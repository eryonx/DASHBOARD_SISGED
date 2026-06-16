import pandas as pd
import json
import os
import time

t_start = time.time()

od_csv_path = "Reporte_Ingresados_Pendientes.csv"
sc_csv_path = "Reporte_Ingresados_Pendientes SC.csv"
output_dir = "public/data"

print("Loading CSV databases...")
# Load OD
df_od = pd.read_csv(od_csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')
df_od.columns = [col.strip() for col in df_od.columns]
df_od['sede_code'] = 1  # 1 = Órganos Desconcentrados

# Load SC
df_sc = pd.read_csv(sc_csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')
df_sc.columns = [col.strip() for col in df_sc.columns]
df_sc['sede_code'] = 0  # 0 = Sede Central

print(f"Loaded OD: {len(df_od)} rows. Columns: {list(df_od.columns)}")
print(f"Loaded SC: {len(df_sc)} rows. Columns: {list(df_sc.columns)}")

# ====================================================================
# Encoding and String Fixes
# ====================================================================

def fix_encoding(s):
    if pd.isna(s):
        return ""
    s = str(s).strip()
    s = " ".join(s.split())  # Clean extra whitespaces
    return s

roman_map = {
    'AAA CAPLINA OCOÑA': 'I. AAA Caplina Ocoña',
    'AAA CHAPARRA CHINCHA': 'II. AAA Chaparra Chincha',
    'AAA CAÑETE - FORTALEZA': 'III. AAA Cañete - Fortaleza',
    'AAA HUARMEY CHICAMA': 'IV. AAA Huarmey Chicama',
    'AAA JEQUETEPEQUE ZARUMILLA': 'V. AAA Jequetepeque Zarumilla',
    'AAA MARAÑON': 'VI. AAA Marañón',
    'AAA AMAZONAS': 'VII. AAA Amazonas',
    'AAA HUALLAGA': 'VIII. AAA Huallaga',
    'AAA UCAYALI': 'IX. AAA Ucayali',
    'AAA MANTARO': 'X. AAA Mantaro',
    'AAA PAMPAS APURIMAC': 'XI. AAA Pampas Apurimac',
    'AAA URUBAMBA VILCANOTA': 'XII. AAA Urubamba Vilcanota',
    'AAA MADRE DE DIOS': 'XIII. AAA Madre de Dios',
    'AAA TITICACA': 'XIV. AAA Titicaca'
}

def get_grupo_official_name(grp):
    if pd.isna(grp):
        return "OTRAS AAA"
    grp_upper = fix_encoding(grp).upper()
    return roman_map.get(grp_upper, grp_upper.title())

def clean_ultimo_sede(val):
    if pd.isna(val):
        return "Sin Oficina"
    s = fix_encoding(val)
    s_upper = s.upper()
    if s_upper.startswith("ALA "):
        return "ALA " + s[4:].strip().title()
    if s_upper.startswith("AAA "):
        return get_grupo_official_name(s)
    return s.title()

def clean_ultimo_escritorio(val):
    if pd.isna(val):
        return "Sin Asignar"
    s = fix_encoding(val).strip()
    if ' / ' in s:
        parts = s.split(' / ', 1)
        person = parts[1].strip()
        if person and person != '-':
            return person.title()
        return parts[0].strip().title()
    if s.startswith('USER') or s.endswith(' - -'):
        return s.rstrip(' -').strip().title()
    return s.title()

# ====================================================================
# Standardize Columns and Process Records
# ====================================================================

# We will concatenate both dataframes. But first we map their specific structures.
# Let's map row by row or columns by renaming/constructing a unified dataframe.

processed_rows = []

print("Processing OD records...")
for idx, row in df_od.iterrows():
    # OD fields mapping
    grupo_raw = row.get('Grupo', '')
    grupo_clean = get_grupo_official_name(grupo_raw)
    
    ultimo_sede_raw = row.get('Ultimo Sede Area', '')
    ultimo_sede_clean = clean_ultimo_sede(ultimo_sede_raw)
    
    ultimo_esc_raw = row.get('Ultimo Escritorio', '')
    ultimo_esc_clean = clean_ultimo_escritorio(ultimo_esc_raw)
    
    # Plazo
    plazo_raw = str(row.get('Plazo', '-')).strip()
    plazo_clean = '-' if plazo_raw in ['', 'nan', '#N/D', '-'] else plazo_raw
    
    # Estupa
    tupa_raw = str(row.get('Estupa', 'NO')).strip().upper()
    tupa_code = 0 if tupa_raw in ['SI', 'S', 'TUPA'] else 1
    
    # Date processing
    fec_ingreso_raw = row.get('Fecha Ingreso Ultimo Escritorio', '')
    if pd.isna(fec_ingreso_raw):
        fec_ingreso_raw = row.get('Fecha de Creación de Trámite', '')
    
    fec_ing_dt = pd.to_datetime(fec_ingreso_raw, dayfirst=True, errors='coerce')
    ingreso_date = fec_ing_dt.strftime('%Y-%m-%d') if not pd.isna(fec_ing_dt) else '1900-01-01'
    ingreso_year = fec_ing_dt.year if not pd.isna(fec_ing_dt) else 2026
    
    creation_year = int(row.get('Año', row.get('Año', 2026)))
    if pd.isna(creation_year):
        creation_year = 2026
    else:
        creation_year = int(creation_year)
        
    proc = fix_encoding(row.get('Procedimiento', 'OTROS'))
    if proc == '' or proc == 'NO':
        proc = 'OTROS'
        
    tarea = fix_encoding(row.get('Tarea', 'RECIBIDOS')).upper()
    if tarea == '':
        tarea = 'RECIBIDOS'
        
    origen_raw = str(row.get('Tipo_Origen', 'INTERNO')).strip().upper()
    origen_code = 0 if origen_raw == 'INTERNO' else 1
    
    cut = str(row.get('CUT', '')).strip()
    
    # Dias transcurridos
    dias_trans_raw = row.get('Dias Transcurridos', 0)
    if pd.isna(dias_trans_raw):
        dias_trans_clean = 0
    else:
        try:
            dias_trans_clean = int(pd.to_numeric(dias_trans_raw, errors='coerce'))
        except:
            dias_trans_clean = 0
            
    # For OD:
    # organo_idx corresponds to grupo_clean (AAA)
    # grupo_oficinar_idx corresponds to grupo_clean (AAA) (Level 1 of drilldown)
    # ultimo_sede_clean is Level 2 of drilldown
    # ultimo_esc_clean is Level 3 of drilldown
    
    processed_rows.append({
        'sede_code': 1,
        'organo_name': grupo_clean,          # First chart grouping
        'grupo_oficina_name': grupo_clean,   # Drilldown Level 1
        'ultimo_sede_name': ultimo_sede_clean, # Drilldown Level 2
        'ultimo_escritorio_name': ultimo_esc_clean, # Drilldown Level 3
        'tupa_code': tupa_code,
        'procedimiento': proc,
        'creation_year': creation_year,
        'ingreso_year': int(ingreso_year),
        'ingreso_date': ingreso_date,
        'tarea': tarea,
        'origen_code': origen_code,
        'cut': cut,
        'plazo': plazo_clean,
        'dias_transcurridos': dias_trans_clean,
        # Other fields for detailed view
        'n': row.get('N°', row.get('N', idx + 1)),
        'tipo': fix_encoding(row.get('Tipo', 'NUEVO')),
        'tipo_documento': fix_encoding(row.get('Último Documento', row.get('ltimo Documento', ''))),
        'documento_origen': fix_encoding(row.get('Documento Origen', '')),
        'asunto': fix_encoding(row.get('Asunto Origen', '')),
        'oficina_envia': fix_encoding(row.get('Oficina Padre', '-')),
        'oficina_padre': '-',
        'remitente': fix_encoding(row.get('Remitente', ''))
    })

print("Processing SC records...")
for idx, row in df_sc.iterrows():
    # SC fields mapping
    organo_raw = row.get('Órgano', row.get('rgano', ''))
    organo_clean = fix_encoding(organo_raw)
    if not organo_clean:
        organo_clean = "Sede Central - Sin Órgano"
    else:
        organo_clean = f"Sede Central - {organo_clean}"
        
    oficina_padre_raw = str(row.get('Oficina Padre', '')).strip()
    oficina_padre_clean = fix_encoding(oficina_padre_raw)
    if not oficina_padre_clean:
        oficina_padre_clean = "SC - Sin Padre"
    else:
        oficina_padre_clean = f"SC - {oficina_padre_clean}"
        
    ultimo_sede_raw = row.get('Ultimo Sede Area', '')
    ultimo_sede_clean = clean_ultimo_sede(ultimo_sede_raw)
    
    ultimo_esc_raw = row.get('Ultimo Escritorio', '')
    ultimo_esc_clean = clean_ultimo_escritorio(ultimo_esc_raw)
    
    # Plazo
    plazo_raw = str(row.get('Plazo', '-')).strip()
    plazo_clean = '-' if plazo_raw in ['', 'nan', '#N/D', '-'] else plazo_raw
    
    # Estupa
    tupa_raw = str(row.get('Estupa', 'NO')).strip().upper()
    tupa_code = 0 if tupa_raw in ['SI', 'S', 'TUPA'] else 1
    
    # Date processing
    fec_ingreso_raw = row.get('Fecha Ingreso Ultimo Escritorio', '')
    if pd.isna(fec_ingreso_raw):
        fec_ingreso_raw = row.get('Fecha de Creación de Trámite', '')
    
    fec_ing_dt = pd.to_datetime(fec_ingreso_raw, dayfirst=True, errors='coerce')
    ingreso_date = fec_ing_dt.strftime('%Y-%m-%d') if not pd.isna(fec_ing_dt) else '1900-01-01'
    ingreso_year = fec_ing_dt.year if not pd.isna(fec_ing_dt) else 2026
    
    creation_year = int(row.get('Año', row.get('Año', 2026)))
    if pd.isna(creation_year):
        creation_year = 2026
    else:
        creation_year = int(creation_year)
        
    proc = fix_encoding(row.get('Procedimiento', 'OTROS'))
    if proc == '' or proc == 'NO':
        proc = 'OTROS'
        
    tarea = fix_encoding(row.get('Tarea', 'RECIBIDOS')).upper()
    if tarea == '':
        tarea = 'RECIBIDOS'
        
    origen_raw = str(row.get('Tipo_Origen', 'INTERNO')).strip().upper()
    origen_code = 0 if origen_raw == 'INTERNO' else 1
    
    cut = str(row.get('CUT', '')).strip()
    
    # Dias transcurridos
    dias_trans_raw = row.get('Dias Transcurridos', 0)
    if pd.isna(dias_trans_raw):
        dias_trans_clean = 0
    else:
        try:
            dias_trans_clean = int(pd.to_numeric(dias_trans_raw, errors='coerce'))
        except:
            dias_trans_clean = 0
            
    # For SC:
    # organo_idx corresponds to organo_clean (First chart grouping)
    # grupo_oficinar_idx corresponds to oficina_padre_clean (Level 1 of drilldown)
    # ultimo_sede_clean is Level 2 of drilldown
    # ultimo_esc_clean is Level 3 of drilldown
    
    processed_rows.append({
        'sede_code': 0,
        'organo_name': organo_clean,          # First chart grouping
        'grupo_oficina_name': oficina_padre_clean,   # Drilldown Level 1
        'ultimo_sede_name': ultimo_sede_clean, # Drilldown Level 2
        'ultimo_escritorio_name': ultimo_esc_clean, # Drilldown Level 3
        'tupa_code': tupa_code,
        'procedimiento': proc,
        'creation_year': creation_year,
        'ingreso_year': int(ingreso_year),
        'ingreso_date': ingreso_date,
        'tarea': tarea,
        'origen_code': origen_code,
        'cut': cut,
        'plazo': plazo_clean,
        'dias_transcurridos': dias_trans_clean,
        # Other fields for detailed view
        'n': row.get('N°', row.get('N', idx + 1)),
        'tipo': fix_encoding(row.get('Tipo', 'NUEVO')),
        'tipo_documento': fix_encoding(row.get('Último Documento', row.get('ltimo Documento', ''))),
        'documento_origen': fix_encoding(row.get('Documento Origen', '')),
        'asunto': fix_encoding(row.get('Asunto Origen', '')),
        'oficina_envia': fix_encoding(row.get('Oficina Padre', '-')),
        'oficina_padre': oficina_padre_clean,
        'remitente': fix_encoding(row.get('Remitente', ''))
    })

print(f"Total processed records: {len(processed_rows)}")

# ====================================================================
# Build Lookups
# ====================================================================
print("Building lookups...")

# Build unique sorted lookups
# To preserve the Roman Numeral ordering of AAAs at the start:
aaa_order = [
    'I. AAA Caplina Ocoña', 'II. AAA Chaparra Chincha', 'III. AAA Cañete - Fortaleza',
    'IV. AAA Huarmey Chicama', 'V. AAA Jequetepeque Zarumilla', 'VI. AAA Marañón',
    'VII. AAA Amazonas', 'VIII. AAA Huallaga', 'IX. AAA Ucayali', 'X. AAA Mantaro',
    'XI. AAA Pampas Apurimac', 'XII. AAA Urubamba Vilcanota', 'XIII. AAA Madre de Dios',
    'XIV. AAA Titicaca'
]

# For organo_name lookup (Chart 1):
# Preserving the Roman AAAs first, followed by all unique organos
all_organo_names = list(aaa_order)
unique_all_organos = sorted(list(set([r['organo_name'] for r in processed_rows])))
for org in unique_all_organos:
    if org not in all_organo_names:
        all_organo_names.append(org)
organo_to_idx = {name: idx for idx, name in enumerate(all_organo_names)}

# For grupo_oficina_name lookup (Drilldown Level 1):
# Preserving the Roman AAAs first, followed by all unique group/office names
all_grupo_oficinas = list(aaa_order)
unique_all_go = sorted(list(set([r['grupo_oficina_name'] for r in processed_rows])))
for go in unique_all_go:
    if go not in all_grupo_oficinas:
        all_grupo_oficinas.append(go)
grupo_oficina_to_idx = {name: idx for idx, name in enumerate(all_grupo_oficinas)}

# For remaining lookups, standard sorted list
ultimo_sedes = sorted(list(set([r['ultimo_sede_name'] for r in processed_rows])))
usede_to_idx = {name: idx for idx, name in enumerate(ultimo_sedes)}

ultimo_escritorios = sorted(list(set([r['ultimo_escritorio_name'] for r in processed_rows])))
uesc_to_idx = {name: idx for idx, name in enumerate(ultimo_escritorios)}

bandejas = sorted(list(set([r['tarea'] for r in processed_rows])))
bandeja_to_idx = {name: idx for idx, name in enumerate(bandejas)}

procedimientos = sorted(list(set([r['procedimiento'] for r in processed_rows])))
proc_to_idx = {name: idx for idx, name in enumerate(procedimientos)}

dates = sorted(list(set([r['ingreso_date'] for r in processed_rows])))
date_to_idx = {name: idx for idx, name in enumerate(dates)}

unique_cuts = sorted(list(set([r['cut'] for r in processed_rows])))
cut_to_idx = {name: idx for idx, name in enumerate(unique_cuts)}

plazos = sorted(list(set([r['plazo'] for r in processed_rows])))
plazo_to_idx = {name: idx for idx, name in enumerate(plazos)}

# ====================================================================
# Map Compact Records
# ====================================================================
print("Mapping compact records...")
compact_records = []
for r in processed_rows:
    compact_records.append([
        r['sede_code'],                          # 0
        organo_to_idx[r['organo_name']],         # 1
        grupo_oficina_to_idx[r['grupo_oficina_name']], # 2
        usede_to_idx[r['ultimo_sede_name']],     # 3
        uesc_to_idx[r['ultimo_escritorio_name']], # 4
        r['tupa_code'],                          # 5
        proc_to_idx[r['procedimiento']],         # 6
        r['creation_year'],                      # 7
        r['ingreso_year'],                       # 8
        bandeja_to_idx[r['tarea']],              # 9
        date_to_idx[r['ingreso_date']],          # 10
        r['origen_code'],                        # 11
        cut_to_idx[r['cut']],                    # 12
        plazo_to_idx[r['plazo']],                # 13
        r['dias_transcurridos']                  # 14
    ])

# ====================================================================
# Output dashboard JSON
# ====================================================================
os.makedirs(output_dir, exist_ok=True)
dashboard_out_path = os.path.join(output_dir, "interno_dashboard_data.json")
dashboard_data = {
    "metadata": {
        "grupos": all_organo_names,                # Represents the groupings for Chart 1
        "grupo_oficinas": all_grupo_oficinas,      # Represents Level 1 of drilldown
        "ultimo_sedes": ultimo_sedes,
        "ultimo_escritorios": ultimo_escritorios,
        "bandejas": bandejas,
        "procedimientos": procedimientos,
        "dates": dates,
        "cuts": unique_cuts,
        "plazos": plazos
    },
    "records": compact_records
}

print(f"Saving {dashboard_out_path}...")
with open(dashboard_out_path, "w", encoding="utf-8") as f:
    json.dump(dashboard_data, f, ensure_ascii=False)

# ====================================================================
# Output detailed JSON
# ====================================================================
detailed_out_path = os.path.join(output_dir, "interno_detailed_data.json")

clean_cols = [
    'N°', 'N° CUT', 'ORIGEN', 'TIPO', 'TUPA', 'PROCEDIMIENTO', 'FEC_CREACION', 'AÑO', 
    'REMITENTE', 'TIPO DOCUMENTO', 'DOCUMENTO ORIGEN', 'ASUNTO', 'REFERENCIA', 
    'ULTIMO DOCUMENTO', 'OFICINA ENVIA', 'ULTIMO ESCRITORIO', 'ULTIMO SEDE', 
    'OFICINA PADRE', 'GRUPO', 'SEDE', 'FEC_INGRESO', 'TAREA', 'PLAZO', 'DIAS TRANSCURRIDOS'
]

# We will build lookups for the detailed view too, but we can reuse some or list them
detailed_lookups = {
    'ORIGEN': ['INTERNO', 'EXTERNO'],
    'TIPO': sorted(list(set([r['tipo'] for r in processed_rows]))),
    'TUPA': ['TUPA', 'NO TUPA'],
    'PROCEDIMIENTO': procedimientos,
    'AÑO': sorted(list(set([str(r['creation_year']) for r in processed_rows]))),
    'TIPO DOCUMENTO': sorted(list(set([r['tipo_documento'] for r in processed_rows]))),
    'OFICINA ENVIA': sorted(list(set([r['oficina_envia'] for r in processed_rows]))),
    'ULTIMO ESCRITORIO': ultimo_escritorios,
    'ULTIMO SEDE': ultimo_sedes,
    'OFICINA PADRE': sorted(list(set([r['oficina_padre'] for r in processed_rows]))),
    'GRUPO': all_grupo_oficinas,
    'SEDE': ['SEDE CENTRAL', 'ORGANOS DESCONCONTRADOS'],
    'TAREA': bandejas,
    'PLAZO': plazos
}

detailed_records = []
print("Mapping detailed records...")
for r in processed_rows:
    rec = []
    # 0: N°
    rec.append(str(r['n']))
    # 1: N° CUT
    rec.append(r['cut'])
    # 2: ORIGEN
    rec.append(0 if r['origen_code'] == 0 else 1)
    # 3: TIPO
    rec.append(detailed_lookups['TIPO'].index(r['tipo']))
    # 4: TUPA
    rec.append(0 if r['tupa_code'] == 0 else 1)
    # 5: PROCEDIMIENTO
    rec.append(detailed_lookups['PROCEDIMIENTO'].index(r['procedimiento']))
    # 6: FEC_CREACION
    rec.append(r['ingreso_date']) # Fallback or clean date string
    # 7: AÑO
    rec.append(detailed_lookups['AÑO'].index(str(r['creation_year'])))
    # 8: REMITENTE
    rec.append(r['remitente'])
    # 9: TIPO DOCUMENTO
    rec.append(detailed_lookups['TIPO DOCUMENTO'].index(r['tipo_documento']))
    # 10: DOCUMENTO ORIGEN
    rec.append(r['documento_origen'])
    # 11: ASUNTO
    rec.append(r['asunto'])
    # 12: REFERENCIA (we don't have it in original data, so empty)
    rec.append('')
    # 13: ULTIMO DOCUMENTO
    rec.append(r['tipo_documento'])
    # 14: OFICINA ENVIA
    rec.append(detailed_lookups['OFICINA ENVIA'].index(r['oficina_envia']))
    # 15: ULTIMO ESCRITORIO
    rec.append(detailed_lookups['ULTIMO ESCRITORIO'].index(r['ultimo_escritorio_name']))
    # 16: ULTIMO SEDE
    rec.append(detailed_lookups['ULTIMO SEDE'].index(r['ultimo_sede_name']))
    # 17: OFICINA PADRE
    rec.append(detailed_lookups['OFICINA PADRE'].index(r['oficina_padre']))
    # 18: GRUPO
    rec.append(detailed_lookups['GRUPO'].index(r['grupo_oficina_name']))
    # 19: SEDE
    rec.append(0 if r['sede_code'] == 0 else 1)
    # 20: FEC_INGRESO
    rec.append(r['ingreso_date'])
    # 21: TAREA
    rec.append(detailed_lookups['TAREA'].index(r['tarea']))
    # 22: PLAZO
    rec.append(detailed_lookups['PLAZO'].index(r['plazo']))
    # 23: DIAS TRANSCURRIDOS
    rec.append(r['dias_transcurridos'])
    
    detailed_records.append(rec)

detailed_data = {
    'columns': clean_cols,
    'lookups': detailed_lookups,
    'records': detailed_records
}

print(f"Saving {detailed_out_path}...")
with open(detailed_out_path, "w", encoding="utf-8") as f:
    json.dump(detailed_data, f, ensure_ascii=False)

print(f"Finished processing in {time.time() - t_start:.2f} seconds!")
print(f"Dashboard JSON size: {os.path.getsize(dashboard_out_path)/(1024*1024):.2f} MB")
print(f"Detailed JSON size: {os.path.getsize(detailed_out_path)/(1024*1024):.2f} MB")
