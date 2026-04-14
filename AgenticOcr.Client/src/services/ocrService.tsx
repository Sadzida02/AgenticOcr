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

export const deleteDocument = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE}/documents/${id}`);
};

export const getFileUrl = (id: string): string => {
  return `${API_BASE}/documents/${id}/file`;
};

export const compareResults = async (id: string): Promise<CompareResult> => {
  const response = await axios.get<CompareResult>(`${API_BASE}/documents/${id}/compare`);
  return response.data;
};