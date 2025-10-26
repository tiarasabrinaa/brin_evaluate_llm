from sqlalchemy import Column, Integer, String, JSON, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base

class Dialog(Base):
    __tablename__ = "dialogs"
    
    id = Column(Integer, primary_key=True, index=True)
    dialog_id = Column(String, unique=True, index=True)
    emotion = Column(String)
    topic = Column(String)
    scenario = Column(String)
    messages = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    kualitas_keseluruhan = Column(String)
    dialog_id = Column(String, index=True)  # ✅ Akan ditambahkan unique constraint
    koherensi = Column(Integer)
    empati = Column(Integer)
    memahami_masalah = Column(Integer)
    kesesuaian_intervensi = Column(Integer)
    perbaikan_emosi = Column(Integer)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ✅ Pastikan satu dialog hanya punya satu evaluasi
    __table_args__ = (
        UniqueConstraint('dialog_id', name='uix_evaluation_dialog_id'),
    )

class MessageFeedback(Base):
    __tablename__ = "message_feedback"

    id = Column(Integer, primary_key=True, index=True)
    dialog_id = Column(String, index=True)
    message_index = Column(Integer)
    rating = Column(Integer, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('dialog_id', 'message_index', name='uix_feedback_dialog_message'),
    )