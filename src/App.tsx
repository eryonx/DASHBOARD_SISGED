import { useState, useEffect, useMemo } from 'react';
import { FiltersBar } from './components/FiltersBar';
import { MetricsCards } from './components/MetricsCards';
import { MonthlyCharts } from './components/MonthlyCharts';
import { SecondaryCharts } from './components/SecondaryCharts';
import { SlaWidget } from './components/SlaWidget';
import { DataTables } from './components/DataTables';
import { LeaderboardWidget } from './components/LeaderboardWidget';
import { InternoDashboard } from './components/InternoDashboard';
import { DestinationTable } from './components/DestinationTable';

// Interfaces matching backend compression
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
  number, // 11: dest_s_idx (Sede Destino)
  number, // 12: dest_g_idx (Grupo Destino)
  number  // 13: dest_o_idx (Oficina Destino_2)
];

interface DashboardData {
  metadata: Metadata;
  records: RecordTuple[];
}



export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<any | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clase, setClase] = useState(-1); // -1: All, 0: Nuevo, 1: Anexo
  const [origin, setOrigin] = useState(-1); // -1: All, 0: Digital, 1: Fisico
  const [tupa, setTupa] = useState(-1); // -1: All, 0: Tupa, 1: No Tupa
  const [procedimiento, setProcedimiento] = useState(-1); // -1: All, index in PROCEDIMIENTOS_LIST otherwise
  const [estadoCut, setEstadoCut] = useState(-1); // -1: All, 0: Atendido, 1: Pendiente, 2: Anulado, 3: Observado
  const [sede, setSede] = useState(-1); // -1: All, index otherwise
  const [ambito, setAmbito] = useState(-1); // -1: All, index otherwise
  const [stateFilter, setStateFilter] = useState(-1); // -1: All, 0: Derivado, 1: Archivado, 2: Calidad, 3: Observado

  // Tab navigation state (Ingresados Ventanilla is default)
  const [activeTab, setActiveTab] = useState('ingresados-ventanilla');

  // Sidebar Search State
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingDashboardName, setPendingDashboardName] = useState<string | null>(null);

  const pendingTabs = ['todas', 'intercambio', 'emitidos', 'notif-fisica', 'notif-digital'];

  const handleTabClick = (tabId: string, tabName: string) => {
    if (pendingTabs.includes(tabId)) {
      setPendingDashboardName(tabName);
    } else {
      setActiveTab(tabId);
    }
  };

  const navLinks = useMemo(() => [
    { id: 'todas', label: 'Todas Las Páginas' },
    { id: 'ingresados-ventanilla', label: 'Ingresados Ventanilla' },
    { id: 'intercambio', label: 'Ingresados por Intercambio' },
    { id: 'interno', label: 'Ingresados Interno' },
    { id: 'emitidos', label: 'Doc. Emitidos' },
    { id: 'notif-fisica', label: 'Notificaciones Fisicas' },
    { id: 'notif-digital', label: 'Notificaciones Digitales' },
  ], []);

  const filteredNavLinks = useMemo(() => {
    if (!sidebarSearch) return navLinks;
    const query = sidebarSearch.toLowerCase();
    return navLinks.filter(link => link.label.toLowerCase().includes(query));
  }, [sidebarSearch, navLinks]);

  // Load dashboard data on mount
  useEffect(() => {
    fetch('/data/dashboard_data.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el archivo de datos.');
        return res.json();
      })
      .then((jsonData: DashboardData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar los datos del dashboard. Verifique que el archivo exista.');
        setLoading(false);
      });
  }, []);

  // Find min and max date from data for date limits
  const { minDate, maxDate } = useMemo(() => {
    if (!data || data.records.length === 0) return { minDate: '', maxDate: '' };
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

  // Set default filter date range once data is loaded
  useEffect(() => {
    if (minDate && maxDate) {
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  }, [minDate, maxDate]);

  // Reset/Clear Filters
  const handleClearFilters = () => {
    setStartDate(minDate);
    setEndDate(maxDate);
    setClase(-1);
    setOrigin(-1);
    setTupa(-1);
    setProcedimiento(-1);
    setEstadoCut(-1);
    setSede(-1);
    setAmbito(-1);
    setStateFilter(-1);
  };

  const handleSedeChange = (val: number) => {
    setSede(val);
    setAmbito(-1); // Reset selected scope if Sede filter changes
  };

  const handleTupaChange = (val: number) => {
    setTupa(val);
    setProcedimiento(-1); // Reset selected procedure if TUPA/NO TUPA filter changes
  };

  // Calculate which ámbitos are valid for the selected Sede
  const allowedAmbitos = useMemo(() => {
    if (!data) return [];
    if (sede === -1) return [];
    const set = new Set<number>();
    for (let i = 0; i < data.records.length; i++) {
      const rec = data.records[i];
      if (rec[5] === sede && rec[6] !== -1) {
        set.add(rec[6]);
      }
    }
    return Array.from(set).sort((a, b) => {
      const nameA = data.metadata.ambitos[a] || '';
      const nameB = data.metadata.ambitos[b] || '';
      return nameA.localeCompare(nameB);
    });
  }, [data, sede]);

  // 15ms React Filter and Aggregation Loop
  const metrics = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        filteredTotal: 0,
        digitalCount: 0,
        fisicoCount: 0,
        tupaCount: 0,
        noTupaCount: 0,
        filteredTupaCount: 0,
        filteredNoTupaCount: 0,
        derivadoCount: 0,
        atendidoCount: 0,
        pendienteCount: 0,
        calidadCount: 0,
        observadoCount: 0,
        archivadoCount: 0,
        avgValidationHours: 0,
        under24Percent: 0,
        slaDistribution: {
          range0_12: 0,
          range12_24: 0,
          range24_48: 0,
          rangeOver48: 0,
          totalCount: 0,
        },
        filteredNuevoCount: 0,
        filteredAnexoCount: 0,
        filteredDigitalCount: 0,
        filteredFisicoCount: 0,
        avgDaily: 0,
        monthlyData: [] as { month: string; tupa: number; notupa: number; digital: number; fisico: number }[],
        sedeDetailsList: [] as any[],
        userData: [] as { name: string; count: number; ambito: string }[],
        destinationDetailsList: [] as any[],
      };
    }

    let total = 0; // KPI Total
    let filteredTotal = 0; // Filtered Total (after stateFilter)
    const uniqueDates = new Set<string>();
    let digitalCount = 0;
    let fisicoCount = 0;
    let tupaCount = 0;
    let noTupaCount = 0;
    let filteredTupaCount = 0;
    let filteredNoTupaCount = 0;
    let filteredNuevoCount = 0;
    let filteredAnexoCount = 0;
    let filteredDigitalCount = 0;
    let filteredFisicoCount = 0;
    let derivadoCount = 0;
    let atendidoCount = 0;
    let pendienteCount = 0;
    let calidadCount = 0;
    let observadoCount = 0;
    let archivadoCount = 0;

    let totalValHours = 0;
    let valHoursCount = 0;
    let under24Count = 0;
    let slaRange0_12 = 0;
    let slaRange12_24 = 0;
    let slaRange24_48 = 0;
    let slaRangeOver48 = 0;

    // Temporal storage for group-bys
    const dailyTrendMap: Record<string, { tupa: number; notupa: number; digital: number; fisico: number }> = {};
    const SedeDetailsMap: Record<number, {
      total: number;
      derivado: number;
      observado: number;
      calidad: number;
      archivado: number;
      valCount: number;
      under24Count: number;
      ambitos: Record<number, {
        total: number;
        derivado: number;
        observado: number;
        calidad: number;
        archivado: number;
        valCount: number;
        under24Count: number;
      }>;
    }> = {};
    const userMap: Record<number, number> = {};
    const userAmbitoMap: Record<number, number> = {};
    const destMap: Record<number, Record<number, Record<number, number>>> = {};

    const records = data.records;
    const len = records.length;

    for (let i = 0; i < len; i++) {
      const rec = records[i];
      const r_origin = rec[0];
      const r_clasif = rec[1];
      const r_tupa = rec[2];
      const r_est_d = rec[3];
      const r_est_c = rec[4];
      const r_sede = rec[5];
      const r_ambito = rec[6];
      const r_user = rec[7];
      const r_date = rec[8];
      const r_val_h = rec[9];

      // 1. Apply Base Filters (except Sede)
      if (startDate && r_date < startDate) continue;
      if (endDate && r_date > endDate) continue;
      if (clase !== -1 && r_clasif !== clase) continue;
      if (origin !== -1 && r_origin !== origin) continue;
      if (tupa !== -1 && r_tupa !== tupa) continue;

      // Filter by Procedimiento
      const r_proced = rec[10];
      if (procedimiento !== -1 && r_proced !== procedimiento) continue;
      if (estadoCut !== -1 && r_est_c !== estadoCut) continue;

      // 2. Count Sede & Ámbito Groupings (BEFORE applying Sede filter)
      if (r_sede !== -1) {
        if (!SedeDetailsMap[r_sede]) {
          SedeDetailsMap[r_sede] = {
            total: 0,
            derivado: 0,
            observado: 0,
            calidad: 0,
            archivado: 0,
            valCount: 0,
            under24Count: 0,
            ambitos: {},
          };
        }
        const sDetail = SedeDetailsMap[r_sede];
        sDetail.total++;
        if (r_est_d === 0) sDetail.derivado++;
        else if (r_est_d === 1) sDetail.archivado++;
        else if (r_est_d === 2) sDetail.calidad++;
        else if (r_est_d === 3) sDetail.observado++;

        if (r_val_h !== null) {
          sDetail.valCount++;
          if (r_val_h <= 24) {
            sDetail.under24Count++;
          }
        }

        if (r_ambito !== -1) {
          if (!sDetail.ambitos[r_ambito]) {
            sDetail.ambitos[r_ambito] = {
              total: 0,
              derivado: 0,
              observado: 0,
              calidad: 0,
              archivado: 0,
              valCount: 0,
              under24Count: 0,
            };
          }
          const aDetail = sDetail.ambitos[r_ambito];
          aDetail.total++;
          if (r_est_d === 0) aDetail.derivado++;
          else if (r_est_d === 1) aDetail.archivado++;
          else if (r_est_d === 2) aDetail.calidad++;
          else if (r_est_d === 3) aDetail.observado++;

          if (r_val_h !== null) {
            aDetail.valCount++;
            if (r_val_h <= 24) {
              aDetail.under24Count++;
            }
          }
        }
      }

      // 3. Apply Sede Filter
      if (sede !== -1 && r_sede !== sede) continue;
      if (ambito !== -1 && r_ambito !== ambito) continue;

      // 4. Count Base KPI Metrics (BEFORE applying stateFilter)
      total++;
      if (r_origin === 0) digitalCount++;
      else if (r_origin === 1) fisicoCount++;

      if (r_tupa === 0) tupaCount++;
      else if (r_tupa === 1) noTupaCount++;

      if (r_est_d === 0) {
        derivadoCount++;
        if (r_est_c === 0) atendidoCount++;
        else if (r_est_c === 1) pendienteCount++;
      } else if (r_est_d === 1) {
        archivadoCount++;
      } else if (r_est_d === 2) {
        calidadCount++;
      } else if (r_est_d === 3) {
        observadoCount++;
      }

      // 5. Apply stateFilter for charts/grids/SLA
      if (stateFilter !== -1 && r_est_d !== stateFilter) continue;

      filteredTotal++;
      if (r_date) {
        uniqueDates.add(r_date);
      }

      if (r_tupa === 0) filteredTupaCount++;
      else if (r_tupa === 1) filteredNoTupaCount++;

      if (r_clasif === 0) filteredNuevoCount++;
      else if (r_clasif === 1) filteredAnexoCount++;

      if (r_origin === 0) filteredDigitalCount++;
      else if (r_origin === 1) filteredFisicoCount++;

      // SLA Compliance
      if (r_val_h !== null) {
        totalValHours += r_val_h;
        valHoursCount++;
        if (r_val_h <= 24) {
          under24Count++;
        }
        if (r_val_h <= 12) {
          slaRange0_12++;
        } else if (r_val_h <= 24) {
          slaRange12_24++;
        } else if (r_val_h <= 48) {
          slaRange24_48++;
        } else {
          slaRangeOver48++;
        }
      }

      // Trend Grouping (by Day: YYYY-MM-DD)
      if (r_date) {
        if (!dailyTrendMap[r_date]) {
          dailyTrendMap[r_date] = { tupa: 0, notupa: 0, digital: 0, fisico: 0 };
        }
        if (r_tupa === 0) dailyTrendMap[r_date].tupa++;
        else dailyTrendMap[r_date].notupa++;

        if (r_origin === 0) dailyTrendMap[r_date].digital++;
        else dailyTrendMap[r_date].fisico++;
      }

      // User Grouping (Top operators)
      if (r_user !== -1) {
        userMap[r_user] = (userMap[r_user] || 0) + 1;
        if (r_ambito !== -1 && userAmbitoMap[r_user] === undefined) {
          userAmbitoMap[r_user] = r_ambito;
        }
      }

      // Destination Grouping
      const r_dest_s = rec[11];
      const r_dest_g = rec[12];
      const r_dest_o = rec[13];
      if (r_dest_s !== undefined && r_dest_s !== -1) {
        if (!destMap[r_dest_s]) destMap[r_dest_s] = {};
        if (!destMap[r_dest_s][r_dest_g]) destMap[r_dest_s][r_dest_g] = {};
        destMap[r_dest_s][r_dest_g][r_dest_o] = (destMap[r_dest_s][r_dest_g][r_dest_o] || 0) + 1;
      }
    }

    // Calculate dynamic granularity for the trend chart
    const uniqueDays = Object.keys(dailyTrendMap).sort();
    const isDaily = uniqueDays.length <= 35;

    let monthlyData: { month: string; tupa: number; notupa: number; digital: number; fisico: number }[] = [];

    if (isDaily) {
      monthlyData = uniqueDays.map((dateStr) => ({
        month: dateStr,
        tupa: dailyTrendMap[dateStr].tupa,
        notupa: dailyTrendMap[dateStr].notupa,
        digital: dailyTrendMap[dateStr].digital,
        fisico: dailyTrendMap[dateStr].fisico,
      }));
    } else {
      const monthlyTrendMap: Record<string, { tupa: number; notupa: number; digital: number; fisico: number }> = {};
      for (const dateStr of uniqueDays) {
        const monthStr = dateStr.substring(0, 7); // YYYY-MM
        if (!monthlyTrendMap[monthStr]) {
          monthlyTrendMap[monthStr] = { tupa: 0, notupa: 0, digital: 0, fisico: 0 };
        }
        monthlyTrendMap[monthStr].tupa += dailyTrendMap[dateStr].tupa;
        monthlyTrendMap[monthStr].notupa += dailyTrendMap[dateStr].notupa;
        monthlyTrendMap[monthStr].digital += dailyTrendMap[dateStr].digital;
        monthlyTrendMap[monthStr].fisico += dailyTrendMap[dateStr].fisico;
      }

      monthlyData = Object.keys(monthlyTrendMap)
        .sort()
        .map((monthStr) => ({
          month: monthStr,
          tupa: monthlyTrendMap[monthStr].tupa,
          notupa: monthlyTrendMap[monthStr].notupa,
          digital: monthlyTrendMap[monthStr].digital,
          fisico: monthlyTrendMap[monthStr].fisico,
        }));
    }

    // Format Sede Details List (hierarchical drill-down)
    const sedeDetailsList = data.metadata.sedes.map((name, idx) => {
      const sVal = SedeDetailsMap[idx] || {
        total: 0,
        derivado: 0,
        observado: 0,
        calidad: 0,
        archivado: 0,
        ambitos: {},
      };

      const ambitosArray = Object.keys(sVal.ambitos).map((aIdxStr) => {
        const aIdx = Number(aIdxStr);
        const aVal = sVal.ambitos[aIdx];
        return {
          name: data.metadata.ambitos[aIdx] || 'Otro',
          total: aVal.total,
          derivado: aVal.derivado,
          observado: aVal.observado,
          calidad: aVal.calidad,
          archivado: aVal.archivado,
          valCount: aVal.valCount,
          under24Count: aVal.under24Count,
          slaPercent: aVal.valCount > 0 ? (aVal.under24Count / aVal.valCount) * 100 : null,
        };
      }).sort((a, b) => b.total - a.total);

      return {
        name,
        idx,
        total: sVal.total,
        derivado: sVal.derivado,
        observado: sVal.observado,
        calidad: sVal.calidad,
        archivado: sVal.archivado,
        valCount: sVal.valCount,
        under24Count: sVal.under24Count,
        slaPercent: sVal.valCount > 0 ? (sVal.under24Count / sVal.valCount) * 100 : null,
        ambitos: ambitosArray,
      };
    }).sort((a, b) => b.total - a.total);

    // Format User Data
    const userData = Object.keys(userMap).map((uIdxStr) => {
      const uIdx = Number(uIdxStr);
      const aIdx = userAmbitoMap[uIdx];
      const ambitoName = aIdx !== undefined ? data.metadata.ambitos[aIdx] : 'Sede Central';
      return {
        name: data.metadata.users[uIdx],
        count: userMap[uIdx],
        ambito: ambitoName,
      };
    }).sort((a, b) => b.count - a.count);

    // Format Destination Details List (Sede -> Grupo -> Oficina)
    const destinationDetailsList = (data.metadata.dest_sedes || []).map((name, sIdx) => {
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
    }).sort((a, b) => b.total - a.total);

    return {
      total,
      filteredTotal,
      digitalCount,
      fisicoCount,
      tupaCount,
      noTupaCount,
      filteredTupaCount,
      filteredNoTupaCount,
      filteredNuevoCount,
      filteredAnexoCount,
      filteredDigitalCount,
      filteredFisicoCount,
      derivadoCount,
      atendidoCount,
      pendienteCount,
      calidadCount,
      observadoCount,
      archivadoCount,
      avgDaily: uniqueDates.size > 0 ? filteredTotal / uniqueDates.size : 0,
      avgValidationHours: valHoursCount > 0 ? totalValHours / valHoursCount : 0,
      under24Percent: valHoursCount > 0 ? (under24Count / valHoursCount) * 100 : 0,
      slaDistribution: {
        range0_12: slaRange0_12,
        range12_24: slaRange12_24,
        range24_48: slaRange24_48,
        rangeOver48: slaRangeOver48,
        totalCount: valHoursCount,
      },
      monthlyData,
      sedeDetailsList,
      userData,
      destinationDetailsList,
    };
  }, [data, startDate, endDate, clase, origin, tupa, procedimiento, estadoCut, sede, ambito, stateFilter]);

  const performDetailedExport = (detailed: any) => {
    const lines: string[] = [];
    
    // Add original headers
    lines.push(detailed.columns.join(';'));

    const lookupCols = [
      'Origen', 'Clasificación', 'Sede Ingreso', 'Ambito Ingreso', 
      'Usu_Ventanilla', 'Tupa', 'Oficina Destino_2', 'Oficina Destino', 
      'Grupo', 'Sede', 'Est. Derivado', 'Est. Cut', 'Ultimo Escritorio'
    ];

    const esc = (s: any) => {
      const str = String(s);
      return `"${str.replace(/"/g, '""')}"`;
    };

    for (let i = 0; i < data!.records.length; i++) {
      const rec = data!.records[i];
      const r_origin = rec[0];
      const r_clasif = rec[1];
      const r_tupa = rec[2];
      const r_est_d = rec[3];
      const r_est_c = rec[4];
      const r_sede = rec[5];
      const r_ambito = rec[6];
      const r_proced = rec[10];
      const r_date = rec[8];

      // Apply current filters
      if (startDate && r_date < startDate) continue;
      if (endDate && r_date > endDate) continue;
      if (clase !== -1 && r_clasif !== clase) continue;
      if (origin !== -1 && r_origin !== origin) continue;
      if (tupa !== -1 && r_tupa !== tupa) continue;
      if (procedimiento !== -1 && r_proced !== procedimiento) continue;
      if (estadoCut !== -1 && r_est_c !== estadoCut) continue;
      if (sede !== -1 && r_sede !== sede) continue;
      if (ambito !== -1 && r_ambito !== ambito) continue;
      if (stateFilter !== -1 && r_est_d !== stateFilter) continue;

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
    link.setAttribute('download', `SISGED_Detalle_Completo_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Filtered Summary Report as CSV
  const handleExportCSV = () => {
    if (!data) return;

    if (!detailedData) {
      setExportLoading(true);
      fetch('/data/detailed_data.json')
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
          alert('Error al descargar la información completa de la ventanilla.');
          setExportLoading(false);
        });
    } else {
      performDetailedExport(detailedData);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <div className="loading-text">Cargando datos del SISGED...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Procesando 146,796 registros a nivel nacional</div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="loading-overlay">
        <div style={{ color: 'var(--danger)', fontSize: '48px', fontWeight: 'bold' }}>⚠️</div>
        <div className="loading-text" style={{ color: 'var(--danger)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="app-container">

      {/* 1. LEFT SIDEBAR */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <svg className="sidebar-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="sidebar-brand-name">Dashboard ANA</span>
        </div>

        <div className="sidebar-search-container">
          <svg className="sidebar-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Buscar..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-heading">
            <span>Dashboard</span>
            <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
          </div>

          {filteredNavLinks.map((link) => (
            <a
              key={link.id}
              href="#"
              className={`sidebar-nav-link ${activeTab === link.id ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleTabClick(link.id, link.label); }}
            >
              {link.label}
            </a>
          ))}
          {filteredNavLinks.length === 0 && (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No se encontraron resultados
            </div>
          )}
        </nav>

        {/* Profile Section at Bottom */}
        <div className="sidebar-profile">
          <div className="profile-avatar">JG</div>
          <div className="profile-info">
            <span className="profile-name">Jose Guanilo</span>
            <span className="profile-title">Jefe - UATD</span>
          </div>
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Main Header Row */}
        <div className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              className="btn-outline"
              title={sidebarCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7"></polyline>
                  <polyline points="18 17 13 12 18 7"></polyline>
                </svg>
              )}
            </button>
            <div className="header-title-section">
              <h2>{activeTab === 'interno' ? 'Dashboard de Ingresados Internos' : 'Documentos ingresados por ventanilla'}</h2>
              <p>{activeTab === 'interno' ? 'Consolidado y distribución de expedientes ingresados internamente a nivel nacional.' : 'Este dashboard consolida todos los documentos ingresados a través de las ventanillas físicas y virtuales a nivel nacional.'}</p>
            </div>
          </div>
          <div className="header-actions-section">
            {activeTab === 'interno' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-sidebar)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => {}}
                    style={{
                      padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                      background: 'var(--primary)', color: '#000000', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer'
                    }}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => alert('Los datos para Atendidos se generarán dinámicamente cuando proceda a subir la base de datos real en Excel.')}
                    style={{
                      padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                      background: 'none', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', opacity: 0.6
                    }}
                  >
                    Atendidos
                  </button>
                </div>
                <button className="btn-outline" onClick={() => document.getElementById('export-interno-btn')?.click()}>
                  Export data ↓
                </button>
              </div>
            ) : (
              <>
                <button className="btn-outline" onClick={handleExportCSV} disabled={exportLoading}>
                  {exportLoading ? 'Cargando...' : 'Export data ↓'}
                </button>
                <button className="btn-primary" onClick={() => window.print()}>
                  Create report
                </button>
              </>
            )}
          </div>
        </div>

        {activeTab === 'interno' ? (
          <InternoDashboard />
        ) : (
          <>

            {/* Compact Inline Filters Bar */}
            <FiltersBar
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              clase={clase}
              onClaseChange={setClase}
              origin={origin}
              onOriginChange={setOrigin}
              tupa={tupa}
              onTupaChange={handleTupaChange}
              procedimiento={procedimiento}
              onProcedimientoChange={setProcedimiento}
              estadoCut={estadoCut}
              onEstadoCutChange={setEstadoCut}
              sede={sede}
              onSedeChange={handleSedeChange}
              sedesList={data?.metadata.sedes || []}
              ambito={ambito}
              onAmbitoChange={setAmbito}
              ambitosList={data?.metadata.ambitos || []}
              allowedAmbitos={allowedAmbitos}
              procedimientosList={data?.metadata.procedimientos || []}
              procedimientosTupa={data?.metadata.procedimientos_tupa || []}
              procedimientosNoTupa={data?.metadata.procedimientos_notupa || []}
              onClearFilters={handleClearFilters}
              minDate={minDate}
              maxDate={maxDate}
            />

            {/* 5 KPI Cards Row */}
            <MetricsCards
              total={metrics.total}
              derivadoCount={metrics.derivadoCount}
              observadoCount={metrics.observadoCount}
              calidadCount={metrics.calidadCount}
              archivadoCount={metrics.archivadoCount}
              selectedState={stateFilter}
              onStateSelect={setStateFilter}
              avgDaily={metrics.avgDaily}
            />

            {/* Row 1: SLA Compliance & Segmentations (TUPA / Origen / Clasificación) */}
            <div className="dashboard-side-by-side" style={{ gridTemplateColumns: '1fr 1.8fr' }}>
              <SlaWidget
                avgValidationHours={metrics.avgValidationHours}
                under24Percent={metrics.under24Percent}
                slaDistribution={metrics.slaDistribution}
              />

              {metrics.monthlyData.length > 0 && (
                <SecondaryCharts
                  tupaData={{
                    tupa: metrics.filteredTupaCount,
                    notupa: metrics.filteredNoTupaCount,
                  }}
                  origenData={{
                    digital: metrics.filteredDigitalCount,
                    fisico: metrics.filteredFisicoCount,
                  }}
                  clasifData={{
                    nuevo: metrics.filteredNuevoCount,
                    anexo: metrics.filteredAnexoCount,
                  }}
                />
              )}
            </div>

            {/* Row 2: Sede/Ambito Drilldown Matrix Table (Full Width) */}
            <div style={{ marginTop: '24px' }}>
              <DataTables
                sedeDetailsList={metrics.sedeDetailsList}
                selectedSede={sede}
                onSedeSelect={handleSedeChange}
                avgValidationHours={metrics.avgValidationHours}
              />
            </div>

            {/* Row 3: Monthly Trend Charts & Leaderboard (Trends & Operators) */}
            {metrics.monthlyData.length > 0 && (
              <div className="dashboard-side-by-side" style={{ marginTop: '24px' }}>
                <MonthlyCharts
                  monthlyData={metrics.monthlyData}
                />

                <LeaderboardWidget
                  userData={metrics.userData}
                />
              </div>
            )}

            {/* Row 4: Destination Table (Sede -> Grupo -> Oficina) */}
            <div style={{ marginTop: '24px' }}>
              <DestinationTable
                destinationDetailsList={metrics.destinationDetailsList}
              />
            </div>
          </>
        )}
      </main>

      {pendingDashboardName && (
        <div className="modal-overlay" onClick={() => setPendingDashboardName(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setPendingDashboardName(null)} aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="modal-icon-wrapper">
              <svg className="modal-icon-gear" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <h3 className="modal-title">Dashboard en Desarrollo</h3>
            <p className="modal-description">
              El dashboard <span className="modal-dashboard-badge">{pendingDashboardName}</span> se encuentra actualmente en desarrollo y estará disponible próximamente.
            </p>
            <button className="modal-action-btn" onClick={() => setPendingDashboardName(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
