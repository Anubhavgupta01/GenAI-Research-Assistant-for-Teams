from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, Form, HTTPException
from typing import Optional
import uuid

from pypdf import PdfReader
from docx import Document

from .deps import summarize_text, answer_question

app = FastAPI(title="GenAI Research Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory document store
DOCUMENTS: dict[str, str] = {}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        content_type = file.content_type or ""
        text = ""
        data = await file.read()
        if content_type.endswith("pdf") or file.filename.lower().endswith(".pdf"):
            from io import BytesIO
            reader = PdfReader(BytesIO(data))
            pages_text = []
            for page in reader.pages:
                try:
                    pages_text.append(page.extract_text() or "")
                except Exception:
                    pages_text.append("")
            text = "\n".join(pages_text)
        elif content_type.endswith("msword") or content_type.endswith("officedocument.wordprocessingml.document") or file.filename.lower().endswith((".doc", ".docx")):
            from io import BytesIO
            doc = Document(BytesIO(data))
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            # assume text-like
            try:
                text = data.decode("utf-8", errors="ignore")
            except Exception:
                text = ""
        if not text.strip():
            raise HTTPException(status_code=400, detail="Unable to extract text from file")
        doc_id = str(uuid.uuid4())
        DOCUMENTS[doc_id] = text
        return {"document_id": doc_id, "characters": len(text)}
    finally:
        await file.close()


@app.post("/summarize")
async def summarize(document_id: Optional[str] = Form(None), text: Optional[str] = Form(None)):
    if not document_id and not text:
        raise HTTPException(status_code=400, detail="Provide document_id or text")
    if document_id:
        context = DOCUMENTS.get(document_id)
        if context is None:
            raise HTTPException(status_code=404, detail="document_id not found")
    else:
        context = text or ""
    summary = summarize_text(context)
    return {"summary": summary}


@app.post("/qa")
async def qa(question: str = Form(...), document_id: Optional[str] = Form(None), context: Optional[str] = Form(None)):
    if not document_id and not context:
        raise HTTPException(status_code=400, detail="Provide document_id or context")
    if document_id:
        doc_text = DOCUMENTS.get(document_id)
        if doc_text is None:
            raise HTTPException(status_code=404, detail="document_id not found")
    else:
        doc_text = context or ""
    answer = answer_question(doc_text, question)
    return {"answer": answer}
