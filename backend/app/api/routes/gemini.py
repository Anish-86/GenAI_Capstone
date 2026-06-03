from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.models import User
from app.schemas.schemas import AskRequest, AskResponse, AskSource
from app.services.rag import answer_with_gemini, persist_chat_exchange

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask_inventory_question(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer, sources, document = answer_with_gemini(
        db,
        question=payload.question,
        current_user=current_user,
        document_id=payload.document_id,
        session_id=payload.session_id,
    )
    session = persist_chat_exchange(
        db,
        document=document,
        current_user=current_user,
        question=payload.question,
        answer=answer,
        session_id=payload.session_id,
    )
    return AskResponse(
        answer=answer,
        document_id=document.id if document else None,
        session_id=session.id,
        sources=[
            AskSource(
                chunk_id=source.chunk.id,
                score=round(source.score, 4),
                excerpt=source.chunk.chunk_text[:300],
                page_number=source.chunk.page_number,
                chunk_index=source.chunk.chunk_index,
            )
            for source in sources
        ],
    )
