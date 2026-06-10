import React, { useState, useRef, useMemo } from 'react';
import { copyElementToClipboard } from '../utils/exportChart';

interface OficinaRow {
  name: string;
  idx: number;
  total: number;
}

interface GrupoRow {
  name: string;
  idx: number;
  total: number;
  oficinas: OficinaRow[];
}

interface SedeDestRow {
  name: string;
  idx: number;
  total: number;
  grupos: GrupoRow[];
}

interface DestinationTableProps {
  destinationDetailsList: SedeDestRow[];
}

export const DestinationTable: React.FC<DestinationTableProps> = ({
  destinationDetailsList,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand state for Sede level and Grupo level
  const [expandedSedes, setExpandedSedes] = useState<Record<number, boolean>>({});
  const [expandedGrupos, setExpandedGrupos] = useState<Record<string, boolean>>({});

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

  const toggleSedeExpand = (sIdx: number) => {
    setExpandedSedes(prev => ({ ...prev, [sIdx]: !prev[sIdx] }));
  };

  const toggleGrupoExpand = (sIdx: number, gIdx: number) => {
    const key = `${sIdx}-${gIdx}`;
    setExpandedGrupos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate totals
  const totalDocs = useMemo(() => {
    return destinationDetailsList.reduce((sum, s) => sum + s.total, 0);
  }, [destinationDetailsList]);

  // Apply search query and filter data hierarchically
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return destinationDetailsList;
    
    const query = searchQuery.toLowerCase();

    return destinationDetailsList.map(s => {
      // Filter groups
      const filteredGroups = s.grupos.map(g => {
        // If group name matches, keep all its offices. Otherwise, filter offices.
        const groupMatches = g.name.toLowerCase().includes(query);
        const filteredOficinas = groupMatches 
          ? g.oficinas 
          : g.oficinas.filter(o => o.name.toLowerCase().includes(query));

        if (filteredOficinas.length > 0 || groupMatches) {
          return {
            ...g,
            oficinas: filteredOficinas,
            // Recompute total count for search display matching
            total: filteredOficinas.reduce((sum, o) => sum + o.total, 0) || g.total
          };
        }
        return null;
      }).filter((g): g is GrupoRow => g !== null);

      if (filteredGroups.length > 0 || s.name.toLowerCase().includes(query)) {
        return {
          ...s,
          grupos: filteredGroups,
          total: filteredGroups.reduce((sum, g) => sum + g.total, 0) || s.total
        };
      }
      return null;
    }).filter((s): s is SedeDestRow => s !== null);
  }, [destinationDetailsList, searchQuery]);

  // Expand all matched rows automatically when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const sedesExpand: Record<number, boolean> = {};
      const gruposExpand: Record<string, boolean> = {};
      
      filteredData.forEach(s => {
        sedesExpand[s.idx] = true;
        s.grupos.forEach(g => {
          gruposExpand[`${s.idx}-${g.idx}`] = true;
        });
      });
      
      setExpandedSedes(sedesExpand);
      setExpandedGrupos(gruposExpand);
    }
  }, [filteredData, searchQuery]);

  const formatNum = (num: number) => num.toLocaleString('es-PE');

  const getPercent = (count: number) => {
    if (totalDocs === 0) return '0.0%';
    return `${((count / totalDocs) * 100).toFixed(1)}%`;
  };

  const getSedeColor = (idx: number) => {
    const colors = ['#38bdf8', '#bd00ff', '#00e676'];
    return colors[idx % colors.length];
  };

  return (
    <div ref={cardRef} className="chart-card" style={{ padding: '16px 20px', gap: '16px' }}>
      
      {/* Header with Title and Search Input */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '10px',
        }}
      >
        <div className="chart-card-title-box">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Destino de los Documentos (Sede / Grupo / Oficina)
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Distribución jerárquica de expedientes según su destino final registrado.
          </p>
        </div>

        {/* Right side: Search Box + Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Buscar destino..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '210px',
                padding: '7px 10px 7px 32px',
                fontSize: '12.5px',
                backgroundColor: 'var(--bg-sidebar)',
                borderRadius: 'var(--radius-sm)'
              }}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--text-muted)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ✕
              </button>
            )}
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
      </div>

      {/* Table Container */}
      <div 
        style={{ 
          overflowX: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm)',
          maxHeight: '520px',
          overflowY: 'auto'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '700', color: 'var(--text-primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
                Destino (Sede / Grupo / Oficina)
              </th>
              <th style={{ textAlign: 'right', width: '140px', padding: '10px 14px', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
                Documentos
              </th>
              <th style={{ textAlign: 'left', width: '220px', padding: '10px 14px', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
                Distribución
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((s) => {
              const isSedeExpanded = !!expandedSedes[s.idx];
              const sedePct = getPercent(s.total);
              const sedeColor = getSedeColor(s.idx);

              return (
                <React.Fragment key={s.idx}>
                  {/* LEVEL 1: Sede Destino */}
                  <tr 
                    onClick={() => toggleSedeExpand(s.idx)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    className="sede-row"
                  >
                    <td style={{ padding: '8px 14px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', borderLeft: `3px solid ${sedeColor}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '8px', width: '12px', display: 'inline-block' }}>
                        {isSedeExpanded ? '▼' : '▶'}
                      </span>
                      {s.name}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(s.total)}
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '40px', fontWeight: '700', fontSize: '11px', color: 'var(--text-primary)' }}>{sedePct}</span>
                        <div className="progress-bar-bg" style={{ flex: 1, height: '6px' }}>
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: sedePct, 
                              backgroundColor: sedeColor, 
                              boxShadow: `0 0 8px ${sedeColor}aa` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* LEVEL 2: Grupo Destino */}
                  {isSedeExpanded && s.grupos.map((g) => {
                    const groupKey = `${s.idx}-${g.idx}`;
                    const isGroupExpanded = !!expandedGrupos[groupKey];
                    const groupPct = getPercent(g.total);

                    return (
                      <React.Fragment key={groupKey}>
                        <tr
                          onClick={() => toggleGrupoExpand(s.idx, g.idx)}
                          style={{ backgroundColor: 'rgba(255,255,255,0.005)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                        >
                          <td style={{ padding: '7px 14px 7px 32px', fontWeight: '600', color: '#e2e8f0', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '7px', width: '12px', display: 'inline-block' }}>
                              {isGroupExpanded ? '▼' : '▶'}
                            </span>
                            {g.name}
                          </td>
                          <td style={{ textAlign: 'right', padding: '7px 14px', fontWeight: '600', color: '#e2e8f0', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            {formatNum(g.total)}
                          </td>
                          <td style={{ padding: '7px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '40px', fontWeight: '600', fontSize: '11px', color: '#e2e8f0' }}>{groupPct}</span>
                              <div className="progress-bar-bg" style={{ flex: 1, height: '5px' }}>
                                <div 
                                  className="progress-bar-fill" 
                                  style={{ 
                                    width: groupPct, 
                                    backgroundColor: 'var(--purple-accent)' 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* LEVEL 3: Oficina Destino */}
                        {isGroupExpanded && g.oficinas.map((o) => {
                          const officePct = getPercent(o.total);

                          return (
                            <tr key={`${s.idx}-${g.idx}-${o.idx}`} style={{ opacity: 0.85 }}>
                              <td style={{ padding: '5px 14px 5px 52px', fontStyle: 'italic', fontSize: '11.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.01)' }}>
                                ↳ {o.name}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 14px', fontSize: '11.5px', borderBottom: '1px solid rgba(255, 255, 255, 0.01)' }}>
                                {formatNum(o.total)}
                              </td>
                              <td style={{ padding: '5px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.01)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '40px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>{officePct}</span>
                                  <div className="progress-bar-bg" style={{ flex: 1, height: '4px' }}>
                                    <div 
                                      className="progress-bar-fill" 
                                      style={{ 
                                        width: officePct, 
                                        backgroundColor: 'var(--text-muted)' 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No se encontraron destinos que coincidan con la búsqueda.
                </td>
              </tr>
            )}

            {/* GRAND TOTALS FOOTER (Sticky) */}
            <tr style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              <td style={{ padding: '10px 14px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                TOTAL GENERAL
              </td>
              <td style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '800', color: 'var(--text-primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totalDocs)}
              </td>
              <td style={{ padding: '10px 14px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '40px' }}>100.0%</span>
                  <div className="progress-bar-bg" style={{ flex: 1, height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: '100%', backgroundColor: 'var(--primary)' }}></div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
