import React, { useState, useEffect } from 'react';
import { getDialogs, uploadDialog, fetchEvaluation } from '../services/api';
import './DialogList.css';

function DialogList({ onSelectDialog, selectedDialogId }) {
  const [dialogs, setDialogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDialogs();
  }, []);

  const loadDialogs = async () => {
    try {
      const data = await getDialogs();

      // Check for evaluations for each dialog
      const dialogsWithStatus = await Promise.all(
        data.map(async (dialog) => {
          const evaluation = await fetchEvaluation(dialog.dialog_id);
          return {
            ...dialog,
            status: evaluation ? 'reviewed' : 'unseen', // Mark as reviewed if evaluation exists
          };
        })
      );

      setDialogs(dialogsWithStatus);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadDialog(file);
      alert('Upload berhasil!');
      loadDialogs(); // Reload dialogs
    } catch (error) {
      alert('Upload gagal: ' + error);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  const filteredDialogs = dialogs.filter(d => 
    d.dialog_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reviewedCount = filteredDialogs.filter(d => d.status === 'reviewed').length;

  if (loading) {
    return (
      <div className="dialog-list">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dialog-list">
      {/* HEADER */}
      <div className="dialog-list-header">
        <h3>Evaluasi Dialog</h3>
        <p>Tinjau & anotasi percakapan</p>
      </div>

      {/* SEARCH BOX */}
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Cari percakapan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* DIALOG LIST */}
      <div className="dialog-items">
        {filteredDialogs.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada dialog. Upload file JSON untuk mulai!</p>
          </div>
        ) : (
          filteredDialogs.map((dialog) => (
            <div
              key={dialog.id}
              className={`dialog-item ${selectedDialogId === dialog.dialog_id ? 'active' : ''}`}
              onClick={() => onSelectDialog(dialog.dialog_id)}
            >
              <div className="dialog-item-header">
                <span className="dialog-id">{dialog.dialog_id}</span>
                <span className={`status-badge ${dialog.status === 'reviewed' ? 'reviewed' : 'unseen'}`}>
                  {dialog.status === 'reviewed' ? 'Reviewed' : 'Unseen'}
                </span>
              </div>
              <div className="dialog-item-info">
                <p className="dialog-topic">{dialog.topic}</p>
                <p className="dialog-emotion">
                  {dialog.messages?.length || 0} giliran • {dialog.emotion}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="dialog-list-footer">
        <input 
          type="file" 
          accept=".json"
          onChange={handleFileUpload}
          id="file-upload-input"
          style={{ display: 'none' }}
        />
        <label 
          htmlFor="file-upload-input" 
          className={`btn-upload-new ${uploading ? 'disabled' : ''}`}
        >
          <span className="upload-icon">📤</span>
          {uploading ? 'Uploading...' : 'Upload Dialog Baru'}
        </label>
        
        <div className="format-info">
          <span>Format: JSON</span>
          <button className="format-link" onClick={() => {
            alert('Contoh format JSON:\n{\n  "ID": "train_0",\n  "jenis_emosi": "marah",\n  "topik": "Masalah dengan Orang Tua",\n  ...\n}');
          }}>
            Lihat contoh format
          </button>
        </div>

        <div className="progress-info">
          <span className="progress-label">Progress</span>
          <div className="progress-count">
            {reviewedCount} / {filteredDialogs.length} ditinjau
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${filteredDialogs.length > 0 ? (reviewedCount / filteredDialogs.length) * 100 : 0}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DialogList;
