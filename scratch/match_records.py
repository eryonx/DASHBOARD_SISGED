import json
import openpyxl
from datetime import datetime

# Load first few JSON records
with open("public/data/dashboard_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

sedes = data["metadata"]["sedes"]
ambitos = data["metadata"]["ambitos"]
users = data["metadata"]["users"]
records = data["records"]

print("JSON record samples:")
for r in records[:5]:
    # Record format:
    # 0: origen (0=digital, 1=fisico)
    # 1: clasif (0=nuevo, 1=anexo)
    # 2: tupa (0=tupa, 1=notupa)
    # 3: est_d (0=derivado, 1=archivado, 2=calidad, 3=observado)
    # 4: est_c (0=atendido, 1=pendiente, 2=anulado, 3=observado)
    # 5: s_idx (sede index)
    # 6: a_idx (ambito index)
    # 7: u_idx (user index)
    # 8: date_str (YYYY-MM-DD)
    # 9: val_h (validation hours)
    print(r)
    # Print mapped names:
    s_name = sedes[r[5]] if r[5] < len(sedes) else "UNKNOWN"
    a_name = ambitos[r[6]] if r[6] < len(ambitos) else "UNKNOWN"
    u_name = users[r[7]] if r[7] < len(users) else "UNKNOWN"
    print(f" -> Sede: {s_name}, Ambito: {a_name}, User: {u_name}, Date: {r[8]}, ValH: {r[9]}")

print("\nExcel row samples:")
wb = openpyxl.load_workbook("temp_reporte.xlsx", read_only=True)
sheet = wb["Sheet1"]
row_idx = 0
for row in sheet.iter_rows(min_row=2, max_row=10, values_only=True):
    print(f"Row {row_idx}: {row}")
    row_idx += 1
wb.close()
