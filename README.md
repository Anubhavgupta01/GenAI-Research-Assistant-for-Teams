# GenAI Research Assistant for Teams

Full-stack app: React + Tailwind frontend, FastAPI backend using HuggingFace Transformers with Meta LLaMA (fallback to a small model). Upload files, chat, summarize, and Q&A.

## Requirements
- Node 18+ and npm (for local frontend)
- Python 3.10+ (for local backend)
- Docker and Docker Compose (for containerized run)
- Optional: `HUGGINGFACE_HUB_TOKEN` with access to `meta-llama/Llama-3.1-8B-Instruct`

## Environment
- `HUGGINGFACE_HUB_TOKEN`: Token for private LLaMA weights
- `MODEL_ID`: Defaults to `meta-llama/Llama-3.1-8B-Instruct`. You can set to any compatible instruct model. Fallback to `distilgpt2` when unavailable.

## Run with Docker
```bash
# In project root
# Ensure you have exported HUGGINGFACE_HUB_TOKEN if you have access
# Windows PowerShell example:
$env:HUGGINGFACE_HUB_TOKEN = "<your_token>"

docker compose up --build
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/docs
```

## Run locally (without Docker)
### Backend
```bash
cd backend
python -m venv .venv
# PowerShell
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
# Optionally set HF token
$env:HUGGINGFACE_HUB_TOKEN = "<your_token>"
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# VITE_API_URL defaults to http://localhost:8000
```

## Features
- Upload: PDF, DOC/DOCX, or plain text extraction
- Summarize: Summarize uploaded doc or pasted text
- Q&A: Ask questions grounded in uploaded document

## Notes
- Large models may require GPU and appropriate CUDA stack. The backend will try to map devices automatically and falls back to CPU and a smaller model if unavailable.
- This starter stores documents in-memory; for production, use a database or object storage.