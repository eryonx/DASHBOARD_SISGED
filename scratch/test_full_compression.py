import pandas as pd
import json
import os

excel_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\temp_reporte.xlsx"
df = pd.read_excel(excel_path, sheet_name='Sheet1')

# Columns to extract
cols = list(df.columns)
print("Columns in Excel:", cols)

# We will build lookups for all columns to save space, especially repetitive strings
lookups = {}
records = []

# Repetitive columns
lookup_cols = [
    'Origen', 'Clasificación', 'Sede Ingreso', 'Ambito Ingreso', 
    'Usu_Ventanilla', 'Tupa', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Est. Derivado', 'Est. Cut', 'Ultimo Escritorio'
]

# Build lookups
for col in lookup_cols:
    if col in cols:
        # Fill NaN with empty string
        df[col] = df[col].fillna('').astype(str)
        unique_vals = sorted(list(df[col].unique()))
        lookups[col] = unique_vals

# Convert rows to a compact array of values
for _, row in df.iterrows():
    rec = []
    for col in cols:
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
            if isinstance(val, pd.Timestamp):
                rec.append(val.strftime('%Y-%m-%d %H:%M:%S'))
            else:
                rec.append(val)
    records.append(rec)

output_data = {
    'columns': cols,
    'lookups': lookups,
    'records': records
}

output_path = "test_full_data.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False)

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Compressed JSON size: {size_mb:.2f} MB")
