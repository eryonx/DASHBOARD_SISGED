import React, { useState, useRef, useEffect } from 'react';

interface FiltersBarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  clase: number;
  onClaseChange: (val: number) => void;
  origin: number;
  onOriginChange: (val: number) => void;
  tupa: number;
  onTupaChange: (val: number) => void;
  sede: number;
  onSedeChange: (val: number) => void;
  sedesList: string[];
  ambito: number;
  onAmbitoChange: (val: number) => void;
  ambitosList: string[];
  allowedAmbitos: number[];
  procedimiento: number;
  onProcedimientoChange: (val: number) => void;
  procedimientosList: string[];
  procedimientosTupa: number[];
  procedimientosNoTupa: number[];
  estadoCut: number;
  onEstadoCutChange: (val: number) => void;
  onClearFilters: () => void;
  minDate: string;
  maxDate: string;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  clase,
  onClaseChange,
  origin,
  onOriginChange,
  tupa,
  onTupaChange,
  sede,
  onSedeChange,
  sedesList,
  ambito,
  onAmbitoChange,
  ambitosList,
  allowedAmbitos,
  procedimiento,
  onProcedimientoChange,
  procedimientosList,
  procedimientosTupa,
  procedimientosNoTupa,
  estadoCut,
  onEstadoCutChange,
  onClearFilters,
  minDate,
  maxDate,
}) => {
  // Sede Combobox State
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ambito Combobox State
  const [isAmbitoOpen, setIsAmbitoOpen] = useState(false);
  const [ambitoQuery, setAmbitoQuery] = useState('');
  const [ambitoHighlightedIndex, setAmbitoHighlightedIndex] = useState(0);
  const ambitoDropdownRef = useRef<HTMLDivElement>(null);

  // Procedimiento Combobox State
  const [isProcedOpen, setIsProcedOpen] = useState(false);
  const [procedQuery, setProcedQuery] = useState('');
  const [procedHighlightedIndex, setProcedHighlightedIndex] = useState(0);
  const procedDropdownRef = useRef<HTMLDivElement>(null);

  // Sync text input with selected Sede
  useEffect(() => {
    if (sede === -1) {
      setQuery('');
    } else {
      setQuery(sedesList[sede] || '');
    }
  }, [sede, sedesList]);

  // Click outside detection for Sede dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert to original selected name
        if (sede === -1) {
          setQuery('');
        } else {
          setQuery(sedesList[sede] || '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sede, sedesList]);

  // Sede filtering
  const isQueryMatchingSelection = query === (sede === -1 ? '' : sedesList[sede]);
  const filteredSedes = [
    { name: 'Todas las sedes', idx: -1 },
    ...sedesList.map((name, idx) => ({ name, idx }))
  ].filter(item => {
    if (isQueryMatchingSelection || !query) return true;
    return item.name.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (filteredSedes.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredSedes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredSedes.length) % filteredSedes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSedes.length) {
        const selectedOption = filteredSedes[highlightedIndex];
        onSedeChange(selectedOption.idx);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (sede === -1) {
        setQuery('');
      } else {
        setQuery(sedesList[sede] || '');
      }
    }
  };

  // Sync text input with selected Ambito
  useEffect(() => {
    if (ambito === -1) {
      setAmbitoQuery('');
    } else {
      setAmbitoQuery(ambitosList[ambito] || '');
    }
  }, [ambito, ambitosList]);

  // Click outside detection for Ambito dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ambitoDropdownRef.current && !ambitoDropdownRef.current.contains(event.target as Node)) {
        setIsAmbitoOpen(false);
        if (ambito === -1) {
          setAmbitoQuery('');
        } else {
          setAmbitoQuery(ambitosList[ambito] || '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ambito, ambitosList]);

  // Ambito filtering based on Sede selection
  const visibleAmbitos = [
    { name: 'Todos los ámbitos', idx: -1 },
    ...allowedAmbitos.map(idx => ({ name: ambitosList[idx], idx }))
  ];

  const isAmbitoQueryMatchingSelection = ambitoQuery === (ambito === -1 ? '' : ambitosList[ambito]);
  const filteredAmbitos = visibleAmbitos.filter(item => {
    if (isAmbitoQueryMatchingSelection || !ambitoQuery) return true;
    return item.name.toLowerCase().includes(ambitoQuery.toLowerCase());
  });

  useEffect(() => {
    setAmbitoHighlightedIndex(0);
  }, [ambitoQuery]);

  const handleAmbitoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAmbitoOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsAmbitoOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (filteredAmbitos.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAmbitoHighlightedIndex((prev) => (prev + 1) % filteredAmbitos.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAmbitoHighlightedIndex((prev) => (prev - 1 + filteredAmbitos.length) % filteredAmbitos.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (ambitoHighlightedIndex >= 0 && ambitoHighlightedIndex < filteredAmbitos.length) {
        const selectedOption = filteredAmbitos[ambitoHighlightedIndex];
        onAmbitoChange(selectedOption.idx);
        setIsAmbitoOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsAmbitoOpen(false);
      if (ambito === -1) {
        setAmbitoQuery('');
      } else {
        setAmbitoQuery(ambitosList[ambito] || '');
      }
    }
  };

  // Sync text input with selected Procedimiento
  useEffect(() => {
    if (procedimiento === -1) {
      setProcedQuery('');
    } else {
      setProcedQuery(procedimientosList[procedimiento] || '');
    }
  }, [procedimiento, procedimientosList]);

  // Click outside detection for Procedimiento dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (procedDropdownRef.current && !procedDropdownRef.current.contains(event.target as Node)) {
        setIsProcedOpen(false);
        // Revert to original selected name
        if (procedimiento === -1) {
          setProcedQuery('');
        } else {
          setProcedQuery(procedimientosList[procedimiento] || '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [procedimiento, procedimientosList]);

  // Filter procedures based on current Trámite selection
  const visibleProcedimientos = [
    { name: 'Todos los procedimientos', idx: -1 },
    ...procedimientosList.map((name, idx) => ({ name, idx }))
  ].filter(item => {
    if (item.idx === -1) return true;
    if (tupa === 0) {
      return procedimientosTupa.includes(item.idx);
    }
    if (tupa === 1) {
      return procedimientosNoTupa.includes(item.idx);
    }
    return true;
  });

  const isProcedQueryMatchingSelection = procedQuery === (procedimiento === -1 ? '' : procedimientosList[procedimiento]);
  const filteredProcedimientos = visibleProcedimientos.filter(item => {
    if (isProcedQueryMatchingSelection || !procedQuery) return true;
    return item.name.toLowerCase().includes(procedQuery.toLowerCase());
  });

  useEffect(() => {
    setProcedHighlightedIndex(0);
  }, [procedQuery]);

  const handleProcedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isProcedOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsProcedOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (filteredProcedimientos.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProcedHighlightedIndex((prev) => (prev + 1) % filteredProcedimientos.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProcedHighlightedIndex((prev) => (prev - 1 + filteredProcedimientos.length) % filteredProcedimientos.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (procedHighlightedIndex >= 0 && procedHighlightedIndex < filteredProcedimientos.length) {
        const selectedOption = filteredProcedimientos[procedHighlightedIndex];
        onProcedimientoChange(selectedOption.idx);
        setIsProcedOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsProcedOpen(false);
      if (procedimiento === -1) {
        setProcedQuery('');
      } else {
        setProcedQuery(procedimientosList[procedimiento] || '');
      }
    }
  };

  return (
    <div className="inline-filters-bar">
      {/* 1. Sede (AAA) Dropdown */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Sede</span>
        <div className="combobox-container" ref={dropdownRef}>
          <div className="combobox-input-wrapper" onClick={() => setIsOpen(!isOpen)}>
            <input
              type="text"
              className="combobox-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={(e) => {
                setIsOpen(true);
                e.target.select();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Todas las sedes"
              style={{
                width: '165px',
              }}
            />
            <span className={`combobox-chevron ${isOpen ? 'open' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </span>
          </div>

          {isOpen && (
            <div className="combobox-dropdown" style={{ width: '220px' }}>
              {filteredSedes.length > 0 ? (
                filteredSedes.map((item, index) => {
                  const isSelected = sede === item.idx;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <div
                      key={item.idx}
                      className={`combobox-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSedeChange(item.idx);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span>{item.name}</span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="combobox-no-results">Sin resultados para "{query}"</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Ámbito (ALA) Dropdown (Dependent on Sede) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Ámbito</span>
        <div className="combobox-container" ref={ambitoDropdownRef}>
          <div 
            className="combobox-input-wrapper" 
            onClick={() => {
              if (sede !== -1) {
                setIsAmbitoOpen(!isAmbitoOpen);
              }
            }}
            style={{
              opacity: sede === -1 ? 0.55 : 1,
              cursor: sede === -1 ? 'not-allowed' : 'pointer'
            }}
          >
            <input
              type="text"
              className="combobox-input"
              value={sede === -1 ? 'Seleccione Sede primero' : ambitoQuery}
              onChange={(e) => {
                if (sede !== -1) {
                  setAmbitoQuery(e.target.value);
                  setIsAmbitoOpen(true);
                }
              }}
              disabled={sede === -1}
              onFocus={(e) => {
                if (sede !== -1) {
                  setIsAmbitoOpen(true);
                  e.target.select();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (sede !== -1) {
                  setIsAmbitoOpen(true);
                }
              }}
              onKeyDown={handleAmbitoKeyDown}
              placeholder="Todos los ámbitos"
              style={{
                width: '185px',
                cursor: sede === -1 ? 'not-allowed' : 'text'
              }}
            />
            <span className={`combobox-chevron ${isAmbitoOpen ? 'open' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </span>
          </div>

          {isAmbitoOpen && sede !== -1 && (
            <div className="combobox-dropdown" style={{ width: '220px' }}>
              {filteredAmbitos.length > 0 ? (
                filteredAmbitos.map((item, index) => {
                  const isSelected = ambito === item.idx;
                  const isHighlighted = ambitoHighlightedIndex === index;
                  return (
                    <div
                      key={item.idx}
                      className={`combobox-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAmbitoChange(item.idx);
                        setIsAmbitoOpen(false);
                      }}
                      onMouseEnter={() => setAmbitoHighlightedIndex(index)}
                    >
                      <span>{item.name}</span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="combobox-no-results">Sin resultados para "{ambitoQuery}"</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Fecha ingreso (Start and End Dates) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Fecha de</span>
        <input
          type="date"
          className="inline-filter-input"
          value={startDate}
          min={minDate}
          max={endDate || maxDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <span className="inline-filter-label" style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>al</span>
        <input
          type="date"
          className="inline-filter-input"
          value={endDate}
          min={startDate || minDate}
          max={maxDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>

      {/* Clase Filter */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Clase</span>
        <select
          className="inline-filter-select"
          value={clase}
          onChange={(e) => onClaseChange(Number(e.target.value))}
        >
          <option value={-1}>Todos</option>
          <option value={0}>Nuevo</option>
          <option value={1}>Anexo</option>
        </select>
      </div>

      {/* 4. Origen Filter */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Origen</span>
        <select
          className="inline-filter-select"
          value={origin}
          onChange={(e) => onOriginChange(Number(e.target.value))}
        >
          <option value={-1}>Todos</option>
          <option value={0}>Digital</option>
          <option value={1}>Físico</option>
        </select>
      </div>

      {/* 5. TUPA Filter */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Trámite</span>
        <select
          className="inline-filter-select"
          value={tupa}
          onChange={(e) => onTupaChange(Number(e.target.value))}
        >
          <option value={-1}>Todos</option>
          <option value={0}>TUPA</option>
          <option value={1}>NO TUPA</option>
        </select>
      </div>

      {/* 6. Procedimiento Filter (searchable select dropdown) */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Procedimiento</span>
        <div className="combobox-container" ref={procedDropdownRef}>
          <div className="combobox-input-wrapper" onClick={() => setIsProcedOpen(!isProcedOpen)}>
            <input
              type="text"
              className="combobox-input"
              value={procedQuery}
              onChange={(e) => {
                setProcedQuery(e.target.value);
                setIsProcedOpen(true);
              }}
              onFocus={(e) => {
                setIsProcedOpen(true);
                e.target.select();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsProcedOpen(true);
              }}
              onKeyDown={handleProcedKeyDown}
              placeholder="Todos los procedimientos"
              style={{
                width: '240px',
              }}
            />
            <span className={`combobox-chevron ${isProcedOpen ? 'open' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </span>
          </div>

          {isProcedOpen && (
            <div className="combobox-dropdown" style={{ width: '340px' }}>
              {filteredProcedimientos.length > 0 ? (
                filteredProcedimientos.map((item, index) => {
                  const isSelected = procedimiento === item.idx;
                  const isHighlighted = procedHighlightedIndex === index;
                  return (
                    <div
                      key={item.idx}
                      className={`combobox-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProcedimientoChange(item.idx);
                        setIsProcedOpen(false);
                      }}
                      onMouseEnter={() => setProcedHighlightedIndex(index)}
                      style={{
                        padding: '6px 10px',
                        lineHeight: '1.3',
                      }}
                    >
                      <span style={{ flex: 1, paddingRight: '8px' }}>{item.name}</span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="combobox-no-results">Sin resultados para "{procedQuery}"</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estado del CUT Filter */}
      <div className="inline-filter-item">
        <span className="inline-filter-label">Estado CUT</span>
        <select
          className="inline-filter-select"
          value={estadoCut}
          onChange={(e) => onEstadoCutChange(Number(e.target.value))}
        >
          <option value={-1}>Todos</option>
          <option value={0}>Atendido</option>
          <option value={1}>Pendiente</option>
          <option value={2}>Anulado</option>
          <option value={3}>Observado</option>
        </select>
      </div>

      {/* Reset button as icon */}
      <button 
        className="btn-outline btn-clear-filters" 
        onClick={onClearFilters}
        title="Limpiar filtros"
        aria-label="Limpiar filtros"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M13.013 3H2l8 9.46V19l4 2v-8.54L19 7" />
          <path d="m22 2-5 5" />
          <path d="m17 2 5 5" />
        </svg>
      </button>
    </div>
  );
};
