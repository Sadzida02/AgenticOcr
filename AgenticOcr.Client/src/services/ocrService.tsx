import axios from 'axios';
import type { OcrResult, HistoryItem, Document, DocumentDetail, CompareResult } from '../types';

const API_BASE = 'https://localhost:7051/api';


export const uploadDocument = async (file: File): Promise<OcrResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<OcrResult>(
    `${API_BASE}/BaselineOcr/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return response.data;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  const response = await axios.get<HistoryItem[]>(`${API_BASE}/BaselineOcr/results`);
  return response.data;
};

export const getAllDocuments = async (): Promise<Document[]> => {
  const response = await axios.get<Document[]>(`${API_BASE}/documents`);
  return response.data;
};

export const getDocumentById = async (id: string): Promise<DocumentDetail> => {
  const response = await axios.get<DocumentDetail>(`${API_BASE}/documents/${id}`);
  return response.data;
};

// ============ EVALUATION SERVICE FUNCTIONS ============

// Types for the summary response (based on your backend's detailed-summary endpoint)
export interface AggregateMetrics {
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

export interface ImprovementMetrics {
  cerReduction: number;
  tokenOverlapGain: number;
  wordDetectionGain: number;
  f1ScoreGain: number;
  processingTimeCostMs: number;
}

export interface DetailedSummaryResponse {
  totalDocumentsEvaluated: number;
  baseline?: AggregateMetrics;
  agentic?: AggregateMetrics;
  improvement?: ImprovementMetrics;
}

// ✅ CORRECTED: Matches your backend endpoint GET /api/evaluation/detailed-summary
export const getDetailedSummary = async (): Promise<DetailedSummaryResponse> => {
  const response = await axios.get<DetailedSummaryResponse>(`${API_BASE}/evaluation/detailed-summary`);
  return response.data;
};

// GET /api/evaluation/summary - Basic summary
export const getEvaluationSummary = async (): Promise<any> => {
  const response = await axios.get(`${API_BASE}/evaluation/summary`);
  return response.data;
};

// POST /api/evaluation/ground-truth
export const submitGroundTruth = async (documentId: string, correctText: string): Promise<{ message: string }> => {
  const response = await axios.post<{ message: string }>(
    `${API_BASE}/evaluation/ground-truth`,
    { documentId, correctText }
  );
  return response.data;
};

// POST /api/evaluation/evaluate/{documentId}
export const runEvaluation = async (documentId: string): Promise<any> => {
  const response = await axios.post(`${API_BASE}/evaluation/evaluate/${documentId}`);
  return response.data;
};

// GET /api/evaluation/detailed/{documentId}
export const getDetailedResults = async (documentId: string): Promise<DetailedResult[]> => {
  const response = await axios.get<{ documentId: string; results: DetailedResult[] }>(
    `${API_BASE}/evaluation/detailed/${documentId}`
  );
  return response.data.results;
};

// GET /api/evaluation/word-comparison/{documentId}
export const getWordComparison = async (documentId: string): Promise<WordComparisonResponse> => {
  const response = await axios.get<WordComparisonResponse>(
    `${API_BASE}/evaluation/word-comparison/${documentId}`
  );
  return response.data;
};

// GET /api/evaluation/document/{documentId}
export const getDocumentEvaluation = async (documentId: string): Promise<any> => {
  const response = await axios.get(`${API_BASE}/evaluation/document/${documentId}`);
  return response.data;
};

// GET /api/evaluation/export-csv
export const exportEvaluationCsv = async (): Promise<Blob> => {
  const response = await axios.get(`${API_BASE}/evaluation/export-csv`, {
    responseType: 'blob'
  });
  return response.data;
};

// POST /api/evaluation/re-evaluate-all
export const reEvaluateAll = async (): Promise<{ processed: number; failed: number }> => {
  const response = await axios.post<{ processed: number; failed: number }>(
    `${API_BASE}/evaluation/re-evaluate-all`
  );
  return response.data;
};

// ============ OCR UPLOAD FUNCTIONS ============

export const uploadBaseline = async (file: File): Promise<OcrResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post<OcrResult>(
    `${API_BASE}/BaselineOcr/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data;
};

export const uploadAgentic = async (file: File): Promise<AgenticOcrResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post<AgenticOcrResult>(
    `${API_BASE}/AgenticOcr/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data;
};

export const uploadBoth = async (file: File): Promise<BothPipelinesResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Adjust this endpoint based on your backend
  const response = await axios.post<BothPipelinesResult>(
    `${API_BASE}/Ocr/upload-both`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data;
};

// ============ TYPES ============

export interface AgenticOcrResult extends OcrResult {
  globalConfidence?: number;
  reviewRequired?: boolean;
  structuredJson?: string;
  simplifiedText?: string;
  auditLog?: string[];
}

export interface BothPipelinesResult {
  documentId: string;
  results: Array<{
    pipeline: string;
    rawText?: string;
    error?: string;
    processingTimeMs?: number;
  }>;
}

export interface DetailedResult {
  pipelineType: "Baseline" | "Agentic";
  characterErrorRate: number;
  wordErrorRate: number;
  characterAccuracy: number;
  wordAccuracy: number;
  tokenOverlap: number;
  wordDetectionRate: number;
  correctWords: number;
  missingWords: number;
  extraWords: number;
  totalGroundTruthWords: number;
  correctWordsList?: string[];
  missingWordsList?: string[];
  globalConfidence?: number;
  processingTimeMs: number;
  confidenceBreakdown?: {
    description: string;
    factors: Array<{
      factor: string;
      weight: string;
      description: string;
    }>;
    note?: string;
    reviewRequired: boolean;
  };
  extractedTextPreview?: string;
  groundTruthPreview?: string;
}

export interface WordComparisonResponse {
  documentId: string;
  results: Array<{
    pipelineType: string;
    totalWords: number;
    correctWords: number;
    missingWords: number;
    extraWords: number;
    wordDetectionRate: number;
    missingWordsList: string[];
    correctWordsList: string[];
    extraWordsList: string[];
  }>;
}

// ============ DELETE & UTILITIES ============

export const deleteDocument = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE}/documents/${id}`);
};

export const getFileUrl = (id: number): string => {
  return `${API_BASE}/documents/${id}/file`;
};

export const compareResults = async (id: string): Promise<CompareResult> => {
  const response = await axios.get<CompareResult>(`${API_BASE}/documents/${id}/compare`);
  return response.data;
};