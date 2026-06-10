import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte de Ingresado Ventanilla GEN.csv"

# Load CSV using utf-8-sig
df = pd.read_csv(csv_path, sep=';', nrows=3, encoding='utf-8-sig', encoding_errors='replace')

expected_cols = [
    'N°', 'Ticket', 'Cut', 'Origen', 'Clasificación', 'Fecha Registra', 
    'Sede Ingreso', 'Ambito Ingreso', 'Usu_Ventanilla', 'Tupa', 'Procedimiento', 
    'N° Documento', 'Remitente', 'Asunto', 'Oficina Destino_2', 'Oficina Destino', 
    'Grupo', 'Sede', 'Fecha_Estado', 'Est. Derivado', 'Est. Cut', 'Ultimo Documento', 
    'Ultimo Escritorio'
]

print("Columns in DataFrame:")
for col in df.columns:
    print(f"Col: {repr(col)} | In expected: {col in expected_cols}")

print("\nMissing expected columns:")
for exp in expected_cols:
    if exp not in df.columns:
        print(f"Missing: {repr(exp)}")
