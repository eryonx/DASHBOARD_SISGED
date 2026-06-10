import React, { useState, useMemo, useEffect } from 'react';

import { InternoFiltersBar } from './InternoFiltersBar';

// Interfaces for structured data — 4-level hierarchy:
// SEDE (national) → GRUPO (AAA) → ULTIMO SEDE (office) → ULTIMO ESCRITORIO (person)

interface UltimoSedeRecord {
  name: string;
  total: number;
  noTupa: number;
  tupa: number;
  escritorios: Record<string, { total: number, noTupa: number, tupa: number }>; // person name → stats
}

interface GrupoRecord {
  name: string;
  idx: number;
  total: number;
  noTupa: number;
  tupa: number;
  ultimoSedes: UltimoSedeRecord[];
}

interface Metadata {
  grupos: string[];
  ultimo_sedes: string[];
  ultimo_escritorios: string[];
  bandejas: string[];
  procedimientos: string[];
  dates: string[];
}

type InternoRecordTuple = [
  number, // 0: grupo_idx
  number, // 1: ultimo_sede_idx
  number, // 2: ultimo_escritorio_idx
  number, // 3: tupa_code (0=TUPA, 1=NO TUPA)
  number, // 4: proc_idx
  number, // 5: creation_year
  number, // 6: ingreso_year
  number, // 7: bandeja_idx
  number, // 8: date_idx
  number  // 9: origen_code (0=Interno, 1=Externo)
];

interface DashboardData {
  metadata: Metadata;
  records: InternoRecordTuple[];
}

export const InternoDashboard: React.FC = () => {
  // New Filters State
  const [filterSede, setFilterSede] = useState<number>(-1);
  const [filterGrupo, setFilterGrupo] = useState<number>(-1);
  const [filterOficina, setFilterOficina] = useState<number>(-1);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterOrigen, setFilterOrigen] = useState<number>(-1);
  const [filterTupa, setFilterTupa] = useState<number>(-1);
  const [filterBandeja, setFilterBandeja] = useState<number>(-1);
  const [filterProcedimiento, setFilterProcedimiento] = useState<number>(-1);

  // ResizeObserver for Drilldown Chart
  const svgContainerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(350);

  // Drilldown Vertical Chart State
  // Path stores the current navigation level: [] = Level 0 (Ámbitos), [grupoIdx] = Level 1 (Sedes), [grupoIdx, sedeIdx] = Level 2 (Profesionales)
  const [drilldownPath, setDrilldownPath] = useState<number[]>([]);

  // Data states
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !svgContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(svgContainerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  // Load real data from server
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/interno_dashboard_data.json`)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar el archivo de datos del servidor.');
        return res.json();
      })
      .then((jsonData: DashboardData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Error al cargar la base de datos de expedientes internos.');
        setLoading(false);
      });
  }, []);

  // Compute allowed Oficinas (Ultimo Sedes) based on selected Grupo
  const allowedOficinas = useMemo(() => {
    if (!data) return [];
    if (filterGrupo === -1) return [];
    const set = new Set<number>();
    for (let i = 0; i < data.records.length; i++) {
      if (data.records[i][0] === filterGrupo) {
        set.add(data.records[i][1]);
      }
    }
    return Array.from(set).sort((a, b) => {
      const nameA = data.metadata.ultimo_sedes[a] || '';
      const nameB = data.metadata.ultimo_sedes[b] || '';
      return nameA.localeCompare(nameB);
    });
  }, [data, filterGrupo]);

  // Handle dates setup
  const { minDate, maxDate } = useMemo(() => {
    if (!data || data.metadata.dates.length === 0) return { minDate: '', maxDate: '' };
    const d = data.metadata.dates;
    return { minDate: d[0], maxDate: d[d.length - 1] };
  }, [data]);

  useEffect(() => {
    if (minDate && maxDate && !filterStartDate) {
      setFilterStartDate(minDate);
      setFilterEndDate(maxDate);
    }
  }, [minDate, maxDate]);

  // Clear all filters
  const handleClearFilters = () => {
    setFilterSede(-1);
    setFilterGrupo(-1);
    setFilterOficina(-1);
    setFilterOrigen(-1);
    setFilterTupa(-1);
    setFilterBandeja(-1);
    setFilterProcedimiento(-1);
    setFilterStartDate(minDate);
    setFilterEndDate(maxDate);
  };

  // Dynamically aggregate raw records to match the GrupoRecord[] hierarchy
  const rawData: GrupoRecord[] = useMemo(() => {
    if (!data) return [];

    const gruposMap: Record<number, GrupoRecord> = {};
    data.metadata.grupos.forEach((grupoName, idx) => {
      gruposMap[idx] = {
        name: grupoName,
        idx,
        total: 0,
        noTupa: 0,
        tupa: 0,
        ultimoSedes: []
      };
    });

    const usedesMap: Record<number, Record<number, UltimoSedeRecord>> = {};

    data.records.forEach(rec => {
      const [gIdx, usIdx, ueIdx, tupaCode, procIdx, _creationYear, _ingresoYear, bandejaIdx, dateIdx, origenCode] = rec;

      const tupaVal = tupaCode === 0 ? 1 : 0;
      const noTupaVal = tupaCode === 1 ? 1 : 0;

      // Apply Filters
      if (filterSede === 0) return; // Sede Central has no records in this db yet
      if (filterGrupo !== -1 && gIdx !== filterGrupo) return;
      if (filterOficina !== -1 && usIdx !== filterOficina) return;
      if (filterTupa !== -1 && tupaCode !== filterTupa) return;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) return;
      }

      const grupo = gruposMap[gIdx];
      if (!grupo) return;

      grupo.total += 1;
      grupo.noTupa += noTupaVal;
      grupo.tupa += tupaVal;

      if (!usedesMap[gIdx]) usedesMap[gIdx] = {};
      if (!usedesMap[gIdx][usIdx]) {
        usedesMap[gIdx][usIdx] = {
          name: data.metadata.ultimo_sedes[usIdx] || 'Sin Oficina',
          total: 0, noTupa: 0, tupa: 0, escritorios: {}
        };
      }
      const sedeEntry = usedesMap[gIdx][usIdx];
      sedeEntry.total += 1;
      sedeEntry.noTupa += noTupaVal;
      sedeEntry.tupa += tupaVal;
      const ueName = data.metadata.ultimo_escritorios[ueIdx] || 'Sin Asignar';
      if (!sedeEntry.escritorios[ueName]) {
        sedeEntry.escritorios[ueName] = { total: 0, noTupa: 0, tupa: 0 };
      }
      sedeEntry.escritorios[ueName].total += 1;
      sedeEntry.escritorios[ueName].noTupa += noTupaVal;
      sedeEntry.escritorios[ueName].tupa += tupaVal;
    });

    data.metadata.grupos.forEach((_, gIdx) => {
      const grupo = gruposMap[gIdx];
      if (usedesMap[gIdx]) {
        grupo.ultimoSedes = Object.values(usedesMap[gIdx]).sort((a, b) => b.total - a.total);
      }
    });

    return Object.values(gruposMap);
  }, [data, filterSede, filterGrupo, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate]);

  // Sort rawData by total descending for the hierarchy chart
  const sortedRawData = useMemo(() => {
    return [...rawData].sort((a, b) => b.total - a.total);
  }, [rawData]);

  // Filter and process data dynamically with 100% accuracy at record level
  const metrics = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        noTupa: 0,
        tupa: 0,
        listToDisplay: [] as { name: string, total: number, noTupa: number, tupa: number }[],
        gruposStaticList: [] as { name: string, total: number, noTupa: number, tupa: number }[],
        yearsCreation: {} as Record<number, number>,
        yearsEscritorio: {} as Record<number, number>,
        bandejas: {} as Record<string, number>,
        procedures: {} as Record<string, { total: number, noTupa: number, tupa: number }>,
        bottleneckOffice: null as { name: string, count: number } | null,
        topProcedure: null as { name: string, count: number } | null,
        oldestYear: null as number | null
      };
    }

    let totalPendientes = 0;
    let noTupaCount = 0;
    let tupaCount = 0;

    const yearsCreation: Record<number, number> = {};
    const yearsEscritorio: Record<number, number> = {};
    const bandejas: Record<string, number> = {};
    const procedures: Record<string, { total: number, noTupa: number, tupa: number }> = {};

    const groupCounts: Record<string, { total: number; noTupa: number; tupa: number }> = {};
    const staticGroupCounts: Record<string, { total: number; noTupa: number; tupa: number }> = {};

    data.records.forEach(rec => {
      const [gIdx, usIdx, _, tupaCode, procIdx, creationYear, ingresoYear, bandejaIdx, dateIdx, origenCode] = rec;

      // Apply same filters for metrics
      if (filterSede === 0) return; // Sede Central has no records in this db yet
      if (filterGrupo !== -1 && gIdx !== filterGrupo) return;
      if (filterOficina !== -1 && usIdx !== filterOficina) return;
      if (filterTupa !== -1 && tupaCode !== filterTupa) return;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) return;
      }

      const grupoName = data.metadata.grupos[gIdx];
      const ultimoSedeName = data.metadata.ultimo_sedes[usIdx];
      const tupaVal = tupaCode === 0 ? 1 : 0;
      const noTupaVal = tupaCode === 1 ? 1 : 0;
      const bName = data.metadata.bandejas[bandejaIdx];
      const pName = data.metadata.procedimientos[procIdx];

      // Increment metrics
      totalPendientes += 1;
      noTupaCount += noTupaVal;
      tupaCount += tupaVal;

      yearsCreation[creationYear] = (yearsCreation[creationYear] || 0) + 1;
      yearsEscritorio[ingresoYear] = (yearsEscritorio[ingresoYear] || 0) + 1;
      bandejas[bName] = (bandejas[bName] || 0) + 1;
      if (!procedures[pName]) procedures[pName] = { total: 0, noTupa: 0, tupa: 0 };
      procedures[pName].total += 1;
      procedures[pName].noTupa += noTupaVal;
      procedures[pName].tupa += tupaVal;

      // Grouping (Dynamic for Top 5)
      const groupKey = filterGrupo !== -1 ? ultimoSedeName : grupoName;
      if (!groupCounts[groupKey]) {
        groupCounts[groupKey] = { total: 0, noTupa: 0, tupa: 0 };
      }
      groupCounts[groupKey].total += 1;
      groupCounts[groupKey].noTupa += noTupaVal;
      groupCounts[groupKey].tupa += tupaVal;

      // Grouping (Static by Grupo for Stacked Bar Chart)
      if (!staticGroupCounts[grupoName]) {
        staticGroupCounts[grupoName] = { total: 0, noTupa: 0, tupa: 0 };
      }
      staticGroupCounts[grupoName].total += 1;
      staticGroupCounts[grupoName].noTupa += noTupaVal;
      staticGroupCounts[grupoName].tupa += tupaVal;
    });

    const listToDisplay = Object.entries(groupCounts).map(([name, counts]) => ({
      name,
      total: counts.total,
      noTupa: counts.noTupa,
      tupa: counts.tupa
    })).sort((a, b) => b.total - a.total);

    const gruposStaticList = Object.entries(staticGroupCounts).map(([name, counts]) => ({
      name,
      total: counts.total,
      noTupa: counts.noTupa,
      tupa: counts.tupa
    })).sort((a, b) => b.total - a.total);

    // Fill missing keys with 0s to avoid empty lists if filtered
    if (filterGrupo !== -1) {
      const grupo = rawData.find(a => a.idx === filterGrupo);
      if (grupo) {
        grupo.ultimoSedes.forEach(us => {
          if (filterOficina !== -1 && us.name !== data.metadata.ultimo_sedes[filterOficina]) return;
          if (!groupCounts[us.name]) {
            listToDisplay.push({ name: us.name, total: 0, noTupa: 0, tupa: 0 });
          }
        });
      }
    } else {
      rawData.forEach(grupo => {
        if (!groupCounts[grupo.name]) {
          listToDisplay.push({ name: grupo.name, total: 0, noTupa: 0, tupa: 0 });
        }
      });
    }

    rawData.forEach(grupo => {
      if (!staticGroupCounts[grupo.name]) {
        gruposStaticList.push({ name: grupo.name, total: 0, noTupa: 0, tupa: 0 });
      }
    });

    const topProcEntry = Object.entries(procedures).sort((a, b) => b[1].total - a[1].total)[0];
    const topProcedure = topProcEntry ? { name: topProcEntry[0], count: topProcEntry[1].total } : null;

    const sedeCounts: Record<string, number> = {};
    rawData.forEach(grupo => {
      grupo.ultimoSedes.forEach(us => {
        sedeCounts[us.name] = (sedeCounts[us.name] || 0) + us.total;
      });
    });
    const bottleneckEntry = Object.entries(sedeCounts).sort((a, b) => b[1] - a[1])[0];
    const bottleneckOffice = bottleneckEntry ? { name: bottleneckEntry[0], count: bottleneckEntry[1] } : null;

    const years = Object.keys(yearsCreation).map(Number);
    const oldestYear = years.length > 0 ? Math.min(...years) : null;

    return {
      total: totalPendientes,
      noTupa: noTupaCount,
      tupa: tupaCount,
      listToDisplay,
      gruposStaticList,
      yearsCreation,
      yearsEscritorio,
      bandejas,
      procedures,
      bottleneckOffice,
      topProcedure,
      oldestYear
    };
  }, [data, rawData, filterGrupo, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate, filterSede]);

  if (loading) {
    return (
      <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: '20px', background: 'rgba(13, 17, 45, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(56, 189, 248, 0.1)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'rotateGear 1.2s linear infinite'
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: '700', letterSpacing: '0.5px' }}>
          Cargando base de datos de expedientes internos pendientes...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.04)' }}>
        <div style={{ color: '#ef4444', fontSize: '32px' }}>⚠️</div>
        <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: '750' }}>{error || 'Error al cargar los datos del dashboard.'}</p>
        <button className="btn-outline" onClick={() => window.location.reload()} style={{ padding: '8px 16px', fontSize: '12px' }}>
          Reintentar
        </button>
      </div>
    );
  }



  // Helper to format numbers with separators
  const formatNum = (num: number) => num.toLocaleString('es-PE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <InternoFiltersBar
        sede={filterSede} onSedeChange={(v) => { setFilterSede(v); setFilterGrupo(-1); setFilterOficina(-1); }}
        grupo={filterGrupo} onGrupoChange={(v) => { setFilterGrupo(v); setFilterOficina(-1); }} gruposList={data.metadata.grupos}
        oficina={filterOficina} onOficinaChange={setFilterOficina} oficinasList={data.metadata.ultimo_sedes} allowedOficinas={allowedOficinas}
        startDate={filterStartDate} endDate={filterEndDate} minDate={minDate} maxDate={maxDate} onStartDateChange={setFilterStartDate} onEndDateChange={setFilterEndDate}
        origen={filterOrigen} onOrigenChange={setFilterOrigen}
        bandeja={filterBandeja} onBandejaChange={setFilterBandeja} bandejasList={data.metadata.bandejas}
        tupa={filterTupa} onTupaChange={setFilterTupa}
        procedimiento={filterProcedimiento} onProcedimientoChange={setFilterProcedimiento} procedimientosList={data.metadata.procedimientos}
        onClearFilters={handleClearFilters}
      />

      {/* 3. Main KPI Indicator Cards Row */}
      <div className="kpi-row-3col" style={{ marginBottom: '8px' }}>
        {/* Card 1: TOTAL PENDIENTES */}
        <div
          className={`kpi-card ${filterTupa === -1 ? 'active' : ''}`}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px' }}
          onClick={() => setFilterTupa(-1)}
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: filterTupa === -1 ? 'var(--primary)' : 'var(--text-secondary)' }}>
              TOTAL PENDIENTES
            </span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatNum(metrics.total)}</div>
            <span className="kpi-badge blue">100%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Todos los expedientes internos en trámite
          </div>
        </div>

        {/* Card 2: PENDIENTES NO TUPA */}
        <div
          className={`kpi-card green ${filterTupa === 1 ? 'active' : ''}`}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px' }}
          onClick={() => setFilterTupa(1)}
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: filterTupa === 1 ? 'var(--success)' : 'var(--text-secondary)' }}>
              PENDIENTES NO TUPA
            </span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatNum(metrics.noTupa)}</div>
            <span className="kpi-badge green">
              {metrics.total > 0 ? ((metrics.noTupa / metrics.total) * 100).toFixed(1) : '86.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Trámites internos libres de cobro TUPA
          </div>
        </div>

        {/* Card 3: PENDIENTES TUPA */}
        <div
          className={`kpi-card orange ${filterTupa === 0 ? 'active' : ''}`}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px' }}
          onClick={() => setFilterTupa(0)}
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: filterTupa === 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
              PENDIENTES TUPA
            </span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatNum(metrics.tupa)}</div>
            <span className="kpi-badge orange">
              {metrics.total > 0 ? ((metrics.tupa / metrics.total) * 100).toFixed(1) : '14.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Procedimientos regulados administrativamente
          </div>
        </div>

      </div>

      {/* 4. Row 1: Horizontal Desconcentrados Bar Chart & Vertical Tupa/NoTupa comparison */}
      <div className="interno-grid-row1">

        {/* Card 1: Horizontal Bar Chart (Total by Grupo) */}
        <div className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="chart-card-title-box">
              <h3>DISTRIBUCIÓN POR ÁMBITO (AAA)</h3>
              <p>Clasificación de expedientes por dependencia territorial.</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {metrics.gruposStaticList
              .sort((a, b) => b.total - a.total)
              .map((item, idx) => {
                const maxVal = Math.max(...metrics.gruposStaticList.map(i => i.total), 1);
                const pctTotal = (item.total / maxVal) * 100;
                const colors = ['var(--primary)', '#22d3ee', '#34d399', '#fbbf24', '#f97316'];
                const barColor = colors[idx % colors.length];
                const pctNacional = metrics.total > 0 ? ((item.total / metrics.total) * 100).toFixed(1) : '0.0';

                return (
                  <div key={idx} title={`${pctNacional}% del total nacional`} style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: '700' }}>
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{item.name}</span>
                      <span style={{ color: barColor, fontSize: '11px', fontWeight: '900' }}>{formatNum(item.total)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                        {item.total > 0 && (
                          <div style={{ width: `${pctTotal}%`, height: '100%', backgroundColor: barColor, borderRadius: '3px' }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Card 2: Hierarchical Vertical Drilldown Chart */}
        <div className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3>Desglose Estructural Interactivo</h3>
              <p>Navega la jerarquía de expedientes (Sede → Ámbito → Oficina → Profesional). Haz clic en una columna para profundizar.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontWeight: '700' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #00dfd8, #007cf0)', borderRadius: '50%', boxShadow: '0 0 6px rgba(0,223,216,0.4)' }}></span>
                <span>NO TUPA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #ff0080, #7928ca)', borderRadius: '50%', boxShadow: '0 0 6px rgba(255,0,128,0.4)' }}></span>
                <span>TUPA</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {/* Breadcrumb Navigation */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', fontWeight: '700', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span
                style={{ color: drilldownPath.length === 0 ? 'var(--text-primary)' : 'var(--primary)', cursor: drilldownPath.length === 0 ? 'default' : 'pointer', transition: 'color var(--transition-fast)' }}
                onClick={() => setDrilldownPath([])}
              >
                Nacional (Todos los Ámbitos)
              </span>

              {drilldownPath.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span
                    style={{ color: drilldownPath.length === 1 ? 'var(--text-primary)' : 'var(--primary)', cursor: drilldownPath.length === 1 ? 'default' : 'pointer', transition: 'color var(--transition-fast)' }}
                    onClick={() => setDrilldownPath([drilldownPath[0]])}
                  >
                    {sortedRawData.find(g => g.idx === drilldownPath[0])?.name || 'Ámbito'}
                  </span>
                </>
              )}

              {drilldownPath.length > 1 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {sortedRawData.find(g => g.idx === drilldownPath[0])?.ultimoSedes[drilldownPath[1]]?.name || 'Oficina'}
                  </span>
                </>
              )}
            </div>

            {/* SVG Vertical Chart */}
            <div style={{ flex: 1, minHeight: '350px', marginTop: '12px', position: 'relative', width: '100%' }}>
              <div ref={svgContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {(() => {
                  const level = drilldownPath.length;
                  let currentItems: { id: number | string, name: string, total: number, tupa: number, noTupa: number, rawId?: number }[] = [];

                  if (level === 0) {
                    currentItems = sortedRawData.map(g => ({ id: g.idx, name: g.name, total: g.total, tupa: g.tupa, noTupa: g.noTupa, rawId: g.idx }));
                  } else if (level === 1) {
                    const grupo = sortedRawData.find(g => g.idx === drilldownPath[0]);
                    if (grupo) {
                      currentItems = grupo.ultimoSedes.map((s, idx) => ({ id: idx, name: s.name, total: s.total, tupa: s.tupa, noTupa: s.noTupa, rawId: idx }));
                    }
                  } else if (level === 2) {
                    const grupo = sortedRawData.find(g => g.idx === drilldownPath[0]);
                    if (grupo) {
                      const sede = grupo.ultimoSedes[drilldownPath[1]];
                      if (sede) {
                        currentItems = Object.entries(sede.escritorios)
                          .map(([name, stats], idx) => ({ id: idx, name, total: stats.total, tupa: stats.tupa, noTupa: stats.noTupa }))
                          .sort((a, b) => b.total - a.total);
                      }
                    }
                  }

                  if (currentItems.length === 0) {
                    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No hay datos para mostrar en este nivel.</div>;
                  }

                  const maxVal = Math.max(...currentItems.map(i => Math.max(i.tupa, i.noTupa)), 1); // Grouped bars max height depends on max of individual stacks, not total
                  const barCount = currentItems.length;
                  const svgWidth = Math.max(containerWidth, barCount * 45);
                  const svgHeight = Math.max(350, containerHeight);
                  const chartBottomY = svgHeight - 120;
                  const chartHeight = chartBottomY - 20;

                  return (
                    <div style={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                      <svg width={svgWidth} height={svgHeight}>
                        <defs>
                          <linearGradient id="gradNoTupa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00dfd8" />
                            <stop offset="100%" stopColor="#007cf0" />
                          </linearGradient>
                          <linearGradient id="gradTupa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff0080" />
                            <stop offset="100%" stopColor="#7928ca" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                          <line key={i} x1="40" y1={20 + chartHeight * p} x2={svgWidth - 20} y2={20 + chartHeight * p} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />
                        ))}

                        {/* Bars */}
                        {currentItems.map((item, idx) => {
                          const spacing = (svgWidth - 100) / Math.max(currentItems.length, 1);
                          const groupWidth = Math.min(48, spacing * 0.7);
                          const singleBarWidth = (groupWidth / 2) - 2;

                          // Centered inside its cell
                          const xPosCenter = 60 + spacing * 0.5 + idx * spacing;
                          const xPosNoTupa = xPosCenter - groupWidth / 2;
                          const xPosTupa = xPosCenter + 2;

                          const heightTupa = (item.tupa / maxVal) * chartHeight;
                          const heightNoTupa = (item.noTupa / maxVal) * chartHeight;

                          const yTupa = chartBottomY - heightTupa;
                          const yNoTupa = chartBottomY - heightNoTupa;

                          const shortName = barCount > 15 && item.name.length > 15
                            ? item.name.substring(0, 15) + '...'
                            : item.name;

                          return (
                            <g
                              key={item.id}
                              style={{ cursor: level < 2 ? 'pointer' : 'default', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                              onClick={() => {
                                if (level === 0 && item.rawId !== undefined) {
                                  setDrilldownPath([item.rawId]);
                                } else if (level === 1 && item.rawId !== undefined) {
                                  setDrilldownPath([...drilldownPath, item.rawId]);
                                }
                              }}
                              className="drilldown-bar-group"
                            >
                              <title>{item.name} | Total: {item.total} | TUPA: {item.tupa} | NO TUPA: {item.noTupa}</title>

                              <rect x={xPosCenter - (groupWidth * 0.7)} y="10" width={groupWidth * 1.4} height={chartBottomY + 10} fill="rgba(255,255,255,0.02)" rx="8" style={{ opacity: 0, transition: 'opacity 0.2s' }} className="hover-bg-rect" />

                              {/* Background Tracks */}
                              <rect x={xPosNoTupa} y={20} width={singleBarWidth} height={chartHeight} fill="rgba(255,255,255,0.04)" rx={singleBarWidth / 2} />
                              <rect x={xPosTupa} y={20} width={singleBarWidth} height={chartHeight} fill="rgba(255,255,255,0.04)" rx={singleBarWidth / 2} />

                              {/* Data Bars */}
                              {heightNoTupa > 0 && (
                                <rect x={xPosNoTupa} y={yNoTupa} width={singleBarWidth} height={heightNoTupa} fill="url(#gradNoTupa)" rx={singleBarWidth / 2} className="bar-rect" />
                              )}

                              {heightTupa > 0 && (
                                <rect x={xPosTupa} y={yTupa} width={singleBarWidth} height={heightTupa} fill="url(#gradTupa)" rx={singleBarWidth / 2} className="bar-rect" />
                              )}

                              {/* No TUPA Label */}
                              {heightNoTupa > 0 && (
                                <text x={xPosNoTupa + singleBarWidth / 2} y={yNoTupa - 6} fill="#00dfd8" fontSize="9.5" fontWeight="800" textAnchor="middle">
                                  {formatNum(item.noTupa)}
                                </text>
                              )}

                              {/* TUPA Label */}
                              {heightTupa > 0 && (
                                <text x={xPosTupa + singleBarWidth / 2} y={yTupa - 6} fill="#ff0080" fontSize="9.5" fontWeight="800" textAnchor="middle">
                                  {formatNum(item.tupa)}
                                </text>
                              )}

                              {/* Group Total Text */}
                              <text x={xPosCenter} y={chartBottomY + 16} fill="var(--text-primary)" fontSize="11" fontWeight="800" textAnchor="middle">
                                {formatNum(item.total)}
                              </text>

                              {/* X-Axis Label */}
                              <text
                                x={xPosCenter}
                                y={chartBottomY + 32}
                                fill="var(--text-secondary)"
                                fontSize="10"
                                fontWeight="600"
                                textAnchor="end"
                                transform={`rotate(-40, ${xPosCenter}, ${chartBottomY + 32})`}
                              >
                                {shortName}
                              </text>
                            </g>
                          );
                        })}
                        <line x1="40" y1={chartBottomY} x2={svgWidth - 20} y2={chartBottomY} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Row 2: Three Widgets (Año Creación, Año Escritorio, Bandejas) */}
      <div className="interno-grid-row2">

        {/* Widget 1: ANTIGÜEDAD DE PENDIENTES */}
        <div className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header">
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>ANTIGÜEDAD DE PENDIENTES (FECHA DE CREACIÓN)</h3>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '230px', marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            {Object.keys(metrics.yearsCreation).sort().map((yrStr, idx) => {
              const yr = Number(yrStr);
              const val = metrics.yearsCreation[yr] || 0;
              const maxVal = Math.max(...Object.values(metrics.yearsCreation), 1);
              const pctHeight = (val / maxVal) * 180;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <div style={{ position: 'relative', width: '14px', height: '180px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '14px', display: 'flex', alignItems: 'flex-end', marginTop: '12px' }}>
                    {val > 0 && (
                      <span style={{ position: 'absolute', bottom: `${pctHeight + 4}px`, left: '50%', transform: 'translateX(-50%)', fontSize: '8.5px', fontWeight: '800', color: '#00dfd8' }}>
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: `${pctHeight}px`,
                        background: 'linear-gradient(180deg, #00dfd8, #007cf0)',
                        borderRadius: '14px',
                        opacity: val > 0 ? 1 : 0
                      }}
                    ></div>
                  </div>
                  <div style={{ height: '10px' }}>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      {yr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 2: AÑO DE INGRESO ULTIMO ESCRITORIO */}
        <div className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header">
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>AÑO DE INGRESO ULTIMO ESCRITORIO</h3>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '230px', marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            {Object.keys(metrics.yearsEscritorio).sort().map((yrStr, idx) => {
              const yr = Number(yrStr);
              const val = metrics.yearsEscritorio[yr] || 0;
              const maxVal = Math.max(...Object.values(metrics.yearsEscritorio), 1);
              const pctHeight = (val / maxVal) * 180;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <div style={{ position: 'relative', width: '16px', height: '180px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '16px', display: 'flex', alignItems: 'flex-end', marginTop: '12px' }}>
                    {val > 0 && (
                      <span style={{ position: 'absolute', bottom: `${pctHeight + 4}px`, left: '50%', transform: 'translateX(-50%)', fontSize: '8.5px', fontWeight: '800', color: '#ff0080' }}>
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: `${pctHeight}px`,
                        background: 'linear-gradient(180deg, #ff0080, #7928ca)',
                        borderRadius: '16px',
                        opacity: val > 0 ? 1 : 0
                      }}
                    ></div>
                  </div>
                  <div style={{ height: '10px' }}>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      {yr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 4: POR BANDEJAS */}
        <div className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header">
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>POR BANDEJAS</h3>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '230px', marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', gap: '8px' }}>
            {Object.keys(metrics.bandejas).map((bKey, idx) => {
              const val = metrics.bandejas[bKey] || 0;
              const maxVal = Math.max(...Object.values(metrics.bandejas), 1);
              const pctHeight = (val / maxVal) * 180;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <div style={{ position: 'relative', width: '18px', height: '180px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '18px', display: 'flex', alignItems: 'flex-end', marginTop: '12px' }} title={`${bKey}: ${formatNum(val)}`}>
                    {val > 0 && (
                      <span style={{ position: 'absolute', bottom: `${pctHeight + 4}px`, left: '50%', transform: 'translateX(-50%)', fontSize: '8.5px', fontWeight: '800', color: '#f59e0b' }}>
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: `${pctHeight}px`,
                        background: 'linear-gradient(180deg, #f59e0b, #ea580c)',
                        borderRadius: '18px',
                        opacity: 1
                      }}
                    ></div>
                  </div>
                  <div style={{ height: 'auto', minHeight: '30px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', padding: '0 2px' }}
                      title={bKey}
                    >
                      {bKey}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>







      {/* 6. Row 3: Vertical Bar Chart for Procedures */}
      <div className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="chart-card-title-box">
            <h3>PROCEDIMIENTOS (TUPA / NO TUPA)</h3>
            <p>Clasificación de expedientes por tipo de trámite. (Mostrando Top 30)</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontWeight: '700' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #00dfd8, #007cf0)', borderRadius: '50%' }}></span>
              <span>NO TUPA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #f59e0b, #ea580c)', borderRadius: '50%' }}></span>
              <span>TUPA</span>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', display: 'flex', alignItems: 'flex-end', height: '280px', marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', gap: '16px', width: '100%', minWidth: 0 }}>
          {Object.entries(metrics.procedures)
            .filter(([_, count]) => count.total > 0)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 30) // Limit to top 30
            .map(([name, count], idx) => {
              const maxVal = Math.max(...Object.values(metrics.procedures).map(p => p.total), 1);
              const pctHeight = (count.total / maxVal) * 200;

              const isTupa = count.tupa > count.noTupa;
              const barGradient = isTupa ? 'linear-gradient(180deg, #f59e0b, #ea580c)' : 'linear-gradient(180deg, #00dfd8, #007cf0)';
              const textColor = isTupa ? '#f59e0b' : '#00dfd8';

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px', gap: '6px' }}>
                  <div style={{ position: 'relative', width: '20px', height: '200px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '20px', display: 'flex', alignItems: 'flex-end', marginTop: '12px' }} title={`${name}: ${formatNum(count.total)}`}>
                    {count.total > 0 && (
                      <span style={{ position: 'absolute', bottom: `${pctHeight + 4}px`, left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: '800', color: textColor }}>
                        {count.total >= 1000 ? `${(count.total / 1000).toFixed(1)}k` : count.total}
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: `${pctHeight}px`,
                        background: barGradient,
                        borderRadius: '20px',
                        opacity: 1
                      }}
                    ></div>
                  </div>
                  <div style={{ height: 'auto', minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', padding: '0 2px' }}
                      title={name}
                    >
                      {name}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom summary bar */}
      <div style={{
        marginTop: '16px', padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(56, 189, 248, 0.03)',
        border: '1px solid rgba(56, 189, 248, 0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            Reporte generado: <strong style={{ color: 'var(--text-primary)' }}>{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            Base de datos: <strong style={{ color: 'var(--primary)' }}>{formatNum(metrics.total)}</strong> registros procesados
          </span>
        </div>
      </div>

    </div>
  );
};
