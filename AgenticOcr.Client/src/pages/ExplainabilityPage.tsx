import { useState } from 'react';
import AuditTimeline from '../components/AuditTimeline';

const API = 'https://localhost:7051/api';

interface ReadabilityData {
  fleschReadingEase: number;
  readabilityLevel: string;
  wordCount: number;
  sentenceCount: number;
  averageSyllablesPerWord: number;
  interpretation: string;
}

interface ReadabilityResponse {
  documentId: string;
  rawText: {
    text: string;
    readability: ReadabilityData;
  };
  simplifiedText: {
    text: string;
    readability: ReadabilityData;
  };
  improvement: {
    scoreGain: number;
    levelChange: string;
    message: string;
  };
}

export default function ExplainabilityPage() {
  const [docId, setDocId] = useState('');
  const [data, setData] = useState<ReadabilityResponse | null>(null);
  const [auditLog, setAuditLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Also check if data was passed from upload page via localStorage
  const savedData = (() => {
    try {
      return JSON.parse(localStorage.getItem('explainabilityData') || '{}');
    } catch { return {}; }
  })();

  const loadData = async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);

    try {
      // Load readability data
      const res = await fetch(
        `${API}/evaluation/readability/${docId}`);
      if (!res.ok) throw new Error(await res.text());
      const readabilityData = await res.json();
      setData(readabilityData);

      // Load audit log from OCR result
      const docRes = await fetch(
        `${API}/evaluation/document/${docId}`);
      if (docRes.ok) {
        const docData = await docRes.json();
        const agenticResult = docData.results?.find(
          (r: any) => r.pipelineType === 'Agentic');
        if (agenticResult?.auditLog)
          setAuditLog(agenticResult.auditLog);
      }
    } catch (err: unknown) {
      setError(err instanceof Error
        ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  // Use saved audit log from upload page if available
  const displayAuditLog = auditLog.length > 0
    ? auditLog
    : (savedData.auditLog || []);

  const displayData = data || (savedData.rawText ? {
    rawText: {
      text: savedData.rawText,
      readability: savedData.originalReadability
    },
    simplifiedText: {
      text: savedData.simplifiedText,
      readability: savedData.simplifiedReadability
    },
    improvement: savedData.improvement
  } : null);

  const pct = (v: number) => `${v.toFixed(1)}%`;

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={titleStyle}>Explainability Analysis</h1>
        <p style={subtitleStyle}>
          Understand how the agentic pipeline processed the document,
          and measure readability improvement for elderly patients
        </p>
      </div>

      {/* Document ID input */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Load Document Analysis</h3>
        <p style={{ fontSize: 13, color: '#7a5249', marginBottom: '1rem' }}>
          Enter a document ID to load its explainability data,
          or open this page from the Upload page after extraction.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Document ID</label>
            <input
              value={docId}
              onChange={e => setDocId(e.target.value)}
              placeholder="Paste document ID here"
              style={inputStyle}
            />
          </div>
          <button
            onClick={loadData}
            disabled={!docId || loading}
            style={btnStyle(loading)}
          >
            {loading ? 'Loading...' : 'Load Analysis'}
          </button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
      </div>

      {displayData && (
        <>
          {/* Readability improvement banner */}
          {displayData.improvement && (
            <div style={{
              ...cardStyle,
              background: (displayData.improvement.scoreGain ?? 0) > 0
                ? '#d4ecd4' : '#fef3c7',
              border: (displayData.improvement.scoreGain ?? 0) > 0
                ? '1px solid #A8D3A8' : '1px solid #fde68a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center',
                gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 40 }}>
                  {(displayData.improvement.scoreGain ?? 0) > 10
                    ? '✅' : (displayData.improvement.scoreGain ?? 0) > 0
                    ? '📈' : '⚠️'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16,
                    color: '#553832' }}>
                    {displayData.improvement.message}
                  </div>
                  <div style={{ fontSize: 14, color: '#7a5249',
                    marginTop: '0.25rem' }}>
                    Readability: {displayData.improvement.levelChange}
                    {' — '}Score improved by{' '}
                    <strong>
                      +{displayData.improvement.scoreGain} points
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Readability scores side by side */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>
              Readability Comparison — Clinical vs Patient-Friendly
            </h3>
            <p style={{ fontSize: 13, color: '#7a5249',
              marginBottom: '1rem' }}>
              Flesch Reading Ease: higher score = easier to read.
              Score of 60+ is suitable for general public.
              Score of 70+ is ideal for elderly patients.
            </p>

            <div style={{ display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Raw clinical text score */}
              <ReadabilityCard
                title="Original Clinical Text"
                data={displayData.rawText?.readability}
                color="#553832"
                bgColor="#fef2f2"
              />

              {/* Simplified text score */}
              <ReadabilityCard
                title="Simplified Patient Version"
                data={displayData.simplifiedText?.readability}
                color="#2d6a2d"
                bgColor="#d4ecd4"
              />
            </div>

            {/* Score bar comparison */}
            {displayData.rawText?.readability &&
              displayData.simplifiedText?.readability && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600,
                  color: '#553832', marginBottom: '0.75rem' }}>
                  Score Comparison (0 = hardest, 100 = easiest)
                </div>
                <ScoreBar
                  label="Clinical Text"
                  score={displayData.rawText.readability.fleschReadingEase}
                  color="#553832"
                />
                <ScoreBar
                  label="Simplified Text"
                  score={
                    displayData.simplifiedText.readability.fleschReadingEase}
                  color="#2d6a2d"
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem',
                  fontSize: 12, color: '#666' }}>
                  <span>0 — Very Difficult</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    60 — Acceptable for patients
                  </span>
                  <span>100 — Very Easy</span>
                </div>
              </div>
            )}
          </div>

          {/* Side by side text comparison */}
          <div style={{ display: 'grid',
            gridTemplateColumns: '1fr 1fr', gap: '1.5rem',
            marginBottom: '1.5rem' }}>
            <div style={cardStyle}>
              <h3 style={{ ...sectionTitle, color: '#553832' }}>
                Extracted Clinical Text
              </h3>
              <p style={{ fontSize: 11, color: '#888', marginBottom: '0.75rem' }}>
                Technical language — difficult for elderly patients
              </p>
              <pre style={textBoxStyle('#fef2f2', '#553832')}>
                {displayData.rawText?.text || 'No text available'}
              </pre>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...sectionTitle, color: '#2d6a2d' }}>
                Simplified Patient Version
              </h3>
              <p style={{ fontSize: 11, color: '#888', marginBottom: '0.75rem' }}>
                Plain language — accessible to elderly patients
              </p>
              <pre style={textBoxStyle('#d4ecd4', '#2d6a2d')}>
                {displayData.simplifiedText?.text || 'No simplified text available'}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Agent workflow timeline */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Agent Workflow Timeline</h3>
        <p style={{ fontSize: 13, color: '#7a5249', marginBottom: '1rem' }}>
          Step-by-step trace of every agent decision in the pipeline.
          This demonstrates the explainability and transparency
          of the agentic approach.
        </p>
        {displayAuditLog.length > 0 ? (
          <AuditTimeline auditLog={displayAuditLog} />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center',
            color: '#9ca3af', background: '#f5faf5', borderRadius: 8,
            border: '2px dashed #dde8dd' }}>
            No audit log available. Load a document above or
            open this page from the Upload page after extraction.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Readability card component ────────────────────────────────────────────────
function ReadabilityCard({ title, data, color, bgColor }: {
  title: string;
  data?: ReadabilityData;
  color: string;
  bgColor: string;
}) {
  if (!data) return (
    <div style={{ background: bgColor, borderRadius: 8, padding: '1rem',
      border: '1px solid #dde8dd' }}>
      <h4 style={{ color, marginBottom: '0.5rem' }}>{title}</h4>
      <p style={{ color: '#888', fontSize: 13 }}>No data available</p>
    </div>
  );

  return (
    <div style={{ background: bgColor, borderRadius: 8, padding: '1.25rem',
      border: `1px solid ${color}33` }}>
      <h4 style={{ color, marginBottom: '1rem', fontSize: 14 }}>{title}</h4>

      <div style={{ fontSize: 36, fontWeight: 800, color,
        marginBottom: '0.25rem' }}>
        {data.fleschReadingEase.toFixed(1)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color,
        marginBottom: '0.75rem' }}>
        {data.readabilityLevel}
      </div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: '1rem',
        lineHeight: 1.5 }}>
        {data.interpretation}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem' }}>
        <Stat label="Words" value={data.wordCount.toString()} />
        <Stat label="Sentences" value={data.sentenceCount.toString()} />
        <Stat label="Avg syllables/word"
          value={data.averageSyllablesPerWord.toFixed(2)} />
        <Stat label="Target audience"
          value={data.fleschReadingEase >= 70 ? 'General public'
            : data.fleschReadingEase >= 50 ? 'Educated adults'
            : 'Specialists'} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 6,
      padding: '0.4rem 0.6rem' }}>
      <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
        {value}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color }: {
  label: string;
  score: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        marginBottom: '0.25rem' }}>
        <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>
          {score.toFixed(1)} / 100
        </span>
      </div>
      <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6,
        overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 6,
          width: `${clamped}%`,
          background: color,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  padding: '2rem', background: '#f5faf5', minHeight: '100vh'
};
const titleStyle: React.CSSProperties = {
  color: '#553832', fontWeight: 700, fontSize: 26, marginBottom: '0.4rem'
};
const subtitleStyle: React.CSSProperties = {
  color: '#7a5249', fontSize: 15
};
const cardStyle: React.CSSProperties = {
  background: 'white', padding: '1.5rem', borderRadius: 10,
  marginBottom: '1.5rem', border: '1px solid #dde8dd',
  boxShadow: '0 2px 8px rgba(85,56,50,0.06)'
};
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, color: '#553832', marginBottom: '0.5rem'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#553832', marginBottom: '0.4rem'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem', border: '1px solid #A8D3A8',
  borderRadius: 8, fontSize: 14, background: '#fff', color: '#2a2a2a'
};
const btnStyle = (loading: boolean): React.CSSProperties => ({
  background: loading ? '#aaa' : '#553832',
  color: '#fff', border: 'none', borderRadius: 8,
  padding: '0.6rem 1.5rem', cursor: loading ? 'not-allowed' : 'pointer',
  fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap'
});
const errorStyle: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', borderRadius: 6,
  padding: '0.5rem 1rem', fontSize: 13, marginTop: '0.75rem'
};
const textBoxStyle = (bg: string, borderColor: string): React.CSSProperties => ({
  background: bg, border: `1px solid ${borderColor}33`,
  padding: '1rem', borderRadius: 8, whiteSpace: 'pre-wrap',
  fontSize: 12, lineHeight: 1.7, maxHeight: 300,
  overflowY: 'auto', margin: 0
});