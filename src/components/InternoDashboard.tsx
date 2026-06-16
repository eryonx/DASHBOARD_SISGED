import React, { useState, useMemo, useEffect, useRef } from 'react';

import { InternoFiltersBar } from './InternoFiltersBar';
import { copyElementToClipboard } from '../utils/exportChart';

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
  grupo_oficinas: string[];
  ultimo_sedes: string[];
  ultimo_escritorios: string[];
  bandejas: string[];
  procedimientos: string[];
  dates: string[];
  cuts?: string[];
  plazos: string[];
}

type InternoRecordTuple = [
  number, // 0: sede_code (0=SC, 1=OD)
  number, // 1: organo_idx
  number, // 2: grupo_oficinar_idx
  number, // 3: ultimo_sede_idx
  number, // 4: ultimo_escritorio_idx
  number, // 5: tupa_code (0=TUPA, 1=NO TUPA)
  number, // 6: proc_idx
  number, // 7: creation_year
  number, // 8: ingreso_year
  number, // 9: bandeja_idx
  number, // 10: date_idx
  number, // 11: origen_code (0=Interno, 1=Externo)
  number, // 12: cut_idx
  number, // 13: plazo_idx
  number  // 14: dias_transcurridos
];

interface DashboardData {
  metadata: Metadata;
  records: InternoRecordTuple[];
}

// Helper to determine traffic light color of a record
const getSemaforoColor = (diasTranscurridos: number, plazoStr: string): 'VERDE' | 'AMARILLO' | 'ANARANJADO' | 'ROJO' | 'SIN_PLAZO' => {
  if (!plazoStr || plazoStr === '-' || plazoStr === '#N/D') {
    return 'SIN_PLAZO';
  }
  const P = parseInt(plazoStr, 10);
  if (isNaN(P)) return 'SIN_PLAZO';
  
  if (diasTranscurridos <= 0) return 'VERDE';
  if (diasTranscurridos > P) return 'ROJO';

  // Specific overrides from the official table
  if (P === 1) return 'VERDE';
  if (P === 2) {
    if (diasTranscurridos === 1) return 'VERDE';
    if (diasTranscurridos === 2) return 'ANARANJADO';
  }
  if (P === 3) {
    if (diasTranscurridos === 1) return 'VERDE';
    if (diasTranscurridos === 2) return 'AMARILLO';
    if (diasTranscurridos === 3) return 'ANARANJADO';
  }
  if (P === 5) {
    if (diasTranscurridos <= 2) return 'VERDE';
    if (diasTranscurridos <= 4) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 7) {
    if (diasTranscurridos <= 3) return 'VERDE';
    if (diasTranscurridos <= 5) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 10) {
    if (diasTranscurridos <= 4) return 'VERDE';
    if (diasTranscurridos <= 7) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 12) {
    if (diasTranscurridos <= 5) return 'VERDE';
    if (diasTranscurridos <= 8) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 15) {
    if (diasTranscurridos <= 6) return 'VERDE';
    if (diasTranscurridos <= 9) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 20) {
    if (diasTranscurridos <= 8) return 'VERDE';
    if (diasTranscurridos <= 14) return 'AMARILLO';
    return 'ANARANJADO';
  }
  if (P === 30) {
    if (diasTranscurridos <= 12) return 'VERDE';
    if (diasTranscurridos <= 21) return 'AMARILLO';
    return 'ANARANJADO';
  }

  // Fallback based on standard percentages
  const pct = (diasTranscurridos / P) * 100;
  if (pct <= 40) return 'VERDE';
  if (pct <= 70) return 'AMARILLO';
  return 'ANARANJADO';
};

export const InternoDashboard: React.FC = () => {
  // Refs for each chart card to copy them as images
  const chart1Ref = useRef<HTMLDivElement>(null);
  const chart2Ref = useRef<HTMLDivElement>(null);
  const chart3Ref = useRef<HTMLDivElement>(null);
  const chart4Ref = useRef<HTMLDivElement>(null);
  const chart5Ref = useRef<HTMLDivElement>(null);
  const chart6Ref = useRef<HTMLDivElement>(null);

  // States for clipboard feedback
  const [copiedChart1, setCopiedChart1] = useState(false);
  const [copiedChart2, setCopiedChart2] = useState(false);
  const [copiedChart3, setCopiedChart3] = useState(false);
  const [copiedChart4, setCopiedChart4] = useState(false);
  const [copiedChart5, setCopiedChart5] = useState(false);
  const [copiedChart6, setCopiedChart6] = useState(false);

  // Export States
  const [detailedData, setDetailedData] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportChart = (ref: React.RefObject<HTMLDivElement | null>, setCopied: (v: boolean) => void) => {
    if (ref.current) {
      copyElementToClipboard(ref.current)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => console.error('Clipboard copy failed:', err));
    }
  };

  // New Filters State
  const [filterSede, setFilterSede] = useState<number>(-1);
  const [filterGrupo, setFilterGrupo] = useState<number>(-1);
  const [filterOrgano, setFilterOrgano] = useState<number>(-1);
  const [filterOficina, setFilterOficina] = useState<number>(-1);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterOrigen, setFilterOrigen] = useState<number>(-1);
  const [filterTupa, setFilterTupa] = useState<number>(-1);
  const [filterBandeja, setFilterBandeja] = useState<number>(-1);
  const [filterProcedimiento, setFilterProcedimiento] = useState<number>(-1);
  const [filterSemaforo, setFilterSemaforo] = useState<string>('TODOS');
  const [structViewMode, setStructViewMode] = useState<'TUPA' | 'PLAZOS'>('TUPA');
  const [structSemaforoFilter, setStructSemaforoFilter] = useState<string[]>([]);
  const [showPlazosInfo, setShowPlazosInfo] = useState(false);

  const isSemaforoFiltered = (rec: InternoRecordTuple) => {
    if (filterSemaforo === 'TODOS') return false;
    const plazoVal = data?.metadata.plazos[rec[13]] || '-';
    const semaforoColor = getSemaforoColor(rec[14], plazoVal);
    return semaforoColor !== filterSemaforo;
  };

  // ResizeObserver for Drilldown Chart 2
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
    const set = new Set<number>();
    
    if (filterSede === 0) {
      // Sede Central: allow all offices in SC records matching organ/parent-office filters
      for (let i = 0; i < data.records.length; i++) {
        if (data.records[i][0] === 0) {
          if (filterOrgano !== -1 && data.records[i][1] !== filterOrgano) continue;
          if (filterGrupo !== -1 && data.records[i][2] !== filterGrupo) continue;
          set.add(data.records[i][3]);
        }
      }
    } else {
      // OD or Todas (Grupo applies to OD)
      if (filterGrupo === -1) {
        for (let i = 0; i < data.records.length; i++) {
          if (data.records[i][0] === 1) {
            set.add(data.records[i][3]);
          }
        }
      } else {
        for (let i = 0; i < data.records.length; i++) {
          if (data.records[i][0] === 1 && data.records[i][2] === filterGrupo) {
            set.add(data.records[i][3]);
          }
        }
      }
    }

    return Array.from(set).sort((a, b) => {
      const nameA = data.metadata.ultimo_sedes[a] || '';
      const nameB = data.metadata.ultimo_sedes[b] || '';
      return nameA.localeCompare(nameB);
    });
  }, [data, filterSede, filterOrgano, filterGrupo]);

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
    setFilterOrgano(-1);
    setFilterOficina(-1);
    setFilterOrigen(-1);
    setFilterTupa(-1);
    setFilterBandeja(-1);
    setFilterProcedimiento(-1);
    setFilterSemaforo('TODOS');
    setFilterStartDate(minDate);
    setFilterEndDate(maxDate);
  };

  const performDetailedExport = (detailed: any) => {
    if (!data) return;
    const lines: string[] = [];
    
    // Add original headers
    lines.push(detailed.columns.join(';'));

    const lookupCols = [
      'ORIGEN', 'TIPO', 'TUPA', 'PROCEDIMIENTO', 'AÑO', 'TIPO DOCUMENTO', 
      'OFICINA ENVIA', 'ULTIMO ESCRITORIO', 'ULTIMO SEDE', 'OFICINA PADRE', 
      'GRUPO', 'SEDE', 'TAREA', 'PLAZO'
    ];

    const esc = (s: any) => {
      const str = String(s ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    for (let i = 0; i < data.records.length; i++) {
      const rec = data.records[i];
      const [
        sedeCode,
        organoIdxVal,
        goIdx,
        usIdx,
        _ueIdx,
        tupaCode,
        procIdx,
        _creationYear,
        _ingresoYear,
        bandejaIdx,
        dateIdx,
        origenCode,
        _cutIdx,
        _plazoIdx,
        diasTranscurridos
      ] = rec;

      // Apply Filters
      if (filterSede === 0 && sedeCode !== 0) continue;
      if (filterSede === 1 && sedeCode !== 1) continue;
      if (filterOrgano !== -1 && organoIdxVal !== filterOrgano) continue;
      if (filterGrupo !== -1 && goIdx !== filterGrupo) continue;
      if (filterOficina !== -1 && usIdx !== filterOficina) continue;
      if (filterTupa !== -1 && tupaCode !== filterTupa) continue;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) continue;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) continue;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) continue;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) continue;
      }
      if (filterSemaforo !== 'TODOS') {
        const plazoVal = data.metadata.plazos[_plazoIdx];
        const semaforoColor = getSemaforoColor(diasTranscurridos, plazoVal);
        if (semaforoColor !== filterSemaforo) continue;
      }

      const detailedRec = detailed.records[i];
      const csvRow = detailed.columns.map((col: string, colIdx: number) => {
        const val = detailedRec[colIdx];
        if (lookupCols.includes(col)) {
          const lookupList = detailed.lookups[col] || [];
          return esc(lookupList[val] || '');
        } else {
          return esc(val);
        }
      });

      lines.push(csvRow.join(';'));
    }

    const csvContent = '\uFEFF' + lines.join('\n');

    // Download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SISGED_Interno_Detalle_Filtrado_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (!data) return;

    if (!detailedData) {
      setExportLoading(true);
      fetch(`${import.meta.env.BASE_URL}data/interno_detailed_data.json`)
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar el archivo detallado.');
          return res.json();
        })
        .then((jsonDetailed: any) => {
          setDetailedData(jsonDetailed);
          setExportLoading(false);
          performDetailedExport(jsonDetailed);
        })
        .catch((err) => {
          console.error(err);
          alert('Error al descargar la información detallada de los expedientes internos.');
          setExportLoading(false);
        });
    } else {
      performDetailedExport(detailedData);
    }
  };

  // Dynamically aggregate raw records to match the GrupoRecord[] hierarchy
  const rawData: GrupoRecord[] = useMemo(() => {
    if (!data) return [];

    const gruposMap: Record<number, GrupoRecord> = {};
    data.metadata.grupo_oficinas.forEach((grupoName, idx) => {
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
      const [
        sedeCode,
        organoIdxVal,
        goIdx,
        usIdx,
        ueIdx,
        tupaCode,
        procIdx,
        _creationYear,
        _ingresoYear,
        bandejaIdx,
        dateIdx,
        origenCode,
        _cutIdx,
        _plazoIdx,
        diasTranscurridos
      ] = rec;

      const tupaVal = tupaCode === 0 ? 1 : 0;
      const noTupaVal = tupaCode === 1 ? 1 : 0;

      // Apply Filters
      if (filterSede === 0 && sedeCode !== 0) return;
      if (filterSede === 1 && sedeCode !== 1) return;
      if (filterOrgano !== -1 && organoIdxVal !== filterOrgano) return;
      if (filterGrupo !== -1 && goIdx !== filterGrupo) return;
      if (filterOficina !== -1 && usIdx !== filterOficina) return;
      if (filterTupa !== -1 && tupaCode !== filterTupa) return;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) return;
      }
      if (filterSemaforo !== 'TODOS') {
        const plazoVal = data.metadata.plazos[_plazoIdx];
        const semaforoColor = getSemaforoColor(diasTranscurridos, plazoVal);
        if (semaforoColor !== filterSemaforo) return;
      }

      const grupo = gruposMap[goIdx];
      if (!grupo) return;

      grupo.total += 1;
      grupo.noTupa += noTupaVal;
      grupo.tupa += tupaVal;

      if (!usedesMap[goIdx]) usedesMap[goIdx] = {};
      if (!usedesMap[goIdx][usIdx]) {
        usedesMap[goIdx][usIdx] = {
          name: data.metadata.ultimo_sedes[usIdx] || 'Sin Oficina',
          total: 0, noTupa: 0, tupa: 0, escritorios: {}
        };
      }
      const sedeEntry = usedesMap[goIdx][usIdx];
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

    data.metadata.grupo_oficinas.forEach((_, goIdx) => {
      const grupo = gruposMap[goIdx];
      if (usedesMap[goIdx]) {
        grupo.ultimoSedes = Object.values(usedesMap[goIdx]).sort((a, b) => b.total - a.total);
      }
    });

    // Return only groups that have records under current filters
    return Object.values(gruposMap).filter(g => g.total > 0);
  }, [data, filterSede, filterGrupo, filterOrgano, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate]);

  // Sort rawData by total descending for the hierarchy chart
  const sortedRawData = useMemo(() => {
    return [...rawData].sort((a, b) => b.total - a.total);
  }, [rawData]);

  // Aggregate traffic light counts for each item in the vertical drilldown level
  const structChartSemaforoCounts = useMemo(() => {
    if (!data) return {} as Record<string, { VERDE: number; AMARILLO: number; ANARANJADO: number; ROJO: number; SIN_PLAZO: number }>;
    
    const level = drilldownPath.length;
    const counts: Record<string, { VERDE: number; AMARILLO: number; ANARANJADO: number; ROJO: number; SIN_PLAZO: number }> = {};

    data.records.forEach(rec => {
      const [
        sedeCode,
        organoIdx,
        goIdx,
        usIdx,
        ueIdx,
        tupaCode,
        procIdx,
        _creationYear,
        _ingresoYear,
        bandejaIdx,
        dateIdx,
        origenCode,
        _cutIdx,
        _plazoIdx,
        diasTranscurridos
      ] = rec;

      // Apply the dashboard filters (excluding filterSemaforo so we can see all segments stacked)
      if (filterSede === 0 && sedeCode !== 0) return;
      if (filterSede === 1 && sedeCode !== 1) return;
      if (filterOrgano !== -1 && organoIdx !== filterOrgano) return;
      if (filterGrupo !== -1 && goIdx !== filterGrupo) return;
      if (filterOficina !== -1 && usIdx !== filterOficina) return;
      if (filterTupa !== -1 && tupaCode !== filterTupa) return;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) return;
      }

      let itemKey = "";
      if (level === 0) {
        // level 0: grouped by goIdx (matching sortedRawData name)
        itemKey = data.metadata.grupo_oficinas[goIdx] || "";
      } else if (level === 1) {
        // level 1: grouped by usIdx under selected group (drilldownPath[0])
        if (goIdx === drilldownPath[0]) {
          itemKey = data.metadata.ultimo_sedes[usIdx] || "";
        }
      } else if (level === 2) {
        // level 2: grouped by ueIdx under selected group and office
        const groupRecord = sortedRawData.find(g => g.idx === drilldownPath[0]);
        const selectedOfficeName = groupRecord?.ultimoSedes[drilldownPath[1]]?.name;
        if (goIdx === drilldownPath[0] && data.metadata.ultimo_sedes[usIdx] === selectedOfficeName) {
          itemKey = data.metadata.ultimo_escritorios[ueIdx] || "";
        }
      }

      if (!itemKey) return;

      const plazoVal = data.metadata.plazos[_plazoIdx];
      const semaforoColor = getSemaforoColor(diasTranscurridos, plazoVal);

      if (!counts[itemKey]) {
        counts[itemKey] = { VERDE: 0, AMARILLO: 0, ANARANJADO: 0, ROJO: 0, SIN_PLAZO: 0 };
      }
      counts[itemKey][semaforoColor]++;
    });

    return counts;
  }, [data, drilldownPath, sortedRawData, filterSede, filterOrgano, filterGrupo, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate]);

  // Filter and process data dynamically with 100% accuracy at record level
  const metrics = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        noTupa: 0,
        tupa: 0,
        uniqueCuts: 0,
        duplicates: 0,
        listToDisplay: [] as { name: string, total: number, noTupa: number, tupa: number }[],
        gruposStaticList: [] as { name: string, total: number, noTupa: number, tupa: number }[],
        yearsCreation: {} as Record<number, number>,
        yearsEscritorio: {} as Record<number, number>,
        bandejas: {} as Record<string, number>,
        procedures: {} as Record<string, { total: number, noTupa: number, tupa: number }>,
        bottleneckOffice: null as { name: string, count: number } | null,
        topProcedure: null as { name: string, count: number } | null,
        oldestYear: null as number | null,
        verde: 0,
        amarillo: 0,
        anaranjado: 0,
        rojo: 0,
        sinPlazo: 0,
        groupSemaforoCounts: {} as Record<string, { VERDE: number; AMARILLO: number; ANARANJADO: number; ROJO: number; SIN_PLAZO: number }>
      };
    }

    let totalPendientes = 0;
    let noTupaCount = 0;
    let tupaCount = 0;

    let verdeCount = 0;
    let amarilloCount = 0;
    let anaranjadoCount = 0;
    let rojoCount = 0;
    let sinPlazoCount = 0;

    const groupSemaforoCounts: Record<string, { VERDE: number; AMARILLO: number; ANARANJADO: number; ROJO: number; SIN_PLAZO: number }> = {};

    const yearsCreation: Record<number, number> = {};
    const yearsEscritorio: Record<number, number> = {};
    const bandejas: Record<string, number> = {};
    const procedures: Record<string, { total: number, noTupa: number, tupa: number }> = {};

    const groupCounts: Record<string, { total: number; noTupa: number; tupa: number }> = {};
    const staticGroupCounts: Record<string, { total: number; noTupa: number; tupa: number }> = {};

    const uniqueCutsSet = new Set<number>();

    data.records.forEach(rec => {
      const [
        sedeCode,
        organoIdx,
        goIdx,
        usIdx,
        _ueIdx,
        tupaCode,
        procIdx,
        creationYear,
        ingresoYear,
        bandejaIdx,
        dateIdx,
        origenCode,
        cutIdx,
        _plazoIdx,
        diasTranscurridos
      ] = rec;

      // Apply same filters for metrics (excluding semaforo for counts itself)
      if (filterSede === 0 && sedeCode !== 0) return;
      if (filterSede === 1 && sedeCode !== 1) return;
      if (filterOrgano !== -1 && organoIdx !== filterOrgano) return;
      if (filterGrupo !== -1 && goIdx !== filterGrupo) return;
      if (filterOficina !== -1 && usIdx !== filterOficina) return;
      if (filterTupa !== -1 && tupaCode !== filterTupa) return;
      if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
      if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
      if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
      if (filterStartDate && filterEndDate) {
        const dStr = data.metadata.dates[dateIdx];
        if (dStr < filterStartDate || dStr > filterEndDate) return;
      }

      const plazoVal = data.metadata.plazos[_plazoIdx];
      const semaforoColor = getSemaforoColor(diasTranscurridos, plazoVal);

      // Accumulate color counts globally
      if (semaforoColor === 'VERDE') verdeCount++;
      else if (semaforoColor === 'AMARILLO') amarilloCount++;
      else if (semaforoColor === 'ANARANJADO') anaranjadoCount++;
      else if (semaforoColor === 'ROJO') rojoCount++;
      else if (semaforoColor === 'SIN_PLAZO') sinPlazoCount++;

      const organoName = data.metadata.grupos[organoIdx];
      const ultimoSedeName = data.metadata.ultimo_sedes[usIdx];

      // Grouping for Semaforo Distribution card (calculated before applying semaforo filter)
      const groupKey = filterGrupo !== -1 ? ultimoSedeName : organoName;
      if (!groupSemaforoCounts[groupKey]) {
        groupSemaforoCounts[groupKey] = { VERDE: 0, AMARILLO: 0, ANARANJADO: 0, ROJO: 0, SIN_PLAZO: 0 };
      }
      groupSemaforoCounts[groupKey][semaforoColor]++;

      // Apply semaforo filter to standard dashboard counts
      if (filterSemaforo !== 'TODOS' && semaforoColor !== filterSemaforo) return;

      const isNewCut = !uniqueCutsSet.has(cutIdx);
      uniqueCutsSet.add(cutIdx);

      const tupaVal = tupaCode === 0 ? 1 : 0;
      const noTupaVal = tupaCode === 1 ? 1 : 0;
      const bName = data.metadata.bandejas[bandejaIdx];
      const pName = data.metadata.procedimientos[procIdx];

      // Increment metrics
      totalPendientes += 1;
      if (isNewCut) {
        if (tupaCode === 0) tupaCount++;
        else if (tupaCode === 1) noTupaCount++;
      }

      yearsCreation[creationYear] = (yearsCreation[creationYear] || 0) + 1;
      yearsEscritorio[ingresoYear] = (yearsEscritorio[ingresoYear] || 0) + 1;
      bandejas[bName] = (bandejas[bName] || 0) + 1;
      if (!procedures[pName]) procedures[pName] = { total: 0, noTupa: 0, tupa: 0 };
      procedures[pName].total += 1;
      procedures[pName].noTupa += noTupaVal;
      procedures[pName].tupa += tupaVal;

      // Grouping (Dynamic for Top 5 / listToDisplay)
      if (!groupCounts[groupKey]) {
        groupCounts[groupKey] = { total: 0, noTupa: 0, tupa: 0 };
      }
      groupCounts[groupKey].total += 1;
      groupCounts[groupKey].noTupa += noTupaVal;
      groupCounts[groupKey].tupa += tupaVal;

      // Grouping (Static by Grupo for Stacked Bar Chart - Chart 1)
      if (!staticGroupCounts[organoName]) {
        staticGroupCounts[organoName] = { total: 0, noTupa: 0, tupa: 0 };
      }
      staticGroupCounts[organoName].total += 1;
      staticGroupCounts[organoName].noTupa += noTupaVal;
      staticGroupCounts[organoName].tupa += tupaVal;
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
    }

    data.metadata.grupos.forEach((grupoName, idx) => {
      const isOD = idx < 14;
      if (filterSede === 0 && isOD) return;
      if (filterSede === 1 && !isOD) return;
      if (!staticGroupCounts[grupoName]) {
        gruposStaticList.push({ name: grupoName, total: 0, noTupa: 0, tupa: 0 });
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
      uniqueCuts: uniqueCutsSet.size,
      duplicates: totalPendientes - uniqueCutsSet.size,
      listToDisplay,
      gruposStaticList,
      yearsCreation,
      yearsEscritorio,
      bandejas,
      procedures,
      bottleneckOffice,
      topProcedure,
      oldestYear,
      verde: verdeCount,
      amarillo: amarilloCount,
      anaranjado: anaranjadoCount,
      rojo: rojoCount,
      sinPlazo: sinPlazoCount,
      groupSemaforoCounts
    };
  }, [data, rawData, filterGrupo, filterOrgano, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate, filterSede, filterSemaforo]);

  const scOrganos = useMemo(() => {
    if (!data) return [];
    return data.metadata.grupos
      .map((name, idx) => ({ name: name.replace(/^Sede Central - /, ""), idx }))
      .slice(14);
  }, [data]);

  const customGruposList = useMemo(() => {
    if (!data) return [];
    if (filterSede === 0) {
      return data.metadata.grupo_oficinas
        .map((name, idx) => ({ name: name.replace(/^SC - /, ""), idx }))
        .slice(14);
    } else {
      return data.metadata.grupo_oficinas
        .map((name, idx) => ({ name: name.replace(/^SC - /, ""), idx }))
        .slice(0, 14);
    }
  }, [data, filterSede]);

  const chart1Data = useMemo(() => {
    if (!data) return { level: 0, title: "DISTRIBUCIÓN POR SEDE", items: [], breadcrumbs: [] };

    const breadcrumbs: { label: string, onClick: () => void }[] = [];
    breadcrumbs.push({
      label: "Sedes (Nacional)",
      onClick: () => {
        setFilterSede(-1);
        setFilterOrgano(-1);
        setFilterGrupo(-1);
        setFilterOficina(-1);
      }
    });

    if (filterSede === -1) {
      let scTotal = 0, scTupa = 0, scNoTupa = 0;
      let odTotal = 0, odTupa = 0, odNoTupa = 0;

      data.records.forEach(rec => {
        const [
          sedeCode,
          _organoIdx,
          _goIdx,
          _usIdx,
          _ueIdx,
          tupaCode,
          procIdx,
          _creationYear,
          _ingresoYear,
          bandejaIdx,
          dateIdx,
          origenCode,
          _cutIdx,
          _plazoIdx
        ] = rec;

        if (filterTupa !== -1 && tupaCode !== filterTupa) return;
        if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
        if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
        if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
        if (filterStartDate && filterEndDate) {
          const dStr = data.metadata.dates[dateIdx];
          if (dStr < filterStartDate || dStr > filterEndDate) return;
        }
        if (isSemaforoFiltered(rec)) return;

        const tupaVal = tupaCode === 0 ? 1 : 0;
        const noTupaVal = tupaCode === 1 ? 1 : 0;

        if (sedeCode === 0) {
          scTotal++;
          scTupa += tupaVal;
          scNoTupa += noTupaVal;
        } else {
          odTotal++;
          odTupa += tupaVal;
          odNoTupa += noTupaVal;
        }
      });

      const items = [
        { id: "SC", name: "Sede Central", total: scTotal, tupa: scTupa, noTupa: scNoTupa, rawId: 0 },
        { id: "OD", name: "Órganos Desconcentrados", total: odTotal, tupa: odTupa, noTupa: odNoTupa, rawId: 1 },
        { id: "TOT", name: "Total General", total: scTotal + odTotal, tupa: scTupa + odTupa, noTupa: scNoTupa + odNoTupa, rawId: -1 }
      ];

      return {
        level: 0,
        title: "DISTRIBUCIÓN POR SEDE",
        items,
        breadcrumbs
      };
    }

    if (filterSede === 0) {
      breadcrumbs.push({
        label: "Sede Central",
        onClick: () => {
          setFilterOrgano(-1);
          setFilterGrupo(-1);
          setFilterOficina(-1);
        }
      });

      if (filterOrgano === -1) {
        const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
        data.records.forEach(rec => {
          const [
            sedeCode,
            organoIdx,
            _goIdx,
            _usIdx,
            _ueIdx,
            tupaCode,
            procIdx,
            _creationYear,
            _ingresoYear,
            bandejaIdx,
            dateIdx,
            origenCode,
            _cutIdx,
            _plazoIdx
          ] = rec;

          if (sedeCode !== 0) return;
          if (filterTupa !== -1 && tupaCode !== filterTupa) return;
          if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
          if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
          if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
          if (filterStartDate && filterEndDate) {
            const dStr = data.metadata.dates[dateIdx];
            if (dStr < filterStartDate || dStr > filterEndDate) return;
          }
          if (isSemaforoFiltered(rec)) return;

          const tupaVal = tupaCode === 0 ? 1 : 0;
          const noTupaVal = tupaCode === 1 ? 1 : 0;

          if (!counts[organoIdx]) counts[organoIdx] = { total: 0, tupa: 0, noTupa: 0 };
          counts[organoIdx].total++;
          counts[organoIdx].tupa += tupaVal;
          counts[organoIdx].noTupa += noTupaVal;
        });

        const items = Object.entries(counts).map(([orgIdxStr, stats]) => {
          const orgIdx = Number(orgIdxStr);
          const rawName = data.metadata.grupos[orgIdx] || "Sin Órgano";
          const name = rawName.replace(/^Sede Central - /, "");
          return {
            id: orgIdx,
            name,
            total: stats.total,
            tupa: stats.tupa,
            noTupa: stats.noTupa,
            rawId: orgIdx
          };
        }).sort((a, b) => b.total - a.total);

        return {
          level: 1,
          title: "DISTRIBUCIÓN POR ÓRGANO",
          items,
          breadcrumbs
        };
      }

      const organoName = (data.metadata.grupos[filterOrgano] || "Órgano").replace(/^Sede Central - /, "");
      breadcrumbs.push({
        label: organoName,
        onClick: () => {
          setFilterGrupo(-1);
          setFilterOficina(-1);
        }
      });

      if (filterGrupo === -1) {
        const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
        data.records.forEach(rec => {
          const [
            sedeCode,
            organoIdx,
            goIdx,
            _usIdx,
            _ueIdx,
            tupaCode,
            procIdx,
            _creationYear,
            _ingresoYear,
            bandejaIdx,
            dateIdx,
            origenCode,
            _cutIdx,
            _plazoIdx
          ] = rec;

          if (sedeCode !== 0) return;
          if (organoIdx !== filterOrgano) return;
          if (filterTupa !== -1 && tupaCode !== filterTupa) return;
          if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
          if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
          if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
          if (filterStartDate && filterEndDate) {
            const dStr = data.metadata.dates[dateIdx];
            if (dStr < filterStartDate || dStr > filterEndDate) return;
          }
          if (isSemaforoFiltered(rec)) return;

          const tupaVal = tupaCode === 0 ? 1 : 0;
          const noTupaVal = tupaCode === 1 ? 1 : 0;

          if (!counts[goIdx]) counts[goIdx] = { total: 0, tupa: 0, noTupa: 0 };
          counts[goIdx].total++;
          counts[goIdx].tupa += tupaVal;
          counts[goIdx].noTupa += noTupaVal;
        });

        const items = Object.entries(counts).map(([goIdxStr, stats]) => {
          const goIdx = Number(goIdxStr);
          const rawName = data.metadata.grupo_oficinas[goIdx] || "Sin Oficina Padre";
          const name = rawName.replace(/^SC - /, "");
          return {
            id: goIdx,
            name,
            total: stats.total,
            tupa: stats.tupa,
            noTupa: stats.noTupa,
            rawId: goIdx
          };
        }).sort((a, b) => b.total - a.total);

        return {
          level: 2,
          title: "DISTRIBUCIÓN POR OFICINA PADRE",
          items,
          breadcrumbs
        };
      }

      const oficinaPadreName = (data.metadata.grupo_oficinas[filterGrupo] || "Oficina Padre").replace(/^SC - /, "");
      breadcrumbs.push({
        label: oficinaPadreName,
        onClick: () => {
          setFilterOficina(-1);
        }
      });

      if (filterOficina === -1) {
        const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
        data.records.forEach(rec => {
          const [
            sedeCode,
            organoIdx,
            goIdx,
            usIdx,
            _ueIdx,
            tupaCode,
            procIdx,
            _creationYear,
            _ingresoYear,
            bandejaIdx,
            dateIdx,
            origenCode,
            _cutIdx,
            _plazoIdx
          ] = rec;

          if (sedeCode !== 0) return;
          if (organoIdx !== filterOrgano) return;
          if (goIdx !== filterGrupo) return;
          if (filterTupa !== -1 && tupaCode !== filterTupa) return;
          if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
          if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
          if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
          if (filterStartDate && filterEndDate) {
            const dStr = data.metadata.dates[dateIdx];
            if (dStr < filterStartDate || dStr > filterEndDate) return;
          }
          if (isSemaforoFiltered(rec)) return;

          const tupaVal = tupaCode === 0 ? 1 : 0;
          const noTupaVal = tupaCode === 1 ? 1 : 0;

          if (!counts[usIdx]) counts[usIdx] = { total: 0, tupa: 0, noTupa: 0 };
          counts[usIdx].total++;
          counts[usIdx].tupa += tupaVal;
          counts[usIdx].noTupa += noTupaVal;
        });

        const items = Object.entries(counts).map(([usIdxStr, stats]) => {
          const usIdx = Number(usIdxStr);
          const name = data.metadata.ultimo_sedes[usIdx] || "Sin Oficina";
          return {
            id: usIdx,
            name,
            total: stats.total,
            tupa: stats.tupa,
            noTupa: stats.noTupa,
            rawId: usIdx
          };
        }).sort((a, b) => b.total - a.total);

        return {
          level: 3,
          title: "DISTRIBUCIÓN POR OFICINA (ÁREA)",
          items,
          breadcrumbs
        };
      }

      const officeName = data.metadata.ultimo_sedes[filterOficina] || "Oficina";
      breadcrumbs.push({
        label: officeName,
        onClick: () => {}
      });

      const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
      data.records.forEach(rec => {
        const [
          sedeCode,
          organoIdx,
          goIdx,
          usIdx,
          ueIdx,
          tupaCode,
          procIdx,
          _creationYear,
          _ingresoYear,
          bandejaIdx,
          dateIdx,
          origenCode,
          _cutIdx,
          _plazoIdx
        ] = rec;

        if (sedeCode !== 0) return;
        if (organoIdx !== filterOrgano) return;
        if (goIdx !== filterGrupo) return;
        if (usIdx !== filterOficina) return;
        if (filterTupa !== -1 && tupaCode !== filterTupa) return;
        if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
        if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
        if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
        if (filterStartDate && filterEndDate) {
          const dStr = data.metadata.dates[dateIdx];
          if (dStr < filterStartDate || dStr > filterEndDate) return;
        }
        if (isSemaforoFiltered(rec)) return;

        const tupaVal = tupaCode === 0 ? 1 : 0;
        const noTupaVal = tupaCode === 1 ? 1 : 0;

        if (!counts[ueIdx]) counts[ueIdx] = { total: 0, tupa: 0, noTupa: 0 };
        counts[ueIdx].total++;
        counts[ueIdx].tupa += tupaVal;
        counts[ueIdx].noTupa += noTupaVal;
      });

      const items = Object.entries(counts).map(([ueIdxStr, stats]) => {
        const ueIdx = Number(ueIdxStr);
        const name = data.metadata.ultimo_escritorios[ueIdx] || "Sin Asignar";
        return {
          id: ueIdx,
          name,
          total: stats.total,
          tupa: stats.tupa,
          noTupa: stats.noTupa,
          rawId: ueIdx
        };
      }).sort((a, b) => b.total - a.total);

      return {
        level: 4,
        title: "DISTRIBUCIÓN POR PROFESIONAL",
        items,
        breadcrumbs
      };
    }

    if (filterSede === 1) {
      breadcrumbs.push({
        label: "Órganos Desconcentrados",
        onClick: () => {
          setFilterGrupo(-1);
          setFilterOficina(-1);
        }
      });

      if (filterGrupo === -1) {
        const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
        data.records.forEach(rec => {
          const [
            sedeCode,
            _organoIdx,
            goIdx,
            _usIdx,
            _ueIdx,
            tupaCode,
            procIdx,
            _creationYear,
            _ingresoYear,
            bandejaIdx,
            dateIdx,
            origenCode,
            _cutIdx,
            _plazoIdx
          ] = rec;

          if (sedeCode !== 1) return;
          if (filterTupa !== -1 && tupaCode !== filterTupa) return;
          if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
          if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
          if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
          if (filterStartDate && filterEndDate) {
            const dStr = data.metadata.dates[dateIdx];
            if (dStr < filterStartDate || dStr > filterEndDate) return;
          }
          if (isSemaforoFiltered(rec)) return;

          const tupaVal = tupaCode === 0 ? 1 : 0;
          const noTupaVal = tupaCode === 1 ? 1 : 0;

          if (!counts[goIdx]) counts[goIdx] = { total: 0, tupa: 0, noTupa: 0 };
          counts[goIdx].total++;
          counts[goIdx].tupa += tupaVal;
          counts[goIdx].noTupa += noTupaVal;
        });

        const items = Object.entries(counts).map(([goIdxStr, stats]) => {
          const goIdx = Number(goIdxStr);
          const name = data.metadata.grupo_oficinas[goIdx] || "Sin Ámbito";
          return {
            id: goIdx,
            name,
            total: stats.total,
            tupa: stats.tupa,
            noTupa: stats.noTupa,
            rawId: goIdx
          };
        }).sort((a, b) => b.total - a.total);

        return {
          level: 1,
          title: "DISTRIBUCIÓN POR ÁMBITO (AAA)",
          items,
          breadcrumbs
        };
      }

      const aaaName = data.metadata.grupo_oficinas[filterGrupo] || "Ámbito";
      breadcrumbs.push({
        label: aaaName,
        onClick: () => {
          setFilterOficina(-1);
        }
      });

      if (filterOficina === -1) {
        const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
        data.records.forEach(rec => {
          const [
            sedeCode,
            _organoIdx,
            goIdx,
            usIdx,
            _ueIdx,
            tupaCode,
            procIdx,
            _creationYear,
            _ingresoYear,
            bandejaIdx,
            dateIdx,
            origenCode,
            _cutIdx,
            _plazoIdx
          ] = rec;

          if (sedeCode !== 1) return;
          if (goIdx !== filterGrupo) return;
          if (filterTupa !== -1 && tupaCode !== filterTupa) return;
          if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
          if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
          if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
          if (filterStartDate && filterEndDate) {
            const dStr = data.metadata.dates[dateIdx];
            if (dStr < filterStartDate || dStr > filterEndDate) return;
          }
          if (isSemaforoFiltered(rec)) return;

          const tupaVal = tupaCode === 0 ? 1 : 0;
          const noTupaVal = tupaCode === 1 ? 1 : 0;

          if (!counts[usIdx]) counts[usIdx] = { total: 0, tupa: 0, noTupa: 0 };
          counts[usIdx].total++;
          counts[usIdx].tupa += tupaVal;
          counts[usIdx].noTupa += noTupaVal;
        });

        const items = Object.entries(counts).map(([usIdxStr, stats]) => {
          const usIdx = Number(usIdxStr);
          const name = data.metadata.ultimo_sedes[usIdx] || "Sin Oficina";
          return {
            id: usIdx,
            name,
            total: stats.total,
            tupa: stats.tupa,
            noTupa: stats.noTupa,
            rawId: usIdx
          };
        }).sort((a, b) => b.total - a.total);

        return {
          level: 2,
          title: "DISTRIBUCIÓN POR OFICINA (ALA / AAA)",
          items,
          breadcrumbs
        };
      }

      const officeName = data.metadata.ultimo_sedes[filterOficina] || "Oficina";
      breadcrumbs.push({
        label: officeName,
        onClick: () => {}
      });

      const counts: Record<number, { total: number, tupa: number, noTupa: number }> = {};
      data.records.forEach(rec => {
        const [
          sedeCode,
          _organoIdx,
          goIdx,
          usIdx,
          ueIdx,
          tupaCode,
          procIdx,
          _creationYear,
          _ingresoYear,
          bandejaIdx,
          dateIdx,
          origenCode,
          _cutIdx,
          _plazoIdx
        ] = rec;

        if (sedeCode !== 1) return;
        if (goIdx !== filterGrupo) return;
        if (usIdx !== filterOficina) return;
        if (filterTupa !== -1 && tupaCode !== filterTupa) return;
        if (filterBandeja !== -1 && bandejaIdx !== filterBandeja) return;
        if (filterProcedimiento !== -1 && procIdx !== filterProcedimiento) return;
        if (filterOrigen !== -1 && origenCode !== filterOrigen) return;
        if (filterStartDate && filterEndDate) {
          const dStr = data.metadata.dates[dateIdx];
          if (dStr < filterStartDate || dStr > filterEndDate) return;
        }
        if (isSemaforoFiltered(rec)) return;

        const tupaVal = tupaCode === 0 ? 1 : 0;
        const noTupaVal = tupaCode === 1 ? 1 : 0;

        if (!counts[ueIdx]) counts[ueIdx] = { total: 0, tupa: 0, noTupa: 0 };
        counts[ueIdx].total++;
        counts[ueIdx].tupa += tupaVal;
        counts[ueIdx].noTupa += noTupaVal;
      });

      const items = Object.entries(counts).map(([ueIdxStr, stats]) => {
        const ueIdx = Number(ueIdxStr);
        const name = data.metadata.ultimo_escritorios[ueIdx] || "Sin Asignar";
        return {
          id: ueIdx,
          name,
          total: stats.total,
          tupa: stats.tupa,
          noTupa: stats.noTupa,
          rawId: ueIdx
        };
      }).sort((a, b) => b.total - a.total);

      return {
        level: 3,
        title: "DISTRIBUCIÓN POR PROFESIONAL",
        items,
        breadcrumbs
      };
    }

    return { level: 0, title: "DISTRIBUCIÓN POR SEDE", items: [], breadcrumbs: [] };
  }, [data, filterSede, filterOrgano, filterGrupo, filterOficina, filterTupa, filterBandeja, filterProcedimiento, filterOrigen, filterStartDate, filterEndDate, filterSemaforo]);

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
        sede={filterSede} onSedeChange={(v) => { setFilterSede(v); setFilterOrgano(-1); setFilterGrupo(-1); setFilterOficina(-1); }}
        grupo={filterGrupo} onGrupoChange={(v) => { setFilterGrupo(v); setFilterOficina(-1); }} gruposList={customGruposList}
        organo={filterOrgano} onOrganoChange={(v) => { setFilterOrgano(v); setFilterGrupo(-1); setFilterOficina(-1); }} organosList={scOrganos}
        oficina={filterOficina} onOficinaChange={setFilterOficina} oficinasList={data.metadata.ultimo_sedes} allowedOficinas={allowedOficinas}
        startDate={filterStartDate} endDate={filterEndDate} minDate={minDate} maxDate={maxDate} onStartDateChange={setFilterStartDate} onEndDateChange={setFilterEndDate}
        origen={filterOrigen} onOrigenChange={setFilterOrigen}
        bandeja={filterBandeja} onBandejaChange={setFilterBandeja} bandejasList={data.metadata.bandejas}
        tupa={filterTupa} onTupaChange={setFilterTupa}
        procedimiento={filterProcedimiento} onProcedimientoChange={setFilterProcedimiento} procedimientosList={data.metadata.procedimientos}
        semaforo={filterSemaforo} onSemaforoChange={setFilterSemaforo}
        onClearFilters={handleClearFilters}
      />

      {/* 3. Main KPI Indicator Cards Row */}
      <div className="kpi-row" style={{ marginBottom: '8px' }}>
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

        {/* Card 2: CUTS ÚNICOS */}
        <div
          className="kpi-card purple"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px', cursor: 'default' }}
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--purple-accent)' }}>
              CUTS ÚNICOS
            </span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatNum(metrics.uniqueCuts)}</div>
            <span className="kpi-badge purple">
              {metrics.total > 0 ? ((metrics.uniqueCuts / metrics.total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Expedientes principales independientes
          </div>
        </div>

        {/* Card 3: DUPLICADOS (COPIAS) */}
        <div
          className="kpi-card red"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '84px', cursor: 'default' }}
        >
          <div className="kpi-title-row">
            <span className="kpi-title" style={{ color: 'var(--danger)' }}>
              DUPLICADOS (COPIAS)
            </span>
            <span className="kpi-dots">•••</span>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{formatNum(metrics.duplicates)}</div>
            <span className="kpi-badge red">
              {metrics.total > 0 ? ((metrics.duplicates / metrics.total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Derivaciones y copias en otras bandejas
          </div>
        </div>

        {/* Card 4: PENDIENTES NO TUPA */}
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
              {metrics.uniqueCuts > 0 ? ((metrics.noTupa / metrics.uniqueCuts) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Trámites internos libres de cobro (Cuts únicos)
          </div>
        </div>

        {/* Card 5: PENDIENTES TUPA */}
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
              {metrics.uniqueCuts > 0 ? ((metrics.tupa / metrics.uniqueCuts) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
            Procedimientos regulados (Cuts únicos)
          </div>
        </div>

      </div>

      {/* 4. Row 1: Horizontal Desconcentrados Bar Chart & Vertical Tupa/NoTupa comparison */}
      <div className="interno-grid-row1">

        {/* Card 1: Horizontal Bar Chart (Total by Sede / Drilldown) */}
        <div ref={chart1Ref} className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3>{chart1Data.title}</h3>
              <p>Clasificación interactiva por sede y dependencia. Haz clic en una sección para profundizar.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => handleExportChart(chart1Ref, setCopiedChart1)}
                title={copiedChart1 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedChart1 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = copiedChart1 ? 'var(--success)' : '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = copiedChart1 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {copiedChart1 ? (
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

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {/* Breadcrumb Navigation */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', fontWeight: '700', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              {chart1Data.breadcrumbs.map((bc, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
                  <span
                    style={{
                      color: idx === chart1Data.breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--primary)',
                      cursor: idx === chart1Data.breadcrumbs.length - 1 ? 'default' : 'pointer',
                      transition: 'color var(--transition-fast)'
                    }}
                    onClick={bc.onClick}
                  >
                    {bc.label}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* SVG Donut / Horizontal Bar Chart */}
            <div style={{ flex: 1, minHeight: '350px', marginTop: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {(() => {
                const currentItems = chart1Data.items;

                if (currentItems.length === 0) {
                  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No hay datos para mostrar en este nivel.</div>;
                }

                if (chart1Data.level === 0) {
                  const scItem = currentItems.find(i => i.id === "SC");
                  const odItem = currentItems.find(i => i.id === "OD");
                  const scTotal = scItem ? scItem.total : 0;
                  const odTotal = odItem ? odItem.total : 0;
                  const totalVal = scTotal + odTotal;

                  const scPct = totalVal > 0 ? scTotal / totalVal : 0;
                  const odPct = totalVal > 0 ? odTotal / totalVal : 0;

                  const r = 75;
                  const circ = 2 * Math.PI * r; // ~471.24
                  const scDash = scPct * circ;
                  const odDash = odPct * circ;

                  // Midpoint angles for labels on the slices (radius = 75, offset by -90 deg / -Math.PI/2)
                  const angleSC = -Math.PI / 2 + (scPct * Math.PI);
                  const xSC = 110 + r * Math.cos(angleSC);
                  const ySC = 110 + r * Math.sin(angleSC);

                  const angleOD = -Math.PI / 2 + (scPct * 2 * Math.PI) + (odPct * Math.PI);
                  const xOD = 110 + r * Math.cos(angleOD);
                  const yOD = 110 + r * Math.sin(angleOD);

                  return (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                      <svg width="220" height="220" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="gradSC" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#00dfd8" />
                            <stop offset="100%" stopColor="#007cf0" />
                          </linearGradient>
                          <linearGradient id="gradOD" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ff0080" />
                            <stop offset="100%" stopColor="#7928ca" />
                          </linearGradient>
                          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.6"/>
                          </filter>
                        </defs>

                        {/* Backing Circle */}
                        <circle cx="110" cy="110" r={r} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="20" />

                        {/* Slice 1: Sede Central */}
                        {scTotal > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={r}
                            fill="transparent"
                            stroke="url(#gradSC)"
                            strokeWidth="20"
                            strokeDasharray={`${scDash} ${circ}`}
                            strokeDashoffset="0"
                            transform="rotate(-90 110 110)"
                            strokeLinecap={odTotal > 0 ? "butt" : "round"}
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                            onClick={() => {
                              setFilterSede(0);
                              setFilterOrgano(-1);
                              setFilterGrupo(-1);
                              setFilterOficina(-1);
                            }}
                          >
                            <title>Sede Central | Total: {formatNum(scTotal)} ({(scPct * 100).toFixed(1)}%)</title>
                          </circle>
                        )}

                        {/* Slice 2: Órganos Desconcentrados */}
                        {odTotal > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={r}
                            fill="transparent"
                            stroke="url(#gradOD)"
                            strokeWidth="20"
                            strokeDasharray={`${odDash} ${circ}`}
                            strokeDashoffset={-scDash}
                            transform="rotate(-90 110 110)"
                            strokeLinecap={scTotal > 0 ? "butt" : "round"}
                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                            onClick={() => {
                              setFilterSede(1);
                              setFilterOrgano(-1);
                              setFilterGrupo(-1);
                              setFilterOficina(-1);
                            }}
                          >
                            <title>Órganos Desconcentrados | Total: {formatNum(odTotal)} ({(odPct * 100).toFixed(1)}%)</title>
                          </circle>
                        )}

                        {/* Slice labels (quantities) on the donut */}
                        {scTotal > 0 && scPct > 0.08 && (
                          <>
                            <rect
                              x={xSC - 22}
                              y={ySC - 10}
                              width="44"
                              height="20"
                              rx="6"
                              fill="rgba(15, 23, 42, 0.85)"
                              stroke="rgba(0, 223, 216, 0.4)"
                              strokeWidth="1.5"
                              style={{ pointerEvents: 'none' }}
                            />
                            <text 
                              x={xSC} 
                              y={ySC} 
                              fill="var(--text-primary)" 
                              fontSize="9.5" 
                              fontWeight="900" 
                              textAnchor="middle" 
                              dominantBaseline="central"
                              style={{ pointerEvents: 'none' }}
                            >
                              {formatNum(scTotal)}
                            </text>
                          </>
                        )}

                        {odTotal > 0 && odPct > 0.08 && (
                          <>
                            <rect
                              x={xOD - 22}
                              y={yOD - 10}
                              width="44"
                              height="20"
                              rx="6"
                              fill="rgba(15, 23, 42, 0.85)"
                              stroke="rgba(255, 0, 128, 0.4)"
                              strokeWidth="1.5"
                              style={{ pointerEvents: 'none' }}
                            />
                            <text 
                              x={xOD} 
                              y={yOD} 
                              fill="var(--text-primary)" 
                              fontSize="9.5" 
                              fontWeight="900" 
                              textAnchor="middle" 
                              dominantBaseline="central"
                              style={{ pointerEvents: 'none' }}
                            >
                              {formatNum(odTotal)}
                            </text>
                          </>
                        )}

                        {/* Hole labels */}
                        <text x="110" y="97" fill="var(--text-secondary)" fontSize="10.5" fontWeight="700" textAnchor="middle" letterSpacing="0.5px">TOTAL</text>
                        <text x="110" y="119" fill="var(--text-primary)" fontSize="20" fontWeight="900" textAnchor="middle">{formatNum(totalVal)}</text>
                        <text x="110" y="133" fill="var(--text-muted)" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.5px">EXPEDIENTES</text>
                      </svg>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', width: '100%', padding: '0 8px', marginTop: '4px' }}>
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onClick={() => {
                            setFilterSede(0);
                            setFilterOrgano(-1);
                            setFilterGrupo(-1);
                            setFilterOficina(-1);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 223, 216, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(0, 223, 216, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                          }}
                        >
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #00dfd8, #007cf0)' }}></span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '10px', fontWeight: '800', letterSpacing: '0.3px' }}>SEDE CENTRAL</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', fontWeight: '700' }}>{(scPct * 100).toFixed(1)}%</span>
                          </div>
                        </div>

                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onClick={() => {
                            setFilterSede(1);
                            setFilterOrgano(-1);
                            setFilterGrupo(-1);
                            setFilterOficina(-1);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 128, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 0, 128, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                          }}
                        >
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #ff0080, #7928ca)' }}></span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '10px', fontWeight: '800', letterSpacing: '0.3px' }}>ÓRGANOS DESCONCENTRADOS</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', fontWeight: '700' }}>{(odPct * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Render Horizontal CSS Bar List (Level 1, 2, 3, etc.)
                  const maxVal = Math.max(...currentItems.map(i => i.total), 1);
                  const colors = ['var(--primary)', '#22d3ee', '#34d399', '#fbbf24', '#f97316'];
                  const itemCount = currentItems.length;

                  // Dynamic sizing to completely avoid scrolling at Level 1+
                  const paddingY = itemCount > 12 ? '3px' : itemCount > 8 ? '5px' : '7px';
                  const gapY = itemCount > 12 ? '4px' : itemCount > 8 ? '6px' : '8px';
                  const fontSizeName = itemCount > 12 ? '9.5px' : '10.5px';
                  const fontSizeVal = itemCount > 12 ? '10px' : '11px';
                  const barHeight = itemCount > 12 ? '5px' : '6px';
                  const nameFlex = itemCount > 12 ? '0 0 150px' : '0 0 180px';
                  const overflowBehavior = itemCount > 14 ? 'auto' : 'hidden';

                  return (
                    <div style={{ flex: 1, overflowY: overflowBehavior, paddingRight: '4px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: gapY, maxHeight: '415px' }}>
                      {currentItems.map((item, idx) => {
                        const pctTotal = (item.total / maxVal) * 100;
                        const barColor = colors[idx % colors.length];
                        const pctNacional = metrics.total > 0 ? ((item.total / metrics.total) * 100).toFixed(1) : '0.0';

                        const isClickable = item.rawId !== -1 && chart1Data.level < 1;

                        return (
                          <div
                            key={item.id}
                            title={`${pctNacional}% del total nacional | TUPA: ${item.tupa} | NO TUPA: ${item.noTupa}`}
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              gap: '12px', 
                              cursor: isClickable ? 'pointer' : 'default', 
                              padding: `${paddingY} 6px`, 
                              borderRadius: '4px', 
                              transition: 'background-color 0.2s',
                              width: '100%'
                            }}
                            onClick={() => {
                              if (!isClickable) return;
                              if (chart1Data.level === 1) {
                                if (filterSede === 0) {
                                  setFilterOrgano(item.rawId!);
                                  setFilterGrupo(-1);
                                  setFilterOficina(-1);
                                } else {
                                  setFilterGrupo(item.rawId!);
                                  setFilterOficina(-1);
                                }
                              } else if (chart1Data.level === 2) {
                                if (filterSede === 0) {
                                  setFilterGrupo(item.rawId!);
                                  setFilterOficina(-1);
                                } else {
                                  setFilterOficina(item.rawId!);
                                }
                              } else if (chart1Data.level === 3) {
                                if (filterSede === 0) {
                                  setFilterOficina(item.rawId!);
                                }
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (isClickable) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                            }}
                            onMouseLeave={(e) => {
                              if (isClickable) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {/* Name */}
                            <span style={{ 
                              color: 'var(--text-primary)', 
                              fontSize: fontSizeName, 
                              fontWeight: '700', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              flex: nameFlex
                            }}>
                              {item.name}
                            </span>

                            {/* Bar Container */}
                            <div style={{ flex: 1, height: barHeight, backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                              {item.total > 0 && (
                                <div style={{ width: `${pctTotal}%`, height: '100%', backgroundColor: barColor, borderRadius: '3px' }}></div>
                              )}
                            </div>

                            {/* Total Value */}
                            <span style={{ 
                              color: barColor, 
                              fontSize: fontSizeVal, 
                              fontWeight: '900', 
                              minWidth: '42px', 
                              textAlign: 'right' 
                            }}>
                              {formatNum(item.total)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        {/* Card 2: Hierarchical Vertical Drilldown Chart */}
        <div ref={chart2Ref} className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3>Desglose Estructural Interactivo</h3>
              <p>Navega la jerarquía de expedientes (Sede → Ámbito → Oficina → Profesional). Haz clic en una columna para profundizar.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Selector de Vista (TUPA / PLAZOS) */}
              <div className="view-mode-toggle" style={{ display: 'inline-flex', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2px', gap: '2px' }}>
                <button
                  onClick={() => setStructViewMode('TUPA')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '9.5px',
                    fontWeight: '800',
                    borderRadius: '18px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: structViewMode === 'TUPA' ? 'var(--primary)' : 'transparent',
                    color: structViewMode === 'TUPA' ? '#000000' : 'var(--text-secondary)'
                  }}
                >
                  TUPA
                </button>
                <button
                  onClick={() => setStructViewMode('PLAZOS')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '9.5px',
                    fontWeight: '800',
                    borderRadius: '18px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: structViewMode === 'PLAZOS' ? 'var(--primary)' : 'transparent',
                    color: structViewMode === 'PLAZOS' ? '#000000' : 'var(--text-secondary)'
                  }}
                >
                  PLAZOS
                </button>
              </div>

              {/* Leyenda Dinámica */}
              {structViewMode === 'TUPA' ? (
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
              ) : (
                <div style={{ display: 'flex', gap: '6px', fontSize: '9px', fontWeight: '800', alignItems: 'center' }}>
                  {[
                    { id: 'VERDE', label: 'A Tiempo', color: '#22c55e' },
                    { id: 'AMARILLO', label: 'Límite', color: '#f59e0b' },
                    { id: 'ANARANJADO', label: 'Finales', color: '#ea580c' },
                    { id: 'ROJO', label: 'Fuera Plazo', color: 'var(--danger)' },
                    { id: 'SIN_PLAZO', label: 'Sin Plazo', color: '#5b6582' }
                  ].map(pill => {
                    const isSelected = structSemaforoFilter.includes(pill.id);
                    const isAnySelected = structSemaforoFilter.length > 0;
                    const active = !isAnySelected || isSelected;
                    return (
                      <div
                        key={pill.id}
                        onClick={() => {
                          setStructSemaforoFilter(prev =>
                            prev.includes(pill.id)
                              ? prev.filter(s => s !== pill.id)
                              : [...prev, pill.id]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                          opacity: active ? 1 : 0.45,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                          border: `1px solid ${isSelected ? pill.color : 'transparent'}`,
                          transition: 'all 0.2s',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: pill.color }}></span>
                        <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{pill.label}</span>
                      </div>
                    );
                  })}
                  {/* Botón Informativo de Plazos */}
                  <div style={{ position: 'relative', marginLeft: '4px' }}>
                    <button
                      onClick={() => setShowPlazosInfo(!showPlazosInfo)}
                      style={{
                        background: showPlazosInfo ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${showPlazosInfo ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                        color: showPlazosInfo ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '900',
                        transition: 'all 0.2s',
                        padding: 0
                      }}
                      title="¿Cómo se evalúan los plazos?"
                    >
                      ?
                    </button>
                    {showPlazosInfo && (
                      <div style={{
                        position: 'absolute',
                        top: '24px',
                        right: 0,
                        width: '320px',
                        background: 'rgba(13, 17, 45, 0.97)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        zIndex: 100,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        fontSize: '10px',
                        lineHeight: '1.6',
                        color: 'var(--text-secondary)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: '900', fontSize: '11px', color: 'var(--text-primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Lógica de Plazos</span>
                          <button onClick={() => setShowPlazosInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', fontSize: '14px', lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }}></span>
                            <span><strong style={{ color: '#22c55e' }}>VERDE (40%)</strong> — Los primeros 40% del plazo total.</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }}></span>
                            <span><strong style={{ color: '#f59e0b' }}>AMARILLO (30%)</strong> — Los siguientes 30% del plazo total.</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea580c', flexShrink: 0 }}></span>
                            <span><strong style={{ color: '#ea580c' }}>ANARANJADO (30%)</strong> — Los últimos 30% del plazo total.</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)', flexShrink: 0 }}></span>
                            <span><strong style={{ color: 'var(--danger)' }}>ROJO</strong> — El plazo se ha excedido.</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5b6582', flexShrink: 0 }}></span>
                            <span><strong style={{ color: '#5b6582' }}>SIN PLAZO</strong> — No se ha asignado plazo al expediente.</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px 10px', backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.1)', fontSize: '9.5px', color: 'var(--text-muted)' }}>
                          💡 Haz clic en los indicadores de la leyenda para filtrar visualmente el gráfico. Puedes seleccionar múltiples colores.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
              <button
                onClick={() => handleExportChart(chart2Ref, setCopiedChart2)}
                title={copiedChart2 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedChart2 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = copiedChart2 ? 'var(--success)' : '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = copiedChart2 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {copiedChart2 ? (
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

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {/* Breadcrumb Navigation */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', fontWeight: '700', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span
                style={{ color: drilldownPath.length === 0 ? 'var(--text-primary)' : 'var(--primary)', cursor: drilldownPath.length === 0 ? 'default' : 'pointer', transition: 'color var(--transition-fast)' }}
                onClick={() => setDrilldownPath([])}
              >
                {filterSede === 0 ? 'Sede Central (Todas las Oficinas)' : filterSede === 1 ? 'Nacional (Todos los Ámbitos)' : 'Todas las Sedes (Nacional)'}
              </span>

              {drilldownPath.length > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span
                    style={{ color: drilldownPath.length === 1 ? 'var(--text-primary)' : 'var(--primary)', cursor: drilldownPath.length === 1 ? 'default' : 'pointer', transition: 'color var(--transition-fast)' }}
                    onClick={() => setDrilldownPath([drilldownPath[0]])}
                  >
                    {sortedRawData.find(g => g.idx === drilldownPath[0])?.name.replace("SC - ", "").replace("Sede Central - ", "") || 'Ámbito/Oficina'}
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

                  const maxVal = structViewMode === 'TUPA'
                    ? Math.max(...currentItems.map(i => Math.max(i.tupa, i.noTupa)), 1)
                    : Math.max(...currentItems.map(i => i.total), 1);
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
                          const cleanName = item.name.replace("SC - ", "");
                          const shortName = barCount > 15 && cleanName.length > 15
                            ? cleanName.substring(0, 15) + '...'
                            : cleanName;
                          const xPosCenter = 60 + spacing * 0.5 + idx * spacing;

                          if (structViewMode === 'TUPA') {
                            const singleBarWidth = (groupWidth / 2) - 2;
                            const xPosNoTupa = xPosCenter - groupWidth / 2;
                            const xPosTupa = xPosCenter + 2;

                            const heightTupa = (item.tupa / maxVal) * chartHeight;
                            const heightNoTupa = (item.noTupa / maxVal) * chartHeight;

                            const yTupa = chartBottomY - heightTupa;
                            const yNoTupa = chartBottomY - heightNoTupa;

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
                                <title>{cleanName} | Total: {item.total} | TUPA: {item.tupa} | NO TUPA: {item.noTupa}</title>

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
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="end"
                                  transform={`rotate(-30, ${xPosCenter}, ${chartBottomY + 32})`}
                                >
                                  {shortName}
                                </text>
                              </g>
                            );
                          } else {
                            // PLAZOS stacked bars mode
                            const counts = structChartSemaforoCounts[item.name] || { VERDE: 0, AMARILLO: 0, ANARANJADO: 0, ROJO: 0, SIN_PLAZO: 0 };
                            const totalVal = counts.VERDE + counts.AMARILLO + counts.ANARANJADO + counts.ROJO + counts.SIN_PLAZO;

                            const hVerde = (counts.VERDE / maxVal) * chartHeight;
                            const hAmarillo = (counts.AMARILLO / maxVal) * chartHeight;
                            const hAnaranjado = (counts.ANARANJADO / maxVal) * chartHeight;
                            const hRojo = (counts.ROJO / maxVal) * chartHeight;
                            const hSinPlazo = (counts.SIN_PLAZO / maxVal) * chartHeight;

                            const barWidth = Math.min(26, groupWidth * 0.8);
                            const xPosBar = xPosCenter - barWidth / 2;

                            let currentY = chartBottomY;

                            const segments = [
                              { key: 'VERDE', h: hVerde, count: counts.VERDE, color: '#22c55e', name: 'A Tiempo' },
                              { key: 'AMARILLO', h: hAmarillo, count: counts.AMARILLO, color: '#f59e0b', name: 'En el Límite' },
                              { key: 'ANARANJADO', h: hAnaranjado, count: counts.ANARANJADO, color: '#ea580c', name: 'Días Finales' },
                              { key: 'ROJO', h: hRojo, count: counts.ROJO, color: 'var(--danger)', name: 'Fuera de Plazo' },
                              { key: 'SIN_PLAZO', h: hSinPlazo, count: counts.SIN_PLAZO, color: '#5b6582', name: 'Sin Plazo' }
                            ].filter(s => s.h > 0);

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
                                <title>
                                  {cleanName} | Total: {totalVal} docs&#10;
                                  - A Tiempo (Verde): {counts.VERDE}&#10;
                                  - En Límite (Amarillo): {counts.AMARILLO}&#10;
                                  - Días Finales (Naranja): {counts.ANARANJADO}&#10;
                                  - Fuera Plazo (Rojo): {counts.ROJO}&#10;
                                  - Sin Plazo: {counts.SIN_PLAZO}
                                </title>

                                <rect x={xPosCenter - (groupWidth * 0.7)} y="10" width={groupWidth * 1.4} height={chartBottomY + 10} fill="rgba(255,255,255,0.02)" rx="8" style={{ opacity: 0, transition: 'opacity 0.2s' }} className="hover-bg-rect" />

                                {/* Background Track */}
                                <rect x={xPosBar} y={20} width={barWidth} height={chartHeight} fill="rgba(255,255,255,0.03)" rx="3" />

                                {/* Stacked segments */}
                                {segments.map(seg => {
                                  const segmentY = currentY - seg.h;
                                  currentY -= seg.h;
                                  const isSelected = structSemaforoFilter.includes(seg.key);
                                  const isAnyFilterActive = structSemaforoFilter.length > 0;

                                  return (
                                    <rect
                                      key={seg.key}
                                      x={xPosBar}
                                      y={segmentY}
                                      width={barWidth}
                                      height={seg.h}
                                      fill={seg.color}
                                      rx="1.5"
                                      style={{
                                        transition: 'all 0.2s',
                                        stroke: isSelected ? '#ffffff' : 'none',
                                        strokeWidth: isSelected ? 1.5 : 0,
                                        opacity: !isAnyFilterActive || isSelected ? 1 : 0.2
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setStructSemaforoFilter(prev =>
                                          prev.includes(seg.key)
                                            ? prev.filter(s => s !== seg.key)
                                            : [...prev, seg.key]
                                        );
                                      }}
                                    >
                                      <title>{seg.name}: {seg.count} ({totalVal > 0 ? ((seg.count / totalVal) * 100).toFixed(1) : 0}%)</title>
                                    </rect>
                                  );
                                })}

                                {/* Group Total Text */}
                                <text x={xPosCenter} y={chartBottomY + 16} fill="var(--text-primary)" fontSize="11" fontWeight="800" textAnchor="middle">
                                  {formatNum(totalVal)}
                                </text>

                                {/* X-Axis Label */}
                                <text
                                  x={xPosCenter}
                                  y={chartBottomY + 32}
                                  fill="var(--text-secondary)"
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="end"
                                  transform={`rotate(-30, ${xPosCenter}, ${chartBottomY + 32})`}
                                >
                                  {shortName}
                                </text>
                              </g>
                            );
                          }
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
        <div ref={chart3Ref} className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>ANTIGÜEDAD DE PENDIENTES (FECHA DE CREACIÓN)</h3>
            </div>
            <button
              onClick={() => handleExportChart(chart3Ref, setCopiedChart3)}
              title={copiedChart3 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedChart3 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedChart3 ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedChart3 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedChart3 ? (
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
        <div ref={chart4Ref} className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>AÑO DE INGRESO ULTIMO ESCRITORIO</h3>
            </div>
            <button
              onClick={() => handleExportChart(chart4Ref, setCopiedChart4)}
              title={copiedChart4 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedChart4 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedChart4 ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedChart4 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedChart4 ? (
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
        <div ref={chart5Ref} className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3 style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>POR BANDEJAS</h3>
            </div>
            <button
              onClick={() => handleExportChart(chart5Ref, setCopiedChart5)}
              title={copiedChart5 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
              style={{
                background: 'none',
                border: 'none',
                color: copiedChart5 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = copiedChart5 ? 'var(--success)' : '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = copiedChart5 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {copiedChart5 ? (
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







      {/* 6. Row 3: Procedures & traffic light plazos (Semáforo) */}
      <div className="interno-grid-row3">
        {/* Left Column: Procedures */}
        <div ref={chart6Ref} className="chart-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="chart-card-title-box">
              <h3>PROCEDIMIENTOS (TUPA / NO TUPA)</h3>
              <p>Clasificación de expedientes por tipo de trámite. (Mostrando Top 30)</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <button
                onClick={() => handleExportChart(chart6Ref, setCopiedChart6)}
                title={copiedChart6 ? "¡Copiado!" : "Exportar Gráfico (Copiar)"}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedChart6 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = copiedChart6 ? 'var(--success)' : '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = copiedChart6 ? 'var(--success)' : 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {copiedChart6 ? (
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

          <div style={{ overflowX: 'auto', display: 'flex', alignItems: 'flex-end', height: '240px', marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', gap: '16px', width: '100%', minWidth: 0 }}>
            {Object.entries(metrics.procedures)
              .filter(([_, count]) => count.total > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 30) // Limit to top 30
              .map(([name, count], idx) => {
                const maxVal = Math.max(...Object.values(metrics.procedures).map(p => p.total), 1);
                const pctHeight = (count.total / maxVal) * 160;

                const isTupa = count.tupa > count.noTupa;
                const barGradient = isTupa ? 'linear-gradient(180deg, #f59e0b, #ea580c)' : 'linear-gradient(180deg, #00dfd8, #007cf0)';
                const textColor = isTupa ? '#f59e0b' : '#00dfd8';

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px', gap: '6px' }}>
                    <div style={{ position: 'relative', width: '20px', height: '160px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '20px', display: 'flex', alignItems: 'flex-end', marginTop: '12px' }} title={`${name}: ${formatNum(count.total)}`}>
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

      {/* Hidden button for triggering detailed export from App.tsx */}
      <button 
        id="export-interno-btn" 
        style={{ display: 'none' }} 
        onClick={handleExportCSV} 
        disabled={exportLoading}
      />

      {/* Loading overlay for export preparation */}
      {exportLoading && (
        <div className="loading-overlay" style={{ position: 'fixed', zIndex: 9999 }}>
          <div className="spinner"></div>
          <div className="loading-text">Preparando archivo de exportación detallado...</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Procesando {formatNum(metrics.total)} registros filtrados</div>
        </div>
      )}
    </div>
  );
};
