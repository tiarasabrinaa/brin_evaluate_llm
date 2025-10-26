// /Users/tiarasabrina/Documents/PROJECT/brin_evaluate_chatbot/frontend/src/services/api.js

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// ==============================
// 🔍 Axios Interceptors (Logging)
// ==============================
axios.interceptors.request.use(
  (config) => {
    console.log('➡️ API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('⚠️ Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==============================
// 📤 Upload Dialog JSON
// ==============================
export const uploadDialog = async (file) => {
  try {
    if (!file) throw new Error('File tidak boleh kosong');
    if (!file.name.endsWith('.json')) throw new Error('File harus berformat JSON');

    const text = await file.text();
    let jsonData;
    try {
      jsonData = JSON.parse(text);
      if (!jsonData.dialogue || !Array.isArray(jsonData.dialogue)) {
        throw new Error('JSON harus berisi array "dialogue"');
      }
    } catch (err) {
      throw new Error(`JSON tidak valid: ${err.message}`);
    }

    const blob = new Blob([text], { type: 'application/json' });
    const uploadFile = new File([blob], file.name, { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', uploadFile);

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Upload gagal');
    } else if (error.request) {
      throw new Error('Tidak dapat terhubung ke server');
    } else {
      throw new Error(error.message);
    }
  }
};

// ==============================
// 💬 Get Dialog List & Details
// ==============================
export const getDialogs = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/dialogs`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Gagal mengambil daftar dialog');
  }
};

export const getDialog = async (dialogId) => {
  try {
    const encodedId = encodeURIComponent(dialogId);
    const response = await axios.get(`${API_BASE_URL}/dialogs/${encodedId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error('Dialog tidak ditemukan');
    throw new Error(error.response?.data?.detail || 'Gagal mengambil detail dialog');
  }
};

// ==============================
// 🧠 Evaluation Endpoints
// ==============================
export const submitEvaluation = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/evaluate`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Gagal menyimpan evaluasi');
  }
};

export const fetchEvaluation = async (dialogId) => {
  try {
    const encodedId = encodeURIComponent(dialogId);
    const response = await axios.get(`${API_BASE_URL}/evaluate/${encodedId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new Error('Gagal mengambil evaluasi');
  }
};

// ==============================
// 👍👎 Message Feedback Endpoints
// ==============================

export const submitFeedback = async (dialogId, messageIndex, rating = null, tags = []) => {
  try {
    // ✅ Kirim sebagai JSON body, BUKAN query params
    const payload = {
      dialog_id: dialogId,
      message_index: messageIndex,
      rating: rating,
      tags: tags
    };

    console.log('📤 Sending feedback payload:', payload);

    const response = await axios.post(`${API_BASE_URL}/feedback`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('✅ Feedback response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ submitFeedback error:', error);
    throw new Error(error.response?.data?.detail || 'Gagal menyimpan feedback');
  }
};

// Ambil semua feedback per dialog
export const fetchFeedback = async (dialogId) => {
  try {
    const encodedId = encodeURIComponent(dialogId);
    const response = await axios.get(`${API_BASE_URL}/feedback/${encodedId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw new Error('Gagal mengambil feedback');
  }
};

// ==============================
// 📥 Export Endpoints
// ==============================

export const exportDialogJSON = async (dialogId) => {
  try {
    const encodedId = encodeURIComponent(dialogId);
    const response = await axios.get(`${API_BASE_URL}/export/${encodedId}/json`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dialogId.replace(/[^a-z0-9]/gi, '_')}_export.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Gagal export JSON');
  }
};

export const exportDialogCSV = async (dialogId) => {
  try {
    const encodedId = encodeURIComponent(dialogId);
    const response = await axios.get(`${API_BASE_URL}/export/${encodedId}/csv`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dialogId.replace(/[^a-z0-9]/gi, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Gagal export CSV');
  }
};