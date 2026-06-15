import pandas as pd
import json
import os
import time

t_start = time.time()

csv_path = "Reporte_Ingresados_Pendientes.csv"
output_dir = "public/data"
output_path = os.path.join(output_dir, "interno_detailed_data.json")

print("Loading CSV database...")
df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')

# Clean headers directly to correct names
clean_cols = [
    'N°', 'N° CUT', 'ORIGEN', 'TIPO', 'TUPA', 'PROCEDIMIENTO', 'FEC_CREACION', 'AÑO', 
    'REMITENTE', 'TIPO DOCUMENTO', 'DOCUMENTO ORIGEN', 'ASUNTO', 'REFERENCIA', 
    'ULTIMO DOCUMENTO', 'OFICINA ENVIA', 'ULTIMO ESCRITORIO', 'ULTIMO SEDE', 
    'OFICINA PADRE', 'GRUPO', 'SEDE', 'FEC_INGRESO', 'TAREA'
]
df.columns = clean_cols
print(f"Loaded {len(df)} rows. Columns: {list(df.columns)}")

def fix_encoding(s):
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

def clean_ultimo_sede(val):
    if pd.isna(val):
        return "Sin Oficina"
    s = fix_encoding(val)
    s_upper = s.upper()
    if s_upper.startswith("ALA "):
        return "ALA " + s[4:].strip().title()
    if s_upper.startswith("AAA "):
        # Roman numerals map helper
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
        return roman_map.get(s_upper, s_upper.title())
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

# Apply the same cleanings so the strings in export match dashboard exactly
df['ORIGEN'] = df['ORIGEN'].fillna('INTERNO').astype(str).apply(fix_encoding)
df['TIPO'] = df['TIPO'].fillna('DIGITAL').astype(str).apply(fix_encoding)
df['TUPA'] = df['TUPA'].fillna('NO TUPA').astype(str).apply(fix_encoding)
df['PROCEDIMIENTO'] = df['PROCEDIMIENTO'].fillna('').astype(str).apply(fix_encoding)
df['TAREA'] = df['TAREA'].fillna('RECIBIDOS').astype(str).apply(fix_encoding)

# Roman map for groups
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
df['GRUPO'] = df['GRUPO'].apply(lambda x: roman_map.get(fix_encoding(x).upper(), fix_encoding(x).title()) if not pd.isna(x) else 'Otras AAA')
df['ULTIMO SEDE'] = df['ULTIMO SEDE'].apply(clean_ultimo_sede)
df['ULTIMO ESCRITORIO'] = df['ULTIMO ESCRITORIO'].apply(clean_ultimo_escritorio)
df['SEDE'] = df['SEDE'].fillna('ORGANOS DESCONCONTRADOS').astype(str).apply(fix_encoding)

# For all other text fields, just fix encoding
other_text_cols = [
    'TIPO DOCUMENTO', 'DOCUMENTO ORIGEN', 'ASUNTO', 'REFERENCIA', 'ULTIMO DOCUMENTO',
    'OFICINA ENVIA', 'OFICINA PADRE', 'REMITENTE'
]
for col in other_text_cols:
    df[col] = df[col].fillna('').astype(str).apply(fix_encoding)

# Lookup columns to optimize size
lookup_cols = [
    'ORIGEN', 'TIPO', 'TUPA', 'PROCEDIMIENTO', 'AÑO', 'TIPO DOCUMENTO', 
    'OFICINA ENVIA', 'ULTIMO ESCRITORIO', 'ULTIMO SEDE', 'OFICINA PADRE', 
    'GRUPO', 'SEDE', 'TAREA'
]

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

lookups = {}
for col in lookup_cols:
    lookups[col] = sorted(list(df[col].astype(str).unique()))

records = []
print("Encoding records...")
for _, row in df.iterrows():
    rec = []
    for col in clean_cols:
        val = row[col]
        if pd.isna(val):
            rec.append('')
        elif col in lookup_cols:
            try:
                idx = lookups[col].index(str(val))
                rec.append(idx)
            except ValueError:
                rec.append(-1)
        else:
            rec.append(str(val))
    records.append(rec)

output_data = {
    'columns': clean_cols,
    'lookups': lookups,
    'records': records
}

print(f"Writing to {output_path}...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False)

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Detailed JSON created successfully! Size: {size_mb:.2f} MB")
print(f"Finished in {time.time() - t_start:.2f} seconds!")
