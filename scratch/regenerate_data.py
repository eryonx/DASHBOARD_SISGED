import pandas as pd
import json
import time
from datetime import datetime

t_start = time.time()

# 1. Load existing JSON metadata to maintain stable order for sedes, ambitos, and users
print("Loading existing metadata...")
with open("public/data/dashboard_data.json", "r", encoding="utf-8") as f:
    orig_data = json.load(f)

sedes = orig_data["metadata"]["sedes"]
ambitos = orig_data["metadata"]["ambitos"]
users = orig_data["metadata"]["users"]

# 2. Load the full Excel sheet
print("Loading Excel temp_reporte.xlsx...")
# Columns index:
# 3: Origen, 4: Clasificacion, 5: Fecha Registra, 6: Sede Ingreso, 7: Ambito Ingreso,
# 8: Usu_Ventanilla, 9: Tupa, 10: Procedimiento, 18: Fecha_Estado, 19: Est. Derivado, 20: Est. Cut
df = pd.read_excel('temp_reporte.xlsx', sheet_name='Sheet1', usecols=[3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20])
print(f"Loaded {len(df)} rows in {time.time() - t_start:.2f} seconds.")

records = []
procedimientos_set = set()
procedimientos_tupa_set = set()
procedimientos_notupa_set = set()

# We need a stable, alphabetical sorting of procedimientos. 
# But wait, we can just collect all unique procedures first, sort them, and then map them.
# Let's do that! First let's collect unique procedure strings.
print("Collecting unique procedures...")
for idx, val in df.iloc[:, 7].items():
    p_str = str(val).strip() if pd.notna(val) else "OTROS"
    # Normalize unicode encoding or characters if needed, but standard strip is usually enough
    if p_str == "":
        p_str = "OTROS"
    procedimientos_set.add(p_str)

procedimientos_list = sorted(list(procedimientos_set))
print(f"Found {len(procedimientos_list)} unique procedures.")

# Create lookup dict for faster indexing
proc_to_idx = {name: i for i, name in enumerate(procedimientos_list)}

print("Processing records...")
t0 = time.time()
for idx, row in df.iterrows():
    origen_val = row.iloc[0]
    clasif_val = row.iloc[1]
    fecha_reg = row.iloc[2]
    sede_val = row.iloc[3]
    ambito_val = row.iloc[4]
    user_val = row.iloc[5]
    tupa_val = row.iloc[6]
    proc_val = row.iloc[7]
    fecha_est = row.iloc[8]
    est_d_val = row.iloc[9]
    est_c_val = row.iloc[10]

    # Map Origen
    orig_code = 0 if str(origen_val).strip().upper() == "DIGITAL" else 1

    # Map Clasificacion
    clas_code = 0 if str(clasif_val).strip().upper() in ["NUEVO", "NUEVOS"] else 1

    # Map Tupa
    tupa_code = 0 if str(tupa_val).strip().upper() in ["TUPA", "TUPA "] else 1

    # Map Est. Derivado (0=derivado, 1=archivado, 2=calidad, 3=observado)
    est_d_str = str(est_d_val).strip().upper()
    if "DERIVADO" in est_d_str:
        est_d_code = 0
    elif "ARCHIVADO" in est_d_str:
        est_d_code = 1
    elif "CALIDAD" in est_d_str:
        est_d_code = 2
    elif "OBSERVADO" in est_d_str:
        est_d_code = 3
    else:
        est_d_code = 0

    # Map Est. Cut (0=atendido, 1=pendiente, 2=anulado, 3=observado)
    est_c_str = str(est_c_val).strip().upper() if pd.notna(est_c_val) else ""
    if "ATENDIDO" in est_c_str:
        est_c_code = 0
    elif "PENDIENTE" in est_c_str:
        est_c_code = 1
    elif "ANULADO" in est_c_str:
        est_c_code = 2
    elif "OBSERVADO" in est_c_str:
        est_c_code = 3
    else:
        est_c_code = 1

    # Sede index
    sede_clean = str(sede_val).strip()
    if sede_clean not in sedes:
        sedes.append(sede_clean)
    s_idx = sedes.index(sede_clean)

    # Ambito index
    ambito_clean = str(ambito_val).strip()
    if ambito_clean not in ambitos:
        ambitos.append(ambito_clean)
    a_idx = ambitos.index(ambito_clean)

    # User index
    user_clean = str(user_val).strip()
    if user_clean not in users:
        users.append(user_clean)
    u_idx = users.index(user_clean)

    # Date string (YYYY-MM-DD)
    date_str = ""
    if pd.notna(fecha_reg):
        if isinstance(fecha_reg, datetime):
            date_str = fecha_reg.strftime("%Y-%m-%d")
        else:
            try:
                dt_parsed = pd.to_datetime(fecha_reg)
                date_str = dt_parsed.strftime("%Y-%m-%d")
            except:
                pass

    # val_h (validation hours)
    val_h = None
    if est_d_code == 0 and pd.notna(fecha_reg) and pd.notna(fecha_est):
        try:
            dt_reg = pd.to_datetime(fecha_reg)
            if isinstance(fecha_est, datetime):
                dt_est = fecha_est
            else:
                dt_est = pd.to_datetime(fecha_est, dayfirst=True)
            diff_h = (dt_est - dt_reg).total_seconds() / 3600.0
            val_h = round(diff_h, 1)
        except:
            pass

    # Procedimiento index
    proc_clean = str(proc_val).strip() if pd.notna(proc_val) else "OTROS"
    if proc_clean == "":
        proc_clean = "OTROS"
    p_idx = proc_to_idx[proc_clean]

    # Map procedures to Tupa / No Tupa lists
    if tupa_code == 0:
        procedimientos_tupa_set.add(p_idx)
    else:
        procedimientos_notupa_set.add(p_idx)

    # Append to records:
    # 0: origen, 1: clasif, 2: tupa, 3: est_d, 4: est_c, 5: s_idx, 6: a_idx, 7: u_idx, 8: date_str, 9: val_h, 10: p_idx
    records.append([
        orig_code,
        clas_code,
        tupa_code,
        est_d_code,
        est_c_code,
        s_idx,
        a_idx,
        u_idx,
        date_str,
        val_h,
        p_idx
    ])

    if (idx + 1) % 50000 == 0:
        print(f"Processed {idx + 1} records...")

print(f"Processed records in {time.time() - t0:.2f} seconds.")

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
