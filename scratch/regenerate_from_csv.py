import pandas as pd
import json
import os
import time
import numpy as np

t_start = time.time()

csv_path = "Reporte de Ingresado Ventanilla GEN.csv"
output_dir = "public/data"

print("Loading CSV database...")
# Load CSV with utf-8-sig to automatically strip BOM and parse characters correctly
df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')

# Clean headers just in case there are whitespaces
df.columns = [col.strip() for col in df.columns]
print(f"Loaded {len(df)} rows. Columns count: {len(df.columns)}")

if 'Ambito Ingreso' not in df.columns and 'Ventanilla' in df.columns:
    print("Mapping 'Ventanilla' column to 'Ambito Ingreso'")
    df['Ambito Ingreso'] = df['Ventanilla']

expected_cols = [
    'N°', 'Ticket', 'Cut', 'Origen', 'Clasificación', 'Fecha Registra', 
    'Sede Ingreso', 'Ambito Ingreso', 'Usu_Ventanilla', 'Tupa', 'Procedimiento', 
    'N° Documento', 'Remitente', 'Asunto', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Fecha_Estado', 'Est. Derivado', 'Est. Cut', 'Ultimo Documento', 
    'Ultimo Escritorio'
]

# Ensure we have all columns
for c in expected_cols:
    if c not in df.columns:
        print(f"Warning: expected column {repr(c)} not found in CSV. Adding empty column.")
        df[c] = ''
df = df[expected_cols]

print("Parsing dates...")
# Parse dates using dayfirst=True
df['Fecha Registra'] = pd.to_datetime(df['Fecha Registra'], dayfirst=True, errors='coerce')
df['Fecha_Estado'] = pd.to_datetime(df['Fecha_Estado'], dayfirst=True, errors='coerce')

print("Vectorizing calculations...")
# 1. Origen: 0=digital, 1=fisico
df['orig_code'] = np.where(df['Origen'].astype(str).str.strip().str.upper() == 'DIGITAL', 0, 1)

# 2. Clasificacion: 0=nuevo, 1=anexo
df['clas_code'] = np.where(df['Clasificación'].astype(str).str.strip().str.upper().isin(['NUEVO', 'NUEVOS']), 0, 1)

# 3. Tupa: 0=tupa, 1=notupa
df['tupa_code'] = np.where(df['Tupa'].astype(str).str.strip().str.upper().isin(['TUPA', 'TUPA ']), 0, 1)

# 4. Est. Derivado: 0=derivado, 1=archivado, 2=calidad, 3=observado
est_d_clean = df['Est. Derivado'].astype(str).str.strip().str.upper()
df['est_d_code'] = 0
df.loc[est_d_clean.str.contains('ARCHIVADO', na=False), 'est_d_code'] = 1
df.loc[est_d_clean.str.contains('CALIDAD', na=False), 'est_d_code'] = 2
df.loc[est_d_clean.str.contains('OBSERVADO', na=False), 'est_d_code'] = 3

# 5. Est. Cut: 0=atendido, 1=pendiente, 2=anulado, 3=observado
est_c_clean = df['Est. Cut'].astype(str).str.strip().str.upper()
df['est_c_code'] = 1  # default pending
df.loc[est_c_clean.str.contains('ATENDIDO', na=False), 'est_c_code'] = 0
df.loc[est_c_clean.str.contains('ANULADO', na=False), 'est_c_code'] = 2
df.loc[est_c_clean.str.contains('OBSERVADO', na=False), 'est_c_code'] = 3

# 6. val_h (validation hours)
diff_hours = (df['Fecha_Estado'] - df['Fecha Registra']).dt.total_seconds() / 3600.0
df['val_h'] = np.where(df['est_d_code'] == 0, diff_hours.round(1), np.nan)

# Clean fields and fill NaNs
df['Sede Ingreso'] = df['Sede Ingreso'].fillna('').astype(str).str.strip()
df['Ambito Ingreso'] = df['Ambito Ingreso'].fillna('').astype(str).str.strip()
df['Usu_Ventanilla'] = df['Usu_Ventanilla'].fillna('').astype(str).str.strip()
df['Procedimiento'] = df['Procedimiento'].fillna('OTROS').astype(str).str.strip()
df.loc[df['Procedimiento'] == '', 'Procedimiento'] = 'OTROS'

# Clean destination fields
df['Sede'] = df['Sede'].fillna('OTRAS').astype(str).str.strip()
df.loc[df['Sede'] == '', 'Sede'] = 'OTRAS'
df['Grupo'] = df['Grupo'].fillna('OTROS').astype(str).str.strip()
df.loc[df['Grupo'] == '', 'Grupo'] = 'OTROS'
df['Oficina Destino_2'] = df['Oficina Destino_2'].fillna('OTRAS').astype(str).str.strip()
df.loc[df['Oficina Destino_2'] == '', 'Oficina Destino_2'] = 'OTRAS'

# Metadata Lists (sorted alphabetically)
sedes = sorted(list(df['Sede Ingreso'].unique()))
ambitos = sorted(list(df['Ambito Ingreso'].unique()))
users = sorted(list(df['Usu_Ventanilla'].unique()))
procedimientos = sorted(list(df['Procedimiento'].unique()))
dest_sedes = sorted(list(df['Sede'].unique()))
dest_grupos = sorted(list(df['Grupo'].unique()))
dest_oficinas = sorted(list(df['Oficina Destino_2'].unique()))

# Create reverse lookup dictionaries
sede_to_idx = {name: i for i, name in enumerate(sedes)}
ambito_to_idx = {name: i for i, name in enumerate(ambitos)}
user_to_idx = {name: i for i, name in enumerate(users)}
proc_to_idx = {name: i for i, name in enumerate(procedimientos)}
dest_sede_to_idx = {name: i for i, name in enumerate(dest_sedes)}
dest_grupo_to_idx = {name: i for i, name in enumerate(dest_grupos)}
dest_oficina_to_idx = {name: i for i, name in enumerate(dest_oficinas)}

# Map indices back to dataframe columns
df['s_idx'] = df['Sede Ingreso'].map(sede_to_idx)
df['a_idx'] = df['Ambito Ingreso'].map(ambito_to_idx)
df['u_idx'] = df['Usu_Ventanilla'].map(user_to_idx)
df['p_idx'] = df['Procedimiento'].map(proc_to_idx)
df['dest_s_idx'] = df['Sede'].map(dest_sede_to_idx)
df['dest_g_idx'] = df['Grupo'].map(dest_grupo_to_idx)
df['dest_o_idx'] = df['Oficina Destino_2'].map(dest_oficina_to_idx)

# Format dates to string
df['date_str'] = df['Fecha Registra'].dt.strftime('%Y-%m-%d').fillna('')

# Process procedures classification
procedimientos_tupa_set = set()
procedimientos_notupa_set = set()

print("Assembling compact records for dashboard_data.json...")
compact_records = []
df_val_h_list = df['val_h'].replace({np.nan: None}).tolist()

iter_cols = [
    df['orig_code'].tolist(),
    df['clas_code'].tolist(),
    df['tupa_code'].tolist(),
    df['est_d_code'].tolist(),
    df['est_c_code'].tolist(),
    df['s_idx'].tolist(),
    df['a_idx'].tolist(),
    df['u_idx'].tolist(),
    df['date_str'].tolist(),
    df_val_h_list,
    df['p_idx'].tolist(),
    df['dest_s_idx'].tolist(),
    df['dest_g_idx'].tolist(),
    df['dest_o_idx'].tolist()
]

for i in range(len(df)):
    orig_c = iter_cols[0][i]
    clas_c = iter_cols[1][i]
    tupa_c = iter_cols[2][i]
    est_d_c = iter_cols[3][i]
    est_c_c = iter_cols[4][i]
    s_idx = iter_cols[5][i]
    a_idx = iter_cols[6][i]
    u_idx = iter_cols[7][i]
    d_str = iter_cols[8][i]
    val_h_val = iter_cols[9][i]
    p_idx_val = iter_cols[10][i]
    dest_s_c = iter_cols[11][i]
    dest_g_c = iter_cols[12][i]
    dest_o_c = iter_cols[13][i]

    if tupa_c == 0:
        procedimientos_tupa_set.add(p_idx_val)
    else:
        procedimientos_notupa_set.add(p_idx_val)

    compact_records.append([
        orig_c, clas_c, tupa_c, est_d_c, est_c_c,
        s_idx, a_idx, u_idx, d_str, val_h_val, p_idx_val,
        dest_s_c, dest_g_c, dest_o_c
    ])

# Save compact dashboard data
dashboard_json_path = os.path.join(output_dir, "dashboard_data.json")
metadata = {
    "sedes": sedes,
    "ambitos": ambitos,
    "users": users,
    "procedimientos": procedimientos,
    "procedimientos_tupa": sorted(list(procedimientos_tupa_set)),
    "procedimientos_notupa": sorted(list(procedimientos_notupa_set)),
    "dest_sedes": dest_sedes,
    "dest_grupos": dest_grupos,
    "dest_oficinas": dest_oficinas
}
dashboard_data = {
    "metadata": metadata,
    "records": compact_records
}

print(f"Saving {dashboard_json_path}...")
with open(dashboard_json_path, "w", encoding="utf-8") as f:
    json.dump(dashboard_data, f, ensure_ascii=False)

# ---- GENERATE DETAILED DATA JSON ----
print("Processing detailed records for detailed_data.json...")
lookup_cols = [
    'Origen', 'Clasificación', 'Sede Ingreso', 'Ambito Ingreso', 
    'Usu_Ventanilla', 'Tupa', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Est. Derivado', 'Est. Cut', 'Ultimo Escritorio'
]

detailed_lookups = {}
for col in lookup_cols:
    df[col] = df[col].fillna('').astype(str).str.strip()
    detailed_lookups[col] = sorted(list(df[col].unique()))

detailed_records = []
for _, row in df.iterrows():
    rec = []
    for col in expected_cols:
        val = row[col]
        if pd.isna(val):
            rec.append('')
        elif col in lookup_cols:
            try:
                idx = detailed_lookups[col].index(str(val))
                rec.append(idx)
            except ValueError:
                rec.append(-1)
        else:
            if isinstance(val, pd.Timestamp):
                if col == 'Fecha Registra':
                    rec.append(val.strftime('%Y-%m-%d'))
                else:
                    rec.append(val.strftime('%Y-%m-%d %H:%M:%S'))
            else:
                rec.append(val)
    detailed_records.append(rec)

detailed_json_path = os.path.join(output_dir, "detailed_data.json")
detailed_data = {
    'columns': expected_cols,
    'lookups': detailed_lookups,
    'records': detailed_records
}

print(f"Saving {detailed_json_path}...")
with open(detailed_json_path, 'w', encoding='utf-8') as f:
    json.dump(detailed_data, f, ensure_ascii=False)

print(f"Finished processing in {time.time() - t_start:.2f} seconds!")
print(f"dashboard_data.json size: {os.path.getsize(dashboard_json_path)/(1024*1024):.2f} MB")
print(f"detailed_data.json size: {os.path.getsize(detailed_json_path)/(1024*1024):.2f} MB")
