import React from 'react';

interface MetricsCardsProps {
  total: number;
  derivadoCount: number;
  observadoCount: number;
  calidadCount: number;
  archivadoCount: number;
  selectedState: number; // -1: All, 0: Derivado, 1: Archivado, 2: Calidad, 3: Observado
  onStateSelect: (val: number) => void;
  avgDaily: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  total,
  derivadoCount,
  observadoCount,
  calidadCount,
  archivadoCount,
  selectedState,
  onStateSelect,
  avgDaily,
}) => {
  // Format to e.g. "50.8K" or "600"
  const formatVal = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('es-PE');
  };

  // Safe percentage helper
  const getPercent = (count: number) => {
    if (total === 0) return '0.0%';
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  const handleCardClick = (val: number) => {
    if (selectedState === val) {
      onStateSelect(-1); // Toggle off (resets to all)
    } else {
      onStateSelect(val);
    }
  };

  return (
    <div className="kpi-row">
      {/* 1. TOTAL */}
      <div
        className={`kpi-card ${selectedState === -1 ? 'active' : ''}`}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px' }}
        onClick={() => handleCardClick(-1)}
      >
        <div className="kpi-title-row">
          <span className="kpi-title" style={{ color: selectedState === -1 ? 'var(--primary)' : 'var(--text-secondary)' }}>
            TOTAL
          </span>
          <span className="kpi-dots">•••</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatVal(total)}</div>
          <span className="kpi-badge blue">100%</span>
        </div>
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Promedio:</span>
          <strong style={{ color: 'var(--primary)' }}>{Math.round(avgDaily).toLocaleString('es-PE')} / día</strong>
        </div>
      </div>

      {/* 2. DERIVADOS */}
      <div
        className={`kpi-card green ${selectedState === 0 ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleCardClick(0)}
      >
        <div className="kpi-title-row">
          <span className="kpi-title" style={{ color: selectedState === 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
            DERIVADOS
          </span>
          <span className="kpi-dots">•••</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatVal(derivadoCount)}</div>
          <span className="kpi-badge green">{getPercent(derivadoCount)}</span>
        </div>
      </div>

      {/* 3. OBSERVADOS */}
      <div
        className={`kpi-card orange ${selectedState === 3 ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleCardClick(3)}
      >
        <div className="kpi-title-row">
          <span className="kpi-title" style={{ color: selectedState === 3 ? 'var(--warning)' : 'var(--text-secondary)' }}>
            OBSERVADOS
          </span>
          <span className="kpi-dots">•••</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatVal(observadoCount)}</div>
          <span className="kpi-badge orange">{getPercent(observadoCount)}</span>
        </div>
      </div>

      {/* 4. CALIDAD */}
      <div
        className={`kpi-card orange ${selectedState === 2 ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleCardClick(2)}
      >
        <div className="kpi-title-row">
          <span className="kpi-title" style={{ color: selectedState === 2 ? 'var(--warning)' : 'var(--text-secondary)' }}>
            CALIDAD
          </span>
          <span className="kpi-dots">•••</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatVal(calidadCount)}</div>
          <span className="kpi-badge orange">{getPercent(calidadCount)}</span>
        </div>
      </div>

      {/* 5. ARCHIVADOS */}
      <div
        className={`kpi-card red ${selectedState === 1 ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleCardClick(1)}
      >
        <div className="kpi-title-row">
          <span className="kpi-title" style={{ color: selectedState === 1 ? 'var(--danger)' : 'var(--text-secondary)' }}>
            ARCHIVADOS
          </span>
          <span className="kpi-dots">•••</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value">{formatVal(archivadoCount)}</div>
          <span className="kpi-badge red">{getPercent(archivadoCount)}</span>
        </div>
      </div>
    </div>
  );
};
