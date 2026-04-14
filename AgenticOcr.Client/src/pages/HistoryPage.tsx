import { useEffect, useState } from 'react';
import type { Document } from '../types';
import { getAllDocuments, deleteDocument, getFileUrl } from '../services/ocrService';

export default function HistoryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await getAllDocuments();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    await deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
      <h2>Documents</h2>
      <p style={{ color: '#666' }}>All uploaded documents and their OCR results</p>

      {loading && <p>Loading...</p>}

      {!loading && documents.length === 0 && (
        <div style={emptyStyle}>No documents yet. Upload one first.</div>
      )}

      {documents.map(doc => (
        <div key={doc.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{doc.fileName}</strong>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {new Date(doc.uploadedAt).toLocaleString()} —
                {(doc.fileSizeBytes / 1024).toFixed(1)} KB —
                {doc.resultCount} result(s)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={statusBadge(doc.status)}>{doc.status}</span>
              <button
                style={outlineButton}
                onClick={() => setPreviewId(previewId === doc.id ? null : doc.id)}
              >
                {previewId === doc.id ? 'Hide Preview' : 'Preview'}
              </button>
              <button
                style={deleteButton}
                onClick={() => handleDelete(doc.id, doc.fileName)}
              >
                Delete
              </button>
            </div>
          </div>

          {previewId === doc.id && (
            <div style={{ marginTop: '1rem' }}>
              <hr />
              {doc.fileType === '.pdf' ? (
                <iframe
                  src={getFileUrl(doc.id)}
                  style={{ width: '100%', height: 500, border: 'none', borderRadius: 6 }}
                  title={doc.fileName}
                />
              ) : (
                <img
                  src={getFileUrl(doc.id)}
                  alt={doc.fileName}
                  style={{ maxWidth: '100%', borderRadius: 6 }}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: '1.25rem',
  marginBottom: '1rem'
};

const emptyStyle: React.CSSProperties = {
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1d4ed8',
  borderRadius: 8,
  padding: '1rem'
};

const statusBadge = (status: string): React.CSSProperties => ({
  background: status === 'Done' ? '#dcfce7' : '#fef9c3',
  color: status === 'Done' ? '#166534' : '#854d0e',
  borderRadius: 12,
  padding: '0.2rem 0.8rem',
  fontSize: 12,
  fontWeight: 500
});

const outlineButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.3rem 0.8rem',
  cursor: 'pointer',
  fontSize: 13
};

const deleteButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #fca5a5',
  color: '#dc2626',
  borderRadius: 6,
  padding: '0.3rem 0.8rem',
  cursor: 'pointer',
  fontSize: 13
};