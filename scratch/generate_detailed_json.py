import pandas as pd
import json
import os

excel_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\temp_reporte.xlsx"
output_dir = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\public\data"
output_path = os.path.join(output_dir, "detailed_data.json")

print("Loading Excel...")
df = pd.read_excel(excel_path, sheet_name='Sheet1')

# Define clean column names
clean_cols = [
    'N°', 'Ticket', 'Cut', 'Origen', 'Clasificación', 'Fecha Registra', 
    'Sede Ingreso', 'Ambito Ingreso', 'Usu_Ventanilla', 'Tupa', 'Procedimiento', 
    'N° Documento', 'Remitente', 'Asunto', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Fecha_Estado', 'Est. Derivado', 'Est. Cut', 'Ultimo Documento', 
    'Ultimo Escritorio'
]

# Map lookup table columns to save space
lookup_cols = [
    'Origen', 'Clasificación', 'Sede Ingreso', 'Ambito Ingreso', 
    'Usu_Ventanilla', 'Tupa', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Est. Derivado', 'Est. Cut', 'Ultimo Escritorio'
]

# Ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)

lookups = {}
for col_name in lookup_cols:
    df[col_name] = df[col_name].fillna('').astype(str)
    lookups[col_name] = sorted(list(df[col_name].unique()))

records = []
print("Processing records...")
for _, row in df.iterrows():
    rec = []
    # Loop using original Excel columns but map to indices or format value
    for orig_col, clean_col in zip(df.columns, clean_cols):
        val = row[orig_col]
        if pd.isna(val):
            rec.append('')
        elif clean_col in lookup_cols:
            try:
                idx = lookups[clean_col].index(str(val))
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
    'columns': clean_cols,
    'lookups': lookups,
    'records': records
}

print(f"Writing to {output_path}...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False)

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Detailed JSON created successfully! Size: {size_mb:.2f} MB")
