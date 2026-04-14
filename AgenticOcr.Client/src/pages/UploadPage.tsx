import { useState } from 'react';
import type { OcrResult } from '../types';
import { uploadDocument } from '../services/ocrService';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);

    if (selected) {
      setFileType(selected.type);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    } else {
      setPreview(null);
      setFileType('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadDocument(file);
      setResult(data);
    } catch {
      setError('Failed to process document. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <h2>Upload Document</h2>
      <p style={{ color: '#666' }}>Upload an image or PDF to extract text using baseline OCR</p>

      {/* Upload form */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Select file
            </label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleFileChange}
              style={fileInputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            style={buttonStyle(!file || loading)}
          >
            {loading ? 'Processing...' : 'Extract Text'}
          </button>
        </form>
      </div>

      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* Side by side preview and result */}
      {preview && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>

          {/* Left — file preview */}
          <div style={cardStyle}>
            <h5 style={sectionTitleStyle}>Document Preview</h5>
            <p style={subtitleStyle}>{file?.name}</p>
            <div style={previewContainerStyle}>
              {fileType === 'application/pdf' ? (
                <iframe
                  src={preview}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF preview"
                />
              ) : (
                <img
                  src={preview}
                  alt="Document preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
          </div>

          {/* Right — extraction result */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={sectionTitleStyle}>Extracted Text</h5>
              {result && (
                <span style={badgeStyle}>{result.processingTimeMs} ms</span>
              )}
            </div>

            {loading && (
              <div style={loadingStyle}>
                <div style={spinnerStyle} />
                <p style={{ color: '#666', marginTop: '1rem' }}>Processing document...</p>
              </div>
            )}

            {!loading && !result && (
              <div style={placeholderStyle}>
                <p style={{ color: '#9ca3af' }}>
                  Extracted text will appear here after you click Extract Text
                </p>
              </div>
            )}

            {result && (
              <>
                <p style={{ fontSize: 13, color: '#666', marginBottom: '0.75rem' }}>
                  <strong>Document ID:</strong> <code style={{ fontSize: 11 }}>{result.documentId}</code>
                </p>
                <pre style={preStyle}>{result.extractedText}</pre>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '0'
};

const fileInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? '#aaa' : '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1.5rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 15,
  whiteSpace: 'nowrap'
});

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 0.25rem 0',
  fontSize: 15,
  fontWeight: 600
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: '0.75rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const previewContainerStyle: React.CSSProperties = {
  width: '100%',
  height: 480,
  background: '#f8f8f8',
  borderRadius: 6,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const preStyle: React.CSSProperties = {
  background: '#f8f8f8',
  padding: '1rem',
  borderRadius: 6,
  whiteSpace: 'pre-wrap',
  fontSize: 13,
  height: 420,
  overflowY: 'auto',
  margin: 0
};

const placeholderStyle: React.CSSProperties = {
  height: 420,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f9fafb',
  borderRadius: 6,
  border: '2px dashed #e5e7eb',
  textAlign: 'center',
  padding: '1rem'
};

const loadingStyle: React.CSSProperties = {
  height: 420,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
};

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '3px solid #e5e7eb',
  borderTop: '3px solid #2563eb',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite'
};

const badgeStyle: React.CSSProperties = {
  background: '#dcfce7',
  color: '#166534',
  borderRadius: 12,
  padding: '0.2rem 0.8rem',
  fontSize: 13,
  fontWeight: 500
};

const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  color: '#dc2626',
  borderRadius: 8,
  padding: '1rem',
  marginBottom: '1rem'
};