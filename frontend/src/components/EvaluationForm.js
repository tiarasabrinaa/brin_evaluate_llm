import React, { useState, useEffect } from 'react';
import { submitEvaluation, fetchEvaluation, submitFeedback } from '../services/api';
import './EvaluationForm.css';

function EvaluationForm({ dialogId, reactions, onEvaluationSubmit, onSkip }) {
  const [ratings, setRatings] = useState({
    kualitas_keseluruhan: '',
    koherensi: 0,
    empati: 0,
    memahami_masalah: 0,
    kesesuaian_intervensi: 0,
    perbaikan_emosi: 0,
  });
  const [notes, setNotes] = useState('');
  const [isu, setIsu] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const availableIsu = [
    'Faktual error',
    'Pertanyaan berulang/Off Topic',
    'Gaya Bahasa/Tone/Term tidak tepat',
    '[FLAG] Respon Berbahaya/Tidak sesuai kultur Indonesia'
  ];

  const metrics = [
    { key: 'koherensi', label: 'Koherensi' },
    { key: 'empati', label: 'Empati' },
    { key: 'memahami_masalah', label: 'Memahami Masalah' },
    { key: 'kesesuaian_intervensi', label: 'Kesesuaian Intervensi' },
    { key: 'perbaikan_emosi', label: 'Perbaikan Emosi' },
  ];

  // ✅ Load existing evaluation - dengan cleanup
  useEffect(() => {
    let isMounted = true; // ✅ Prevent state update after unmount

    async function loadEvaluation() {
      console.log('🔄 Loading evaluation for:', dialogId);
      setLoading(true);
      
      // ✅ Reset state dulu
      setRatings({
        kualitas_keseluruhan: '',
        koherensi: 0,
        empati: 0,
        memahami_masalah: 0,
        kesesuaian_intervensi: 0,
        perbaikan_emosi: 0,
      });
      setNotes('');
      setIsu([]);
      
      try {
        const existing = await fetchEvaluation(dialogId);
        console.log('📥 Fetched evaluation:', existing);
        
        if (!isMounted) return; // ✅ Don't update if unmounted
        
        if (existing) {
          const newRatings = {
            kualitas_keseluruhan: existing.kualitas_keseluruhan || '',
            koherensi: existing.koherensi || 0,
            empati: existing.empati || 0,
            memahami_masalah: existing.memahami_masalah || 0,
            kesesuaian_intervensi: existing.kesesuaian_intervensi || 0,
            perbaikan_emosi: existing.perbaikan_emosi || 0,
          };
          
          console.log('✅ Setting ratings to:', newRatings);
          setRatings(newRatings);
          setNotes(existing.notes || '');
          setIsu(existing.isu || []);
        } else {
          console.log('⚠️ No existing evaluation found');
        }
      } catch (err) {
        console.error('❌ Error loading evaluation:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    if (dialogId) {
      loadEvaluation();
    }

    // ✅ Cleanup function
    return () => {
      isMounted = false;
    };
  }, [dialogId]);

  // ✅ Debug: Monitor state changes
  useEffect(() => {
    console.log('🎯 Current ratings state:', ratings);
  }, [ratings]);

  const handleRatingChange = (key, value) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleQualitySelect = (label) => {
    console.log('🔘 Selecting quality:', label);
    setRatings(prev => {
      const newRatings = { ...prev, kualitas_keseluruhan: label };
      console.log('🔘 New ratings after select:', newRatings);
      return newRatings;
    });
  };

  const handleSubmit = async () => {
    const allRated = Object.entries(ratings)
      .filter(([key]) => key !== 'kualitas_keseluruhan')
      .every(([_, val]) => val > 0);

    if (!ratings.kualitas_keseluruhan) {
      alert('Pilih kualitas keseluruhan!');
      return;
    }
    if (!allRated) {
      alert('Harap isi semua rating!');
      return;
    }

    setSubmitting(true);
    try {
      // 1️⃣ Submit evaluation
      console.log('📤 Submitting evaluation:', ratings);
      const evalResult = await submitEvaluation({
        dialog_id: dialogId,
        ...ratings,
        notes: notes || null,
        isu: isu.length > 0 ? isu : null,
      });
      
      console.log('✅ Evaluation result:', evalResult);

      // 2️⃣ Submit feedback per message
      console.log('🔍 Reactions:', reactions);
      
      if (reactions && Object.keys(reactions).length > 0) {
        for (const [messageIndex, reaction] of Object.entries(reactions)) {
          const rating =
            reaction.rating === 'like' ? 1 :
            reaction.rating === 'dislike' ? -1 : null;
          const tags = reaction.tags || [];

          if (rating !== null || tags.length > 0) {
            try {
              await submitFeedback(dialogId, parseInt(messageIndex), rating, tags);
              console.log(`✅ Feedback saved for message ${messageIndex}`);
            } catch (err) {
              console.error(`❌ Failed to save feedback for message ${messageIndex}:`, err);
            }
          }
        }
      }

      // 3️⃣ Reload saved evaluation
      const saved = await fetchEvaluation(dialogId);
      if (saved) {
        setRatings({
          kualitas_keseluruhan: saved.kualitas_keseluruhan || '',
          koherensi: saved.koherensi || 0,
          empati: saved.empati || 0,
          memahami_masalah: saved.memahami_masalah || 0,
          kesesuaian_intervensi: saved.kesesuaian_intervensi || 0,
          perbaikan_emosi: saved.perbaikan_emosi || 0,
        });
        setNotes(saved.notes || '');
        setIsu(saved.isu || []);
      }

      onEvaluationSubmit && onEvaluationSubmit();
      
      if (evalResult.action === 'updated') {
        alert('✅ Evaluasi berhasil diperbarui!');
      } else {
        alert('✅ Evaluasi berhasil disimpan!');
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('❌ Gagal menyimpan: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="evaluation-form">Memuat evaluasi...</div>;

  return (
    <div className="evaluation-form">
      <div className="evaluation-header">
        <h3>Evaluasi</h3>
      </div>

      {/* Kualitas Keseluruhan */}
      <div className="quality-section">
        <h4>Kualitas keseluruhan</h4>
        <div className="quality-badges">
          {['Kurang', 'Cukup', 'Baik', 'Baik sekali'].map((label) => {
            const isActive = ratings.kualitas_keseluruhan === label;
            return (
              <button
                key={label}
                className={`quality-badge ${isActive ? 'active' : ''}`}
                onClick={() => handleQualitySelect(label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="metrics-section">
        <h4>Quality Metrics</h4>
        {metrics.map((metric) => (
          <div key={metric.key} className="metric-item">
            <div className="metric-header">
              <span>{metric.label}</span>
              <span className="metric-score">{ratings[metric.key]}/5</span>
            </div>
            <div className="rating-buttons">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  className={`rating-btn ${
                    ratings[metric.key] === num ? 'active' : ''
                  }`}
                  onClick={() => handleRatingChange(metric.key, num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="issues-section">
        <h4>Isu yang ditemukan</h4>
        <div className="issues-checkboxes">
          {availableIsu.map((issue) => (
            <label key={issue} className="issue-checkbox">
              <input
                type="checkbox"
                checked={isu.includes(issue)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setIsu([...isu, issue]);
                  } else {
                    setIsu(isu.filter(i => i !== issue));
                  }
                }}
              />
              <span className={issue.startsWith('[FLAG]') ? 'flag-issue' : ''}>
                {issue}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="notes-section">
        <h4>Notes</h4>
        <textarea
          placeholder="Tambahkan catatan tambahan..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>

      <div className="form-actions">
        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Menyimpan...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}

export default EvaluationForm;