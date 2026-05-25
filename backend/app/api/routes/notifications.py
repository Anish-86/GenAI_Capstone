from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import NotificationResponse
from app.models.models import Notification, User
from app.dependencies.auth import get_current_user

router = APIRouter()


def notification_query(db: Session, current_user: User):
    return db.query(Notification).filter(
        or_(
            Notification.recipient_id == current_user.id,
            Notification.recipient_id == None,
        )
    )


@router.get("", response_model=List[NotificationResponse])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return notification_query(db, current_user).order_by(Notification.created_at.desc()).limit(25).all()


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = notification_query(db, current_user).filter(Notification.is_read == False).count()
    return {"count": count}


@router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification_query(db, current_user).filter(Notification.is_read == False).update(
        {Notification.is_read: True}, synchronize_session=False
    )
    db.commit()
    return {"marked": True}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = notification_query(db, current_user).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
