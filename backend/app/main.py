from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

import csv
from io import StringIO
from typing import Optional, List
import json
import traceback

from . import models
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dialog Evaluator API")

# =========================
#  CORS SETTINGS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
#  SCHEMAS
# =========================
class EvaluationRequest(BaseModel):
    dialog_id: str
    kualitas_keseluruhan: str
    koherensi: int
    empati: int
    memahami_masalah: int
    kesesuaian_intervensi: int
    perbaikan_emosi: int
    notes: Optional[str] = None


class MessageFeedbackRequest(BaseModel):
    dialog_id: str
    message_index: int
    rating: Optional[int] = None  # ✅ Ubah jadi Optional
    tags: Optional[List[str]] = None


# =========================
#  ROUTES
# =========================
@app.get("/")
def root():
    return {"message": "Dialog Evaluator API"}


@app.post("/upload")
async def upload_dialog(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File harus berformat JSON")

        content = await file.read()
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

        if "dialogue" not in data:
            raise HTTPException(status_code=400, detail="Field 'dialogue' tidak ditemukan")

        dialogue_data = data["dialogue"]
        if not isinstance(dialogue_data, list):
            raise HTTPException(status_code=400, detail="Field 'dialogue' harus berupa array")

        messages = []
        for idx, msg in enumerate(dialogue_data):
            if "speaker" not in msg or "text" not in msg:
                raise HTTPException(status_code=400, detail=f"Message ke-{idx} harus punya 'speaker' & 'text'")
            role = "user" if msg["speaker"] == "usr" else "bot"
            messages.append({
                "role": role,
                "content": msg["text"],
                "timestamp": msg.get("timestamp", "")
            })

        dialog_id = data.get("ID", data.get("id", "unknown"))
        dialog_id_str = f"Dialog #{dialog_id}"

        if db.query(models.Dialog).filter(models.Dialog.dialog_id == dialog_id_str).first():
            raise HTTPException(status_code=400, detail=f"Dialog {dialog_id_str} sudah ada")

        dialog = models.Dialog(
            dialog_id=dialog_id_str,
            emotion=data.get("jenis_emosi", data.get("emotion", "")),
            topic=data.get("topik", data.get("topic", "")),
            scenario=data.get("ringkasan_situasi", data.get("scenario", data.get("summary", ""))),
            messages=messages
        )

        db.add(dialog)
        db.commit()
        db.refresh(dialog)

        return {"message": "Upload berhasil", "dialog_id": dialog.dialog_id, "total_messages": len(messages)}

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Upload error:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@app.get("/dialogs")
def get_dialogs(db: Session = Depends(get_db)):
    return db.query(models.Dialog).all()


@app.get("/dialogs/{dialog_id}")
def get_dialog(dialog_id: str, db: Session = Depends(get_db)):
    dialog = db.query(models.Dialog).filter(models.Dialog.dialog_id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return dialog


@app.post("/evaluate")
def submit_evaluation(data: EvaluationRequest, db: Session = Depends(get_db)):
    """Submit atau update evaluasi untuk dialog"""
    
    # ✅ Debug: Print received data
    print(f"📥 Received evaluation data:")
    print(f"   dialog_id: {data.dialog_id}")
    print(f"   kualitas_keseluruhan: {data.kualitas_keseluruhan}")  # ✅ DEBUG
    print(f"   koherensi: {data.koherensi}")
    
    # Validasi dialog
    dialog = db.query(models.Dialog).filter(models.Dialog.dialog_id == data.dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog tidak ditemukan")

    # Validasi scores
    scores = [
        data.koherensi,
        data.empati,
        data.memahami_masalah,
        data.kesesuaian_intervensi,
        data.perbaikan_emosi
    ]
    if any(score < 1 or score > 5 for score in scores):
        raise HTTPException(status_code=400, detail="Semua skor harus antara 1-5")

    # ✅ Cek apakah sudah ada evaluasi untuk dialog ini
    existing = db.query(models.Evaluation).filter(models.Evaluation.dialog_id == data.dialog_id).first()

    if existing:
        # ✅ UPDATE evaluasi yang sudah ada
        print(f"🔄 Updating existing evaluation for {data.dialog_id}")
        existing.kualitas_keseluruhan = data.kualitas_keseluruhan  # ✅ TAMBAHKAN INI!
        existing.koherensi = data.koherensi
        existing.empati = data.empati
        existing.memahami_masalah = data.memahami_masalah
        existing.kesesuaian_intervensi = data.kesesuaian_intervensi
        existing.perbaikan_emosi = data.perbaikan_emosi
        existing.notes = data.notes
        
        db.commit()
        db.refresh(existing)
        
        print(f"✅ Evaluation updated: ID={existing.id}, kualitas_keseluruhan={existing.kualitas_keseluruhan}")  # ✅ DEBUG
        return {
            "message": "Evaluasi berhasil diperbarui",
            "id": existing.id,
            "action": "updated"
        }
    
    # ✅ INSERT evaluasi baru
    print(f"➕ Creating new evaluation for {data.dialog_id}")
    evaluation = models.Evaluation(
        dialog_id=data.dialog_id,
        kualitas_keseluruhan=data.kualitas_keseluruhan,  # ✅ TAMBAHKAN INI!
        koherensi=data.koherensi,
        empati=data.empati,
        memahami_masalah=data.memahami_masalah,
        kesesuaian_intervensi=data.kesesuaian_intervensi,
        perbaikan_emosi=data.perbaikan_emosi,
        notes=data.notes
    )
    
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return {
        "message": "Evaluasi berhasil disimpan",
        "id": evaluation.id,
        "action": "created"
    }

@app.get("/evaluate/{dialog_id}")
def get_evaluation(dialog_id: str, db: Session = Depends(get_db)):
    """Ambil hasil evaluasi yang sudah disimpan untuk dialog tertentu"""
    evaluation = db.query(models.Evaluation).filter(models.Evaluation.dialog_id == dialog_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Belum ada evaluasi untuk dialog ini")
    return {
        "dialog_id": evaluation.dialog_id,
        "kualitas_keseluruhan": evaluation.kualitas_keseluruhan,
        "koherensi": evaluation.koherensi,
        "empati": evaluation.empati,
        "memahami_masalah": evaluation.memahami_masalah,
        "kesesuaian_intervensi": evaluation.kesesuaian_intervensi,
        "perbaikan_emosi": evaluation.perbaikan_emosi,
        "notes": evaluation.notes,
        "created_at": evaluation.created_at
    }


@app.post("/feedback")
def submit_message_feedback(data: MessageFeedbackRequest, db: Session = Depends(get_db)):
    """
    Simpan feedback (👍/👎 + tags) untuk message tertentu dari dialog.
    """
    print(f"📥 Received feedback:")
    print(f"   dialog_id: {data.dialog_id}")
    print(f"   message_index: {data.message_index}")
    print(f"   rating: {data.rating}")
    print(f"   tags: {data.tags}")

    # Validasi dialog
    dialog = db.query(models.Dialog).filter(models.Dialog.dialog_id == data.dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog tidak ditemukan")

    # Cek existing feedback
    existing = (
        db.query(models.MessageFeedback)
        .filter(
            models.MessageFeedback.dialog_id == data.dialog_id,
            models.MessageFeedback.message_index == data.message_index
        )
        .first()
    )

    if existing:
        existing.rating = data.rating
        existing.tags = data.tags or []
        db.commit()
        db.refresh(existing)
        print(f"✅ Feedback updated: ID={existing.id}")
        return {
            "message": "✅ Feedback diperbarui",
            "id": existing.id,
            "dialog_id": data.dialog_id,
            "message_index": data.message_index,
            "rating": data.rating,
            "tags": data.tags or []
        }

    print(f"➕ Creating new feedback")
    feedback = models.MessageFeedback(
        dialog_id=data.dialog_id,
        message_index=data.message_index,
        rating=data.rating,
        tags=data.tags or []
    )
    
    try:
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "id": feedback.id,
        "dialog_id": data.dialog_id,
        "message_index": data.message_index,
        "rating": data.rating,
        "tags": data.tags or []
    }


@app.get("/feedback/{dialog_id}")
def get_message_feedback(dialog_id: str, db: Session = Depends(get_db)):
    feedbacks = db.query(models.MessageFeedback).filter(models.MessageFeedback.dialog_id == dialog_id).all()
    return [
        {
            "message_index": f.message_index,
            "rating": f.rating,
            "tags": f.tags
        } for f in feedbacks
    ]

@app.get("/export/{dialog_id}/json")
def export_dialog_json(dialog_id: str, db: Session = Depends(get_db)):
    """Export dialog, evaluation, dan feedback sebagai JSON"""
    
    # Get dialog
    dialog = db.query(models.Dialog).filter(models.Dialog.dialog_id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog tidak ditemukan")
    
    # Get evaluation
    evaluation = db.query(models.Evaluation).filter(models.Evaluation.dialog_id == dialog_id).first()
    
    # Get feedbacks
    feedbacks = db.query(models.MessageFeedback).filter(models.MessageFeedback.dialog_id == dialog_id).all()
    
    # Build export data
    export_data = {
        "dialog": {
            "dialog_id": dialog.dialog_id,
            "emotion": dialog.emotion,
            "topic": dialog.topic,
            "scenario": dialog.scenario,
            "messages": dialog.messages,
            "created_at": dialog.created_at.isoformat() if dialog.created_at else None
        },
        "evaluation": None,
        "message_feedbacks": []
    }
    
    if evaluation:
        export_data["evaluation"] = {
            "koherensi": evaluation.koherensi,
            "empati": evaluation.empati,
            "memahami_masalah": evaluation.memahami_masalah,
            "kesesuaian_intervensi": evaluation.kesesuaian_intervensi,
            "perbaikan_emosi": evaluation.perbaikan_emosi,
            "notes": evaluation.notes,
            "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
        }
    
    for fb in feedbacks:
        export_data["message_feedbacks"].append({
            "message_index": fb.message_index,
            "rating": fb.rating,
            "tags": fb.tags,
            "created_at": fb.created_at.isoformat() if fb.created_at else None
        })
    
    # Return as downloadable JSON
    json_str = json.dumps(export_data, indent=2, ensure_ascii=False)
    
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={dialog_id.replace(' ', '_')}_export.json"}
    )


@app.get("/export/{dialog_id}/csv")
def export_dialog_csv(dialog_id: str, db: Session = Depends(get_db)):
    """Export dialog dan feedback sebagai CSV"""
    
    # Get dialog
    dialog = db.query(models.Dialog).filter(models.Dialog.dialog_id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog tidak ditemukan")
    
    # Get evaluation
    evaluation = db.query(models.Evaluation).filter(models.Evaluation.dialog_id == dialog_id).first()
    
    # Get feedbacks
    feedbacks = db.query(models.MessageFeedback).filter(models.MessageFeedback.dialog_id == dialog_id).all()
    feedbacks_dict = {fb.message_index: fb for fb in feedbacks}
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Dialog ID", "Emotion", "Topic", "Scenario",
        "Message Index", "Role", "Content", "Timestamp",
        "Rating (👍=1, 👎=-1)", "Tags",
        "Koherensi", "Empati", "Memahami Masalah", "Kesesuaian Intervensi", "Perbaikan Emosi", "Notes"
    ])
    
    # Evaluation scores (same for all rows)
    eval_scores = []
    if evaluation:
        eval_scores = [
            evaluation.koherensi,
            evaluation.empati,
            evaluation.memahami_masalah,
            evaluation.kesesuaian_intervensi,
            evaluation.perbaikan_emosi,
            evaluation.notes or ""
        ]
    else:
        eval_scores = ["", "", "", "", "", ""]
    
    # Write message rows
    for idx, msg in enumerate(dialog.messages):
        feedback = feedbacks_dict.get(idx)
        
        writer.writerow([
            dialog.dialog_id,
            dialog.emotion,
            dialog.topic,
            dialog.scenario,
            idx,
            msg.get("role", ""),
            msg.get("content", ""),
            msg.get("timestamp", ""),
            feedback.rating if feedback else "",
            ", ".join(feedback.tags) if feedback and feedback.tags else "",
            *eval_scores
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dialog_id.replace(' ', '_')}_export.csv"}
    )