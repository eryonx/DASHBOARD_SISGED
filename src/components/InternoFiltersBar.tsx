import React, { useState, useRef, useEffect } from 'react';

interface InternoFiltersBarProps {
  // Sede
  sede: number;
  onSedeChange: (val: number) => void;
  
  // Ambito (Grupo) / Oficina Padre
  grupo: number;
  onGrupoChange: (val: number) => void;
  gruposList: { name: string; idx: number }[];

  // Organo (solo para Sede Central)
  organo: number;
  onOrganoChange: (val: number) => void;
  organosList: { name: string; idx: number }[];

  // Oficina (Ultimo Sede)
  oficina: number;
  onOficinaChange: (val: number) => void;
  oficinasList: string[];
  allowedOficinas: number[];

  // Fechas
  startDate: string;
  endDate: string;
  minDate: string;
  maxDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;

  // Origen
  origen: number;
  onOrigenChange: (val: number) => void;

  // Bandeja
  bandeja: number;
  onBandejaChange: (val: number) => void;
  bandejasList: string[];

  // Trámite (TUPA)
  tupa: number;
  onTupaChange: (val: number) => void;

  // Procedimiento
  procedimiento: number;
  onProcedimientoChange: (val: number) => void;
  procedimientosList: string[];

  // Semáforo
  semaforo: string;
  onSemaforoChange: (val: string) => void;

  onClearFilters: () => void;
}

export const InternoFiltersBar: React.FC<InternoFiltersBarProps> = ({
  sede, onSedeChange,
  grupo, onGrupoChange, gruposList,
  organo, onOrganoChange, organosList,
  oficina, onOficinaChange, oficinasList, allowedOficinas,
  startDate, endDate, minDate, maxDate, onStartDateChange, onEndDateChange,
  origen, onOrigenChange,
  bandeja, onBandejaChange, bandejasList,
  tupa, onTupaChange,
  procedimiento, onProcedimientoChange, procedimientosList,
  semaforo, onSemaforoChange,
  onClearFilters
}) => {
  // --- Grupo Combobox ---
  const [isGrupoOpen, setIsGrupoOpen] = useState(false);
  const [grupoQuery, setGrupoQuery] = useState('');
  const grupoDropdownRef = useRef<HTMLDivElement>(null);

  // --- Oficina Combobox ---
  const [isOficinaOpen, setIsOficinaOpen] = useState(false);
  const [oficinaQuery, setOficinaQuery] = useState('');
  const oficinaDropdownRef = useRef<HTMLDivElement>(null);

  // --- Procedimiento Combobox ---
  const [isProcedOpen, setIsProcedOpen] = useState(false);
  const [procedQuery, setProcedQuery] = useState('');
  const procedDropdownRef = useRef<HTMLDivElement>(null);

  // Sync inputs
  useEffect(() => {
    setGrupoQuery(grupo === -1 ? '' : (gruposList.find(g => g.idx === grupo)?.name || ''));
  }, [grupo, gruposList]);

  useEffect(() => {
    setOficinaQuery(oficina === -1 ? '' : (oficinasList[oficina] || ''));
  }, [oficina, oficinasList]);

  useEffect(() => {
    setProcedQuery(procedimiento === -1 ? '' : (procedimientosList[procedimiento] || ''));
  }, [procedimiento, procedimientosList]);

  // Click outside hooks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (grupoDropdownRef.current && !grupoDropdownRef.current.contains(e.target as Node)) {
        setIsGrupoOpen(false);
        setGrupoQuery(grupo === -1 ? '' : (gruposList.find(g => g.idx === grupo)?.name || ''));
      }
      if (oficinaDropdownRef.current && !oficinaDropdownRef.current.contains(e.target as Node)) {
        setIsOficinaOpen(false);
        setOficinaQuery(oficina === -1 ? '' : (oficinasList[oficina] || ''));
      }
      if (procedDropdownRef.current && !procedDropdownRef.current.contains(e.target as Node)) {
        setIsProcedOpen(false);
        setProcedQuery(procedimiento === -1 ? '' : (procedimientosList[procedimiento] || ''));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [grupo, gruposList, oficina, oficinasList, procedimiento, procedimientosList]);

  // Options filtering
  const filteredGrupos = [
    { name: sede === 0 ? 'Todas las oficinas padre' : 'Todos los ámbitos', idx: -1 },
    ...gruposList
  ].filter(item => {
    const currentName = grupo === -1 ? '' : (gruposList.find(g => g.idx === grupo)?.name || '');
    if (grupoQuery === currentName || !grupoQuery) return true;
    return item.name.toLowerCase().includes(grupoQuery.toLowerCase());
  });

  const visibleOficinas = [
    { name: 'Todas las oficinas', idx: -1 },
    ...allowedOficinas.map(idx => ({ name: oficinasList[idx], idx }))
  ];
  const filteredOficinas = visibleOficinas.filter(item => {
    if (oficinaQuery === (oficina === -1 ? '' : oficinasList[oficina]) || !oficinaQuery) return true;
    return item.name.toLowerCase().includes(oficinaQuery.toLowerCase());
  });

  const filteredProcedimientos = [
    { name: 'Todos los procedimientos', idx: -1 },
    ...procedimientosList.map((name, idx) => ({ name, idx }))
  ].filter(item => {
    if (procedQuery === (procedimiento === -1 ? '' : procedimientosList[procedimiento]) || !procedQuery) return true;
    return item.name.toLowerCase().includes(procedQuery.toLowerCase());
  });

  return (
    <div className="inline-filters-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
      {/* 1. Sede (Dropdown normal) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Sede</span>
        <select
          className="inline-filter-select"
          value={sede}
          onChange={(e) => onSedeChange(Number(e.target.value))}
          style={{ width: '160px' }}
        >
          <option value={-1}>Todas</option>
          <option value={0}>Sede Central</option>
          <option value={1}>Órganos Desconcentrados</option>
        </select>
      </div>

      {/* 1.5. Órgano (Dropdown normal, solo si Sede Central) */}
      {sede === 0 && (
        <div className="inline-filter-item">
          <span className="inline-filter-label">Órgano</span>
          <select
            className="inline-filter-select"
            value={organo}
            onChange={(e) => onOrganoChange(Number(e.target.value))}
            style={{ width: '180px' }}
          >
            <option value={-1}>Todos los órganos</option>
            {organosList.map((org) => (
              <option key={org.idx} value={org.idx}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Ámbito / Grupo (Combobox) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">{sede === 0 ? 'Oficina Padre' : 'Ámbito'}</span>
        <div className="combobox-container" ref={grupoDropdownRef}>
          <div 
            className="combobox-input-wrapper" 
            onClick={() => setIsGrupoOpen(!isGrupoOpen)}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="text" className="combobox-input"
              value={grupoQuery}
              onChange={(e) => { setGrupoQuery(e.target.value); setIsGrupoOpen(true); }}
              placeholder={sede === 0 ? 'Todas las oficinas padre' : 'Todos los ámbitos'}
              style={{ width: '160px', cursor: 'text' }}
            />
            <span className={`combobox-chevron ${isGrupoOpen ? 'open' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>

          {isGrupoOpen && (
            <div className="combobox-dropdown" style={{ width: '220px' }}>
              {filteredGrupos.map((item) => (
                <div
                  key={item.idx}
                  className={`combobox-option ${grupo === item.idx ? 'selected' : ''}`}
                  onClick={() => { onGrupoChange(item.idx); setIsGrupoOpen(false); }}
                >
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Oficina / Ultimo Sede (Combobox) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">{sede === 0 ? 'Oficina (Área)' : 'Oficina'}</span>
        <div className="combobox-container" ref={oficinaDropdownRef}>
          <div 
            className="combobox-input-wrapper" 
            onClick={() => {
              if (grupo === -1 && sede !== 0) return;
              setIsOficinaOpen(!isOficinaOpen);
            }}
            style={{ opacity: (grupo === -1 && sede !== 0) ? 0.5 : 1, cursor: (grupo === -1 && sede !== 0) ? 'not-allowed' : 'pointer' }}
          >
            <input
              type="text" className="combobox-input"
              value={(grupo === -1 && sede !== 0) ? 'Seleccione Ámbito' : oficinaQuery}
              onChange={(e) => { if (grupo !== -1 || sede === 0) { setOficinaQuery(e.target.value); setIsOficinaOpen(true); } }}
              disabled={grupo === -1 && sede !== 0}
              placeholder="Todas las oficinas"
              style={{ width: '180px', cursor: (grupo === -1 && sede !== 0) ? 'not-allowed' : 'text' }}
            />
            <span className={`combobox-chevron ${isOficinaOpen ? 'open' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>

          {isOficinaOpen && (grupo !== -1 || sede === 0) && (
            <div className="combobox-dropdown" style={{ width: '240px' }}>
              {filteredOficinas.length > 0 ? filteredOficinas.map((item) => (
                <div
                  key={item.idx}
                  className={`combobox-option ${oficina === item.idx ? 'selected' : ''}`}
                  onClick={() => { onOficinaChange(item.idx); setIsOficinaOpen(false); }}
                >
                  <span>{item.name}</span>
                </div>
              )) : <div className="combobox-no-results">Sin resultados</div>}
            </div>
          )}
        </div>
      </div>

      {/* 4. Fechas */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Fecha de</span>
        <input type="date" className="inline-filter-input" value={startDate} min={minDate} max={endDate || maxDate} onChange={(e) => onStartDateChange(e.target.value)} />
        <span className="inline-filter-label" style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>al</span>
        <input type="date" className="inline-filter-input" value={endDate} min={startDate || minDate} max={maxDate} onChange={(e) => onEndDateChange(e.target.value)} />
      </div>

      {/* 5. Origen */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Origen</span>
        <select className="inline-filter-select" value={origen} onChange={(e) => onOrigenChange(Number(e.target.value))}>
          <option value={-1}>Todos</option>
          <option value={0}>Interno</option>
          <option value={1}>Externo</option>
        </select>
      </div>

      {/* 6. Bandeja */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Bandeja</span>
        <select className="inline-filter-select" value={bandeja} onChange={(e) => onBandejaChange(Number(e.target.value))}>
          <option value={-1}>Todas</option>
          {bandejasList.map((bName, idx) => (
            <option key={idx} value={idx}>{bName}</option>
          ))}
        </select>
      </div>

      {/* 7. Trámite (TUPA) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Trámite</span>
        <select className="inline-filter-select" value={tupa} onChange={(e) => onTupaChange(Number(e.target.value))}>
          <option value={-1}>Todos</option>
          <option value={0}>TUPA</option>
          <option value={1}>NO TUPA</option>
        </select>
      </div>

      {/* 8. Procedimiento */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Procedimiento</span>
        <div className="combobox-container" ref={procedDropdownRef}>
          <div className="combobox-input-wrapper" onClick={() => setIsProcedOpen(!isProcedOpen)}>
            <input
              type="text" className="combobox-input"
              value={procedQuery}
              onChange={(e) => { setProcedQuery(e.target.value); setIsProcedOpen(true); }}
              placeholder="Todos los procedimientos"
              style={{ width: '220px' }}
            />
            <span className={`combobox-chevron ${isProcedOpen ? 'open' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>

          {isProcedOpen && (
            <div className="combobox-dropdown" style={{ width: '320px', maxHeight: '250px' }}>
              {filteredProcedimientos.length > 0 ? filteredProcedimientos.map((item) => (
                <div
                  key={item.idx}
                  className={`combobox-option ${procedimiento === item.idx ? 'selected' : ''}`}
                  onClick={() => { onProcedimientoChange(item.idx); setIsProcedOpen(false); }}
                  style={{ padding: '6px 10px', fontSize: '11px', lineHeight: '1.2' }}
                >
                  <span>{item.name}</span>
                </div>
              )) : <div className="combobox-no-results">Sin resultados</div>}
            </div>
          )}
        </div>
      </div>

      {/* 9. Semáforo */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Semáforo</span>
        <select 
          className="inline-filter-select" 
          value={semaforo} 
          onChange={(e) => onSemaforoChange(e.target.value)}
          style={{ width: '130px' }}
        >
          <option value="TODOS">Todos</option>
          <option value="VERDE">A Tiempo (Verde)</option>
          <option value="AMARILLO">En el Límite (Amarillo)</option>
          <option value="ANARANJADO">Días Finales (Anaranjado)</option>
          <option value="ROJO">Fuera de Plazo (Rojo)</option>
          <option value="SIN_PLAZO">Sin Plazo</option>
        </select>
      </div>

      {/* Clear Button */}
      <button className="btn-outline btn-clear-filters" onClick={onClearFilters} title="Limpiar filtros" style={{ padding: '8px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.013 3H2l8 9.46V19l4 2v-8.54L19 7" />
          <path d="m22 2-5 5" />
          <path d="m17 2 5 5" />
        </svg>
      </button>
    </div>
  );
};
