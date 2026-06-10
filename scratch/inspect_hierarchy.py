import pandas as pd

csv_path = r"c:\Users\Administrador\OneDrive - Autoridad Nacional del Agua (1)\SISGED\DASHBOARD_SISGED\Reporte_Ingresados_Pendientes.csv"
df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')
df.columns = [col.strip() for col in df.columns]

print(f"Total rows: {len(df)}")

print("\n=== UNIQUE SEDE values ===")
for v in sorted(df['SEDE'].dropna().unique()):
    cnt = len(df[df['SEDE'] == v])
    print(f"  {v}: {cnt}")

print(f"\n=== UNIQUE GRUPO count: {df['GRUPO'].nunique()} ===")
print("Sample GRUPO values:")
for v in sorted(df['GRUPO'].dropna().unique())[:20]:
    cnt = len(df[df['GRUPO'] == v])
    print(f"  {v}: {cnt}")

print(f"\n=== UNIQUE ULTIMO SEDE count: {df['ULTIMO SEDE'].nunique()} ===")
print("Sample ULTIMO SEDE values (top 20 by count):")
top_usede = df['ULTIMO SEDE'].value_counts().head(20)
for v, cnt in top_usede.items():
    print(f"  {v}: {cnt}")

print(f"\n=== ULTIMO ESCRITORIO unique count: {df['ULTIMO ESCRITORIO'].nunique()} ===")
print("Sample ULTIMO ESCRITORIO (top 10):")
top_ue = df['ULTIMO ESCRITORIO'].value_counts().head(10)
for v, cnt in top_ue.items():
    print(f"  {v}: {cnt}")
