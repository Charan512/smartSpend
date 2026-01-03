# Smart Expense Tracker 💰

A full-stack expense tracking application with AI-powered features for intelligent expense management.

## Features

- 💬 **Smart Chat Interface** - Add expenses via natural language
- 📸 **Receipt OCR Processing** - Extract expense data from receipt images
- 📊 **Budget Goals & Optimization** - Set and track spending goals
- 📈 **Spending Forecasts** - AI-powered expense predictions
- 📅 **Monthly Summaries** - Comprehensive spending analytics
- 🔄 **Real-time Updates** - WebSocket-based live updates
- 📁 **CSV Import** - Bulk import historical expenses

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **ORM**: SQLAlchemy
- **AI/ML**: spaCy, scikit-learn, Tesseract OCR
- **Authentication**: Bcrypt password hashing
- **Rate Limiting**: SlowAPI
- **Scheduler**: APScheduler

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Tesseract OCR** (for receipt processing)

### Installing Tesseract

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download from [GitHub Releases](https://github.com/UB-Mannheim/tesseract/wiki)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd task-2
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python download_models.py

# Create .env file from example
cp .env.example .env
# Edit .env and set your configuration

# Run the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000" > .env.local
echo "NEXT_PUBLIC_WS_BASE=ws://127.0.0.1:8000" >> .env.local

# Run the frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```bash
ENVIRONMENT=development
DATABASE_URL=sqlite:///./expenses.db
JWT_SECRET_KEY=your-secret-key-here
RUN_SCHEDULER=true
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
NEXT_PUBLIC_WS_BASE=ws://127.0.0.1:8000
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Production Deployment

### Backend (Render/Railway/Fly.io)

1. Set environment variables:
   - `ENVIRONMENT=production`
   - `DATABASE_URL=<your-postgres-url>`
   - `JWT_SECRET_KEY=<secure-random-key>`
   - `RUN_SCHEDULER=true` (only on one instance)

2. Install dependencies and run:
   ```bash
   pip install -r requirements.txt
   python download_models.py
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Frontend (Vercel/Netlify)

1. Set environment variables:
   - `NEXT_PUBLIC_API_BASE=<your-backend-url>`
   - `NEXT_PUBLIC_WS_BASE=<your-backend-ws-url>`

2. Deploy:
   ```bash
   npm run build
   npm start
   ```

## Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d
```

## Project Structure

```
task-2/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── crud.py          # Database operations
│   │   ├── nlp.py           # NLP processing
│   │   ├── ocr.py           # OCR processing
│   │   ├── exceptions.py    # Custom exceptions
│   │   └── database.py      # Database configuration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.jsx     # Main dashboard
│   │   │   └── layout.js
│   │   └── lib/
│   │       ├── api.js       # API client
│   │       └── config.js    # Configuration
│   ├── package.json
│   └── next.config.mjs
└── docker-compose.yml

```

## Features in Detail

### Smart Chat
- Natural language expense entry
- Automatic category classification
- Date and merchant extraction
- Real-time WebSocket updates

### Receipt OCR
- Upload receipt images
- Automatic text extraction
- Intelligent parsing of amounts, dates, merchants
- Category prediction

### Budget Management
- Set monthly budgets
- Category-wise budget allocation
- Automatic budget optimization suggestions
- Real-time budget usage tracking

### Analytics
- Monthly spending summaries
- Category-wise breakdowns
- Spending forecasts using ARIMA/Linear Regression
- Historical trend analysis

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using FastAPI and Next.js**