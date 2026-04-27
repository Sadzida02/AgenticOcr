interface NavbarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
  }
  
  export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
    return (
      <nav style={navStyle}>
        <div style={innerStyle}>
          <div style={logoStyle}>
            <span style={logoIconStyle}>OCR</span>
            <span style={logoTextStyle}>AgenticOCR</span>
          </div>
          <div style={linksStyle}>
            {['upload', 'history', 'comparison'].map(page => (
              <button
                key={page}
                style={linkStyle(currentPage === page)}
                onClick={() => onNavigate(page)}
              >
                {page === 'upload' ? 'Upload'
                : page === 'history' ? 'History'
                : 'Comparison'}
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  }
  
  const navStyle: React.CSSProperties = {
    background: '#553832',
    width: '100%',
    padding: '0',
    boxShadow: '0 2px 12px rgba(85,56,50,0.18)'
  };
  
  const innerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '60px'
  };
  
  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem'
  };
  
  const logoIconStyle: React.CSSProperties = {
    background: '#A8D3A8',
    color: '#553832',
    fontWeight: 700,
    fontSize: 12,
    padding: '3px 7px',
    borderRadius: 6,
    letterSpacing: 1
  };
  
  const logoTextStyle: React.CSSProperties = {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: 0.5
  };
  
  const linksStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem'
  };
  
  const linkStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#A8D3A8' : 'transparent',
    color: active ? '#553832' : '#e8d5d3',
    border: active ? 'none' : '1px solid rgba(168,211,168,0.3)',
    borderRadius: 8,
    padding: '0.4rem 1.2rem',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.2s'
  });