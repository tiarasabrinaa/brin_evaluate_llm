import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDialog } from '../services/api';
import './HomePage.css';

function HomePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Pilih file JSON dulu!');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadDialog(file);
      alert('Upload berhasil: ' + result.dialog_id);
      navigate('/evaluate');
    } catch (error) {
      alert('Upload gagal: ' + error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="home-page">
      <div className="upload-card">
        <h1>Dialog Evaluator</h1>
        <p>Upload file JSON untuk mulai evaluasi</p>
        
        <div className="upload-area">
          <input 
            type="file" 
            accept=".json"
            onChange={handleFileChange}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="upload-label">
            {file ? file.name : 'Pilih file JSON'}
          </label>
        </div>

        <button 
          className="btn-upload" 
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? 'Uploading...' : 'Upload Dialog'}
        </button>

        <button 
          className="btn-view" 
          onClick={() => navigate('/evaluate')}
        >
          Lihat Dialog yang Ada
        </button>
      </div>
    </div>
  );
}

export default HomePage;