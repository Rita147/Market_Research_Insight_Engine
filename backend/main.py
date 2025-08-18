from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import joblib
from scraper import scrape_url  # your existing scraper module
import random
from pydantic import BaseModel, EmailStr
import aiosmtplib
from email.message import EmailMessage
import os
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# optional sklearn imports for clustering / reduction / explainability
try:
    from sklearn.decomposition import TruncatedSVD, PCA
    from sklearn.cluster import KMeans
    SKLEARN_AVAILABLE = True
except ImportError:
    logger.warning("sklearn not available, clustering features will be disabled")
    SKLEARN_AVAILABLE = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model & vectorizer with error handling
try:
    model = joblib.load("fake_news_url_model.pkl")
    vectorizer = joblib.load("fake_news_url_vectorizer.pkl")
    logger.info("Models loaded successfully")
except Exception as e:
    logger.error(f"Failed to load models: {e}")
    model = None
    vectorizer = None

# --- helper: search the web (with fallback mock data) ---
# --- helper: search the web using SerpAPI ---
def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Search the web using SerpAPI.
    Requires SERPAPI_KEY environment variable.
    """
    serp_api_key = os.getenv("SERPAPI_KEY")
    if not serp_api_key:
        logger.warning("SERPAPI_KEY not set. Using mock data.")
        # fallback mock
        return [
            {
                "title": f"Mock Article {i+1} about {query}",
                "link": f"https://example-news-{i+1}.com/article-{query.replace(' ', '-')}",
                "snippet": f"This is a mock snippet about {query}."
            }
            for i in range(min(max_results, 3))
        ]

    try:
        params = {
            "engine": "google",
            "q": query,
            "api_key": serp_api_key,
            "num": max_results
        }
        resp = requests.get("https://serpapi.com/search", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in (data.get("organic_results") or [])[:max_results]:
            results.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet") or item.get("snippet_text") or ""
            })
        if not results:
            logger.info("No results from SerpAPI, falling back to mock data.")
            # fallback mock
            results = [
                {
                    "title": f"Mock Article {i+1} about {query}",
                    "link": f"https://example-news-{i+1}.com/article-{query.replace(' ', '-')}",
                    "snippet": f"This is a mock snippet about {query}."
                }
                for i in range(min(max_results, 3))
            ]
        return results
    except Exception as e:
        logger.error(f"SerpAPI request failed: {e}. Using mock data.")
        return [
            {
                "title": f"Mock Article {i+1} about {query}",
                "link": f"https://example-news-{i+1}.com/article-{query.replace(' ', '-')}",
                "snippet": f"This is a mock snippet about {query}."
            }
            for i in range(min(max_results, 3))
        ]


# --- helper: compute recency in days from iso date or heuristics ---
def recency_days(publish_date: Optional[str]) -> Optional[int]:
    if not publish_date:
        return None
    try:
        # Try ISO format first
        if 'T' in publish_date:
            dt = datetime.fromisoformat(publish_date.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(publish_date)
    except Exception:
        try:
            # Try common date formats
            for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    dt = datetime.strptime(publish_date, fmt)
                    break
                except ValueError:
                    continue
            else:
                return None
        except Exception:
            return None
    
    return (datetime.utcnow() - dt.replace(tzinfo=None)).days

# --- helper: explain top tokens/features for a single vector (sparse) ---
def top_contributing_features(vec, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    A light-weight explainability with better error handling
    """
    if model is None or vectorizer is None:
        return []
    
    try:
        feature_names = vectorizer.get_feature_names_out()
        arr = vec.toarray().ravel()  # 1D array of tfidf values for the instance

        contrib_scores = None
        if hasattr(model, "coef_") and model.coef_ is not None:
            # Linear model
            weights = model.coef_.ravel()
            if len(weights) == len(arr):
                contrib_scores = arr * weights
            else:
                logger.warning(f"Dimension mismatch: weights {len(weights)}, features {len(arr)}")
                contrib_scores = arr.copy()
        elif hasattr(model, "feature_importances_") and model.feature_importances_ is not None:
            # Tree-based model
            weights = model.feature_importances_
            if len(weights) == len(arr):
                contrib_scores = arr * weights
            else:
                # Handle dimension mismatch
                min_len = min(len(weights), len(arr))
                contrib_scores = arr[:min_len] * weights[:min_len]
                if len(arr) > min_len:
                    contrib_scores = np.concatenate([contrib_scores, arr[min_len:]])
        else:
            # Fallback: use tf-idf magnitude
            contrib_scores = arr.copy()

        # Get top indices by absolute contribution (considering both positive and negative)
        top_idx = np.argsort(-np.abs(contrib_scores))[:top_k]
        results = []
        
        for i in top_idx:
            if i < len(feature_names) and abs(contrib_scores[i]) > 1e-8:  # Avoid very small values
                results.append({
                    "token": feature_names[i],
                    "contribution_score": float(contrib_scores[i]),
                    "tfidf": float(arr[i]) if i < len(arr) else 0.0
                })
        
        return results
    except Exception as e:
        logger.error(f"Error in top_contributing_features: {e}")
        return []

# -------------------------------
# New endpoint: accept a prompt
# -------------------------------
class QueryRequest(BaseModel):
    prompt: str
    max_results: int = 5

@app.post("/query")
def query_prompt(req: QueryRequest):
    """
    Enhanced query endpoint with better error handling
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    if model is None or vectorizer is None:
        raise HTTPException(status_code=500, detail="ML models not loaded properly")

    # 1) Run web search
    try:
        hits = search_web(req.prompt, max_results=req.max_results)
        logger.info(f"Found {len(hits)} search results for query: {req.prompt}")
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

    if not hits:
        return {"prompt": req.prompt, "results": [], "message": "No results found"}

    items = []
    texts_for_embedding = []
    
    for i, h in enumerate(hits):
        url = h.get("link", "")
        if not url:
            continue
            
        try:
            # Try to scrape the URL
            scraped = scrape_url(url)
            logger.info(f"Successfully scraped {url}")
        except Exception as e:
            logger.warning(f"Failed to scrape {url}: {e}")
            # Create fallback data from search result
            scraped = {
                "title": h.get("title", ""),
                "source_domain": url.split('/')[2] if '/' in url else url,
                "snippet": h.get("snippet", ""),
                "body": "",
                "publish_date": None,
                "news_url": url
            }

        # Build input text for ML model
        input_text_parts = []
        if scraped.get("title"):
            input_text_parts.append(scraped["title"])
        if scraped.get("snippet"):
            input_text_parts.append(scraped["snippet"])
        if scraped.get("body"):
            input_text_parts.append(scraped["body"][:500])  # Limit body text
        if scraped.get("source_domain"):
            input_text_parts.append(scraped["source_domain"])
            
        input_text = " ".join(filter(None, input_text_parts))
        
        if not input_text.strip():
            logger.warning(f"No text content found for {url}")
            continue

        try:
            # Vectorize and predict
            vec = vectorizer.transform([input_text])
            pred = int(model.predict(vec)[0])
            
            # Get trust score
            try:
                proba = model.predict_proba(vec)[0]
                trust_score = float(proba[1] if len(proba) > 1 else proba[0])
            except Exception as e:
                logger.warning(f"predict_proba failed: {e}")
                trust_score = 1.0 if pred == 1 else 0.0

            # Get top contributing features
            top_features = top_contributing_features(vec, top_k=3)
            
            # Calculate recency
            rd = recency_days(scraped.get("publish_date"))
            
            # Add some mock recency if none found (for testing visualization)
            if rd is None:
                rd = random.randint(1, 30)  # Random days for visualization testing

            item = {
                "url": url,
                "title": scraped.get("title") or h.get("title", f"Article {i+1}"),
                "snippet": scraped.get("snippet") or h.get("snippet", ""),
                "source_domain": scraped.get("source_domain", ""),
                "publish_date": scraped.get("publish_date"),
                "recency_days": rd,
                "prediction": "REAL" if pred == 1 else "FAKE",
                "trust_score": trust_score,
                "top_contributing_features": top_features,
                "news_url": url  # Add this field for compatibility
            }
            
            items.append(item)
            texts_for_embedding.append(input_text)
            
        except Exception as e:
            logger.error(f"ML processing failed for {url}: {e}")
            continue

    # 2) Clustering + 2D coords for visualization (optional)
    if SKLEARN_AVAILABLE and items and len(items) > 1:
        try:
            X = vectorizer.transform(texts_for_embedding)
            
            # Reduce dimensionality
            n_components = min(50, X.shape[1] - 1, X.shape[0] - 1)
            if n_components > 1:
                reducer = TruncatedSVD(n_components=n_components, random_state=42)
                X_reduced = reducer.fit_transform(X)
                
                # Clustering
                k = min(3, len(items))
                if k > 1:
                    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_reduced)
                    cluster_labels = kmeans.labels_
                else:
                    cluster_labels = [0] * len(items)
                
                # 2D coordinates for visualization
                if X_reduced.shape[1] >= 2:
                    if X_reduced.shape[1] > 2:
                        pca2 = PCA(n_components=2, random_state=42)
                        coords_2d = pca2.fit_transform(X_reduced)
                    else:
                        coords_2d = X_reduced
                        
                    for idx, item in enumerate(items):
                        item["cluster"] = int(cluster_labels[idx])
                        item["coord_2d"] = {
                            "x": float(coords_2d[idx, 0]), 
                            "y": float(coords_2d[idx, 1])
                        }
                        
            logger.info("Successfully added clustering and 2D coordinates")
            
        except Exception as e:
            logger.warning(f"Clustering failed: {e}")
            # Continue without clustering data

    logger.info(f"Returning {len(items)} processed items")
    return {"prompt": req.prompt, "results": items}

# -------------------------------
# Existing /scrape endpoint - enhanced with explainability
# -------------------------------
@app.get("/scrape")
def scrape(url: str = Query(..., description="URL to scrape")):
    """
    Enhanced scrape endpoint with better error handling
    """
    if model is None or vectorizer is None:
        raise HTTPException(status_code=500, detail="ML models not loaded properly")
    
    try:
        scraped = scrape_url(url)
    except Exception as e:
        logger.error(f"Scraping failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {str(e)}")
    
    # Build input text
    input_text = f"{scraped.get('title', '')} {scraped.get('source_domain', '')}"
    
    if not input_text.strip():
        raise HTTPException(status_code=400, detail="No content found to analyze")
    
    try:
        vec = vectorizer.transform([input_text])
        pred = int(model.predict(vec)[0])
        
        try:
            proba = model.predict_proba(vec)[0]
            trust_score = float(proba[1] if len(proba) > 1 else proba[0])
        except Exception:
            trust_score = 1.0 if pred == 1 else 0.0

        top_features = top_contributing_features(vec, top_k=3)
        
        return {
            **scraped,
            "prediction": "REAL" if pred == 1 else "FAKE",
            "trust_score": trust_score,
            "top_contributing_features": top_features,
        }
    except Exception as e:
        logger.error(f"ML processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# -------------------------------
# Health check endpoint
# -------------------------------
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": model is not None and vectorizer is not None,
        "sklearn_available": SKLEARN_AVAILABLE
    }

# -------------------------------
# Email verification endpoints
# -------------------------------
# In-memory store for demo (email -> code)
verification_codes = {}

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyRequest(BaseModel):
    email: EmailStr
    code: str

@app.post("/send-code")
async def send_code(req: EmailRequest):
    if not req.email.endswith("@pwc.com"):  
        raise HTTPException(status_code=400, detail="Email must be @pwc.com")
    
    code = str(random.randint(100000, 999999))
    verification_codes[req.email] = code

    try:
        # Compose email
        message = EmailMessage()
        message["From"] = "rita.aldeek.147@gmail.com"
        message["To"] = req.email
        message["Subject"] = "Your PwC Verification Code"
        message.set_content(f"Your verification code is: {code}")

        # Send email 
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username="rita.aldeek.147@gmail.com",
            password="dtlb kuxu rvad peqn"
        )
        
        return {"message": "Code sent successfully"}
    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

@app.post("/verify-code")
def verify_code(req: VerifyRequest):
    if verification_codes.get(req.email) == req.code:
        del verification_codes[req.email]  # one-time use
        return {"verified": True}  
    else:
        raise HTTPException(status_code=400, detail="Invalid code")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
#