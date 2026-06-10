import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte de Ingresado Ventanilla GEN.csv"

encodings = [
    ('utf-8', 'replace'),
    ('latin-1', 'strict'),
    ('iso-8859-15', 'strict'),
    ('cp1252', 'replace'),
    ('cp1252', 'ignore'),
    ('utf-8-sig', 'replace')
]

for enc, err in encodings:
    try:
        df = pd.read_csv(csv_path, sep=';', nrows=10, encoding=enc, encoding_errors=err)
        print(f"\n--- {enc} ({err}) ---")
        cols = list(df.columns)
        print("Col 0:", repr(cols[0]))
        print("Col 4:", repr(cols[4]))
        print("Row 0 Asunto:", repr(df.iloc[0]['Asunto']))
        print("Row 2 Ambito:", repr(df.iloc[1]['Ambito Ingreso']))
    except Exception as e:
        print(f"--- {enc} ({err}) failed: {e}")
