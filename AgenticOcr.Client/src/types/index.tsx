// src/types/index.ts

export interface OcrResult {
  documentId: string;
  fileName: string;
  extractedText: string;
  processingTimeMs: number;
}

export interface HistoryItem {
  fileName: string;
  pipelineType: string;
  rawText: string;
  processingTimeMs: number;
  createdAt: string;
}

// ✅ Add explicit status union type
export type DocumentStatus = "Done" | "Failed" | "Processing";

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  status: DocumentStatus;  // Use union type instead of string
  resultCount: number;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  status: string;
  ocrResults: OcrResultDetail[];
}

export interface OcrResultDetail {
  id: string;
  pipelineType: string;
  rawText: string;
  processingTimeMs: number;
  createdAt: string;
}

export interface CompareResult {
  documentId: string;
  fileName: string;
  baseline: {
      rawText: string;
      processingTimeMs: number;
      createdAt: string;
  } | null;
  agentic: {
      rawText: string;
      processingTimeMs: number;
      createdAt: string;
  } | null;
}