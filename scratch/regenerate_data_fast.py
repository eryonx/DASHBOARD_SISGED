import pandas as pd
import json
import time
import numpy as np

t_start = time.time()

# 1. Load existing JSON metadata to maintain stable order for sedes, ambitos, and users
print("Loading existing metadata...")
with open("public/data/dashboard_data.json", "r", encoding="utf-8") as f:
    orig_data = json.load(f)

sedes = orig_data["metadata"]["sedes"]
ambitos = orig_data["metadata"]["ambitos"]
users = orig_data["metadata"]["users"]

# Create lookup dicts for O(1) index queries
sede_to_idx = {name: i for i, name in enumerate(sedes)}
ambito_to_idx = {name: i for i, name in enumerate(ambitos)}
user_to_idx = {name: i for i, name in enumerate(users)}

# 2. Load the full Excel sheet
print("Loading Excel temp_reporte.xlsx...")
# Columns index:
# 3: Origen, 4: Clasificacion, 5: Fecha Registra, 6: Sede Ingreso, 7: Ambito Ingreso,
# 8: Usu_Ventanilla, 9: Tupa, 10: Procedimiento, 18: Fecha_Estado, 19: Est. Derivado, 20: Est. Cut
df = pd.read_excel('temp_reporte.xlsx', sheet_name='Sheet1', usecols=[3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20])
print(f"Loaded {len(df)} rows in {time.time() - t_start:.2f} seconds.")

# Rename columns to standard clean ASCII names
df.columns = [
    'Origen',
    'Clasificacion',
    'Fecha Registra',
    'Sede Ingreso',
    'Ambito Ingreso',
    'Usu_Ventanilla',
    'Tupa',
    'Procedimiento',
    'Fecha_Estado',
    'Est. Derivado',
    'Est. Cut'
]

print("Vectorizing calculations...")
t_vec = time.time()

# Vectorized Date parsing
df['Fecha Registra'] = pd.to_datetime(df['Fecha Registra'], errors='coerce')
df['Fecha_Estado'] = pd.to_datetime(df['Fecha_Estado'], dayfirst=True, errors='coerce')

# Vectorized Map Origen
df['orig_code'] = np.where(df['Origen'].astype(str).str.strip().str.upper() == 'DIGITAL', 0, 1)

# Vectorized Map Clasificacion
df['clas_code'] = np.where(df['Clasificacion'].astype(str).str.strip().str.upper().isin(['NUEVO', 'NUEVOS']), 0, 1)

# Vectorized Map Tupa
df['tupa_code'] = np.where(df['Tupa'].astype(str).str.strip().str.upper().isin(['TUPA', 'TUPA ']), 0, 1)

# Vectorized Map Est. Derivado
# 0=derivado, 1=archivado, 2=calidad, 3=observado
est_d_clean = df['Est. Derivado'].astype(str).str.strip().str.upper()
df['est_d_code'] = 0
df.loc[est_d_clean.str.contains('ARCHIVADO', na=False), 'est_d_code'] = 1
df.loc[est_d_clean.str.contains('CALIDAD', na=False), 'est_d_code'] = 2
df.loc[est_d_clean.str.contains('OBSERVADO', na=False), 'est_d_code'] = 3

# Vectorized Map Est. Cut
# 0=atendido, 1=pendiente, 2=anulado, 3=observado
est_c_clean = df['Est. Cut'].astype(str).str.strip().str.upper()
df['est_c_code'] = 1  # default pending
df.loc[est_c_clean.str.contains('ATENDIDO', na=False), 'est_c_code'] = 0
df.loc[est_c_clean.str.contains('ANULADO', na=False), 'est_c_code'] = 2
df.loc[est_c_clean.str.contains('OBSERVADO', na=False), 'est_c_code'] = 3

# Vectorized val_h calculation
diff_hours = (df['Fecha_Estado'] - df['Fecha Registra']).dt.total_seconds() / 3600.0
df['val_h'] = np.where(df['est_d_code'] == 0, diff_hours.round(1), np.nan)

# Extract unique procedures and sort them
df['Procedimiento_Clean'] = df['Procedimiento'].astype(str).str.strip()
df.loc[df['Procedimiento_Clean'] == '', 'Procedimiento_Clean'] = 'OTROS'
df.loc[df['Procedimiento_Clean'].isna(), 'Procedimiento_Clean'] = 'OTROS'

procedimientos_list = sorted(list(df['Procedimiento_Clean'].unique()))
print(f"Found {len(procedimientos_list)} unique procedures.")
proc_to_idx = {name: i for i, name in enumerate(procedimientos_list)}

df['p_idx'] = df['Procedimiento_Clean'].map(proc_to_idx)

print(f"Vectorization done in {time.time() - t_vec:.2f} seconds.")

# Prepare mappings lists for Tupa / No Tupa
procedimientos_tupa_set = set()
procedimientos_notupa_set = set()

# Populate sede, ambito, and user lookup lists if any new entries appear
print("Mapping metadata indices...")
records = []
t_loop = time.time()

# Convert dataframe columns of interest to list of tuples for ultra-fast iteration
# Columns needed for tuple creation:
# orig_code, clas_code, tupa_code, est_d_code, est_c_code, Sede Ingreso, Ambito Ingreso, Usu_Ventanilla, Fecha Registra (str), val_h, p_idx
df['date_str'] = df['Fecha Registra'].dt.strftime('%Y-%m-%d').fillna('')

# Replace NaN in val_h with None
df_val_h_list = df['val_h'].replace({np.nan: None}).tolist()

iter_cols = [
    df['orig_code'].tolist(),
    df['clas_code'].tolist(),
    df['tupa_code'].tolist(),
    df['est_d_code'].tolist(),
    df['est_c_code'].tolist(),
    df['Sede Ingreso'].astype(str).str.strip().tolist(),
    df['Ambito Ingreso'].astype(str).str.strip().tolist(),
    df['Usu_Ventanilla'].astype(str).str.strip().tolist(),
    df['date_str'].tolist(),
    df_val_h_list,
    df['p_idx'].tolist()
]

# Quick loop over zip
for i in range(len(df)):
    orig_c = iter_cols[0][i]
    clas_c = iter_cols[1][i]
    tupa_c = iter_cols[2][i]
    est_d_c = iter_cols[3][i]
    est_c_c = iter_cols[4][i]
    sede_s = iter_cols[5][i]
    ambito_s = iter_cols[6][i]
    user_s = iter_cols[7][i]
    d_str = iter_cols[8][i]
    val_h_val = iter_cols[9][i]
    p_idx_val = iter_cols[10][i]

    # Resolve indices (with dynamic growth of lists if new items appear)
    if sede_s not in sede_to_idx:
        sede_to_idx[sede_s] = len(sedes)
        sedes.append(sede_s)
    s_idx = sede_to_idx[sede_s]

    if ambito_s not in ambito_to_idx:
        ambito_to_idx[ambito_s] = len(ambitos)
        ambitos.append(ambito_s)
    a_idx = ambito_to_idx[ambito_s]

    if user_s not in user_to_idx:
        user_to_idx[user_s] = len(users)
        users.append(user_s)
    u_idx = user_to_idx[user_s]

    # Track tupa vs. no tupa classification for procedures
    if tupa_c == 0:
        procedimientos_tupa_set.add(p_idx_val)
    else:
        procedimientos_notupa_set.add(p_idx_val)

    records.append([
        orig_c,
        clas_c,
        tupa_c,
        est_d_c,
        est_c_c,
        s_idx,
        a_idx,
        u_idx,
        d_str,
        val_h_val,
        p_idx_val
    ])

print(f"Mapped {len(records)} records in {time.time() - t_loop:.2f} seconds.")

# Prepare metadata
metadata = {
    "sedes": sedes,
    "ambitos": ambitos,
    "users": users,
    "procedimientos": procedimientos_list,
    "procedimientos_tupa": sorted(list(procedimientos_tupa_set)),
    "procedimientos_notupa": sorted(list(procedimientos_notupa_set))
}

out_data = {
    "metadata": metadata,
    "records": records
}

print("Saving JSON to public/data/dashboard_data.json...")
t_save = time.time()
with open("public/data/dashboard_data.json", "w", encoding="utf-8") as f:
    json.dump(out_data, f, ensure_ascii=False)
print(f"JSON saved in {time.time() - t_save:.2f} seconds.")
print(f"Total execution time: {time.time() - t_start:.2f} seconds.")
