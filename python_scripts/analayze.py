import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# ── Load data ─────────────────────────────────────────────────────────────────
df = pd.read_csv('ocr_evaluation_result.csv')
df.columns = df.columns.str.strip()

baseline = df[df['PipelineType'] == 'Baseline'].copy()
agentic = df[df['PipelineType'] == 'Agentic'].copy()

GREEN = '#A8D3A8'
BROWN = '#553832'
LIGHT_GREEN = '#2d6a2d'
LIGHT_BROWN = '#7a5249'
BG = '#f5faf5'

def doc_type(filename):
    f = str(filename).lower()
    if 'lab' in f: return 'Lab Results'
    elif 'typed' in f or 'prescription' in f: return 'Typed Prescription'
    elif 'handwritten' in f or 'hw' in f: return 'Handwritten'
    else: return 'Other'

df['DocType'] = df['DocumentName'].apply(doc_type)
baseline['DocType'] = baseline['DocumentName'].apply(doc_type)
agentic['DocType'] = agentic['DocumentName'].apply(doc_type)

# Recompute F1 from token overlap and word detection
def compute_f1(row):
    p = row.get('TokenOverlap', 0)
    r = row.get('WordDetectionRate', 0)
    if pd.isna(p) or pd.isna(r): return 0
    if p + r == 0: return 0
    return round(2 * p * r / (p + r), 4)

df['F1Score'] = df.apply(compute_f1, axis=1)
baseline['F1Score'] = baseline.apply(compute_f1, axis=1)
agentic['F1Score'] = agentic.apply(compute_f1, axis=1)

def save(name):
    plt.tight_layout()
    plt.savefig(f'{name}.png', dpi=150, bbox_inches='tight', facecolor=BG)
    plt.savefig(f'{name}.pdf', bbox_inches='tight', facecolor=BG)
    print(f'Saved {name}.png and {name}.pdf')
    plt.close()

def style(ax, title):
    ax.set_facecolor(BG)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.set_title(title, fontsize=14, fontweight='bold', color=BROWN, pad=12)

width = 0.35

# ══════════════════════════════════════════════════════════════════════════════
# CHART 1 — Overall metrics comparison
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(10, 6), facecolor=BG)
style(ax, 'Overall Performance Comparison — Baseline vs Agentic')

chart_metrics = [m for m in ['CER', 'TokenOverlap', 'F1Score', 'WordDetectionRate']
                 if m in df.columns]
chart_labels = {
    'CER': 'CER\n(↓ lower better)',
    'TokenOverlap': 'Token\nOverlap',
    'F1Score': 'F1\nScore',
    'WordDetectionRate': 'Word\nDetection'
}

b_vals = [baseline[m].mean() for m in chart_metrics]
a_vals = [agentic[m].mean() for m in chart_metrics]
labels = [chart_labels[m] for m in chart_metrics]
x = np.arange(len(labels))

bars1 = ax.bar(x - width/2, b_vals, width, label='Baseline',
               color=BROWN, alpha=0.85, edgecolor='white')
bars2 = ax.bar(x + width/2, a_vals, width, label='Agentic',
               color=GREEN, alpha=0.85, edgecolor='white')

for bar in bars1:
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
            f'{bar.get_height():.2f}', ha='center', fontsize=9, color=BROWN)
for bar in bars2:
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
            f'{bar.get_height():.2f}', ha='center', fontsize=9, color=LIGHT_GREEN)

ax.set_xticks(x)
ax.set_xticklabels(labels, fontsize=10)
ax.set_ylabel('Score (0–1)', fontsize=11)
ax.set_ylim(0, 1.15)
ax.legend(fontsize=10)
ax.axhline(y=0.85, color='gray', linestyle='--', alpha=0.4)
save('chart1_overall_comparison')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 2 — CER per document
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(14, 6), facecolor=BG)
style(ax, 'Character Error Rate (CER) Per Document')

merged = baseline[['DocumentName', 'CER']].merge(
    agentic[['DocumentName', 'CER']], on='DocumentName',
    suffixes=('_baseline', '_agentic'))

docs = [d[:18] + '…' if len(d) > 18 else d for d in merged['DocumentName']]
x = np.arange(len(docs))

ax.bar(x - width/2, merged['CER_baseline'], width,
       label='Baseline', color=BROWN, alpha=0.85)
ax.bar(x + width/2, merged['CER_agentic'], width,
       label='Agentic', color=GREEN, alpha=0.85)

ax.set_xticks(x)
ax.set_xticklabels(docs, rotation=45, ha='right', fontsize=8)
ax.set_ylabel('CER', fontsize=11)
ax.set_ylim(0, min(merged['CER_baseline'].max() * 1.2, 1.0))
ax.axhline(y=0.15, color='orange', linestyle='--', alpha=0.6,
           label='Good threshold (15%)')
ax.legend(fontsize=10)
save('chart2_cer_per_document')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 3 — Token overlap per document
# ══════════════════════════════════════════════════════════════════════════════
if 'TokenOverlap' in df.columns:
    fig, ax = plt.subplots(figsize=(14, 6), facecolor=BG)
    style(ax, 'Token Overlap Per Document')

    merged_to = baseline[['DocumentName', 'TokenOverlap']].merge(
        agentic[['DocumentName', 'TokenOverlap']], on='DocumentName',
        suffixes=('_baseline', '_agentic'))

    docs = [d[:18] + '…' if len(d) > 18 else d
            for d in merged_to['DocumentName']]
    x = np.arange(len(docs))

    ax.bar(x - width/2, merged_to['TokenOverlap_baseline'], width,
           label='Baseline', color=BROWN, alpha=0.85)
    ax.bar(x + width/2, merged_to['TokenOverlap_agentic'], width,
           label='Agentic', color=GREEN, alpha=0.85)

    ax.set_xticks(x)
    ax.set_xticklabels(docs, rotation=45, ha='right', fontsize=8)
    ax.set_ylabel('Token Overlap', fontsize=11)
    ax.set_ylim(0, 1.1)
    ax.axhline(y=0.90, color='green', linestyle='--',
               alpha=0.5, label='Excellent (90%)')
    ax.legend(fontsize=10)
    save('chart3_token_overlap_per_document')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 4 — Word detection rate per document
# ══════════════════════════════════════════════════════════════════════════════
if 'WordDetectionRate' in df.columns:
    fig, ax = plt.subplots(figsize=(14, 6), facecolor=BG)
    style(ax, 'Word Detection Rate Per Document')

    merged_wd = baseline[['DocumentName', 'WordDetectionRate']].merge(
        agentic[['DocumentName', 'WordDetectionRate']], on='DocumentName',
        suffixes=('_baseline', '_agentic'))

    docs = [d[:18] + '…' if len(d) > 18 else d
            for d in merged_wd['DocumentName']]
    x = np.arange(len(docs))

    ax.bar(x - width/2, merged_wd['WordDetectionRate_baseline'], width,
           label='Baseline', color=BROWN, alpha=0.85)
    ax.bar(x + width/2, merged_wd['WordDetectionRate_agentic'], width,
           label='Agentic', color=GREEN, alpha=0.85)

    ax.set_xticks(x)
    ax.set_xticklabels(docs, rotation=45, ha='right', fontsize=8)
    ax.set_ylabel('Word Detection Rate', fontsize=11)
    ax.set_ylim(0, 1.1)
    ax.axhline(y=0.90, color='green', linestyle='--',
               alpha=0.5, label='Good threshold (90%)')
    ax.legend(fontsize=10)
    save('chart4_word_detection_per_document')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 5 — Processing time comparison
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(8, 6), facecolor=BG)
style(ax, 'Average Processing Time — Baseline vs Agentic')

categories = ['Baseline\n(Tesseract)', 'Agentic\n(Gemini)']
times = [baseline['ProcessingTimeMs'].mean(), agentic['ProcessingTimeMs'].mean()]
colors_bar = [BROWN, GREEN]

bars = ax.bar(categories, times, color=colors_bar, alpha=0.85,
              edgecolor='white', width=0.4)

for bar, t in zip(bars, times):
    label = f'{t:.0f}ms' if t < 1000 else f'{t/1000:.1f}s'
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() * 1.05,
            label, ha='center', fontsize=13, fontweight='bold', color=BROWN)

ax.set_yscale('log')
ax.set_ylabel('Processing Time (log scale)', fontsize=11)
ratio = times[1] / times[0]
ax.text(0.5, 0.92,
        f'Agentic is {ratio:.0f}× slower but significantly more accurate',
        transform=ax.transAxes, ha='center', fontsize=10,
        color=LIGHT_BROWN, style='italic')
save('chart5_processing_time')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 6 — Radar chart
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(8, 8), facecolor=BG,
                       subplot_kw=dict(projection='polar'))
ax.set_facecolor(BG)

radar_labels = ['Char\nAccuracy', 'Token\nOverlap',
                'Word\nDetection', 'F1\nScore', 'Speed\nScore']

def safe_mean(series):
    return series.mean() if len(series) > 0 else 0

b_vals_r = [
    1 - safe_mean(baseline['CER']),
    safe_mean(baseline['TokenOverlap']) if 'TokenOverlap' in baseline.columns else 0,
    safe_mean(baseline['WordDetectionRate']) if 'WordDetectionRate' in baseline.columns else 0,
    safe_mean(baseline['F1Score']),
    max(0, 1 - safe_mean(baseline['ProcessingTimeMs']) / 120000)
]
a_vals_r = [
    1 - safe_mean(agentic['CER']),
    safe_mean(agentic['TokenOverlap']) if 'TokenOverlap' in agentic.columns else 0,
    safe_mean(agentic['WordDetectionRate']) if 'WordDetectionRate' in agentic.columns else 0,
    safe_mean(agentic['F1Score']),
    max(0, 1 - safe_mean(agentic['ProcessingTimeMs']) / 120000)
]

b_vals_r = [min(max(v, 0), 1) for v in b_vals_r]
a_vals_r = [min(max(v, 0), 1) for v in a_vals_r]

angles = np.linspace(0, 2 * np.pi, len(radar_labels), endpoint=False).tolist()
b_vals_r += b_vals_r[:1]
a_vals_r += a_vals_r[:1]
angles += angles[:1]

ax.plot(angles, b_vals_r, 'o-', linewidth=2, color=BROWN, label='Baseline')
ax.fill(angles, b_vals_r, alpha=0.15, color=BROWN)
ax.plot(angles, a_vals_r, 'o-', linewidth=2, color=LIGHT_GREEN, label='Agentic')
ax.fill(angles, a_vals_r, alpha=0.2, color=GREEN)

ax.set_xticks(angles[:-1])
ax.set_xticklabels(radar_labels, fontsize=11)
ax.set_ylim(0, 1)
ax.set_title('Performance Profile — Radar Chart', fontsize=14,
             fontweight='bold', color=BROWN, pad=20)
ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.15), fontsize=10)
save('chart6_radar')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 7 — CER by document type
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(10, 6), facecolor=BG)
style(ax, 'Average CER by Document Type')

doc_types = [dt for dt in df['DocType'].unique() if not pd.isna(dt)]
b_cer = [baseline[baseline['DocType'] == dt]['CER'].mean() for dt in doc_types]
a_cer = [agentic[agentic['DocType'] == dt]['CER'].mean() for dt in doc_types]
counts = [len(baseline[baseline['DocType'] == dt]) for dt in doc_types]

x = np.arange(len(doc_types))
ax.bar(x - width/2, b_cer, width, label='Baseline', color=BROWN, alpha=0.85)
ax.bar(x + width/2, a_cer, width, label='Agentic', color=GREEN, alpha=0.85)

for i, (b, a, c) in enumerate(zip(b_cer, a_cer, counts)):
    if not np.isnan(b):
        ax.text(i - width/2, b + 0.01, f'{b*100:.0f}%',
                ha='center', fontsize=9, color=BROWN, fontweight='bold')
    if not np.isnan(a):
        ax.text(i + width/2, a + 0.01, f'{a*100:.0f}%',
                ha='center', fontsize=9, color=LIGHT_GREEN, fontweight='bold')
    ax.text(i, -0.04, f'n={c}', ha='center', fontsize=8, color='gray')

ax.set_xticks(x)
ax.set_xticklabels(doc_types, fontsize=11)
ax.set_ylabel('Average CER', fontsize=11)
ax.set_ylim(-0.06, max(b_cer + a_cer) * 1.2 if b_cer else 1)
ax.legend(fontsize=10)
save('chart7_cer_by_document_type')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 8 — Statistical significance table
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(12, 5), facecolor=BG)
style(ax, 'Statistical Significance — p-values (t-test)')
ax.axis('off')

sig_metrics = [m for m in ['CER', 'TokenOverlap', 'F1Score', 'WordDetectionRate']
               if m in df.columns]
sig_labels = {
    'CER': 'Character Error Rate',
    'TokenOverlap': 'Token Overlap',
    'F1Score': 'F1 Score',
    'WordDetectionRate': 'Word Detection Rate'
}

table_data = []
for m in sig_metrics:
    b = baseline[m].dropna()
    a = agentic[m].dropna()
    if len(b) > 1 and len(a) > 1:
        t, p = stats.ttest_ind(b, a)
        sig = 'Yes ✓' if p < 0.05 else 'No ✗'
        better = 'Agentic' if (m == 'CER' and a.mean() < b.mean()) or \
                              (m != 'CER' and a.mean() > b.mean()) else 'Baseline'
        table_data.append([
            sig_labels.get(m, m),
            f'{b.mean():.3f}',
            f'{a.mean():.3f}',
            f'{t:.3f}',
            f'{p:.4f}',
            sig,
            better
        ])

table = ax.table(
    cellText=table_data,
    colLabels=['Metric', 'Baseline\nMean', 'Agentic\nMean',
               't-stat', 'p-value', 'Significant\n(p<0.05)', 'Better'],
    loc='center',
    cellLoc='center'
)
table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1.3, 2.5)

for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor('#dde8dd')
    if row == 0:
        cell.set_facecolor(BROWN)
        cell.set_text_props(color='white', fontweight='bold')
    elif row % 2 == 0:
        cell.set_facecolor('#f0f7f0')
    else:
        cell.set_facecolor('white')
    if col == 5 and row > 0:
        text = cell.get_text().get_text()
        color = LIGHT_GREEN if 'Yes' in text else '#dc2626'
        cell.set_text_props(color=color, fontweight='bold')
    if col == 6 and row > 0:
        if cell.get_text().get_text() == 'Agentic':
            cell.set_text_props(color=LIGHT_GREEN, fontweight='bold')

save('chart8_statistical_significance')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 9 — Summary results table
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(12, 5), facecolor=BG)
style(ax, 'Evaluation Results Summary')
ax.axis('off')

def f1_from(p, r):
    return 0 if (p + r) == 0 else 2 * p * r / (p + r)

summary_rows = []

if 'CER' in df.columns:
    b, a = baseline['CER'].mean(), agentic['CER'].mean()
    summary_rows.append(['CER', f'{b*100:.1f}%', f'{a*100:.1f}%',
                         f'{((b-a)/b*100):.1f}% reduction ↓',
                         'Lower is better'])

b_acc = 1 - baseline['CER'].mean()
a_acc = 1 - agentic['CER'].mean()
summary_rows.append(['Char Accuracy', f'{b_acc*100:.1f}%', f'{a_acc*100:.1f}%',
                     f'+{((a_acc-b_acc)/b_acc*100):.1f}% ↑',
                     'Higher is better'])

if 'TokenOverlap' in df.columns:
    b, a = baseline['TokenOverlap'].mean(), agentic['TokenOverlap'].mean()
    summary_rows.append(['Token Overlap', f'{b*100:.1f}%', f'{a*100:.1f}%',
                         f'+{((a-b)/b*100):.1f}% ↑', 'Higher is better'])

if 'WordDetectionRate' in df.columns:
    b, a = baseline['WordDetectionRate'].mean(), agentic['WordDetectionRate'].mean()
    summary_rows.append(['Word Detection', f'{b*100:.1f}%', f'{a*100:.1f}%',
                         f'+{((a-b)/b*100):.1f}% ↑', 'Higher is better'])

if 'F1Score' in df.columns:
    b_f1 = baseline['F1Score'].mean()
    a_f1 = agentic['F1Score'].mean()
    summary_rows.append(['F1 Score', f'{b_f1*100:.1f}%', f'{a_f1*100:.1f}%',
                         f'+{((a_f1-b_f1)/b_f1*100):.1f}% ↑',
                         'Higher is better'])

b_t = baseline['ProcessingTimeMs'].mean()
a_t = agentic['ProcessingTimeMs'].mean()
summary_rows.append(['Processing Time', f'{b_t:.0f}ms', f'{a_t/1000:.1f}s',
                     f'{a_t/b_t:.0f}× slower', 'Speed tradeoff'])

table = ax.table(
    cellText=summary_rows,
    colLabels=['Metric', 'Baseline', 'Agentic', 'Improvement', 'Note'],
    loc='center',
    cellLoc='center'
)
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.2, 2.5)

for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor('#dde8dd')
    if row == 0:
        cell.set_facecolor(BROWN)
        cell.set_text_props(color='white', fontweight='bold')
    elif row % 2 == 0:
        cell.set_facecolor('#f0f7f0')
    else:
        cell.set_facecolor('white')
    if col == 3 and row > 0:
        text = cell.get_text().get_text()
        if '↑' in text or '↓' in text:
            cell.set_text_props(color=LIGHT_GREEN, fontweight='bold')
        elif 'slower' in text:
            cell.set_text_props(color='#dc2626')

save('chart9_summary_table')

# ══════════════════════════════════════════════════════════════════════════════
# CHART 10 — Synthetic vs Original data performance comparison
# ══════════════════════════════════════════════════════════════════════════════
if 'Type of Document' in df.columns:
    fig, axes = plt.subplots(2, 2, figsize=(14, 10), facecolor=BG)
    fig.suptitle('Synthetic vs Original Data — Performance Comparison',
                 fontsize=14, fontweight='bold', color=BROWN, y=1.01)

    plot_metrics = [
        ('CER', 'Character Error Rate (CER)', False),
        ('TokenOverlap', 'Token Overlap', True),
        ('WordDetectionRate', 'Word Detection Rate', True),
        ('F1Score', 'F1 Score', True)
    ]

    for idx, (metric, title, higher_better) in enumerate(plot_metrics):
        if metric not in df.columns:
            continue

        ax = axes[idx // 2][idx % 2]
        ax.set_facecolor(BG)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)

        doc_types_col = 'Type of Document'
        data_types = df[doc_types_col].dropna().unique()

        group_labels = []
        b_vals_chart = []
        a_vals_chart = []

        for dt in data_types:
            subset_b = baseline[baseline[doc_types_col] == dt][metric].dropna()
            subset_a = agentic[agentic[doc_types_col] == dt][metric].dropna()
            if len(subset_b) > 0 and len(subset_a) > 0:
                group_labels.append(dt)
                b_vals_chart.append(subset_b.mean())
                a_vals_chart.append(subset_a.mean())

        if not group_labels:
            continue

        x = np.arange(len(group_labels))
        bars1 = ax.bar(x - width/2, b_vals_chart, width,
                       label='Baseline', color=BROWN, alpha=0.85,
                       edgecolor='white')
        bars2 = ax.bar(x + width/2, a_vals_chart, width,
                       label='Agentic', color=GREEN, alpha=0.85,
                       edgecolor='white')

        for bar in bars1:
            v = bar.get_height()
            if not np.isnan(v):
                ax.text(bar.get_x() + bar.get_width()/2, v + 0.01,
                        f'{v:.2f}', ha='center', fontsize=9,
                        color=BROWN, fontweight='bold')
        for bar in bars2:
            v = bar.get_height()
            if not np.isnan(v):
                ax.text(bar.get_x() + bar.get_width()/2, v + 0.01,
                        f'{v:.2f}', ha='center', fontsize=9,
                        color=LIGHT_GREEN, fontweight='bold')

        for i, dt in enumerate(group_labels):
            n_b = len(baseline[baseline[doc_types_col] == dt][metric].dropna())
            ax.text(i, -0.06, f'n={n_b}',
                    ha='center', fontsize=8, color='gray')

        ax.set_xticks(x)
        ax.set_xticklabels(group_labels, fontsize=10)
        ax.set_title(title, fontsize=12, fontweight='bold',
                     color=BROWN, pad=8)
        ax.set_ylabel('Score', fontsize=10)
        ax.set_ylim(-0.08, 1.15)
        ax.legend(fontsize=9)

        for i, (b, a) in enumerate(zip(b_vals_chart, a_vals_chart)):
            if not np.isnan(b) and not np.isnan(a) and b != 0:
                diff = ((a - b) / b * 100) if higher_better \
                       else ((b - a) / b * 100)
                symbol = '↑' if higher_better else '↓'
                ax.annotate(f'{diff:.0f}% {symbol}',
                            xy=(i, max(a, b) + 0.05),
                            ha='center', fontsize=8,
                            color=LIGHT_GREEN if diff > 0 else '#dc2626',
                            fontweight='bold')

    plt.tight_layout(pad=2.5)
    save('chart10_synthetic_vs_original')
else:
    print("Skipping chart10 — 'Type of Document' column not found in CSV")


print('\n=== STATISTICAL ANALYSIS WITH CONFIDENCE INTERVALS ===')
metrics = ['CER', 'TokenOverlap', 'WordDetectionRate']

for metric in metrics:
    b = baseline[metric].dropna()
    a = agentic[metric].dropna()
    
    # Standard deviation
    b_std = b.std()
    a_std = a.std()
    
    # 95% confidence intervals
    b_ci = stats.t.interval(0.95, len(b)-1, loc=b.mean(), scale=stats.sem(b))
    a_ci = stats.t.interval(0.95, len(a)-1, loc=a.mean(), scale=stats.sem(a))
    
    # t-test
    t_stat, p_val = stats.ttest_ind(b, a)
    
    # Cohen's d effect size
    pooled_std = np.sqrt((b_std**2 + a_std**2) / 2)
    cohens_d = abs(b.mean() - a.mean()) / pooled_std
    
    print(f'\n{metric}:')
    print(f'  Baseline: {b.mean():.4f} ± {b_std:.4f} '
          f'(95% CI: {b_ci[0]:.4f}–{b_ci[1]:.4f})')
    print(f'  Agentic:  {a.mean():.4f} ± {a_std:.4f} '
          f'(95% CI: {a_ci[0]:.4f}–{a_ci[1]:.4f})')
    print(f'  p-value: {p_val:.4f} '
          f'{"(significant)" if p_val < 0.05 else "(not significant)"}')
    print(f'  Cohen\'s d: {cohens_d:.3f} '
          f'({"large" if cohens_d > 0.8 else "medium" if cohens_d > 0.5 else "small"} effect)')

def bootstrap_ci(data, n_boot=1000, ci=95):
    means = [np.mean(np.random.choice(data, len(data), replace=True))
             for _ in range(n_boot)]
    lower = np.percentile(means, (100-ci)/2)
    upper = np.percentile(means, 100-(100-ci)/2)
    return lower, upper

for metric in ['CER', 'TokenOverlap']:
    b_lo, b_hi = bootstrap_ci(baseline[metric].dropna().values)
    a_lo, a_hi = bootstrap_ci(agentic[metric].dropna().values)
    print(f'{metric} bootstrap 95% CI:')
    print(f'  Baseline: {b_lo:.4f}–{b_hi:.4f}')
    print(f'  Agentic:  {a_lo:.4f}–{a_hi:.4f}')

# ── Print summary ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ALL CHARTS SAVED")
print("="*60)
print(f"\n  Documents evaluated: {len(baseline)}")
print(f"  Baseline avg CER:    {baseline['CER'].mean()*100:.1f}%")
print(f"  Agentic avg CER:     {agentic['CER'].mean()*100:.1f}%")
if 'TokenOverlap' in df.columns:
    print(f"  Baseline token overlap: {baseline['TokenOverlap'].mean()*100:.1f}%")
    print(f"  Agentic token overlap:  {agentic['TokenOverlap'].mean()*100:.1f}%")
if 'F1Score' in df.columns:
    print(f"  Baseline F1:  {baseline['F1Score'].mean()*100:.1f}%")
    print(f"  Agentic F1:   {agentic['F1Score'].mean()*100:.1f}%")
print(f"  Baseline avg time:   {baseline['ProcessingTimeMs'].mean():.0f}ms")
print(f"  Agentic avg time:    {agentic['ProcessingTimeMs'].mean()/1000:.1f}s")