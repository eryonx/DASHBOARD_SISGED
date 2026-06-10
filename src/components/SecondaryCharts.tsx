import React, { useRef, useState } from 'react';
import { copyElementToClipboard } from '../utils/exportChart';

interface SecondaryChartsProps {
  tupaData: {
    tupa: number;
    notupa: number;
  };
  origenData: {
    digital: number;
    fisico: number;
  };
  clasifData: {
    nuevo: number;
    anexo: number;
  };
}

export const SecondaryCharts: React.FC<SecondaryChartsProps> = ({
  tupaData,
  origenData,
  clasifData,
}) => {
  const formatK = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString('es-PE');
  };

  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  // Refs for each HTML column and the main card
  const clasifRef = useRef<HTMLDivElement>(null);
  const origenRef = useRef<HTMLDivElement>(null);
  const tupaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Clipboard copy feedback states
  const [copiedClasif, setCopiedClasif] = useState(false);
  const [copiedOrigen, setCopiedOrigen] = useState(false);
  const [copiedTupa, setCopiedTupa] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleExportClasif = () => {
    if (clasifRef.current) {
      copyElementToClipboard(clasifRef.current)
        .then(() => {
          setCopiedClasif(true);
          setTimeout(() => setCopiedClasif(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  const handleExportOrigen = () => {
    if (origenRef.current) {
      copyElementToClipboard(origenRef.current)
        .then(() => {
          setCopiedOrigen(true);
          setTimeout(() => setCopiedOrigen(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  const handleExportTupa = () => {
    if (tupaRef.current) {
      copyElementToClipboard(tupaRef.current)
        .then(() => {
          setCopiedTupa(true);
          setTimeout(() => setCopiedTupa(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  const handleExportAll = () => {
    if (cardRef.current) {
      copyElementToClipboard(cardRef.current)
        .then(() => {
          setCopiedAll(true);
          setTimeout(() => setCopiedAll(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  // Helper to calculate slice center coordinates for labels
  const getSlicesWithCoords = (
    slices: { label: string; count: number; color: string }[],
    total: number
  ) => {
    let cumulativePercent = 0;
    return slices.map((slice) => {
      const percent = total > 0 ? slice.count / total : 0;
      const dasharray = `${percent * circumference} ${circumference}`;
      const dashoffset = `${-(cumulativePercent * circumference)}`;
      
      // Calculate angle for the center of this slice
      const startPercent = cumulativePercent;
      const endPercent = cumulativePercent + percent;
      const midPercent = startPercent + percent / 2;
      
      // Angle in radians (starting from top, i.e., -90 degrees or -PI/2)
      const angle = -Math.PI / 2 + midPercent * 2 * Math.PI;
      
      // Coordinates at radius 30 (center of the stroke width 10)
      const x = 40 + radius * Math.cos(angle);
      const y = 40 + radius * Math.sin(angle);

      cumulativePercent = endPercent;

      return { ...slice, percent, dasharray, dashoffset, x, y };
    });
  };

  // --- DONUT 1: CLASIFICACION (Nuevo vs Anexo) ---
  const totalClasif = clasifData.nuevo + clasifData.anexo;
  const clasifSlices = [
    { label: 'Nuevo', count: clasifData.nuevo, color: '#00e676' },
    { label: 'Anexo', count: clasifData.anexo, color: '#ff9100' },
  ];
  const clasifSlicesData = getSlicesWithCoords(clasifSlices, totalClasif);

  // --- DONUT 2: ORIGEN (Digital vs Físico) ---
  const totalOrigen = origenData.digital + origenData.fisico;
  const origenSlices = [
    { label: 'Digital', count: origenData.digital, color: '#00e5ff' },
    { label: 'Físico', count: origenData.fisico, color: '#ff1744' },
  ];
  const origenSlicesData = getSlicesWithCoords(origenSlices, totalOrigen);

  // --- DONUT 3: TUPA (TUPA vs NO TUPA) ---
  const totalTupa = tupaData.tupa + tupaData.notupa;
  const tupaSlices = [
    { label: 'TUPA', count: tupaData.tupa, color: 'var(--primary)' },
    { label: 'NO TUPA', count: tupaData.notupa, color: '#0369a1' },
  ];
  const tupaSlicesData = getSlicesWithCoords(tupaSlices, totalTupa);

  const donutSize = '185px';

  return (
    <div ref={cardRef} className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px', marginBottom: '10px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Segmentación de Expedientes</h3>
          <p style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '2px', fontWeight: '500' }}>Proporción de trámites e ingresos por tipo, origen y clase.</p>
        </div>
        <button
          onClick={handleExportAll}
          title={copiedAll ? "¡Copiado!" : "Copiar Gráfico Completo al Portapapeles"}
          style={{
            background: 'none',
            border: 'none',
            color: copiedAll ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = copiedAll ? 'var(--success)' : '#ffffff';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = copiedAll ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {copiedAll ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          )}
        </button>
      </div>

      {/* 3 Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'stretch', flex: 1 }}>
        
        {/* Panel 1: CLASIFICACION */}
        <div ref={clasifRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '16px', height: '100%' }}>
          
          {/* Section Header with Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clase de Doc.</span>
            <button
              onClick={handleExportClasif}
              title={copiedClasif ? "¡Copiado!" : "Copiar Gráfico al Portapapeles"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedClasif ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '3px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedClasif ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedClasif ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedClasif ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* SVG Donut */}
          <div style={{ position: 'relative', width: donutSize, height: donutSize, flexShrink: 0, marginTop: '8px', marginBottom: '8px' }}>
            <svg width="185" height="185" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--bg-input)" strokeWidth="10" />
              {clasifSlicesData.map((slice, idx) => (
                <circle
                  key={idx}
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={slice.dasharray}
                  strokeDashoffset={slice.dashoffset}
                  transform="rotate(-90 40 40)"
                  style={{ strokeLinecap: 'butt', transition: 'stroke-dasharray 0.5s ease' }}
                />
              ))}
              
              {/* Dynamic labels rendered as high-contrast pills (Enlarged) */}
              {clasifSlicesData.map((slice, idx) => {
                if (slice.percent < 0.05) return null;
                const labelStr = formatK(slice.count);
                const pillWidth = labelStr.length * 3.0 + 3.0;
                const pillHeight = 6.5;
                return (
                  <g key={idx} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={slice.x - pillWidth / 2}
                      y={slice.y - pillHeight / 2}
                      width={pillWidth}
                      height={pillHeight}
                      rx="1.5"
                      ry="1.5"
                      fill="#0f172a"
                      stroke={slice.color}
                      strokeWidth="0.8"
                    />
                    <text
                      x={slice.x}
                      y={slice.y}
                      fill="#ffffff"
                      fontSize="4.2"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {labelStr}
                    </text>
                  </g>
                );
              })}

              {/* Center text inside SVG for clean export */}
              <text
                x="40"
                y="38"
                fill="var(--text-primary)"
                fontSize="8.6"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {formatK(totalClasif)}
              </text>
              <text
                x="40"
                y="46"
                fill="var(--text-muted)"
                fontSize="3.9"
                fontWeight="750"
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.2"
              >
                CLASE
              </text>
            </svg>
          </div>


          {/* Horizontal Legend at the bottom of the card */}
          <div style={{ 
            marginTop: 'auto', 
            borderTop: '1px solid rgba(255,255,255,0.03)', 
            width: '100%', 
            paddingTop: '10px',
            display: 'flex', 
            flexDirection: 'row', 
            gap: '12px', 
            justifyContent: 'center' 
          }}>
            {clasifSlicesData.map((slice, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: slice.color, flexShrink: 0 }}></span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '10px' }}>{slice.label}:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '850', fontSize: '12.5px' }}>
                  {(slice.percent * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: ORIGEN */}
        <div ref={origenRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '16px', paddingLeft: '4px', height: '100%' }}>
          
          {/* Section Header with Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Origen de Trámite</span>
            <button
              onClick={handleExportOrigen}
              title={copiedOrigen ? "¡Copiado!" : "Copiar Gráfico al Portapapeles"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedOrigen ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '3px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedOrigen ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedOrigen ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedOrigen ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* SVG Donut */}
          <div style={{ position: 'relative', width: donutSize, height: donutSize, flexShrink: 0, marginTop: '8px', marginBottom: '8px' }}>
            <svg width="185" height="185" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--bg-input)" strokeWidth="10" />
              {origenSlicesData.map((slice, idx) => (
                <circle
                  key={idx}
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={slice.dasharray}
                  strokeDashoffset={slice.dashoffset}
                  transform="rotate(-90 40 40)"
                  style={{ strokeLinecap: 'butt', transition: 'stroke-dasharray 0.5s ease' }}
                />
              ))}

              {/* Dynamic labels rendered as high-contrast pills (Enlarged) */}
              {origenSlicesData.map((slice, idx) => {
                if (slice.percent < 0.05) return null;
                const labelStr = formatK(slice.count);
                const pillWidth = labelStr.length * 3.0 + 3.0;
                const pillHeight = 6.5;
                return (
                  <g key={idx} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={slice.x - pillWidth / 2}
                      y={slice.y - pillHeight / 2}
                      width={pillWidth}
                      height={pillHeight}
                      rx="1.5"
                      ry="1.5"
                      fill="#0f172a"
                      stroke={slice.color}
                      strokeWidth="0.8"
                    />
                    <text
                      x={slice.x}
                      y={slice.y}
                      fill="#ffffff"
                      fontSize="4.2"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {labelStr}
                    </text>
                  </g>
                );
              })}

              {/* Center text inside SVG for clean export */}
              <text
                x="40"
                y="38"
                fill="var(--text-primary)"
                fontSize="8.6"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {formatK(totalOrigen)}
              </text>
              <text
                x="40"
                y="46"
                fill="var(--text-muted)"
                fontSize="3.9"
                fontWeight="750"
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.2"
              >
                ORIGEN
              </text>
            </svg>
          </div>

          {/* Horizontal Legend at the bottom of the card */}
          <div style={{ 
            marginTop: 'auto', 
            borderTop: '1px solid rgba(255,255,255,0.03)', 
            width: '100%', 
            paddingTop: '10px',
            display: 'flex', 
            flexDirection: 'row', 
            gap: '12px', 
            justifyContent: 'center' 
          }}>
            {origenSlicesData.map((slice, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: slice.color, flexShrink: 0 }}></span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '10px' }}>{slice.label}:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '850', fontSize: '12.5px' }}>
                  {(slice.percent * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: TUPA */}
        <div ref={tupaRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '4px', height: '100%' }}>
          
          {/* Section Header with Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo Trámite</span>
            <button
              onClick={handleExportTupa}
              title={copiedTupa ? "¡Copiado!" : "Copiar Gráfico al Portapapeles"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedTupa ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '3px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedTupa ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedTupa ? 'var(--success)' : 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedTupa ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              )}
            </button>
          </div>

          {/* SVG Donut */}
          <div style={{ position: 'relative', width: donutSize, height: donutSize, flexShrink: 0, marginTop: '8px', marginBottom: '8px' }}>
            <svg width="185" height="185" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--bg-input)" strokeWidth="10" />
              {tupaSlicesData.map((slice, idx) => (
                <circle
                  key={idx}
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={slice.dasharray}
                  strokeDashoffset={slice.dashoffset}
                  transform="rotate(-90 40 40)"
                  style={{ strokeLinecap: 'butt', transition: 'stroke-dasharray 0.5s ease' }}
                />
              ))}

              {/* Dynamic labels rendered as high-contrast pills (Enlarged) */}
              {tupaSlicesData.map((slice, idx) => {
                if (slice.percent < 0.05) return null;
                const labelStr = formatK(slice.count);
                const pillWidth = labelStr.length * 3.0 + 3.0;
                const pillHeight = 6.5;
                return (
                  <g key={idx} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={slice.x - pillWidth / 2}
                      y={slice.y - pillHeight / 2}
                      width={pillWidth}
                      height={pillHeight}
                      rx="1.5"
                      ry="1.5"
                      fill="#0f172a"
                      stroke={slice.color}
                      strokeWidth="0.8"
                    />
                    <text
                      x={slice.x}
                      y={slice.y}
                      fill="#ffffff"
                      fontSize="4.2"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {labelStr}
                    </text>
                  </g>
                );
              })}

              {/* Center text inside SVG for clean export */}
              <text
                x="40"
                y="38"
                fill="var(--text-primary)"
                fontSize="8.6"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {formatK(totalTupa)}
              </text>
              <text
                x="40"
                y="46"
                fill="var(--text-muted)"
                fontSize="3.9"
                fontWeight="750"
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.2"
              >
                TRÁMITES
              </text>
            </svg>
          </div>

          {/* Horizontal Legend at the bottom of the card */}
          <div style={{ 
            marginTop: 'auto', 
            borderTop: '1px solid rgba(255,255,255,0.03)', 
            width: '100%', 
            paddingTop: '10px',
            display: 'flex', 
            flexDirection: 'row', 
            gap: '12px', 
            justifyContent: 'center' 
          }}>
            {tupaSlicesData.map((slice, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: slice.color, flexShrink: 0 }}></span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '10px' }}>{slice.label}:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '850', fontSize: '12.5px' }}>
                  {(slice.percent * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>


      </div>

    </div>
  );
};
