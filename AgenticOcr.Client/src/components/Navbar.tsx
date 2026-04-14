import { useState } from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        <span style={logoStyle}>AgenticOCR</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            style={navButtonStyle(currentPage === 'upload')}
            onClick={() => onNavigate('upload')}
          >
            Upload
          </button>
          <button
            style={navButtonStyle(currentPage === 'history')}
            onClick={() => onNavigate('history')}
          >
            History
          </button>
        </div>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  background: '#1e293b',
  padding: '0.75rem 0',
  marginBottom: '0'
};

const innerStyle: React.CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto',
  padding: '0 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const logoStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 700,
  fontSize: 18
};

const navButtonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#2563eb' : 'transparent',
  color: '#fff',
  border: active ? 'none' : '1px solid #475569',
  borderRadius: 6,
  padding: '0.4rem 1rem',
  cursor: 'pointer',
  fontSize: 14
});