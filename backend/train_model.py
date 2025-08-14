# train_model.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import joblib

# Load dataset
df = pd.read_csv("FakeNewsNet.csv")

# Drop tweet_num
if "tweet_num" in df.columns:
    df = df.drop(columns=["tweet_num"])

# Fill missing values in title and source_domain
df["title"] = df["title"].fillna("")
df["source_domain"] = df["source_domain"].fillna("")

# Combine title + domain
df["text"] = df["title"] + " " + df["source_domain"]

# Keep only relevant columns
df = df[["text", "label"]]

# Features & target
X = df["text"].fillna("")  # extra safety
y = df["label"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Vectorize
vectorizer = TfidfVectorizer(max_features=5000)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Train model
model = LogisticRegression(max_iter=1000)
model.fit(X_train_vec, y_train)
# After training
joblib.dump(model, "fake_news_url_model.pkl")
joblib.dump(vectorizer, "fake_news_url_vectorizer.pkl")

import os
model_path = os.path.join(os.path.dirname(__file__), "fake_news_url_model.pkl")
vectorizer_path = os.path.join(os.path.dirname(__file__), "fake_news_url_vectorizer.pkl")

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)


print("Model training complete and saved.")
