import React, { useState, useEffect } from 'react';
import DialogList from '../components/DialogList';
import DialogViewer from '../components/DialogViewer';
import EvaluationForm from '../components/EvaluationForm';
import { getDialogs, getDialog } from '../services/api';
import './EvaluationPage.css';

function EvaluationPage() {
  const [dialogs, setDialogs] = useState([]);
  const [selectedDialogId, setSelectedDialogId] = useState(null);
  const [currentDialog, setCurrentDialog] = useState(null);
  const [reactions, setReactions] = useState({}); // ✅ Tambah state reactions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dialogs on mount
  useEffect(() => {
    loadDialogs();
  }, []);

  // Load specific dialog when selected
  useEffect(() => {
    if (selectedDialogId) {
      loadDialog(selectedDialogId);
      setReactions({}); // ✅ Reset reactions saat ganti dialog
    }
  }, [selectedDialogId]);

  const loadDialogs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching dialogs from backend...');
      
      const data = await getDialogs();
      console.log('Received dialogs:', data);

      const transformedDialogs = data.map(dialog => ({
        ...dialog,
        status: dialog.status || 'Pending',
        messages: dialog.messages || []
      }));

      setDialogs(transformedDialogs);

      // Auto-select first dialog if none selected
      if (transformedDialogs.length > 0 && !selectedDialogId) {
        setSelectedDialogId(transformedDialogs[0].dialog_id);
      }
    } catch (err) {
      console.error('❌ Error loading dialogs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDialog = async (dialogId) => {
    try {
      const data = await getDialog(dialogId);
      setCurrentDialog(data);
    } catch (err) {
      console.error('Error loading dialog:', err);
      setError(err.message);
    }
  };

  const handleUploadSuccess = (result) => {
    console.log('Upload successful, refreshing dialogs...', result);
    loadDialogs();
    if (result.dialog_id) {
      setSelectedDialogId(result.dialog_id);
    }
  };

  const handleEvaluationSubmit = () => {
    console.log('✅ Evaluation submitted');
    loadDialogs();

    // Move to next pending dialog
    const currentIndex = dialogs.findIndex(d => d.dialog_id === selectedDialogId);
    const nextPending = dialogs.slice(currentIndex + 1).find(d => d.status === 'Pending');
    if (nextPending) {
      setSelectedDialogId(nextPending.dialog_id);
    }
  };

  const handleSkip = () => {
    const currentIndex = dialogs.findIndex(d => d.dialog_id === selectedDialogId);
    if (currentIndex < dialogs.length - 1) {
      setSelectedDialogId(dialogs[currentIndex + 1].dialog_id);
    } else if (dialogs.length > 0) {
      setSelectedDialogId(dialogs[0].dialog_id);
    }
  };

  if (loading && dialogs.length === 0) {
    return (
      <div className="evaluation-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading dialogs...</p>
        </div>
      </div>
    );
  }

  if (error && dialogs.length === 0) {
    return (
      <div className="evaluation-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadDialogs} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (dialogs.length === 0) {
    return (
      <div className="evaluation-page">
        <DialogList
          dialogs={[]}
          selectedDialog={null}
          onSelectDialog={() => {}}
          onUploadSuccess={handleUploadSuccess}
        />
        <div className="empty-state">
          <h2>Tidak ada dialog</h2>
          <p>Upload dialog JSON untuk memulai evaluasi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-page">
      <DialogList
        dialogs={dialogs}
        selectedDialog={selectedDialogId}
        onSelectDialog={setSelectedDialogId}
        onUploadSuccess={handleUploadSuccess}
      />

      {currentDialog ? (
        <>
          <DialogViewer 
            dialog={currentDialog}
            onReactionsChange={setReactions} // ✅ Pass callback
          />
          <EvaluationForm
            dialogId={selectedDialogId}
            reactions={reactions} // ✅ Pass reactions
            onEvaluationSubmit={handleEvaluationSubmit}
            onSkip={handleSkip}
          />
        </>
      ) : (
        <div className="loading-dialog">
          <div className="spinner-large"></div>
          <p>Loading dialog...</p>
        </div>
      )}
    </div>
  );
}

export default EvaluationPage;