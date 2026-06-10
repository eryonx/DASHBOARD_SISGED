import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte de Ingresado Ventanilla GEN.csv"

# Read first few lines to detect delimiter using repr to prevent print errors
with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
    for i in range(5):
        line = f.readline().strip()
        print(f"Line {i}: {repr(line)}")

print("\n--- Testing pandas load ---")
try:
    df = pd.read_csv(csv_path, sep=';', nrows=5, encoding='utf-8')
    print("Columns (semicolon):", [str(col).encode('ascii', 'ignore').decode() for col in df.columns])
except Exception as e:
    print("Failed to read with semicolon:", e)

try:
    df = pd.read_csv(csv_path, sep=',', nrows=5, encoding='utf-8')
    print("Columns (comma):", [str(col).encode('ascii', 'ignore').decode() for col in df.columns])
except Exception as e:
    print("Failed to read with comma:", e)
