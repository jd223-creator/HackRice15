# RemitEasy Backend (FastAPI)

## Run
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

## API Docs
http://127.0.0.1:8000/docs

## Env
Edit `.env` for SECRET_KEY, DATABASE_URL, and CORS_ALLOW_ORIGINS.
