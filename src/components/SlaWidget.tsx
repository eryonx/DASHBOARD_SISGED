import React, { useRef, useState } from 'react';
import { copyElementToClipboard } from '../utils/exportChart';

interface SlaWidgetProps {
  avgValidationHours: number;
  under24Percent: number;
  slaDistribution: {
    range0_12: number;
    range12_24: number;
    range24_48: number;
    rangeOver48: number;
    totalCount: number;
  };
}

export const SlaWidget: React.FC<SlaWidgetProps> = ({
  avgValidationHours,
  under24Percent,
  slaDistribution,
}) => {
  const { range0_12, range12_24, range24_48, rangeOver48, totalCount } = slaDistribution;

  const pct0_12 = totalCount > 0 ? (range0_12 / totalCount) * 100 : 0;
  const pct12_24 = totalCount > 0 ? (range12_24 / totalCount) * 100 : 0;
  const pct24_48 = totalCount > 0 ? (range24_48 / totalCount) * 100 : 0;
  const pctOver48 = totalCount > 0 ? (rangeOver48 / totalCount) * 100 : 0;

  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    if (cardRef.current) {
      copyElementToClipboard(cardRef.current)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  // Gauge parameters
  const radius = 45;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (under24Percent / 100) * circumference;

  // Determine SLA status color
  const getSlaColor = (pct: number) => {
    if (pct >= 90) return 'var(--success)';
    if (pct >= 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const slaColor = getSlaColor(under24Percent);

  return (
    <div ref={cardRef} className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px', marginBottom: '6px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Eficiencia y Cumplimiento de SLA</h3>
          <p style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '2px', fontWeight: '500' }}>
            Normativa: Derivación/validación dentro del día hábil de presentación (SLA: 24h).
          </p>
        </div>
        <button
          onClick={handleExport}
          title={copied ? "¡Copiado!" : "Copiar Gráfico al Portapapeles"}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = copied ? 'var(--success)' : '#ffffff';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = copied ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {copied ? (
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

      {/* SLA Metrics Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start', flex: 1, paddingTop: '8px' }}>
        
        {/* Left Column: Visual Circular Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '220px', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
            <svg width="220" height="220" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth={strokeWidth}
              />
              {/* Highlight compliance arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={slaColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />

              {/* Center text inside SVG for clean export */}
              <text
                x="60"
                y="57"
                fill="var(--text-primary)"
                fontSize="17.5"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {under24Percent.toFixed(1)}%
              </text>
              <text
                x="60"
                y="71"
                fill="var(--text-secondary)"
                fontSize="5.8"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.4"
              >
                CUMPLIMIENTO
              </text>
            </svg>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '750', padding: '4px 12px', borderRadius: '12px', backgroundColor: `rgba(${under24Percent >= 90 ? '16, 185, 129' : under24Percent >= 75 ? '245, 158, 11' : '239, 68, 68'}, 0.08)`, color: slaColor, border: `1px solid rgba(${under24Percent >= 90 ? '16, 185, 129' : under24Percent >= 75 ? '245, 158, 11' : '239, 68, 68'}, 0.2)` }}>
              {under24Percent >= 90 ? 'Excelente' : under24Percent >= 75 ? 'Regular' : 'Crítico'}
            </span>
          </div>
        </div>

        {/* Right Column: Speed details & Distribution bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
          
          {/* Average Hours Mini Stat */}
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '750', letterSpacing: '0.4px' }}>T. Promedio de Atención</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
              {avgValidationHours.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>horas</span>
            </div>
          </div>


          {/* Distribution Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.4px' }}>Tiempos de Respuesta</div>
            
            {/* 0-12h */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>0 - 12h (Mismo turno)</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{pct0_12.toFixed(0)}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct0_12}%`, height: '100%', backgroundColor: 'var(--success)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* 12-24h */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>12 - 24h (Día Hábil / Límite)</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{pct12_24.toFixed(0)}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct12_24}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* 24-48h (SLA Breach - Mild) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--warning)', fontWeight: '700' }}>Fuera de SLA (24 - 48h)</span>
                <span style={{ color: 'var(--warning)', fontWeight: '800' }}>{pct24_48.toFixed(0)}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct24_48}%`, height: '100%', backgroundColor: 'var(--warning)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* >48h (SLA Breach - Critical) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: '700' }}>Fuera de SLA (&gt;48h - Crítico)</span>
                <span style={{ color: 'var(--danger)', fontWeight: '800' }}>{pctOver48.toFixed(0)}%</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pctOver48}%`, height: '100%', backgroundColor: 'var(--danger)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
