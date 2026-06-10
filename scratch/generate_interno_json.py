import pandas as pd
import json
import os
import time

t_start = time.time()

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte_Ingresados_Pendientes.csv"
output_dir = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\public\data"

print("Loading CSV database...")
df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')

# Clean headers
df.columns = [col.strip() for col in df.columns]
print(f"Loaded {len(df)} rows. Columns: {list(df.columns)}")

# ====================================================================
# HIERARCHY: SEDE (1) -> GRUPO (2) -> ULTIMO SEDE (3) -> ULTIMO ESCRITORIO (4)
# ====================================================================

# Map for official Roman numerals of the AAA (GRUPO level)
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

def fix_encoding(s):
    """Fix encoding corruption for Ñ and other special characters."""
    if pd.isna(s):
        return ""
    s = str(s).strip()
    s = s.replace("MARAON", "MARAÑON").replace("MARA\x91ON", "MARAÑON")
    s = s.replace("OCOA", "OCOÑA").replace("OCO\x91A", "OCOÑA")
    s = s.replace("CAETE", "CAÑETE").replace("CA\x91ETE", "CAÑETE")
    s = s.replace("NEPEÑA", "NEPEÑA").replace("NEPE\x91A", "NEPEÑA")
    s = s.replace("ZA\x91A", "ZAÑA").replace("ZAÑA", "ZAÑA")
    s = s.replace("\x91", "Ñ")
    return s

def get_grupo_official_name(grp):
    if pd.isna(grp):
        return "OTRAS AAA"
    grp_upper = fix_encoding(grp).upper()
    return roman_map.get(grp_upper, grp_upper.title())

# Level 2: GRUPO → Official AAA name
df['grupo_clean'] = df['GRUPO'].apply(get_grupo_official_name)

# Level 3: ULTIMO SEDE → cleaned name
def clean_ultimo_sede(val):
    if pd.isna(val):
        return "Sin Oficina"
    s = fix_encoding(val)
    # Title case for readability but keep AAA/ALA prefixes uppercase
    s_upper = s.upper()
    if s_upper.startswith("ALA "):
        return "ALA " + s[4:].strip().title()
    if s_upper.startswith("AAA "):
        return get_grupo_official_name(s)
    return s.title()

df['ultimo_sede_clean'] = df['ULTIMO SEDE'].apply(clean_ultimo_sede)

# Level 4: ULTIMO ESCRITORIO → extract person name (strip office prefix)
def clean_ultimo_escritorio(val):
    if pd.isna(val):
        return "Sin Asignar"
    s = fix_encoding(val).strip()
    # Format is often "OFFICE / PERSON NAME" or just "PERSON NAME" or "USER2026_XXX - -"
    if ' / ' in s:
        parts = s.split(' / ', 1)
        person = parts[1].strip()
        if person and person != '-':
            return person.title()
        return parts[0].strip().title()
    if s.startswith('USER') or s.endswith(' - -'):
        return s.rstrip(' -').strip().title()
    return s.title()

df['ultimo_escritorio_clean'] = df['ULTIMO ESCRITORIO'].apply(clean_ultimo_escritorio)

# ====================================================================
# Build ordered index lists for metadata
# ====================================================================
seq_order = [
    'I. AAA Caplina Ocoña', 'II. AAA Chaparra Chincha', 'III. AAA Cañete - Fortaleza',
    'IV. AAA Huarmey Chicama', 'V. AAA Jequetepeque Zarumilla', 'VI. AAA Marañón',
    'VII. AAA Amazonas', 'VIII. AAA Huallaga', 'IX. AAA Ucayali', 'X. AAA Mantaro',
    'XI. AAA Pampas Apurimac', 'XII. AAA Urubamba Vilcanota', 'XIII. AAA Madre de Dios',
    'XIV. AAA Titicaca'
]
grupos = seq_order
grupo_to_idx = {name: i for i, name in enumerate(grupos)}

ultimo_sedes = sorted(list(df['ultimo_sede_clean'].unique()))
usede_to_idx = {name: i for i, name in enumerate(ultimo_sedes)}

ultimo_escritorios = sorted(list(df['ultimo_escritorio_clean'].unique()))
uesc_to_idx = {name: i for i, name in enumerate(ultimo_escritorios)}

# Bandejas (TAREA)
df['TAREA'] = df['TAREA'].fillna('RECIBIDOS').astype(str).str.strip().str.upper()
bandejas = sorted(list(df['TAREA'].unique()))
bandeja_to_idx = {name: i for i, name in enumerate(bandejas)}

# Procedimientos
df['PROCEDIMIENTO'] = df['PROCEDIMIENTO'].fillna('OTROS').astype(str).str.strip()
df.loc[df['PROCEDIMIENTO'] == '', 'PROCEDIMIENTO'] = 'OTROS'
procedimientos = sorted(list(df['PROCEDIMIENTO'].unique()))
proc_to_idx = {name: i for i, name in enumerate(procedimientos)}

# Years
df['creation_year'] = pd.to_numeric(df.get('AÑO', df.get('A\x91O', pd.Series([2026]*len(df)))), errors='coerce').fillna(2026).astype(int)
# Fallback for column name encoding issue
if 'AÑO' not in df.columns:
    for col in df.columns:
        if 'O' in col and len(col) <= 5 and col not in ['ORIGEN', 'TIPO']:
            try:
                df['creation_year'] = pd.to_numeric(df[col], errors='coerce').fillna(2026).astype(int)
                break
            except:
                pass

df['fec_ingreso_dt'] = pd.to_datetime(df['FEC_INGRESO'], dayfirst=True, errors='coerce')
df['ingreso_year'] = df['fec_ingreso_dt'].dt.year.fillna(2026).astype(int)
df['ingreso_date'] = df['fec_ingreso_dt'].dt.strftime('%Y-%m-%d').fillna('1900-01-01')
dates = sorted(list(df['ingreso_date'].unique()))
date_to_idx = {d: i for i, d in enumerate(dates)}
df['date_idx'] = df['ingreso_date'].map(date_to_idx).fillna(0).astype(int)

# Tupa Code
df['tupa_code'] = df['TUPA'].apply(lambda x: 0 if str(x).strip().upper() == 'TUPA' else 1)

# Origen Code
df['ORIGEN'] = df['ORIGEN'].fillna('INTERNO').astype(str)
df['origen_code'] = df['ORIGEN'].apply(lambda x: 0 if str(x).strip().upper() == 'INTERNO' else 1)

# ====================================================================
# Map indices
# ====================================================================
print("Mapping indices...")
df['grupo_idx'] = df['grupo_clean'].map(grupo_to_idx).fillna(0).astype(int)
df['usede_idx'] = df['ultimo_sede_clean'].map(usede_to_idx).fillna(0).astype(int)
df['uesc_idx'] = df['ultimo_escritorio_clean'].map(uesc_to_idx).fillna(0).astype(int)
df['proc_idx'] = df['PROCEDIMIENTO'].map(proc_to_idx).fillna(0).astype(int)
df['bandeja_idx'] = df['TAREA'].map(bandeja_to_idx).fillna(0).astype(int)

# ====================================================================
# Build compact records tuple:
# [grupo_idx, usede_idx, uesc_idx, tupa_code, proc_idx, creation_year, ingreso_year, bandeja_idx, date_idx, origen_code]
# ====================================================================
print("Assembling records...")

grupo_idxs = df['grupo_idx'].tolist()
usede_idxs = df['usede_idx'].tolist()
uesc_idxs = df['uesc_idx'].tolist()
tupa_codes = df['tupa_code'].tolist()
proc_idxs = df['proc_idx'].tolist()
creation_years = df['creation_year'].tolist()
ingreso_years = df['ingreso_year'].tolist()
bandeja_idxs = df['bandeja_idx'].tolist()
date_idxs = df['date_idx'].tolist()
origen_codes = df['origen_code'].tolist()

compact_records = []
for i in range(len(df)):
    compact_records.append([
        grupo_idxs[i],
        usede_idxs[i],
        uesc_idxs[i],
        tupa_codes[i],
        proc_idxs[i],
        creation_years[i],
        ingreso_years[i],
        bandeja_idxs[i],
        date_idxs[i],
        origen_codes[i]
    ])

# Structure final JSON
dashboard_data = {
    "metadata": {
        "grupos": grupos,
        "ultimo_sedes": ultimo_sedes,
        "ultimo_escritorios": ultimo_escritorios,
        "bandejas": bandejas,
        "procedimientos": procedimientos,
        "dates": dates
    },
    "records": compact_records
}

# Ensure directory exists
os.makedirs(output_dir, exist_ok=True)
json_out_path = os.path.join(output_dir, "interno_dashboard_data.json")

print(f"Saving {json_out_path}...")
with open(json_out_path, "w", encoding="utf-8") as f:
    json.dump(dashboard_data, f, ensure_ascii=False)

print(f"Finished processing in {time.time() - t_start:.2f} seconds!")
print(f"interno_dashboard_data.json size: {os.path.getsize(json_out_path)/(1024*1024):.2f} MB")
print(f"  Grupos: {len(grupos)}, Ultimo Sedes: {len(ultimo_sedes)}, Escritorios: {len(ultimo_escritorios)}")
print(f"  Bandejas: {len(bandejas)}, Procedimientos: {len(procedimientos)}")
print(f"  Records: {len(compact_records)}")
