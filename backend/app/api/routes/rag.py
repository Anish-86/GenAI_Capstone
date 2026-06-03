from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.models import User
from app.schemas.schemas import RAGChatRequest, RAGChatResponse, RAGUploadResponse
from app.services.rag import answer_document_question, index_uploaded_document, source_to_response

router = APIRouter()


@router.post("/upload", response_model=RAGUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    tenant_id: UUID | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = index_uploaded_document(db, file=file, current_user=current_user, tenant_id=tenant_id)
    return RAGUploadResponse(document_id=document.id, status="indexed")


@router.post("/chat", response_model=RAGChatResponse)
def chat_with_document(
    payload: RAGChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer, sources, session = answer_document_question(
        db,
        document_id=payload.document_id,
        question=payload.question,
        current_user=current_user,
        session_id=payload.session_id,
    )
    return RAGChatResponse(
        answer=answer,
        sources=[source_to_response(source) for source in sources],
        session_id=session.id,
    )
