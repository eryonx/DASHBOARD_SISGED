import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte de Ingresado Ventanilla GEN.csv"
df = pd.read_csv(csv_path, sep=';', encoding='cp1252', encoding_errors='replace')
df.columns = [col.replace('\ufeff', '') for col in df.columns]

col_n_deg = "N\u00b0"
col_clasif = "Clasificaci\u00f3n"
col_n_doc = "N\u00b0 Documento"

print("--- DataFrame Columns ---")
for col in df.columns:
    print(f"Col: {repr(col)} | Ords: {[ord(c) for c in col]}")

print("\n--- Expected Columns ---")
expected_cols = [col_n_deg, col_clasif, col_n_doc]
for exp in expected_cols:
    print(f"Exp: {repr(exp)} | Ords: {[ord(c) for c in exp]}")
