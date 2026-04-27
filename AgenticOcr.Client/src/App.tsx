import { useState } from 'react';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import HistoryPage from './pages/HistoryPage';
import ComparisonPage from './pages/ComparisonPage';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('upload');

  return (
    <div style={{ minHeight: '100vh', background: '#f5faf5' }}>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      {currentPage === 'upload' && <UploadPage />}
      {currentPage === 'history' && <HistoryPage />}
      {currentPage === 'comparison' && <ComparisonPage />}
    </div>
  );
}