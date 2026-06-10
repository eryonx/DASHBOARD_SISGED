import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte de Ingresado Ventanilla GEN.csv"

encodings = ['utf-8-sig', 'latin-1', 'cp1252', 'utf-16']
for enc in encodings:
    try:
        df = pd.read_csv(csv_path, sep=';', nrows=3, encoding=enc)
        print(f"--- Encoding {enc} success ---")
        cols = list(df.columns)
        # Check first column and classification column
        print("Columns:", [c.encode('ascii', 'ignore').decode() for c in cols])
        print("First col raw:", repr(cols[0]))
        print("Clasificacion col raw:", repr(cols[4]))
        print("Row 0 Origen:", repr(df.iloc[0]['Origen']))
        print("Row 0 Clasificacion:", repr(df.iloc[0][cols[4]]))
        print("Row 0 Asunto:", repr(df.iloc[0]['Asunto']))
    except Exception as e:
        print(f"--- Encoding {enc} failed: {e}")
