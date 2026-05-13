# ── Save all charts into one combined PDF ─────────────────────────────────────
from matplotlib.backends.backend_pdf import PdfPages
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats
import warnings



GREEN = '#A8D3A8'
BROWN = '#553832'
LIGHT_GREEN = '#2d6a2d'
LIGHT_BROWN = '#7a5249'
BG = '#f5faf5'


warnings.filterwarnings('ignore')
chart_files = [
    'chart1_overall_comparison.png',
    'chart2_cer_per_document.png',
    'chart3_token_overlap_per_document.png',
    'chart4_word_detection_per_document.png',
    'chart5_processing_time.png',
    'chart6_radar.png',
    'chart7_cer_by_document_type.png',
    'chart8_statistical_significance.png',
    'chart9_summary_table.png',
    'chart10_synthetic_vs_original.png'
]

with PdfPages('ocr_evaluation_all_charts.pdf') as pdf:
    for chart_file in chart_files:
        try:
            img = plt.imread(chart_file)
            fig, ax = plt.subplots(figsize=(14, 9), facecolor=BG)
            ax.imshow(img)
            ax.axis('off')
            pdf.savefig(fig, bbox_inches='tight', facecolor=BG)
            plt.close(fig)
            print(f'Added {chart_file} to PDF')
        except FileNotFoundError:
            print(f'Skipping {chart_file} — not found')

print('\nCombined PDF saved as: ocr_evaluation_all_charts.pdf')