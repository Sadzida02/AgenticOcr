import { useEffect, useState } from 'react';

interface SummaryData {
  totalDocumentsEvaluated: number;
  baseline: PipelineStats | null;
  agentic: PipelineStats | null;
}

interface PipelineStats {
  avgCer: number;
  avgWer: number;
  avgCharAccuracy: number;
  avgWordAccuracy: number;
  avgProcessingTimeMs: number;
  documentsCount: number;
}

const API = 'https://localhost:7051/api';

export default function ComparisonPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [evalResult, setEvalResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/evaluation/summary`)
      .then(r => r.json())
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmitGroundTruth = async () => {
    if (!docId || !groundTruth) return;
    const res = await fetch(`${API}/evaluation/ground-truth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId, correctText: groundTruth })
    });
    const data = await res.json();
    setSubmitMsg(data.message ?? 'Saved');
  };

  const handleEvaluate = async () => {
    if (!docId) return;
    const res = await fetch(`${API}/evaluation/evaluate/${docId}`,
      { method: 'POST' });
    const data = await res.json();
    setEvalResult(data);
    // Refresh summary
    fetch(`${API}/evaluation/summary`)
      .then(r => r.json())
      .then(setSummary);
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Pipeline Comparison</h1>
        <p style={subtitleStyle}>
          Evaluate and compare baseline OCR vs agentic OCR performance
        </p>
      </div>

      {/* Aggregate metrics */}
      {loading && <p style={{ color: '#7a5249' }}>Loading metrics...</p>}

      {summary && (summary.baseline || summary.agentic) && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>
            Aggregate Results — {summary.totalDocumentsEvaluated} documents evaluated
          </h3>
          <div style={metricsGridStyle}>
            <MetricCard
              label="Avg Character Accuracy"
              baseline={summary.baseline?.avgCharAccuracy}
              agentic={summary.agentic?.avgCharAccuracy}
              format={pct}
              higherIsBetter
            />
            <MetricCard
              label="Avg Word Accuracy"
              baseline={summary.baseline?.avgWordAccuracy}
              agentic={summary.agentic?.avgWordAccuracy}
              format={pct}
              higherIsBetter
            />
            <MetricCard
              label="Avg CER"
              baseline={summary.baseline?.avgCer}
              agentic={summary.agentic?.avgCer}
              format={pct}
              higherIsBetter={false}
            />
            <MetricCard
              label="Avg WER"
              baseline={summary.baseline?.avgWer}
              agentic={summary.agentic?.avgWer}
              format={pct}
              higherIsBetter={false}
            />
            <MetricCard
              label="Avg Processing Time"
              baseline={summary.baseline?.avgProcessingTimeMs}
              agentic={summary.agentic?.avgProcessingTimeMs}
              format={v => `${Math.round(v)}ms`}
              higherIsBetter={false}
            />
          </div>
        </div>
      )}

      {/* Submit ground truth */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Submit Ground Truth</h3>
        <p style={{ fontSize: 13, color: '#7a5249', marginBottom: '1rem' }}>
          Paste the document ID and the correct text to enable evaluation
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Document ID</label>
            <input
              value={docId}
              onChange={e => setDocId(e.target.value)}
              placeholder="Paste document ID from upload result"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Correct text (ground truth)</label>
            <textarea
              value={groundTruth}
              onChange={e => setGroundTruth(e.target.value)}
              placeholder="Type or paste the exact correct text from the document"
              style={{ ...inputStyle, height: 120, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={btnStyle('#553832')} onClick={handleSubmitGroundTruth}>
              Save Ground Truth
            </button>
            <button style={btnStyle('#2d6a2d')} onClick={handleEvaluate}>
              Run Evaluation
            </button>
          </div>
          {submitMsg && (
            <div style={successStyle}>{submitMsg}</div>
          )}
        </div>
      </div>

      {/* Single document evaluation result */}
      {evalResult && evalResult.results && (
        <div style={cardStyle} className="fade-in">
          <h3 style={sectionTitle}>Evaluation Result</h3>
          <div style={metricsGridStyle}>
            {evalResult.results.map((r: any, i: number) => (
              <div key={i} style={resultCardStyle}>
                <div style={pipelineBadge(r.pipelineType)}>
                  {r.pipelineType}
                </div>
                <div style={metricRowStyle}>
                  <span style={metricLabel}>CER</span>
                  <span style={metricValue(r.characterErrorRate, true)}>
                    {pct(r.characterErrorRate)}
                  </span>
                </div>
                <div style={metricRowStyle}>
                  <span style={metricLabel}>WER</span>
                  <span style={metricValue(r.wordErrorRate, true)}>
                    {pct(r.wordErrorRate)}
                  </span>
                </div>
                <div style={metricRowStyle}>
                  <span style={metricLabel}>Char accuracy</span>
                  <span style={metricValue(r.characterAccuracy, false)}>
                    {pct(r.characterAccuracy)}
                  </span>
                </div>
                <div style={metricRowStyle}>
                  <span style={metricLabel}>Word accuracy</span>
                  <span style={metricValue(r.wordAccuracy, false)}>
                    {pct(r.wordAccuracy)}
                  </span>
                </div>
                <div style={metricRowStyle}>
                  <span style={metricLabel}>Processing time</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {r.processingTimeMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, baseline, agentic, format, higherIsBetter }: {
  label: string;
  baseline?: number;
  agentic?: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}) {
  const agenticWins = agentic !== undefined && baseline !== undefined
    ? higherIsBetter ? agentic > baseline : agentic < baseline
    : false;

  return (
    <div style={metricCardStyle}>
      <div style={{ fontSize: 12, color: '#7a5249', marginBottom: '0.5rem', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Baseline</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#553832' }}>
            {baseline !== undefined ? format(baseline) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Agentic</div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: agenticWins ? '#2d6a2d' : '#dc2626'
          }}>
            {agentic !== undefined ? format(agentic) : '—'}
          </div>
        </div>
      </div>
      {agenticWins && (
        <div style={winBadgeStyle}>Agentic wins</div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: '100%', minHeight: '100vh',
  padding: '2rem', background: '#f5faf5'
};
const headerStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const titleStyle: React.CSSProperties = {
  fontSize: 26, fontWeight: 700,
  color: '#553832', marginBottom: '0.4rem'
};
const subtitleStyle: React.CSSProperties = { color: '#7a5249', fontSize: 15 };
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #dde8dd',
  borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem',
  boxShadow: '0 2px 8px rgba(85,56,50,0.06)'
};
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600,
  color: '#553832', marginBottom: '1rem'
};
const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '1rem'
};
const metricCardStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '1rem'
};
const winBadgeStyle: React.CSSProperties = {
  marginTop: '0.5rem', textAlign: 'center',
  background: '#d4ecd4', color: '#2d6a2d',
  borderRadius: 12, padding: '0.2rem 0.5rem',
  fontSize: 11, fontWeight: 600
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13,
  fontWeight: 500, color: '#553832', marginBottom: '0.4rem'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem',
  border: '1px solid #dde8dd', borderRadius: 8,
  fontSize: 14, background: '#f5faf5',
  color: '#2a2a2a'
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.6rem 1.5rem',
  cursor: 'pointer', fontSize: 14, fontWeight: 600
});
const successStyle: React.CSSProperties = {
  background: '#d4ecd4', color: '#2d6a2d',
  borderRadius: 6, padding: '0.5rem 1rem', fontSize: 13
};
const resultCardStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '1rem'
};
const pipelineBadge = (type: string): React.CSSProperties => ({
  display: 'inline-block',
  background: type === 'Baseline' ? '#e5e7eb' : '#d4ecd4',
  color: type === 'Baseline' ? '#374151' : '#2d6a2d',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 600, marginBottom: '0.75rem'
});
const metricRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', padding: '0.25rem 0',
  borderBottom: '1px solid #eee'
};
const metricLabel: React.CSSProperties = { fontSize: 13, color: '#666' };
const metricValue = (v: number, lowerIsBetter: boolean): React.CSSProperties => ({
  fontSize: 14, fontWeight: 600,
  color: lowerIsBetter
    ? v < 0.2 ? '#2d6a2d' : v < 0.5 ? '#92400e' : '#dc2626'
    : v > 0.8 ? '#2d6a2d' : v > 0.5 ? '#92400e' : '#dc2626'
});