from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import joblib
from scraper import scrape_url  # your existing scraper module
import random
from pydantic import BaseModel, EmailStr
import aiosmtplib
from email.message import EmailMessage
import os
os.environ["OMP_NUM_THREADS"] = "1"
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import logging

# OpenAI
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")

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

# -------------------------------
# Helper: SerpAPI search
# -------------------------------
def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    serp_api_key = os.getenv("SERPAPI_KEY")
    if not serp_api_key:
        logger.warning("SERPAPI_KEY not set. Using mock data.")
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

# -------------------------------
# Helper: recency
# -------------------------------
def recency_days(publish_date: Optional[str]) -> Optional[int]:
    if not publish_date:
        return None
    try:
        if 'T' in publish_date:
            dt = datetime.fromisoformat(publish_date.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(publish_date)
    except Exception:
        try:
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

# -------------------------------
# Helper: top features
# -------------------------------
def top_contributing_features(vec, top_k: int = 3) -> List[Dict[str, Any]]:
    if model is None or vectorizer is None:
        return []
    try:
        feature_names = vectorizer.get_feature_names_out()
        arr = vec.toarray().ravel()
        contrib_scores = None
        if hasattr(model, "coef_") and model.coef_ is not None:
            weights = model.coef_.ravel()
            contrib_scores = arr * weights if len(weights) == len(arr) else arr.copy()
        elif hasattr(model, "feature_importances_") and model.feature_importances_ is not None:
            weights = model.feature_importances_
            min_len = min(len(weights), len(arr))
            contrib_scores = arr[:min_len] * weights[:min_len]
            if len(arr) > min_len:
                contrib_scores = np.concatenate([contrib_scores, arr[min_len:]])
        else:
            contrib_scores = arr.copy()
        top_idx = np.argsort(-np.abs(contrib_scores))[:top_k]
        results = []
        for i in top_idx:
            if i < len(feature_names) and abs(contrib_scores[i]) > 1e-8:
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
# Query endpoint with OpenAI
# -------------------------------
class QueryRequest(BaseModel):
    prompt: str
    max_results: int = 5

@app.post("/query")
def query_prompt(req: QueryRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    if model is None or vectorizer is None:
        raise HTTPException(status_code=500, detail="ML models not loaded properly")

    # 1) Search
    hits = search_web(req.prompt, max_results=req.max_results)
    if not hits:
        return {"prompt": req.prompt, "results": [], "answer": None, "message": "No results found"}

    items = []
    texts_for_embedding = []
    for i, h in enumerate(hits):
        url = h.get("link", "")
        if not url:
            continue
        try:
            scraped = scrape_url(url)
        except Exception as e:
            scraped = {
                "title": h.get("title", ""),
                "source_domain": url.split('/')[2] if '/' in url else url,
                "snippet": h.get("snippet", ""),
                "body": "",
                "publish_date": None,
                "news_url": url
            }
        input_text = " ".join(filter(None, [
            scraped.get("title"),
            scraped.get("snippet"),
            scraped.get("body")[:500] if scraped.get("body") else None,
            scraped.get("source_domain")
        ]))
        if not input_text.strip():
            continue
        try:
            vec = vectorizer.transform([input_text])
            pred = int(model.predict(vec)[0])
            proba = model.predict_proba(vec)[0] if hasattr(model, "predict_proba") else [0.0, 1.0]
            trust_score = float(proba[1] if len(proba) > 1 else proba[0])
            top_features = top_contributing_features(vec)
            rd = recency_days(scraped.get("publish_date")) or random.randint(1,30)
            items.append({
                "url": url,
                "title": scraped.get("title") or h.get("title", f"Article {i+1}"),
                "snippet": scraped.get("snippet") or h.get("snippet", ""),
                "source_domain": scraped.get("source_domain", ""),
                "publish_date": scraped.get("publish_date"),
                "recency_days": rd,
                "prediction": "REAL" if pred == 1 else "FAKE",
                "trust_score": trust_score,
                "top_contributing_features": top_features,
                "news_url": url
            })
            texts_for_embedding.append(input_text)
        except Exception as e:
            logger.error(f"ML processing failed for {url}: {e}")
            continue

    # 2) Clustering
    if SKLEARN_AVAILABLE and items and len(items) > 1:
        try:
            X = vectorizer.transform(texts_for_embedding)
            n_components = min(50, X.shape[1]-1, X.shape[0]-1)
            if n_components>1:
                X_reduced = TruncatedSVD(n_components=n_components, random_state=42).fit_transform(X)
                k = min(3, len(items))
                cluster_labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_reduced).labels_ if k>1 else [0]*len(items)
                coords_2d = PCA(n_components=2, random_state=42).fit_transform(X_reduced) if X_reduced.shape[1]>2 else X_reduced
                for idx,item in enumerate(items):
                    item["cluster"] = int(cluster_labels[idx])
                    item["coord_2d"] = {"x": float(coords_2d[idx,0]), "y": float(coords_2d[idx,1])}
        except Exception as e:
            logger.warning(f"Clustering failed: {e}")

    # 3) OpenAI final answergit log --oneline --graph --decorate

    items_sorted = sorted(items, key=lambda x: x["trust_score"], reverse=True)
    top_sources = items_sorted[:3]
    combined_text = "\n\n".join([f"{item['title']}: {item['snippet']}" for item in top_sources])

    try:
        from openai import OpenAI
        client = OpenAI()  # will pick up the key from environment

        # --- Simple Answer (keeps your original style) ---
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Question: {req.prompt}\n\nSources:\n{combined_text}"}
            ],
            max_tokens=200,
            temperature=0.2
        )
        final_answer = response.choices[0].message.content

        # --- Research Report (new addition) ---
        report_prompt = f"""
        You are an AI research assistant. The user asked: "{req.prompt}"

        Based on the following sources, write a structured mini research report with:
        1. Executive Summary (2–3 sentences).
        2. Key Findings (bullet points).
        3. Credibility Assessment (REAL vs FAKE + trust scores).
        4. Recent Developments (recency in days).
        5. Conclusion.

        Sources:
        {combined_text}
        """

        report_resp = client.chat.completions.create(
            model="gpt-4o-mini",   # better for summarization
            messages=[
                {"role": "system", "content": "You are a helpful research analyst."},
                {"role": "user", "content": report_prompt}
            ],
            max_tokens=700,
            temperature=0.3
        )
        final_report = report_resp.choices[0].message.content

    except Exception as e:
        logger.error(f"OpenAI request failed: {e}")
        final_answer = None
        final_report = None

    return {
        "prompt": req.prompt,
        "results": items_sorted,
        "answer": final_answer,
        "report": final_report  # <-- new field
    }



# -------------------------------
# /scrape endpoint
# -------------------------------
@app.get("/scrape")
def scrape(url: str = Query(...)):
    if model is None or vectorizer is None:
        raise HTTPException(status_code=500, detail="ML models not loaded properly")
    try:
        scraped = scrape_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {e}")
    input_text = f"{scraped.get('title','')} {scraped.get('source_domain','')}"
    vec = vectorizer.transform([input_text])
    pred = int(model.predict(vec)[0])
    proba = model.predict_proba(vec)[0] if hasattr(model,"predict_proba") else [0.0,1.0]
    trust_score = float(proba[1] if len(proba)>1 else proba[0])
    top_features = top_contributing_features(vec)
    return {**scraped, "prediction":"REAL" if pred==1 else "FAKE", "trust_score":trust_score, "top_contributing_features":top_features}

# -------------------------------
# Health check
# -------------------------------
@app.get("/health")
def health_check():
    return {"status":"healthy","models_loaded":model is not None and vectorizer is not None,"sklearn_available":SKLEARN_AVAILABLE}

# -------------------------------
# Email verification
# -------------------------------
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
        message = EmailMessage()
        message["From"] = "rita.aldeek.147@gmail.com"
        message["To"] = req.email
        message["Subject"] = "Your PwC Verification Code"
        message.set_content(f"Your verification code is: {code}")
        await aiosmtplib.send(message, hostname="smtp.gmail.com", port=587, start_tls=True,
                              username="rita.aldeek.147@gmail.com", password="dtlb kuxu rvad peqn")
        return {"message":"Code sent successfully"}
    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

@app.post("/verify-code")
def verify_code(req: VerifyRequest):
    if verification_codes.get(req.email) == req.code:
        del verification_codes[req.email]
        return {"verified": True}
    else:
        raise HTTPException(status_code=400, detail="Invalid code")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)