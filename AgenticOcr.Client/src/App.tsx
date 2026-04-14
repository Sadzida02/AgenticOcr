import { useState } from 'react';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('upload');

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      {currentPage === 'upload' ? <UploadPage /> : <HistoryPage />}
    </div>
  );
}