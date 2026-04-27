# app/train_category_model.py
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Expanded labeled training data
data = [
    # Food
    ("Swiggy order", "Food"),
    ("Zomato delivery", "Food"),
    ("Dinner at Haldiram's", "Food"),
    ("Coffee at Chai Point", "Food"),
    ("Groceries from BigBasket", "Food"),
    ("Blinkit order", "Food"),
    ("Zepto delivery", "Food"),
    ("Lunch at Saravana Bhavan", "Food"),
    ("Street food chaat", "Food"),
    ("Milk from Mother Dairy", "Food"),
    ("Food", "Food"),

    # Transport
    ("Ola ride", "Transport"),
    ("Uber auto", "Transport"),
    ("Auto rickshaw fare", "Transport"),
    ("Metro card recharge", "Transport"),
    ("Petrol for bike", "Transport"),
    ("Diesel for car", "Transport"),
    ("Bus ticket via Chalo", "Transport"),
    ("Train ticket IRCTC", "Transport"),
    ("Parking at Phoenix Mall", "Transport"),
    ("Toll tax FASTag", "Transport"),
    ("Transport", "Transport"),

    # Bills
    ("Jio recharge", "Bills"),
    ("Airtel postpaid bill", "Bills"),
    ("Electricity bill BESCOM", "Bills"),
    ("Adani Electricity bill", "Bills"),
    ("Monthly house rent", "Bills"),
    ("Gas cylinder booking", "Bills"),
    ("Water bill", "Bills"),
    ("Maintenance fee", "Bills"),
    ("Broadband bill", "Bills"),
    ("Insurance premium", "Bills"),
    ("Bills", "Bills"),

    # Entertainment
    ("PVR cinema tickets", "Entertainment"),
    ("BookMyShow booking", "Entertainment"),
    ("Netflix subscription", "Entertainment"),
    ("Hotstar premium", "Entertainment"),
    ("Prime Video mobile", "Entertainment"),
    ("Spotify family plan", "Entertainment"),
    ("Video game Top-up", "Entertainment"),
    ("Theme park Wonderla", "Entertainment"),
    ("Cricket match tickets", "Entertainment"),
    ("YouTube Premium", "Entertainment"),
    ("Entertainment", "Entertainment"),

    # Shopping
    ("Amazon India order", "Shopping"),
    ("Flipkart purchase", "Shopping"),
    ("Myntra clothes", "Shopping"),
    ("Nykaa cosmetics", "Shopping"),
    ("Ajio shopping", "Shopping"),
    ("Electronics from Croma", "Shopping"),
    ("Furniture from Pepperfry", "Shopping"),
    ("Gifts from Archies", "Shopping"),
    ("Reliance Digital", "Shopping"),
    ("Dmart groceries", "Shopping"),
    ("Shopping", "Shopping"),

    # Other
    ("Doctor consultation", "Other"),
    ("Apollo pharmacy bill", "Other"),
    ("Tution fees", "Other"),
    ("Donation to temple", "Other"),
    ("Pet grooming", "Other"),
    ("Gym membership", "Other"),
    ("Salon haircut", "Other"),
    ("Courier charges", "Other"),
    ("Stationery items", "Other"),
    ("Other", "Other"),
]

texts, labels = zip(*data)

# Build pipeline
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

# Train model
pipeline.fit(texts, labels)

# Ensure models/ folder exists
os.makedirs("models", exist_ok=True)

# Save model
joblib.dump(pipeline, "models/category_model.pkl")

print("✅ Model trained and saved to models/category_model.pkl")
