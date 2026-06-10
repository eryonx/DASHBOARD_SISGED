import pandas as pd
import json
from datetime import datetime

# Load existing JSON metadata to keep identical lists of sedes, ambitos, and users
with open("public/data/dashboard_data.json", "r", encoding="utf-8") as f:
    orig_data = json.load(f)

sedes = orig_data["metadata"]["sedes"]
ambitos = orig_data["metadata"]["ambitos"]
users = orig_data["metadata"]["users"]

# Load first 100 rows of Excel
df = pd.read_excel('temp_reporte.xlsx', sheet_name='Sheet1', nrows=100, usecols=[3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20])

print("Columns in df:", df.columns.tolist())

for idx, row in df.head(10).iterrows():
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

    # Map Est. Derivado
    # 0=derivado, 1=archivado, 2=calidad, 3=observado
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
        est_d_code = 0 # Default fallback

    # Map Est. Cut
    # 0=atendido, 1=pendiente, 2=anulado, 3=observado
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
        est_c_code = 1 # Default pending

    # Find metadata indices (append if not present)
    sede_clean = str(sede_val).strip()
    if sede_clean not in sedes:
        sedes.append(sede_clean)
    s_idx = sedes.index(sede_clean)

    ambito_clean = str(ambito_val).strip()
    if ambito_clean not in ambitos:
        ambitos.append(ambito_clean)
    a_idx = ambitos.index(ambito_clean)

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
            # Fecha_Estado is string or datetime. Let's handle both.
            if isinstance(fecha_est, datetime):
                dt_est = fecha_est
            else:
                dt_est = pd.to_datetime(fecha_est, dayfirst=True)
            diff_h = (dt_est - dt_reg).total_seconds() / 3600.0
            val_h = round(diff_h, 1)
        except Exception as e:
            pass

    print(f"Row {idx}: orig={orig_code}, clas={clas_code}, tupa={tupa_code}, est_d={est_d_code}, est_c={est_c_code}, s={s_idx}({sede_clean}), a={a_idx}({ambito_clean}), u={u_idx}({user_clean}), date={date_str}, val_h={val_h}, proc={proc_val}")
