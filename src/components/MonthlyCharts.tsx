import React, { useState, useRef } from 'react';
import { copyElementToClipboard } from '../utils/exportChart';

interface MonthlyData {
  month: string;
  tupa: number;
  notupa: number;
  digital: number;
  fisico: number;
}

interface MonthlyChartsProps {
  monthlyData: MonthlyData[];
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  monthlyData,
}) => {
  const [activeTab, setActiveTab] = useState<'tramite' | 'origen'>('tramite');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [trendTooltipPos, setTrendTooltipPos] = useState({ x: 0, y: 0 });

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

  const formatK = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString('es-PE');
  };

  const formatLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return parts[2]; // Day number e.g. "09"
    }
    const m = parts.length > 1 ? parts[1] : parts[0];
    const months: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    };
    return months[m] || dateStr;
  };

  const formatTooltipHeader = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthName = months[monthIdx] || parts[1];
      return `${parts[2]} de ${monthName}, ${parts[0]}`;
    }
    const months: Record<string, string> = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
      '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
    };
    const m = parts.length > 1 ? parts[1] : parts[0];
    return `${months[m] || dateStr} ${parts[0]}`;
  };

  // SVG parameters
  const width = 560;
  const height = 280;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const gw = width - padL - padR;
  const gh = height - padT - padB;

  // --- UNIFIED SPLINE TREND CHART CONFIG (FOR BOTH TRAMITE AND ORIGEN + TOTAL) ---
  const maxVal = Math.max(
    ...monthlyData.map((d) =>
      activeTab === 'tramite'
        ? d.tupa + d.notupa
        : d.digital + d.fisico
    ),
    100
  );
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));

  const points = monthlyData.map((d, idx) => {
    const x = padL + (idx / (monthlyData.length - 1 || 1)) * gw;
    const valA = activeTab === 'tramite' ? d.tupa : d.fisico;
    const valB = activeTab === 'tramite' ? d.notupa : d.digital;
    const valTotal = valA + valB;
    const yA = height - padB - (valA / maxVal) * gh;
    const yB = height - padB - (valB / maxVal) * gh;
    const yTotal = height - padB - (valTotal / maxVal) * gh;
    return { x, yA, yB, yTotal, valA, valB, valTotal, raw: d };
  });

  const getSplinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const dx = (p2.x - p1.x) / 2;
      d += ` C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const getAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const linePath = getSplinePath(pts);
    const baselineY = height - padB;
    return `${linePath} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`;
  };

  const pointsA = points.map((p) => ({ x: p.x, y: p.yA }));
  const pointsB = points.map((p) => ({ x: p.x, y: p.yB }));
  const pointsTotal = points.map((p) => ({ x: p.x, y: p.yTotal }));

  const linePathA = getSplinePath(pointsA);
  const areaPathA = getAreaPath(pointsA);
  const linePathB = getSplinePath(pointsB);
  const areaPathB = getAreaPath(pointsB);
  const linePathTotal = getSplinePath(pointsTotal);
  const areaPathTotal = getAreaPath(pointsTotal);

  // Tooltip Handlers
  const handleTrendMouseMove = (e: React.MouseEvent<SVGElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTrendTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 45,
    });
    setHoveredTrendIdx(idx);
  };

  return (
    <div ref={cardRef} className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Title Header with interactive toggle tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '6px',
          marginBottom: '10px',
        }}
      >
        <div className="chart-card-title-box">
          <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Análisis de Tendencias</h3>
          <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {monthlyData[0]?.month.split('-').length === 3 ? 'Evolución diaria de la carga documentaria.' : 'Evolución mensual de la carga documentaria.'}
          </p>
        </div>

        {/* Tab Selection Switch & Export Button Wrapper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tab Selection Switch */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setActiveTab('tramite')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '18px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'tramite' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'tramite' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Por Trámite
            </button>
            <button
              onClick={() => setActiveTab('origen')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '18px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'origen' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'origen' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Por Origen
            </button>
          </div>

          {/* Image Export Button */}
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
      </div>


      {/* Legend row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <div className="chart-card-legend">
          <span>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '6px' }}></span>
            TOTAL
          </span>
          {activeTab === 'tramite' ? (
            <>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#bd00ff', marginRight: '6px' }}></span>
                TUPA
              </span>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', marginRight: '6px' }}></span>
                NO TUPA
              </span>
            </>
          ) : (
            <>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#bd00ff', marginRight: '6px' }}></span>
                FÍSICO
              </span>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', marginRight: '6px' }}></span>
                DIGITAL
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Chart SVG Render slot */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, flex: 1 }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          {ticks.map((tick, idx) => {
            const y = height - padB - (tick / maxVal) * gh;
            return (
              <g key={idx}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontWeight="600">
                  {formatK(tick)}
                </text>
              </g>
            );
          })}

          {monthlyData.map((d, idx) => {
            const x = padL + (idx / (monthlyData.length - 1 || 1)) * gw;
            const isDaily = d.month.split('-').length === 3;
            if (isDaily && monthlyData.length > 15) {
              if (idx % 3 !== 0 && idx !== monthlyData.length - 1) return null;
            }
            return (
              <text key={idx} x={x} y={height - padB + 16} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
                {formatLabel(d.month)}
              </text>
            );
          })}

          {points.length > 0 && (
            <>
              <path d={areaPathTotal} fill="rgba(16, 185, 129, 0.02)" />
              <path d={areaPathB} fill="rgba(56, 189, 248, 0.04)" />
              <path d={areaPathA} fill="rgba(189, 0, 255, 0.04)" />
              
              <path d={linePathTotal} fill="none" stroke="#10b981" strokeWidth="2.5" />
              <path d={linePathB} fill="none" stroke="#38bdf8" strokeWidth="2" />
              <path d={linePathA} fill="none" stroke="#bd00ff" strokeWidth="2" />

              {/* Static nodes and data labels for each data point */}
              {points.map((p, idx) => (
                <g key={`nodes-labels-${idx}`}>
                  {/* Line Total Node and Value Label */}
                  <circle cx={p.x} cy={p.yTotal} r="3.5" fill="#10b981" stroke="var(--bg-card)" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={p.yTotal - 8}
                    textAnchor="middle"
                    fill="#a7f3d0"
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {formatK(p.valTotal)}
                  </text>

                  {/* Line A Node and Value Label */}
                  <circle cx={p.x} cy={p.yA} r="3.5" fill="#bd00ff" stroke="var(--bg-card)" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={p.yA - 8}
                    textAnchor="middle"
                    fill="#e0a6ff"
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {formatK(p.valA)}
                  </text>

                  {/* Line B Node and Value Label */}
                  <circle cx={p.x} cy={p.yB} r="3.5" fill="#38bdf8" stroke="var(--bg-card)" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={p.yB + 13}
                    textAnchor="middle"
                    fill="#7dd3fc"
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {formatK(p.valB)}
                  </text>
                </g>
              ))}
            </>
          )}

          {hoveredTrendIdx !== null && points[hoveredTrendIdx] && (
            <line
              x1={points[hoveredTrendIdx].x}
              y1={padT}
              x2={points[hoveredTrendIdx].x}
              y2={height - padB}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {points.map((p, idx) => (
            <g key={idx}
               onMouseMove={(e) => handleTrendMouseMove(e, idx)}
               onMouseLeave={() => setHoveredTrendIdx(null)}
               style={{ cursor: 'pointer' }}
            >
              <rect x={p.x - 15} y={padT} width={30} height={gh} fill="transparent" />
              {hoveredTrendIdx === idx && (
                <>
                  <circle cx={p.x} cy={p.yTotal} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={p.x} cy={p.yA} r="5" fill="#bd00ff" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={p.x} cy={p.yB} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                </>
              )}
            </g>
          ))}
        </svg>

        {hoveredTrendIdx !== null && points[hoveredTrendIdx] && (
          <div
            className="map-tooltip"
            style={{
              left: `${trendTooltipPos.x}px`,
              top: `${trendTooltipPos.y}px`,
              opacity: 1,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {formatTooltipHeader(points[hoveredTrendIdx].raw.month)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: '#10b981' }}>
                TOTAL: <strong>{points[hoveredTrendIdx].valTotal.toLocaleString()}</strong>
              </span>
              <span style={{ color: '#bd00ff' }}>
                {activeTab === 'tramite' ? 'TUPA' : 'FÍSICO'}: <strong>{points[hoveredTrendIdx].valA.toLocaleString()}</strong>
              </span>
              <span style={{ color: '#38bdf8' }}>
                {activeTab === 'tramite' ? 'NO TUPA' : 'DIGITAL'}: <strong>{points[hoveredTrendIdx].valB.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
