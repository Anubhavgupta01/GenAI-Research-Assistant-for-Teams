from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, Form, HTTPException
from typing import Optional
import uuid

from pydantic import BaseModel
from pypdf import PdfReader
from docx import Document

from .deps import summarize_text, answer_question, generate_key_points, generate_action_tasks
from .rag import InMemoryRAGIndex

app = FastAPI(title="GenAI Research Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory document/text store and RAG index
DOCUMENTS: dict[str, str] = {}
RAG = InMemoryRAGIndex()


class SummarizeRequest(BaseModel):
    text: Optional[str] = None
    document_id: Optional[str] = None


class QARequest(BaseModel):
    context: Optional[str] = None
    question: str
    document_id: Optional[str] = None


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
        # Build RAG index for this document
        try:
            RAG.build_index_for_document(doc_id, text)
        except Exception:
            pass
        return {"document_id": doc_id, "characters": len(text)}
    finally:
        await file.close()


@app.post("/summarize")
async def summarize(json: Optional[SummarizeRequest] = None, document_id: Optional[str] = Form(None), text: Optional[str] = Form(None)):
    # Prefer JSON body when provided
    if json is not None:
        if not json.document_id and not json.text:
            raise HTTPException(status_code=400, detail="Provide document_id or text")
        if json.document_id:
            context = DOCUMENTS.get(json.document_id)
            if context is None:
                raise HTTPException(status_code=404, detail="document_id not found")
        else:
            context = json.text or ""
    else:
        if not document_id and not text:
            raise HTTPException(status_code=400, detail="Provide document_id or text")
        if document_id:
            context = DOCUMENTS.get(document_id)
            if context is None:
                raise HTTPException(status_code=404, detail="document_id not found")
        else:
            context = text or ""
    summary = summarize_text(context)
    key_points = generate_key_points(context, num_points=3)
    tasks = generate_action_tasks(context, num_tasks=2)
    return {"summary": summary, "key_points": key_points, "tasks": tasks}


@app.post("/qa")
async def qa(json: Optional[QARequest] = None, question: Optional[str] = Form(None), document_id: Optional[str] = Form(None), context: Optional[str] = Form(None)):
    if json is not None:
        if not json.document_id and not (json.context or ""):
            raise HTTPException(status_code=400, detail="Provide document_id or context")
        if json.document_id:
            # Prefer RAG retrieval
            try:
                chunks = RAG.retrieve(json.document_id, json.question, top_k=4)
                retrieved = "\n---\n".join(c for c, _ in chunks)
                doc_text = retrieved if retrieved.strip() else DOCUMENTS.get(json.document_id, "")
            except Exception:
                doc_text = DOCUMENTS.get(json.document_id)
                if doc_text is None:
                    raise HTTPException(status_code=404, detail="document_id not found")
        else:
            doc_text = json.context or ""
        q = json.question
    else:
        if not question:
            raise HTTPException(status_code=400, detail="Missing question")
        if not document_id and not (context or ""):
            raise HTTPException(status_code=400, detail="Provide document_id or context")
        if document_id:
            try:
                chunks = RAG.retrieve(document_id, question, top_k=4)
                retrieved = "\n---\n".join(c for c, _ in chunks)
                doc_text = retrieved if retrieved.strip() else DOCUMENTS.get(document_id, "")
            except Exception:
                doc_text = DOCUMENTS.get(document_id)
                if doc_text is None:
                    raise HTTPException(status_code=404, detail="document_id not found")
        else:
            doc_text = context or ""
        q = question
    answer = answer_question(doc_text, q)
    return {"answer": answer}
