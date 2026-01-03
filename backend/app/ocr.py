# app/ocr.py
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import io
import os
import subprocess

# Check if Tesseract is properly installed
try:
    # Test if tesseract command works
    result = subprocess.run(['which', 'tesseract'], capture_output=True, text=True)
    if result.returncode == 0:
        tesseract_path = result.stdout.strip()
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        print(f"✅ Tesseract found at: {tesseract_path}")
        
        # Verify version
        version_result = subprocess.run(['tesseract', '--version'], capture_output=True, text=True)
        print(f"✅ {version_result.stdout.splitlines()[0]}")
    else:
        print("❌ Tesseract not found in PATH")
        # Fallback to common macOS paths
        possible_paths = [
            '/opt/homebrew/bin/tesseract',  # M1/M2 Homebrew
            '/usr/local/bin/tesseract',     # Intel Homebrew
            '/usr/bin/tesseract'
        ]
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"✅ Tesseract found at: {path}")
                break
        else:
            print("❌ Tesseract not found in any common locations")
            
except Exception as e:
    print(f"❌ Tesseract setup error: {e}")

def preprocess_image(img):
    img = img.convert("L")
    img = ImageOps.autocontrast(img)
    img = img.point(lambda x: 0 if x < 140 else 255, "1")
    img = img.filter(ImageFilter.SHARPEN)
    return img

def extract_text_from_bytes(file_bytes: bytes) -> str:
    """Extract text from image bytes using Tesseract OCR."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = preprocess_image(img)
        text = pytesseract.image_to_string(img)
        print("OCR Extracted Text:", text)
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        raise Exception(f"Failed to extract text from image: {str(e)}")

# Test Tesseract on startup
try:
    test_text = pytesseract.image_to_string(Image.new('RGB', (100, 100), color='white'))
    print("✅ Tesseract is working correctly")
except Exception as e:
    print(f"❌ Tesseract test failed: {e}")