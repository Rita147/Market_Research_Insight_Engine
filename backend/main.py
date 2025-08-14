from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import joblib
from scraper import scrape_url  # your existing scraper module
import random
from pydantic import BaseModel, EmailStr
import aiosmtplib
from email.message import EmailMessage

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model & vectorizer
model = joblib.load("fake_news_url_model.pkl")
vectorizer = joblib.load("fake_news_url_vectorizer.pkl")

# -------------------------------
# Scraper endpoint (existing)
# -------------------------------
@app.get("/scrape")
def scrape(url: str = Query(..., description="URL to scrape")):
    scraped = scrape_url(url)
    input_text = f"{scraped['title']} {scraped['source_domain']}"
    vec = vectorizer.transform([input_text])
    pred = model.predict(vec)[0]
    trust_score = float(model.predict_proba(vec)[0][1])

    return {
        **scraped,
        "prediction": "REAL" if pred == 1 else "FAKE",
        "trust_score": trust_score
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

    # Compose email
    message = EmailMessage()
    message["From"] = "your_email@gmail.com"
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

    return {"message": "Code sent successfully"}  # remove code in production!

@app.post("/verify-code")
def verify_code(req: VerifyRequest):
    if verification_codes.get(req.email) == req.code:
        del verification_codes[req.email]  # one-time use
        return {"verified": True}
    else:
        raise HTTPException(status_code=400, detail="Invalid code")
