import { useEffect, useState } from 'react';
import type { Document } from '../types';
import { getAllDocuments, deleteDocument, getFileUrl } from '../services/ocrService';

export default function HistoryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadDocuments(); }, []);

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
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Results History</h1>
        <p style={subtitleStyle}>All processed documents and their OCR results</p>
      </div>

      {loading && (
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          <p style={{ color: '#7a5249', marginTop: '1rem' }}>Loading documents...</p>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 16, color: '#7a5249' }}>No documents yet.</p>
          <p style={{ fontSize: 14, color: '#999', marginTop: '0.5rem' }}>Upload a document to get started.</p>
        </div>
      )}

      <div style={{ width: '100%' }}>
        {documents.map(doc => (
          <div key={doc.id} style={cardStyle} className="fade-in">

            {/* Card header */}
            <div style={cardHeaderStyle}>
              <div style={docInfoStyle}>
                <div style={docIconStyle}>{doc.fileType.replace('.', '').toUpperCase()}</div>
                <div>
                  <div style={fileNameStyle}>{doc.fileName}</div>
                  <div style={metaStyle}>
                    {new Date(doc.uploadedAt).toLocaleString()} —
                    {(doc.fileSizeBytes / 1024).toFixed(1)} KB —
                    {doc.resultCount} result(s)
                  </div>
                </div>
              </div>

              <div style={actionsStyle}>
                <span style={statusBadge(doc.status)}>{doc.status}</span>
                <button
                  style={outlineBtn}
                  onClick={() => setPreviewId(previewId === doc.id ? null : doc.id)}
                >
                  {previewId === doc.id ? 'Hide Preview' : 'Preview File'}
                </button>
                <button
                  style={outlineBtn}
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                >
                  {expandedId === doc.id ? 'Hide Results' : 'View Results'}
                </button>
                <button
                  style={deleteBtn}
                  onClick={() => handleDelete(doc.id, doc.fileName)}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* File preview */}
            {previewId === doc.id && (
              <div style={previewContainerStyle} className="fade-in">
                <hr style={{ border: 'none', borderTop: '1px solid #dde8dd', margin: '1rem 0' }} />
                {doc.fileType === '.pdf' ? (
                  <iframe
                    src={getFileUrl(doc.id)}
                    style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }}
                    title={doc.fileName}
                  />
                ) : (
                  <img
                    src={getFileUrl(doc.id)}
                    alt={doc.fileName}
                    style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, display: 'block', margin: '0 auto' }}
                  />
                )}
              </div>
            )}

            {/* OCR results */}
            {expandedId === doc.id && (
              <DocumentResults docId={doc.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentResults({ docId }: { docId: string }) {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('raw');

  useEffect(() => {
    fetch(`https://localhost:7051/api/documents/${docId}`)
      .then(r => r.json())
      .then(setData);
  }, [docId]);

  if (!data) return <div style={{ padding: '1rem', color: '#888' }}>Loading results...</div>;

  const results = data.ocrResults ?? [];

  if (results.length === 0)
    return <div style={{ padding: '1rem', color: '#888' }}>No OCR results found for this document.</div>;

  return (
    <div style={{ marginTop: '1rem' }} className="fade-in">
      <hr style={{ border: 'none', borderTop: '1px solid #dde8dd', marginBottom: '1rem' }} />
      <h4 style={{ color: '#553832', marginBottom: '1rem', fontSize: 14 }}>OCR Results</h4>
      {results.map((result: any, i: number) => (
        <div key={i} style={resultCardStyle}>
          <div style={resultHeaderStyle}>
            <span style={pipelineBadge(result.pipelineType)}>{result.pipelineType}</span>
            <span style={timeBadgeStyle}>{result.processingTimeMs} ms</span>
            <span style={{ fontSize: 12, color: '#999' }}>
              {new Date(result.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Tabs */}
          <div style={tabRowStyle}>
            {['raw', 'structured', 'simplified'].map(tab => (
              <button
                key={tab}
                style={tabBtnStyle(`${result.id}-${tab}` === `${result.id}-${activeTab}`
                  ? true
                  : activeTab === tab && results.indexOf(result) === 0)}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'raw' && (
            <pre style={preStyle}>{result.rawText || 'No raw text'}</pre>
          )}
          {activeTab === 'structured' && (
            <pre style={preStyle}>
              {result.structuredJson
                ? (() => { try { return JSON.stringify(JSON.parse(result.structuredJson), null, 2); } catch { return result.structuredJson; } })()
                : 'No structured data available'}
            </pre>
          )}
          {activeTab === 'simplified' && (
            <div style={simplifiedStyle}>
              {result.simplifiedText || 'No simplified text available'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  padding: '2rem',
  background: '#f5faf5'
};

const headerStyle: React.CSSProperties = { marginBottom: '1.5rem' };

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: '#553832',
  marginBottom: '0.4rem'
};

const subtitleStyle: React.CSSProperties = {
  color: '#7a5249',
  fontSize: 15
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '3rem'
};

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '3px solid #dde8dd',
  borderTop: '3px solid #553832',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite'
};

const emptyStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #dde8dd',
  borderRadius: 10,
  padding: '3rem',
  textAlign: 'center'
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #dde8dd',
  borderRadius: 10,
  padding: '1.25rem',
  marginBottom: '1rem',
  boxShadow: '0 2px 8px rgba(85,56,50,0.06)'
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.75rem'
};

const docInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem'
};

const docIconStyle: React.CSSProperties = {
  background: '#A8D3A8',
  color: '#553832',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5
};

const fileNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#2a2a2a',
  fontSize: 15
};

const metaStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 2
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap'
};

const statusBadge = (status: string): React.CSSProperties => ({
  background: status === 'Done' ? '#d4ecd4' : status === 'Failed' ? '#fef2f2' : '#fef3c7',
  color: status === 'Done' ? '#2d6a2d' : status === 'Failed' ? '#dc2626' : '#92400e',
  borderRadius: 12,
  padding: '0.2rem 0.8rem',
  fontSize: 12,
  fontWeight: 500
});

const outlineBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #dde8dd',
  borderRadius: 6,
  padding: '0.3rem 0.8rem',
  cursor: 'pointer',
  fontSize: 13,
  color: '#553832'
};

const deleteBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  padding: '0.3rem 0.8rem',
  cursor: 'pointer',
  fontSize: 13,
  color: '#dc2626'
};

const previewContainerStyle: React.CSSProperties = {
  marginTop: '0.5rem'
};

const resultCardStyle: React.CSSProperties = {
  background: '#f5faf5',
  border: '1px solid #dde8dd',
  borderRadius: 8,
  padding: '1rem',
  marginBottom: '0.75rem'
};

const resultHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '0.75rem',
  flexWrap: 'wrap'
};

const pipelineBadge = (type: string): React.CSSProperties => ({
  background: type === 'Baseline' ? '#e5e7eb' : '#d4ecd4',
  color: type === 'Baseline' ? '#374151' : '#2d6a2d',
  borderRadius: 12,
  padding: '0.2rem 0.8rem',
  fontSize: 12,
  fontWeight: 600
});

const timeBadgeStyle: React.CSSProperties = {
  background: '#d4ecd4',
  color: '#2d6a2d',
  borderRadius: 12,
  padding: '0.2rem 0.8rem',
  fontSize: 12,
  fontWeight: 500
};

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  marginBottom: '0.75rem'
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#A8D3A8' : 'transparent',
  color: active ? '#553832' : '#888',
  border: 'none',
  borderRadius: 6,
  padding: '0.25rem 0.75rem',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: active ? 600 : 400
});

const preStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #dde8dd',
  padding: '0.75rem',
  borderRadius: 6,
  whiteSpace: 'pre-wrap',
  fontSize: 12,
  maxHeight: 300,
  overflowY: 'auto',
  margin: 0,
  lineHeight: 1.6
};

const simplifiedStyle: React.CSSProperties = {
  background: '#d4ecd4',
  border: '1px solid #A8D3A8',
  padding: '1rem',
  borderRadius: 6,
  fontSize: 14,
  lineHeight: 1.8,
  maxHeight: 300,
  overflowY: 'auto'
};