import pandas as pd

excel_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\temp_reporte.xlsx"
df = pd.read_excel(excel_path, sheet_name='Sheet1')

col_est_deriv = df.columns[19]
col_est_cut = df.columns[20]

print("=== Value Counts for Estado Derivado (col 19) ===")
print(df[col_est_deriv].value_counts(dropna=False))

print("\n=== Value Counts for Estado Cut (col 20) ===")
print(df[col_est_cut].value_counts(dropna=False))

print("\n=== Cross tabulation ===")
print(pd.crosstab(df[col_est_deriv].fillna('NaN'), df[col_est_cut].fillna('NaN'), margins=True))
