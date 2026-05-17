import { useEffect, useState } from 'react';

const API = 'https://localhost:7051/api';

interface DetailedSummary {
  totalDocumentsEvaluated: number;
  baseline: PipelineStats | null;
  agentic: PipelineStats | null;
  googleVision: PipelineStats | null;
  improvement: ImprovementStats | null;
}

interface PipelineStats {
  avgCer: number;
  avgWer: number;
  avgCharAccuracy: number;
  avgWordAccuracy: number;
  avgTokenOverlap: number;
  avgWordDetectionRate: number;
  avgF1Score: number;
  avgProcessingTimeMs: number;
  documentsCount: number;
}

interface ImprovementStats {
  cerReduction: number;
  tokenOverlapGain: number;
  wordDetectionGain: number;
  f1ScoreGain?: number;
  processingTimeCostMs: number;
}

interface DetailedResult {
  pipelineType: string;
  processingTimeMs: number;
  characterErrorRate: number;
  wordErrorRate: number;
  characterAccuracy: number;
  wordAccuracy: number;
  tokenOverlap: number;
  wordDetectionRate: number;
  f1Score?: number;
  precision?: number;
  recall?: number;
  correctWords: number;
  missingWords: number;
  extraWords: number;
  totalGroundTruthWords: number;
  missingWordsList: string[];
  correctWordsList: string[];
  globalConfidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  extractedTextPreview: string;
  groundTruthPreview: string;
}

interface ConfidenceBreakdown {
  description: string;
  factors: ConfidenceFactor[];
  note: string;
  reviewRequired: boolean;
}

interface ConfidenceFactor {
  factor: string;
  weight: string;
  description: string;
}

function computeF1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export default function ComparisonPage() {
  const [summary, setSummary] = useState<DetailedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([]);
  const [activeDocTab, setActiveDocTab] = useState<string>('metrics');

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = () => {
    fetch(`${API}/evaluation/detailed-summary`)
      .then(r => r.json())
      .then(setSummary)
      .finally(() => setLoading(false));
  };

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
    const res = await fetch(
      `${API}/evaluation/evaluate/${docId}`,
      { method: 'POST' });
    if (res.ok) {
      loadSummary();
      loadDetailed();
    }
  };

  const loadDetailed = async () => {
    if (!docId) return;
    const res = await fetch(`${API}/evaluation/detailed/${docId}`);
    if (res.ok) {
      const data = await res.json();
      setDetailedResults(data.results ?? []);
    }
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const ms = (v: number) => v > 1000
    ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Pipeline Comparison</h1>
        <p style={subtitleStyle}>
          Evaluate and compare Baseline, Google Vision,
          and Agentic OCR performance
        </p>
      </div>

      {loading && <p style={{ color: '#7a5249' }}>Loading...</p>}

      {/* ── Aggregate metrics ─────────────────────────────────────────────── */}
      {summary && (summary.baseline || summary.agentic || summary.googleVision) && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>
            Aggregate Results — {summary.totalDocumentsEvaluated} documents
          </h3>

          {/* CER */}
          <MetricCard3
            label="Avg CER"
            subtitle="Lower is better"
            baseline={summary.baseline?.avgCer}
            googleVision={summary.googleVision?.avgCer}
            agentic={summary.agentic?.avgCer}
            format={pct}
            higherIsBetter={false}
          />

          {/* Char Accuracy */}
          <MetricCard3
            label="Avg Char Accuracy"
            subtitle="Higher is better"
            baseline={summary.baseline?.avgCharAccuracy}
            googleVision={summary.googleVision?.avgCharAccuracy}
            agentic={summary.agentic?.avgCharAccuracy}
            format={pct}
            higherIsBetter
          />

          {/* Token Overlap */}
          <MetricCard3
            label="Token Overlap"
            subtitle="Information retrieval"
            baseline={summary.baseline?.avgTokenOverlap}
            googleVision={summary.googleVision?.avgTokenOverlap}
            agentic={summary.agentic?.avgTokenOverlap}
            format={pct}
            higherIsBetter
          />

          {/* Word Detection */}
          <MetricCard3
            label="Word Detection"
            subtitle="% of words found"
            baseline={summary.baseline?.avgWordDetectionRate}
            googleVision={summary.googleVision?.avgWordDetectionRate}
            agentic={summary.agentic?.avgWordDetectionRate}
            format={pct}
            higherIsBetter
          />

          {/* F1 Score — computed from token overlap and word detection */}
          <MetricCard3
            label="F1 Score"
            subtitle="Precision × Recall balance"
            baseline={summary.baseline
              ? computeF1(
                  summary.baseline.avgTokenOverlap,
                  summary.baseline.avgWordDetectionRate)
              : undefined}
            googleVision={summary.googleVision
              ? computeF1(
                  summary.googleVision.avgTokenOverlap,
                  summary.googleVision.avgWordDetectionRate)
              : undefined}
            agentic={summary.agentic
              ? computeF1(
                  summary.agentic.avgTokenOverlap,
                  summary.agentic.avgWordDetectionRate)
              : undefined}
            format={pct}
            higherIsBetter
          />

          {/* Processing Time */}
          <MetricCard3
            label="Processing Time"
            subtitle="Speed tradeoff"
            baseline={summary.baseline?.avgProcessingTimeMs}
            googleVision={summary.googleVision?.avgProcessingTimeMs}
            agentic={summary.agentic?.avgProcessingTimeMs}
            format={ms}
            higherIsBetter={false}
          />

          {/* Improvement summary — agentic vs baseline */}
          {summary.improvement && (
            <div style={improvementBoxStyle}>
              <h4 style={{ color: '#2d6a2d', marginBottom: '0.5rem',
                fontSize: 14 }}>
                Agentic vs Baseline Improvement
              </h4>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13 }}>
                  CER reduced by{' '}
                  <strong>{pct(summary.improvement.cerReduction)}</strong>
                </span>
                <span style={{ fontSize: 13 }}>
                  Token Overlap +{' '}
                  <strong>{pct(summary.improvement.tokenOverlapGain)}</strong>
                </span>
                <span style={{ fontSize: 13 }}>
                  Word Detection +{' '}
                  <strong>{pct(summary.improvement.wordDetectionGain)}</strong>
                </span>
                <span style={{ fontSize: 13 }}>
                  F1 Score +{' '}
                  <strong>
                    {pct(summary.improvement.f1ScoreGain ?? 0)}
                  </strong>
                </span>
                <span style={{ fontSize: 13, color: '#92400e' }}>
                  Processing time +{' '}
                  <strong>
                    {ms(summary.improvement.processingTimeCostMs)}
                  </strong>
                  {' '}(speed tradeoff)
                </span>
              </div>

              {/* Google Vision vs Baseline */}
              {summary.googleVision && summary.baseline && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem',
                  borderTop: '1px solid #A8D3A8' }}>
                  <h4 style={{ color: '#1d4ed8', marginBottom: '0.5rem',
                    fontSize: 14 }}>
                    Google Vision vs Baseline
                  </h4>
                  <div style={{ display: 'flex', gap: '2rem',
                    flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13 }}>
                      CER:{' '}
                      <strong style={{ color: '#1d4ed8' }}>
                        {pct(summary.googleVision.avgCer)}
                      </strong>
                      {' '}vs{' '}
                      <strong>{pct(summary.baseline.avgCer)}</strong>
                    </span>
                    <span style={{ fontSize: 13 }}>
                      Token Overlap:{' '}
                      <strong style={{ color: '#1d4ed8' }}>
                        {pct(summary.googleVision.avgTokenOverlap)}
                      </strong>
                      {' '}vs{' '}
                      <strong>{pct(summary.baseline.avgTokenOverlap)}</strong>
                    </span>
                    <span style={{ fontSize: 13 }}>
                      Time:{' '}
                      <strong style={{ color: '#1d4ed8' }}>
                        {ms(summary.googleVision.avgProcessingTimeMs)}
                      </strong>
                      {' '}vs{' '}
                      <strong>{ms(summary.baseline.avgProcessingTimeMs)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Submit ground truth ───────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Submit Ground Truth & Evaluate</h3>
        <div style={{ display: 'flex', flexDirection: 'column',
          gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Document ID</label>
            <input
              value={docId}
              onChange={e => setDocId(e.target.value)}
              placeholder="Paste document ID"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Correct text (ground truth)</label>
            <textarea
              value={groundTruth}
              onChange={e => setGroundTruth(e.target.value)}
              placeholder="Paste the correct text from the document"
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
            <button style={btnStyle('#eba226')} onClick={loadDetailed}>
              Load Detailed Results
            </button>
          </div>
          {submitMsg && <div style={successStyle}>{submitMsg}</div>}
        </div>
      </div>

      {/* ── Detailed per-document results ─────────────────────────────────── */}
      {detailedResults.length > 0 && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Detailed Document Analysis</h3>

          <div style={tabRowStyle}>
            {['metrics', 'words', 'confidence'].map(tab => (
              <button
                key={tab}
                style={tabBtnStyle(activeDocTab === tab)}
                onClick={() => setActiveDocTab(tab)}
              >
                {tab === 'metrics' ? 'All Metrics'
                  : tab === 'words' ? 'Word Analysis'
                  : 'Confidence Breakdown'}
              </button>
            ))}
          </div>

          {/* Metrics tab */}
          {activeDocTab === 'metrics' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Pipeline</th>
                    <th style={thStyle}>CER</th>
                    <th style={thStyle}>Char Acc</th>
                    <th style={thStyle}>Token Overlap</th>
                    <th style={thStyle}>Word Detection</th>
                    <th style={thStyle}>F1 Score</th>
                    <th style={thStyle}>Confidence</th>
                    <th style={thStyle}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedResults.map((r, i) => (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? '#f5faf5' : '#fff'
                    }}>
                      <td style={tdStyle}>
                        <span style={pipelineBadgeStyle(r.pipelineType)}>
                          {r.pipelineType}
                        </span>
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: r.characterErrorRate < 0.15 ? '#2d6a2d'
                          : r.characterErrorRate < 0.3 ? '#92400e' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {pct(r.characterErrorRate)}
                      </td>
                      <td style={tdStyle}>
                        {pct(r.characterAccuracy)}
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: r.tokenOverlap > 0.9 ? '#2d6a2d'
                          : r.tokenOverlap > 0.7 ? '#92400e' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {pct(r.tokenOverlap)}
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: r.wordDetectionRate > 0.9 ? '#2d6a2d'
                          : r.wordDetectionRate > 0.7 ? '#92400e' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {pct(r.wordDetectionRate)}
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: computeF1(
                            r.tokenOverlap, r.wordDetectionRate) > 0.85
                          ? '#2d6a2d'
                          : computeF1(
                            r.tokenOverlap, r.wordDetectionRate) > 0.65
                          ? '#92400e' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {pct(computeF1(r.tokenOverlap, r.wordDetectionRate))}
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: r.globalConfidence > 0.7 ? '#2d6a2d'
                          : r.globalConfidence > 0.5 ? '#92400e' : '#dc2626'
                      }}>
                        {r.pipelineType === 'GoogleVision'
                          ? '—'
                          : pct(r.globalConfidence)}
                      </td>
                      <td style={tdStyle}>{ms(r.processingTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Word analysis tab */}
          {activeDocTab === 'words' && detailedResults.map((r, i) => (
            <div key={i} style={resultSectionStyle}>
              <div style={resultHeaderStyle}>
                <span style={pipelineBadgeStyle(r.pipelineType)}>
                  {r.pipelineType}
                </span>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {r.correctWords}/{r.totalGroundTruthWords} words found
                  ({pct(r.wordDetectionRate)}) — {r.extraWords} extra words
                </span>
              </div>
              <div style={{ display: 'grid',
                gridTemplateColumns: '1fr 1fr', gap: '1rem',
                marginTop: '0.75rem' }}>
                <div>
                  <p style={wordSectionLabel('correct')}>
                    ✓ Correctly found ({r.correctWords})
                  </p>
                  <div style={wordTagContainer}>
                    {r.correctWordsList.slice(0, 30).map((w, j) => (
                      <span key={j} style={wordTag('#d4ecd4', '#2d6a2d')}>
                        {w}
                      </span>
                    ))}
                    {r.correctWordsList.length > 30 && (
                      <span style={{ fontSize: 12, color: '#666' }}>
                        +{r.correctWordsList.length - 30} more
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p style={wordSectionLabel('missing')}>
                    ✗ Missing ({r.missingWords})
                  </p>
                  <div style={wordTagContainer}>
                    {r.missingWordsList.slice(0, 30).map((w, j) => (
                      <span key={j} style={wordTag('#fef2f2', '#dc2626')}>
                        {w}
                      </span>
                    ))}
                    {r.missingWordsList.length === 0 && (
                      <span style={{ fontSize: 12, color: '#2d6a2d' }}>
                        No missing words
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Confidence tab — only Agentic has confidence scoring */}
          {activeDocTab === 'confidence' && detailedResults.map((r, i) => (
            r.pipelineType === 'Agentic' ? (
              <div key={i} style={resultSectionStyle}>
                <h4 style={{ color: '#553832', marginBottom: '1rem',
                  fontSize: 14 }}>
                  Confidence Score: {pct(r.globalConfidence)}
                  {r.confidenceBreakdown?.reviewRequired && (
                    <span style={reviewBadge}>Review Required</span>
                  )}
                </h4>
                <p style={{ fontSize: 13, color: '#666',
                  marginBottom: '1rem' }}>
                  {r.confidenceBreakdown?.description}
                </p>
                <div style={{ display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem' }}>
                  {r.confidenceBreakdown?.factors?.map((f, j) => (
                    <div key={j} style={factorCardStyle}>
                      <div style={{ fontWeight: 600, color: '#553832',
                        fontSize: 13 }}>
                        {f.factor}
                      </div>
                      <div style={{ color: '#2d6a2d', fontSize: 12,
                        fontWeight: 600 }}>
                        Weight: {f.weight}
                      </div>
                      <div style={{ fontSize: 12, color: '#666',
                        marginTop: '0.25rem' }}>
                        {f.description}
                      </div>
                    </div>
                  ))}
                </div>
                {r.confidenceBreakdown?.note && (
                  <div style={noteBoxStyle}>
                    <strong>Note:</strong> {r.confidenceBreakdown.note}
                  </div>
                )}
              </div>
            ) : r.pipelineType === 'GoogleVision' ? (
              <div key={i} style={resultSectionStyle}>
                <h4 style={{ color: '#1d4ed8', fontSize: 14 }}>
                  Google Vision — Confidence Scoring
                </h4>
                <p style={{ fontSize: 13, color: '#666', marginTop: '0.5rem' }}>
                  Google Vision API does not provide a confidence score.
                  It is a cloud OCR service without clinical validation
                  or human review escalation. This is one of the key
                  differentiators of the agentic approach.
                </p>
              </div>
            ) : (
              <div key={i} style={resultSectionStyle}>
                <h4 style={{ color: '#374151', fontSize: 14 }}>
                  Baseline (Tesseract) — Confidence Scoring
                </h4>
                <p style={{ fontSize: 13, color: '#666', marginTop: '0.5rem' }}>
                  Tesseract does not provide document-level confidence scoring.
                  Individual character confidence values are available but
                  are not aggregated into a clinically meaningful score.
                </p>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Three-column metric card ──────────────────────────────────────────────────
function MetricCard3({
  label, subtitle, baseline, googleVision, agentic, format, higherIsBetter
}: {
  label: string;
  subtitle: string;
  baseline?: number;
  googleVision?: number;
  agentic?: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}) {
  const winner = (a?: number, b?: number, c?: number) => {
    if (a === undefined && b === undefined && c === undefined) return null;
    const vals = [
      { key: 'baseline', val: a },
      { key: 'vision', val: b },
      { key: 'agentic', val: c }
    ].filter(x => x.val !== undefined) as { key: string; val: number }[];

    const best = higherIsBetter
      ? vals.reduce((m, x) => x.val > m.val ? x : m)
      : vals.reduce((m, x) => x.val < m.val ? x : m);
    return best.key;
  };

  const best = winner(baseline, googleVision, agentic);

  const colStyle = (key: string): React.CSSProperties => ({
    textAlign: 'center', flex: 1
  });

  const valStyle = (key: string): React.CSSProperties => ({
    fontSize: 16, fontWeight: 700,
    color: key === best ? '#2d6a2d'
      : key === 'vision' ? '#1d4ed8' : '#553832'
  });

  return (
    <div style={{ ...metricCardStyle, marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontSize: 13, color: '#7a5249', fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: '#999' }}>{subtitle}</div>
        </div>
        {best && (
          <span style={{
            background: '#d4ecd4', color: '#2d6a2d',
            borderRadius: 8, padding: '0.15rem 0.6rem',
            fontSize: 10, fontWeight: 600
          }}>
            {best === 'baseline' ? 'Baseline wins'
              : best === 'vision' ? 'Google Vision wins'
              : 'Agentic wins'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={colStyle('baseline')}>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>
            Baseline
          </div>
          <div style={valStyle('baseline')}>
            {baseline !== undefined ? format(baseline) : '—'}
          </div>
        </div>
        <div style={{
          width: 1, background: '#dde8dd', margin: '0 0.25rem'
        }} />
        <div style={colStyle('vision')}>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>
            Google Vision
          </div>
          <div style={valStyle('vision')}>
            {googleVision !== undefined ? format(googleVision) : '—'}
          </div>
        </div>
        <div style={{
          width: 1, background: '#dde8dd', margin: '0 0.25rem'
        }} />
        <div style={colStyle('agentic')}>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>
            Agentic
          </div>
          <div style={valStyle('agentic')}>
            {agentic !== undefined ? format(agentic) : '—'}
          </div>
        </div>
      </div>
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
const metricCardStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '0.75rem'
};
const improvementBoxStyle: React.CSSProperties = {
  background: '#d4ecd4', border: '1px solid #A8D3A8',
  borderRadius: 8, padding: '0.75rem 1rem', marginTop: '0.75rem'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13,
  fontWeight: 500, color: '#553832', marginBottom: '0.4rem'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem',
  border: '1px solid #A8D3A8', borderRadius: 8,
  fontSize: 14, background: '#fff', color: '#2a2a2a'
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.6rem 1.25rem',
  cursor: 'pointer', fontSize: 14, fontWeight: 600
});
const successStyle: React.CSSProperties = {
  background: '#d4ecd4', color: '#2d6a2d',
  borderRadius: 6, padding: '0.5rem 1rem', fontSize: 13
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
const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13
};
const thStyle: React.CSSProperties = {
  background: '#553832', color: '#fff',
  padding: '0.5rem 0.75rem', textAlign: 'left',
  fontWeight: 600, fontSize: 12
};
const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', borderBottom: '1px solid #dde8dd'
};
const pipelineBadgeStyle = (type: string): React.CSSProperties => ({
  background: type === 'Baseline' ? '#e5e7eb'
    : type === 'GoogleVision' ? '#dbeafe' : '#d4ecd4',
  color: type === 'Baseline' ? '#374151'
    : type === 'GoogleVision' ? '#1d4ed8' : '#2d6a2d',
  borderRadius: 12, padding: '0.2rem 0.8rem',
  fontSize: 12, fontWeight: 600
});
const resultSectionStyle: React.CSSProperties = {
  background: '#f5faf5', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '1rem', marginBottom: '0.75rem'
};
const resultHeaderStyle: React.CSSProperties = {
  display: 'flex', gap: '0.75rem',
  alignItems: 'center', flexWrap: 'wrap'
};
const wordSectionLabel = (type: string): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600,
  color: type === 'correct' ? '#2d6a2d' : '#dc2626',
  marginBottom: '0.5rem'
});
const wordTagContainer: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '0.25rem'
};
const wordTag = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color, borderRadius: 4,
  padding: '0.1rem 0.4rem', fontSize: 11, fontWeight: 500
});
const reviewBadge: React.CSSProperties = {
  background: '#fef3c7', color: '#92400e',
  borderRadius: 12, padding: '0.15rem 0.6rem',
  fontSize: 11, fontWeight: 600, marginLeft: '0.5rem'
};
const factorCardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #dde8dd',
  borderRadius: 8, padding: '0.75rem'
};
const noteBoxStyle: React.CSSProperties = {
  marginTop: '0.75rem', padding: '0.75rem',
  background: '#fef9c3', border: '1px solid #fde68a',
  borderRadius: 6, fontSize: 12, color: '#92400e'
};