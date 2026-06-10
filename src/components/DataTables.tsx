import React, { useState, useRef } from 'react';
import { copyElementToClipboard } from '../utils/exportChart';

// Interfaces
interface AmbitoRow {
  name: string;
  total: number;
  derivado: number;
  observado: number;
  calidad: number;
  archivado: number;
  valCount: number;
  under24Count: number;
  slaPercent: number | null;
}

interface SedeDetailRow {
  name: string;
  idx: number;
  total: number;
  derivado: number;
  observado: number;
  calidad: number;
  archivado: number;
  valCount: number;
  under24Count: number;
  slaPercent: number | null;
  ambitos: AmbitoRow[];
}

interface DataTablesProps {
  sedeDetailsList: SedeDetailRow[];
  selectedSede: number;
  onSedeSelect: (idx: number) => void;
  avgValidationHours: number;
}

export const DataTables: React.FC<DataTablesProps> = ({
  sedeDetailsList,
  selectedSede,
  onSedeSelect,
  avgValidationHours,
}) => {
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

  // Track expanded sedes
  const [expandedSedes, setExpandedSedes] = useState<Record<number, boolean>>({});

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'derivado' | 'observado' | 'calidad' | 'archivado' | 'total' | 'slaPercent' | 'percent'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Helper to format numbers with separators
  const formatNum = (num: number) => {
    return num.toLocaleString('es-PE');
  };

  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent filtering when clicking expand chevron
    setExpandedSedes((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleRowClick = (idx: number) => {
    if (selectedSede === idx) {
      onSedeSelect(-1); // Deselect
    } else {
      onSedeSelect(idx); // Select/Filter Sede
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to high values first
    }
  };

  const renderSortIndicator = (field: typeof sortField) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: '4px', fontSize: '9px' }}>↕</span>;
    return <span style={{ color: 'var(--primary)', marginLeft: '4px', fontSize: '10px', fontWeight: 'bold' }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  // Sort Sedes and Ambitos hierarchically based on sort state
  const sortedSedes = React.useMemo(() => {
    const list = sedeDetailsList.map(s => {
      const sortedAmbitos = [...s.ambitos].sort((a, b) => {
        const getVal = (row: typeof a) => {
          if (sortField === 'percent') return row.total;
          if (sortField === 'name') return row.name;
          return row[sortField as keyof typeof row] as number | null;
        };

        const valA = getVal(a);
        const valB = getVal(b);

        if (sortField === 'name') {
          return sortDirection === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        } else {
          // For SLA (slaPercent), null values should always stay at the bottom
          if (valA === null && valB === null) return 0;
          if (valA === null) return 1;
          if (valB === null) return -1;

          const numA = valA as number;
          const numB = valB as number;
          return sortDirection === 'asc'
            ? numA - numB
            : numB - numA;
        }
      });
      return { ...s, ambitos: sortedAmbitos };
    });

    list.sort((a, b) => {
      const getVal = (row: typeof a) => {
        if (sortField === 'percent') return row.total;
        if (sortField === 'name') return row.name;
        return row[sortField as keyof typeof row] as number | null;
      };

      const valA = getVal(a);
      const valB = getVal(b);

      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        // For SLA (slaPercent), null values should always stay at the bottom
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        const numA = valA as number;
        const numB = valB as number;
        return sortDirection === 'asc'
          ? numA - numB
          : numB - numA;
      }
    });

    return list;
  }, [sedeDetailsList, sortField, sortDirection]);

  // Calculate Column Totals (Consolidated Sums of all Sedes)
  const totals = sedeDetailsList.reduce(
    (acc, curr) => {
      acc.total += curr.total;
      acc.derivado += curr.derivado;
      acc.observado += curr.observado;
      acc.calidad += curr.calidad;
      acc.archivado += curr.archivado;
      acc.valCount += curr.valCount;
      acc.under24Count += curr.under24Count;
      return acc;
    },
    { total: 0, derivado: 0, observado: 0, calidad: 0, archivado: 0, valCount: 0, under24Count: 0 }
  );

  const getSlaColor = (pct: number | null) => {
    if (pct === null) return 'var(--text-muted)';
    if (pct >= 90) return 'var(--success)';
    if (pct >= 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const overallSla = totals.valCount > 0 ? (totals.under24Count / totals.valCount) * 100 : null;

  return (
    <div ref={cardRef} className="chart-card" style={{ padding: '12px 16px', gap: '12px' }}>
      
      {/* HEADER WITH TITLE & AVERAGE TIME STATS IN LINE */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '4px',
          marginBottom: '4px',
        }}
      >
        <div className="chart-card-title-box">
          <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Ingresos y Estado de Documentos por Sede / Ámbito</h3>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>
            Haga clic en una sede para filtrar, use el cheurón para ver sus ámbitos o en las cabeceras para ordenar.
          </p>
        </div>

        {/* Right Actions: SLA Badge & Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* SLA Hours Badge/Stat in line */}
          <div
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              SLA Promedio de Validación:
            </div>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {avgValidationHours > 0 ? `${avgValidationHours.toFixed(1)} horas` : 'N/A'}
            </span>
          </div>

          {/* Camera Export Button */}
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

      {/* MATRIX HIERARCHICAL TABLE CONTAINER WITH STICKY HEADER/FOOTER */}
      <div 
        style={{ 
          overflowX: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate', // Use separate to allow border collapse simulation with sticky
            borderSpacing: 0,
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
          }}
        >
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <th 
                onClick={() => handleSort('name')}
                className="sortable-th"
                style={{ textAlign: 'left', padding: '5px 8px', fontWeight: '700', color: 'var(--text-primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Sede / Ámbito (ALA) {renderSortIndicator('name')}
              </th>
              <th 
                onClick={() => handleSort('slaPercent')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                SLA % {renderSortIndicator('slaPercent')}
              </th>
              <th 
                onClick={() => handleSort('derivado')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--success)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Derivados {renderSortIndicator('derivado')}
              </th>
              <th 
                onClick={() => handleSort('observado')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--warning)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Observados {renderSortIndicator('observado')}
              </th>
              <th 
                onClick={() => handleSort('calidad')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--warning)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Calidad {renderSortIndicator('calidad')}
              </th>
              <th 
                onClick={() => handleSort('archivado')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--danger)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Archivados {renderSortIndicator('archivado')}
              </th>
              <th 
                onClick={() => handleSort('total')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                Total {renderSortIndicator('total')}
              </th>
              <th 
                onClick={() => handleSort('percent')}
                className="sortable-th"
                style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#0a0d24', borderBottom: '2px solid rgba(255,255,255,0.12)' }}
              >
                % {renderSortIndicator('percent')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSedes.map((row) => {
              const isSelected = selectedSede === row.idx;
              const isExpanded = !!expandedSedes[row.idx];

              return (
                <React.Fragment key={row.idx}>
                  {/* Sede (Parent Row) */}
                  <tr
                    onClick={() => handleRowClick(row.idx)}
                    style={{
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="sede-row"
                  >
                    <td style={{ 
                       padding: '4px 8px', 
                       display: 'flex', 
                       alignItems: 'center', 
                       gap: '4px',
                       borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                       borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    }}>
                      <button
                        onClick={(e) => toggleExpand(row.idx, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          padding: '1px 2px',
                          fontSize: '8px',
                          outline: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {row.name}
                      </span>
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '4px 8px', 
                      fontWeight: '700', 
                      color: getSlaColor(row.slaPercent), 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
                    }}>
                      {row.slaPercent !== null ? `${row.slaPercent.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: '600', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(row.derivado)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(row.observado)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(row.calidad)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(row.archivado)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {formatNum(row.total)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {totals.total > 0 ? `${((row.total / totals.total) * 100).toFixed(1)}%` : '0.0%'}
                    </td>
                  </tr>

                  {/* Nested Ámbitos (Child Rows) */}
                  {isExpanded && row.ambitos.map((amb, aIdx) => (
                    <tr
                      key={`${row.idx}-amb-${aIdx}`}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        opacity: 0.85,
                      }}
                    >
                      <td style={{ 
                        padding: '3px 8px 3px 24px', 
                        color: 'var(--text-secondary)', 
                        fontStyle: 'italic',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.02)' 
                      }}>
                        ↳ {amb.name}
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        padding: '3px 8px', 
                        fontWeight: '600',
                        color: getSlaColor(amb.slaPercent), 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.02)' 
                      }}>
                        {amb.slaPercent !== null ? `${amb.slaPercent.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {formatNum(amb.derivado)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {formatNum(amb.observado)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {formatNum(amb.calidad)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {formatNum(amb.archivado)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {formatNum(amb.total)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '3px 8px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        {totals.total > 0 ? `${((amb.total / totals.total) * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* GRAND TOTALS ROW (Sticky at bottom) */}
            <tr
              style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
              }}
            >
              <td style={{ padding: '5px 8px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                TOTAL GENERAL
              </td>
              <td style={{ 
                textAlign: 'right', 
                padding: '5px 8px', 
                fontWeight: '800', 
                color: getSlaColor(overallSla), 
                backgroundColor: '#0d112d', 
                borderTop: '2px solid rgba(255, 255, 255, 0.2)' 
              }}>
                {overallSla !== null ? `${overallSla.toFixed(1)}%` : '-'}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--success)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totals.derivado)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--warning)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totals.observado)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--warning)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totals.calidad)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--danger)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totals.archivado)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                {formatNum(totals.total)}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#0d112d', borderTop: '2px solid rgba(255, 255, 255, 0.2)' }}>
                100.0%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
