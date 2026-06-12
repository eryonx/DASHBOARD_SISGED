import React, { useState, useMemo, useEffect } from 'react';
import { DestinationTable } from './DestinationTable';

interface Metadata {
  sedes: string[];
  ambitos: string[];
  users: string[];
  procedimientos: string[];
  procedimientos_tupa: number[];
  procedimientos_notupa: number[];
  dest_sedes: string[];
  dest_grupos: string[];
  dest_oficinas: string[];
}

type RecordTuple = [
  number, // 0: origen (0=digital, 1=fisico)
  number, // 1: clasif (0=nuevo, 1=anexo)
  number, // 2: tupa (0=tupa, 1=notupa)
  number, // 3: est_d (0=derivado, 1=archivado, 2=calidad, 3=observado)
  number, // 4: est_c (0=atendido, 1=pendiente, 2=anulado, 3=observado)
  number, // 5: s_idx (sede index)
  number, // 6: a_idx (ambito index)
  number, // 7: u_idx (user index)
  string, // 8: date_str (YYYY-MM-DD)
  number | null, // 9: val_h (validation hours)
  number, // 10: p_idx (procedimiento index)
  number, // 11: dest_s_idx
  number, // 12: dest_g_idx
  number  // 13: dest_o_idx
];

interface DashboardData {
  metadata: Metadata;
  records: RecordTuple[];
}

interface ExecutiveDashboardProps {
  data: DashboardData;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ data }) => {
  // Simplified Executive Filters State
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterSede, setFilterSede] = useState<number>(-1);
  const [filterOrigen, setFilterOrigen] = useState<number>(-1);
  const [filterEstadoCut, setFilterEstadoCut] = useState<number>(-1); // -1 = Todos, 0=Atendido, 1=Pendiente, 2=Anulado, 3=Observado

  // Compute date limits based on dataset
  const { minDate, maxDate } = useMemo(() => {
    if (data.records.length === 0) return { minDate: '', maxDate: '' };
    let min = '9999-12-31';
    let max = '0000-01-01';

    for (let i = 0; i < data.records.length; i++) {
      const dStr = data.records[i][8];
      if (dStr) {
        if (dStr < min) min = dStr;
        if (dStr > max) max = dStr;
      }
    }
    return { minDate: min, maxDate: max };
  }, [data]);

  // Set default dates
  useEffect(() => {
    if (minDate && maxDate && !filterStartDate) {
      setFilterStartDate(minDate);
      setFilterEndDate(maxDate);
    }
  }, [minDate, maxDate]);

  // Reset filters
  const handleClearFilters = () => {
    setFilterStartDate(minDate);
    setFilterEndDate(maxDate);
    setFilterSede(-1);
    setFilterOrigen(-1);
    setFilterEstadoCut(-1);
  };



  // Main evaluation logic: Filter for CUT Único (clasif === 0) and apply filters
  const executiveMetrics = useMemo(() => {
    // Baseline globals (unfiltered by KPI card status, but filtered by headers)
    let totalCuts = 0;
    let atendidoCount = 0;
    let pendienteCount = 0;
    let anuladoCount = 0;
    let observadoCount = 0;

    // Destination grouping Map
    const destMap: Record<number, Record<number, Record<number, number>>> = {};

    const records = data.records;
    const len = records.length;

    for (let i = 0; i < len; i++) {
      const rec = records[i];
      const r_origin = rec[0];
      const r_clasif = rec[1];
      const r_est_c = rec[4];
      const r_sede = rec[5];
      const r_date = rec[8];

      // 1. STRICT EXECUTIVE FILTER: CUT Único (clasif === 0 / Nuevo)
      if (r_clasif !== 0) continue;

      // 2. Apply Header Filters
      if (filterStartDate && r_date < filterStartDate) continue;
      if (filterEndDate && r_date > filterEndDate) continue;
      if (filterSede !== -1 && r_sede !== filterSede) continue;
      if (filterOrigen !== -1 && r_origin !== filterOrigen) continue;

      // 3. Count basic parameters (baseline globals)
      totalCuts++;

      // Count by Estado de CUT (est_c: 0=atendido, 1=pendiente, 2=anulado, 3=observado)
      if (r_est_c === 0) atendidoCount++;
      else if (r_est_c === 1) pendienteCount++;
      else if (r_est_c === 2) anuladoCount++;
      else if (r_est_c === 3) observadoCount++;

      // --- KPI/ESTADO CUT FILTER INTRUSION ---
      if (filterEstadoCut !== -1 && r_est_c !== filterEstadoCut) continue;
      // ----------------------------------------

      // Destination grouping
      const r_dest_s = rec[11];
      const r_dest_g = rec[12];
      const r_dest_o = rec[13];
      if (r_dest_s !== undefined && r_dest_s !== -1) {
        if (!destMap[r_dest_s]) destMap[r_dest_s] = {};
        if (!destMap[r_dest_s][r_dest_g]) destMap[r_dest_s][r_dest_g] = {};
        destMap[r_dest_s][r_dest_g][r_dest_o] = (destMap[r_dest_s][r_dest_g][r_dest_o] || 0) + 1;
      }
    }

    return {
      totalCuts,
      atendidoCount,
      pendienteCount,
      anuladoCount,
      observadoCount,
      destinationDetailsList: (data.metadata.dest_sedes || []).map((name, sIdx) => {
        const groupsMap = destMap[sIdx] || {};
        const groups = Object.keys(groupsMap).map((gIdxStr) => {
          const gIdx = Number(gIdxStr);
          const oficinasMap = groupsMap[gIdx] || {};
          const oficinas = Object.keys(oficinasMap).map((oIdxStr) => {
            const oIdx = Number(oIdxStr);
            const total = oficinasMap[oIdx] || 0;
            return {
              name: data.metadata.dest_oficinas[oIdx] || 'OTRA',
              idx: oIdx,
              total,
            };
          }).sort((a, b) => b.total - a.total);

          const groupTotal = oficinas.reduce((sum, item) => sum + item.total, 0);

          return {
            name: data.metadata.dest_grupos[gIdx] || 'OTROS',
            idx: gIdx,
            total: groupTotal,
            oficinas,
          };
        }).sort((a, b) => b.total - a.total);

        const sedeTotal = groups.reduce((sum, item) => sum + item.total, 0);

        return {
          name,
          idx: sIdx,
          total: sedeTotal,
          grupos: groups,
        };
      }).sort((a, b) => b.total - a.total),
    };
  }, [data, filterStartDate, filterEndDate, filterSede, filterOrigen, filterEstadoCut]);

  const getPercent = (count: number) => {
    if (executiveMetrics.totalCuts === 0) return '0.0%';
    return `${((count / executiveMetrics.totalCuts) * 100).toFixed(1)}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 1. EXECUTIVE SIMPLIFIED FILTERS BAR */}
      <div className="inline-filters-bar" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
        <div className="inline-filter-item">
          <span className="inline-filter-label">Fecha Inicio:</span>
          <input
            type="date"
            className="inline-filter-input"
            value={filterStartDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div className="inline-filter-item">
          <span className="inline-filter-label">Fecha Fin:</span>
          <input
            type="date"
            className="inline-filter-input"
            value={filterEndDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
        <div className="inline-filter-item">
          <span className="inline-filter-label">Sede:</span>
          <select
            className="inline-filter-select"
            value={filterSede}
            onChange={(e) => setFilterSede(Number(e.target.value))}
          >
            <option value="-1">Todas las Sedes</option>
            {data.metadata.sedes.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
        </div>
        <div className="inline-filter-item">
          <span className="inline-filter-label">Origen:</span>
          <select
            className="inline-filter-select"
            value={filterOrigen}
            onChange={(e) => setFilterOrigen(Number(e.target.value))}
          >
            <option value="-1">Todos los Orígenes</option>
            <option value="0">Digital</option>
            <option value="1">Físico</option>
          </select>
        </div>
        <button
          className="btn-outline btn-clear-filters"
          onClick={handleClearFilters}
          title="Limpiar todos los filtros"
        >
          ✕
        </button>
      </div>

      {/* 2. METHODOLOGY EXPLANATORY NOTE */}
      <div className="executive-methodology-note" style={{
        backgroundColor: 'rgba(56, 189, 248, 0.04)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>💡</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--primary)' }}>Enfoque Metodológico de CUT Único (Clasificación: Nuevo)</strong>:
          Este panel estratégico analiza los expedientes filtrándolos estrictamente bajo el estado inicial de la clasificación <strong>Nuevo</strong>.
          Esto aísla los documentos principales y códigos únicos de trámite (CUT), descartando anexos, respuestas y subsanaciones subsecuentes.
          Permite a la Alta Dirección comprender la demanda neta, el tiempo real de envejecimiento de los expedientes y la capacidad real de conclusión de la institución.
        </div>
      </div>

      {/* 3. EXECUTIVE KPI CARDS GRID */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>

        {/* KPI 1: TOTAL CUTS */}
        <div 
          className={`kpi-card ${filterEstadoCut === -1 ? 'active' : ''}`} 
          style={{ minHeight: '84px' }}
          onClick={() => setFilterEstadoCut(-1)}
          title="Ver todos los expedientes (Restablecer filtro)"
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--primary)' }}>TOTAL CUT</span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{executiveMetrics.totalCuts.toLocaleString('es-PE')}</div>
            <span className="kpi-badge blue">100%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Nuevos expedientes de entrada
          </div>
        </div>

        {/* KPI 2: PENDIENTES */}
        <div 
          className={`kpi-card ${filterEstadoCut === 1 ? 'active' : ''}`} 
          style={{ minHeight: '84px' }}
          onClick={() => setFilterEstadoCut(filterEstadoCut === 1 ? -1 : 1)}
          title="Filtrar por expedientes Pendientes"
        >
          <div className="kpi-title-row">
            <span className="kpi-title">PENDIENTES</span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{executiveMetrics.pendienteCount.toLocaleString('es-PE')}</div>
            <span className="kpi-badge blue">{getPercent(executiveMetrics.pendienteCount)}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Expedientes activos en trámite
          </div>
        </div>

        {/* KPI 3: ATENDIDOS */}
        <div 
          className={`kpi-card green ${filterEstadoCut === 0 ? 'active' : ''}`} 
          style={{ minHeight: '84px' }}
          onClick={() => setFilterEstadoCut(filterEstadoCut === 0 ? -1 : 0)}
          title="Filtrar por expedientes Atendidos"
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--success)' }}>ATENDIDOS</span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{executiveMetrics.atendidoCount.toLocaleString('es-PE')}</div>
            <span className="kpi-badge green">{getPercent(executiveMetrics.atendidoCount)}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Expedientes cerrados y archivados
          </div>
        </div>

        {/* KPI 4: OBSERVADOS */}
        <div 
          className={`kpi-card orange ${filterEstadoCut === 3 ? 'active' : ''}`} 
          style={{ minHeight: '84px' }}
          onClick={() => setFilterEstadoCut(filterEstadoCut === 3 ? -1 : 3)}
          title="Filtrar por expedientes Observados"
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--warning)' }}>OBSERVADOS</span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{executiveMetrics.observadoCount.toLocaleString('es-PE')}</div>
            <span className="kpi-badge orange">{getPercent(executiveMetrics.observadoCount)}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Requieren acción del ciudadano o subsanar
          </div>
        </div>

        {/* KPI 5: ANULADOS */}
        <div 
          className={`kpi-card red ${filterEstadoCut === 2 ? 'active' : ''}`} 
          style={{ minHeight: '84px' }}
          onClick={() => setFilterEstadoCut(filterEstadoCut === 2 ? -1 : 2)}
          title="Filtrar por expedientes Anulados"
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--danger)' }}>ANULADOS</span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{executiveMetrics.anuladoCount.toLocaleString('es-PE')}</div>
            <span className="kpi-badge red">{getPercent(executiveMetrics.anuladoCount)}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Expedientes anulados formalmente
          </div>
        </div>

      </div>

      {/* Destination analysis (Sede / Grupo / Oficina) for Unique CUTs */}
      <DestinationTable destinationDetailsList={executiveMetrics.destinationDetailsList} />

    </div>
  );
};
