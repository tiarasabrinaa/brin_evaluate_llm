import React, { useState, useEffect } from 'react';
import { fetchFeedback, exportDialogJSON, exportDialogCSV } from '../services/api';
import './DialogViewer.css';

function DialogViewer({ dialog, onReactionsChange }) {
  const [reactions, setReactions] = useState({});
  const [tagMenuOpen, setTagMenuOpen] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const tagOptions = ["Klarifikasi", "Validasi Emosi", "Lainnya"];

  // ✅ Load existing feedback saat dialog berubah
  useEffect(() => {
    if (!dialog) return;

    const loadFeedback = async () => {
      try {
        const feedbacks = await fetchFeedback(dialog.dialog_id);
        const reactionsMap = {};
        feedbacks.forEach(fb => {
          reactionsMap[fb.message_index] = {
            rating: fb.rating === 1 ? 'like' : fb.rating === -1 ? 'dislike' : null,
            tags: fb.tags || []
          };
        });
        setReactions(reactionsMap);
        console.log('✅ Loaded existing feedback:', reactionsMap);
      } catch (error) {
        console.error('❌ Error loading feedback:', error);
      }
    };

    loadFeedback();
  }, [dialog]);

  // ✅ Kirim reactions ke parent setiap kali berubah
  useEffect(() => {
    if (onReactionsChange) onReactionsChange(reactions);
  }, [reactions, onReactionsChange]);

  // Handle thumbs up/down
  const handleReaction = (idx, type) => {
    const newRating = reactions[idx]?.rating === type ? null : type;

    setReactions(prev => ({
      ...prev,
      [idx]: {
        rating: newRating,
        tags: prev[idx]?.tags || []
      }
    }));

    setTagMenuOpen(null);
  };

  // Handle tag selection (preset tags)
  const handleTagSelect = (idx, tag) => {
    if (tag === "Lainnya") return; // nanti trigger input custom
    const currentTags = reactions[idx]?.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    setReactions(prev => ({
      ...prev,
      [idx]: {
        rating: prev[idx]?.rating || null,
        tags: newTags
      }
    }));
    setTagMenuOpen(null);
  };

  // ✅ Submit tag custom
  const handleCustomTagSubmit = (idx) => {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    const currentTags = reactions[idx]?.tags || [];
    const newTags = [...currentTags, trimmed];

    setReactions(prev => ({
      ...prev,
      [idx]: {
        rating: prev[idx]?.rating || null,
        tags: newTags
      }
    }));

    setCustomTag('');
    setTagMenuOpen(null);
  };

  // ✅ Handle export
  const handleExport = async (format) => {
    try {
      if (format === 'json') {
        await exportDialogJSON(dialog.dialog_id);
        alert('✅ Export JSON berhasil!');
      } else if (format === 'csv') {
        await exportDialogCSV(dialog.dialog_id);
        alert('✅ Export CSV berhasil!');
      }
      setExportMenuOpen(false);
    } catch (error) {
      alert('❌ Export gagal: ' + error.message);
    }
  };

  if (!dialog) {
    return (
      <div className="dialog-viewer empty">
        <p>Pilih dialog untuk mulai evaluasi</p>
      </div>
    );
  }

  return (
    <div className="dialog-viewer">
      <div className="dialog-header">
        <div className="dialog-header-content">
          <h2>{dialog.dialog_id}</h2>
          <div className="dialog-header-actions">
            <div className="export-wrapper">
              <button 
                className="btn-export"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
              >
                Export
              </button>
              
              {exportMenuOpen && (
                <div className="export-menu">
                  <div className="export-option" onClick={() => handleExport('json')}>
                    📄 Export as JSON
                  </div>
                  <div className="export-option" onClick={() => handleExport('csv')}>
                    📊 Export as CSV
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="dialog-meta">
          <span><strong>Emosi:</strong> {dialog.emotion}</span>
          <span><strong>Topik:</strong> {dialog.topic}</span>
        </div>
        {dialog.scenario && (
          <div className="dialog-scenario">
            <strong>Skenario:</strong> {dialog.scenario}
          </div>
        )}
      </div>

      <div className="messages-container">
        {dialog.messages?.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? 'U' : 'B'}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-role">{msg.role === 'user' ? 'User' : 'Bot'}</span>
                <span className="message-time">{msg.timestamp || '10:34 AM'}</span>
              </div>

              <div className="message-text">{msg.content}</div>

              {msg.role === 'bot' && (
                <div className="message-reactions">
                  <button
                    className={`reaction-btn ${reactions[idx]?.rating === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(idx, 'like')}
                  >
                    👍
                  </button>

                  <button
                    className={`reaction-btn ${reactions[idx]?.rating === 'dislike' ? 'active' : ''}`}
                    onClick={() => handleReaction(idx, 'dislike')}
                  >
                    👎
                  </button>

                  <div className="tag-wrapper">
                    <button
                      className={`reaction-btn ${
                        reactions[idx]?.tags?.length > 0 ? 'active' : ''
                      }`}
                      onClick={() =>
                        setTagMenuOpen(tagMenuOpen === idx ? null : idx)
                      }
                    >
                      🏷️ Tag {reactions[idx]?.tags?.length > 0 && `(${reactions[idx].tags.length})`}
                    </button>

                    {tagMenuOpen === idx && (
                      <div className="tag-menu">
                        {tagOptions.map((opt) => (
                          <div
                            key={opt}
                            className={`tag-option ${
                              reactions[idx]?.tags?.includes(opt) ? 'selected' : ''
                            }`}
                            onClick={() => {
                              if (opt === 'Lainnya') {
                                setCustomTag(''); // buka input
                              } else {
                                handleTagSelect(idx, opt);
                              }
                            }}
                          >
                            {opt} {reactions[idx]?.tags?.includes(opt) && '✓'}
                          </div>
                        ))}

                        {/* Custom tag input */}
                        {customTag !== undefined && (
                          <div className="custom-tag-input">
                            <input
                              type="text"
                              placeholder="Tambahkan tag lain..."
                              value={customTag}
                              onChange={(e) => setCustomTag(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button onClick={() => handleCustomTagSubmit(idx)}>
                              Tambah
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Display selected tags */}
              {msg.role === 'bot' && reactions[idx]?.tags?.length > 0 && (
                <div className="selected-tags">
                  {reactions[idx].tags.map((tag, i) => (
                    <span key={i} className="tag-badge">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DialogViewer;