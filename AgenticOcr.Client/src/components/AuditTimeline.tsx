type Props = {
    auditLog: string[];
  };
  
  export default function AuditTimeline({ auditLog }: Props) {
    const steps = auditLog.map(entry => {
      const parts = entry.split(' - ');
      const time = parts[0];
      const action = parts[1] || '';
  
      const descriptions: Record<string, string> = {
        'image_assessment_started': 'Analysing image quality and document type',
        'image_assessment_completed': 'Document classified — strategy selected',
        'plain_text_extraction_started': 'Extracting all visible text',
        'plain_text_extraction_completed': 'Text extraction complete',
        'table_extraction_started': 'Detected table layout — using table extractor',
        'safety_validation_started': 'Validating medication dosages',
        'interaction_check_started': 'Checking for drug interactions',
        'authenticity_check_started': 'Verifying document authenticity',
        'simplification_started': 'Generating patient-friendly summary',
        'WARNING: interactions_detected': '⚠️ Potential drug interaction found',
        'WARNING: authenticity_flagged': '⚠️ Document authenticity concern'
      };
  
      const isWarning = action.includes('WARNING');
      const isCompleted = action.includes('_completed');
  
      const description =
        Object.entries(descriptions)
          .find(([key]) => action.includes(key))?.[1] ?? action;
  
      return {
        time,
        action,
        description,
        isWarning,
        isCompleted
      };
    });
  
    return (
      <div style={{ padding: '1rem' }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '0.5rem',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                marginTop: 4,
                flexShrink: 0,
                background: step.isWarning
                  ? '#dc2626'
                  : step.isCompleted
                  ? '#2d6a2d'
                  : '#A8D3A8'
              }}
            />
  
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {new Date(step.time).toLocaleTimeString()}
              </div>
  
              <div
                style={{
                  fontSize: 13,
                  color: step.isWarning ? '#dc2626' : '#2a2a2a',
                  fontWeight: step.isWarning ? 600 : 400
                }}
              >
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }