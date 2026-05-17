import { useState } from 'react';
import type { OcrResult } from '../types';
import { uploadDocument } from '../services/ocrService';

type PipelineType = 'baseline' | 'agentic' | 'both' | 'googlevision' | 'all';

interface AgenticResult {
  documentId: string;
  fileName: string;
  rawText: string;
  structuredJson: string;
  simplifiedText: string;
  globalConfidence: number;
  reviewRequired: boolean;
  processingTimeMs: number;
  auditLog: string[];
}

interface MultiResult {
  documentId: string;
  fileName: string;
  results: Array<{
    pipeline: string;
    rawText?: string;
    processingTimeMs?: number;
    simplifiedText?: string;
    globalConfidence?: number;
    reviewRequired?: boolean;
    error?: string;
  }>;
}

const API = 'https://localhost:7051/api';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState('');
  const [pipeline, setPipeline] = useState<PipelineType>('baseline');
  const [baselineResult, setBaselineResult] = useState<OcrResult | null>(null);
  const [agenticResult, setAgenticResult] = useState<AgenticResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState <'raw' | 'structured' | 'simplified' | 'audit'>('raw');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setBaselineResult(null);
    setAgenticResult(null);
    setMultiResult(null);
    setError(null);
    if (selected) {
      setFileType(selected.type);
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  };

  const playNotificationSound = () => {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setBaselineResult(null);
    setAgenticResult(null);
    setMultiResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (pipeline === 'baseline') {
        const data = await uploadDocument(file);
        setBaselineResult(data);

      } else if (pipeline === 'agentic') {
        const res = await fetch(`${API}/AgenticOcr/upload`,
          { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        setAgenticResult(await res.json());

      } else if (pipeline === 'googlevision') {
        const res = await fetch(`${API}/GoogleVision/upload`,
          { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Display as a simple result
        setMultiResult({
          documentId: data.documentId,
          fileName: data.fileName,
          results: [{
            pipeline: 'Google Vision',
            rawText: data.rawText,
            processingTimeMs: data.processingTimeMs
          }]
        });

      } else if (pipeline === 'both') {
        const res = await fetch(`${API}/BaselineOcr/upload-both`,
          { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        setMultiResult(await res.json());

      } else {
        // All three pipelines
        const res = await fetch(`${API}/GoogleVision/upload-all`,
          { method: 'POST', body: formData });
        if (!res.ok) throw new Error(await res.text());
        setMultiResult(await res.json());
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      playNotificationSound();
      setLoading(false);
    }
  };

  const confidence = agenticResult?.globalConfidence ?? null;
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Document OCR Extraction</h1>
        <p style={subtitleStyle}>
          Upload a healthcare document and extract text using
          Baseline, Google Vision, or Agentic OCR
        </p>
      </div>

      {/* Upload card */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div style={formRowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Select document</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
                style={fileInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pipeline</label>
              <div style={toggleGroupStyle}>
                {([
                  ['baseline', 'Baseline'],
                  ['googlevision', 'Google Vision'],
                  ['agentic', 'Agentic'],
                  ['both', 'Baseline + Agentic'],
                  ['all', 'All Three']
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    style={toggleBtnStyle(pipeline === key)}
                    onClick={() => setPipeline(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                disabled={!file || loading}
                style={submitBtnStyle(!file || loading)}
              >
                {loading ? 'Processing...' : 'Extract Text'}
              </button>
            </div>
          </div>

          <div style={pipelineInfoStyle(pipeline)}>
            {pipeline === 'baseline' &&
              'Tesseract OCR — fast local character recognition.'}
            {pipeline === 'googlevision' &&
              'Google Vision API — cloud OCR with layout understanding.'}
            {pipeline === 'agentic' &&
              'Gemini multi-agent pipeline — structured extraction with clinical validation.'}
            {pipeline === 'both' &&
              'Baseline + Agentic on the same document for comparison.'}
            {pipeline === 'all' &&
              'All three pipelines on the same document — full benchmark comparison.'}
          </div>
        </form>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Multi-pipeline result */}
      {multiResult && (
        <div style={cardStyle}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '1rem'
          }}>
            <div>
              <h3 style={sectionTitleStyle}>
                {pipeline === 'all'
                  ? 'All Three Pipelines Completed'
                  : pipeline === 'both'
                  ? 'Both Pipelines Completed'
                  : 'Google Vision Result'}
              </h3>
              <p style={{ fontSize: 13, color: '#7a5249', marginTop: '0.25rem' }}>
                Use this Document ID on the Comparison page to evaluate
                results against ground truth.
              </p>
            </div>
            <div style={docIdBoxStyle}>
              <div style={{ fontSize: 11, color: '#7a5249', marginBottom: 2 }}>
                Document ID
              </div>
              <code style={{ fontSize: 11, color: '#553832',
                wordBreak: 'break-all' }}>
                {multiResult.documentId}
              </code>
              <button
                style={copyBtnStyle}
                onClick={() => navigator.clipboard.writeText(
                  multiResult.documentId)}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Results grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${multiResult.results.length}, 1fr)`,
            gap: '1rem'
          }}>
            {multiResult.results.map((r, i) => (
              <div key={i} style={resultPanelStyle}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '0.75rem'
                }}>
                  <span style={pipelineBadgeStyle(r.pipeline)}>
                    {r.pipeline}
                  </span>
                  {r.processingTimeMs && (
                    <span style={timeBadgeStyle}>
                      {r.processingTimeMs > 1000
                        ? `${(r.processingTimeMs / 1000).toFixed(1)}s`
                        : `${r.processingTimeMs}ms`}
                    </span>
                  )}
                </div>

                {r.globalConfidence !== undefined && (
                  <div style={{
                    marginBottom: '0.5rem',
                    fontSize: 12,
                    color: r.globalConfidence > 0.7 ? '#2d6a2d' : '#92400e'
                  }}>
                    Confidence: {pct(r.globalConfidence)}
                    {r.reviewRequired &&
                      <span style={reviewBadgeStyle}> Review required</span>}
                  </div>
                )}

                {r.error ? (
                  <div style={{ color: '#dc2626', fontSize: 13 }}>
                    {r.error}
                  </div>
                ) : (
                  <pre style={preStyle}>
                    {r.rawText || 'No text extracted'}
                  </pre>
                )}

                {r.simplifiedText && (
                  <div style={simplifiedBoxStyle}>
                    <p style={{ fontSize: 11, color: '#553832',
                      fontWeight: 600, marginBottom: '0.25rem' }}>
                      Simplified:
                    </p>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {r.simplifiedText}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single pipeline preview + result */}
      {preview && !multiResult && (
        <div style={splitStyle}>
          {/* Left — preview */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Document Preview</h3>
            <p style={fileNameStyle}>{file?.name}</p>
            <div style={previewBoxStyle}>
              {fileType === 'application/pdf' ? (
                <iframe src={preview}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="preview" />
              ) : (
                <img src={preview} alt="preview"
                  style={{ width: '100%', height: '100%',
                    objectFit: 'contain' }} />
              )}
            </div>
          </div>

          {/* Right — result */}
          <div style={cardStyle}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem'
            }}>
              <h3 style={sectionTitleStyle}>Extraction Result</h3>
              {(baselineResult || agenticResult) && (
                <div style={{ display: 'flex', gap: '0.5rem',
                  alignItems: 'center' }}>
                  {confidence !== null && (
                    <span style={confidenceBadge(confidence)}>
                      {pct(confidence)} confidence
                    </span>
                  )}
                  <span style={timeBadgeStyle}>
                    {baselineResult?.processingTimeMs
                      ?? agenticResult?.processingTimeMs}ms
                  </span>
                  {agenticResult?.reviewRequired && (
                    <span style={reviewBadgeStyle}>Review required</span>
                  )}
                </div>
              )}
            </div>

            {/* Document ID */}
            {(baselineResult || agenticResult) && (
              <div style={{ ...docIdBoxStyle, marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: '#7a5249', marginBottom: 2 }}>
                  Document ID
                </div>
                <code style={{ fontSize: 11, color: '#553832',
                  wordBreak: 'break-all' }}>
                  {baselineResult?.documentId ?? agenticResult?.documentId}
                </code>
                <button
                  style={copyBtnStyle}
                  onClick={() => navigator.clipboard.writeText(
                    baselineResult?.documentId ??
                    agenticResult?.documentId ?? '')}
                >
                  Copy
                </button>
              </div>
            )}

            {/* Tabs for agentic */}
            {agenticResult && (
              <div style={tabRowStyle}>
                {(['raw', 'structured', 'simplified', 'audit'] as const)
                  .map(tab => (
                    <button key={tab}
                      style={tabBtnStyle(activeTab === tab)}
                      onClick={() => setActiveTab(tab)}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
              </div>
            )}

            {loading && (
              <div style={loadingBoxStyle}>
                <div style={spinnerStyle} />
                <p style={{ color: '#666', marginTop: '1rem' }}>
                  Processing document...
                </p>
              </div>
            )}

            {!loading && !baselineResult && !agenticResult && (
              <div style={placeholderStyle}>
                <p style={{ color: '#9ca3af' }}>
                  Results will appear here after extraction
                </p>
              </div>
            )}

            {baselineResult && (
              <pre style={preStyle}>{baselineResult.extractedText}</pre>
            )}

            {agenticResult && activeTab === 'raw' && (
              <pre style={preStyle}>
                {agenticResult.rawText || 'No raw text extracted'}
              </pre>
            )}
            {agenticResult && activeTab === 'structured' && (
              <pre style={preStyle}>
                {(() => {
                  try {
                    return JSON.stringify(
                      JSON.parse(agenticResult.structuredJson), null, 2);
                  } catch { return agenticResult.structuredJson; }
                })()}
              </pre>
            )}
            {agenticResult && activeTab === 'simplified' && (
              <div style={simplifiedStyle}>
                <p style={{ fontSize: 13, color: '#553832',
                  marginBottom: '0.75rem', fontWeight: 600 }}>
                  Simplified for patient:
                </p>
                <p style={{ lineHeight: 1.8, fontSize: 15 }}>
                  {agenticResult.simplifiedText ||
                    'No simplified text available'}
                </p>
              </div>
            )}
            {agenticResult && activeTab === 'audit' && (
              <div style={preStyle}>
                {agenticResult.auditLog.map((entry, i) => (
                  <div key={i} style={{
                    padding: '2px 0',
                    borderBottom: '1px solid #eee', fontSize: 12
                  }}>
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview below when multi result shown */}
      {preview && multiResult && (
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Document Preview</h3>
          <p style={fileNameStyle}>{file?.name}</p>
          <div style={{ ...previewBoxStyle, height: 280 }}>
            {fileType === 'application/pdf' ? (
              <iframe src={preview}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="preview" />
            ) : (
              <img src={preview} alt="preview"
                style={{ width: '100%', height: '100%',
                  objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  width: '100%', minHeight: '100vh',
  padding: '2rem', background: '#f5faf5'
};
const headerStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const titleStyle: React.CSSProperties = {
  fontSize: 26, fontWeight: 700,
  color: '#553832', marginBottom: '0.4rem'
};
const subtitleStyle: React.CSSProperties = {
  color: '#7a5249', fontSize: 15
};
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #dde8dd',
  borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem',
  boxShadow: '0 2px 8px rgba(85,56,50,0.06)'
};
const formRowStyle: React.CSSProperties = {
  display: 'flex', gap: '1rem',
  alignItems: 'flex-end', flexWrap: 'wrap'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13,
  fontWeight: 500, color: '#553832', marginBottom: '0.4rem'
};
const fileInputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem',
  border: '1px solid #dde8dd', borderRadius: 8,
  fontSize: 14, background: '#f5faf5', color: '#2a2a2a'
};
const toggleGroupStyle: React.CSSProperties = {
  display: 'flex', border: '1px solid #dde8dd',
  borderRadius: 8, overflow: 'hidden'
};
const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.5rem 0.85rem',
  background: active ? '#A8D3A8' : '#fff',
  color: active ? '#553832' : '#888',
  border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: active ? 600 : 400,
  transition: 'all 0.2s', whiteSpace: 'nowrap'
});
const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? '#ccc' : '#553832',
  color: '#fff', border: 'none', borderRadius: 8,
  padding: '0.6rem 1.8rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 15, fontWeight: 600
});
const pipelineInfoStyle = (p: PipelineType): React.CSSProperties => ({
  marginTop: '0.75rem', padding: '0.6rem 1rem',
  background: p === 'agentic' ? '#d4ecd4'
    : p === 'googlevision' ? '#dbeafe'
    : p === 'all' ? '#ede9fe'
    : p === 'both' ? '#eff6ff'
    : '#f0f0f0',
  borderRadius: 6, fontSize: 13,
  color: p === 'agentic' ? '#2d6a2d'
    : p === 'googlevision' ? '#1d4ed8'
    : p === 'all' ? '#6d28d9'
    : p === 'both' ? '#1d4ed8'
    : '#666'
});
const errorStyle: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fca5a5',
  color: '#dc2626', borderRadius: 8,
  padding: '1rem', marginBottom: '1.5rem', fontSize: 14
};
const splitStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem', width: '100%'
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600,
  color: '#553832', marginBottom: '0.25rem'
};
const fileNameStyle: React.CSSProperties = {
  fontSize: 12, color: '#888', marginBottom: '0.75rem',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
};
const previewBoxStyle: React.CSSProperties = {
  width: '100%', height: 460, background: '#f5faf5',
  borderRadius: 8, overflow: 'hidden',
  display: 'flex', alignItems: 'center',
  justifyContent: 'center', border: '1px solid #dde8dd'
};
const docIdBoxStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '0.75rem 1rem',
  minWidth: 260, maxWidth: 380
};
const copyBtnStyle: React.CSSProperties = {
  display: 'block', marginTop: '0.4rem',
  background: '#A8D3A8', color: '#553832',
  border: 'none', borderRadius: 6,
  padding: '0.25rem 0.75rem',
  cursor: 'pointer', fontSize: 12, fontWeight: 600
};
const tabRowStyle: React.CSSProperties = {
  display: 'flex', gap: '0.25rem',
  marginBottom: '1rem', borderBottom: '2px solid #dde8dd',
  paddingBottom: '0.5rem'
};
const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#A8D3A8' : 'transparent',
  color: active ? '#553832' : '#888',
  border: 'none', borderRadius: 6,
  padding: '0.3rem 0.9rem', cursor: 'pointer',
  fontSize: 13, fontWeight: active ? 600 : 400
});
const preStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  padding: '1rem', borderRadius: 8,
  whiteSpace: 'pre-wrap', fontSize: 13,
  height: 320, overflowY: 'auto', margin: 0, lineHeight: 1.6
};
const resultPanelStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '1rem'
};
const simplifiedStyle: React.CSSProperties = {
  background: '#d4ecd4', border: '1px solid #A8D3A8',
  padding: '1.25rem', borderRadius: 8,
  height: 320, overflowY: 'auto'
};
const simplifiedBoxStyle: React.CSSProperties = {
  marginTop: '0.75rem', background: '#d4ecd4',
  border: '1px solid #A8D3A8', borderRadius: 6, padding: '0.75rem'
};
const placeholderStyle: React.CSSProperties = {
  height: 320, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: '#f5faf5', borderRadius: 8,
  border: '2px dashed #dde8dd', textAlign: 'center'
};
const loadingBoxStyle: React.CSSProperties = {
  height: 320, display: 'flex',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
};
const spinnerStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: '3px solid #dde8dd', borderTop: '3px solid #553832',
  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
};
const timeBadgeStyle: React.CSSProperties = {
  background: '#d4ecd4', color: '#2d6a2d',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 500
};
const reviewBadgeStyle: React.CSSProperties = {
  background: '#fef3c7', color: '#92400e',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 500
};
const confidenceBadge = (score: number): React.CSSProperties => ({
  background: score > 0.7 ? '#d4ecd4' : score > 0.4 ? '#fef3c7' : '#fef2f2',
  color: score > 0.7 ? '#2d6a2d' : score > 0.4 ? '#92400e' : '#dc2626',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 500
});
const pipelineBadgeStyle = (pipeline: string): React.CSSProperties => ({
  background: pipeline.includes('Agentic') ? '#d4ecd4'
    : pipeline.includes('Vision') ? '#dbeafe' : '#e5e7eb',
  color: pipeline.includes('Agentic') ? '#2d6a2d'
    : pipeline.includes('Vision') ? '#1d4ed8' : '#374151',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 600
});