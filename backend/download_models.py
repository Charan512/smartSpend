# backend/download_models.py
import spacy
import subprocess
import sys
def download_spacy_model():
    try:
        spacy.load("en_core_web_sm")
        print("spaCy model already installed")
    except OSError:
        print("Downloading spaCy model...")
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        print("SpaCy model downloaded")

if __name__ == "__main__":
    download_spacy_model()