# RemitEasy Backend (FastAPI)

## Run
# Make sure you are in backend/
source app/venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload

## API Docs
http://127.0.0.1:8000/docs

## Env
Edit `.env` for SECRET_KEY, DATABASE_URL, and CORS_ALLOW_ORIGINS.
