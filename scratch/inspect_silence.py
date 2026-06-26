import pandas as pd

csv_path = "Reporte de Ingresado Ventanilla GEN.csv"
print("Loading CSV...")
df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', encoding_errors='replace')
df.columns = [col.strip() for col in df.columns]

# Filter for Tupa
df_tupa = df[df['Tupa'].astype(str).str.strip().str.upper().isin(['TUPA', 'TUPA '])]
print(f"Total TUPA rows: {len(df_tupa)}")

# Let's see some unique values of Procedimiento
unique_proceds = df_tupa['Procedimiento'].dropna().unique()
print(f"Total unique TUPA procedures: {len(unique_proceds)}")

# Let's find if any have 'Silencio', 'positivo', 'negativo', '+', '-'
silence_terms = ['silencio', 'positivo', 'negativo', '+', '-']
matching = []
for p in unique_proceds:
    p_lower = p.lower()
    if any(t in p_lower for t in silence_terms):
        matching.append(p)

print(f"Found {len(matching)} procedures matching silence terms:")
for m in matching[:20]:
    print(" -", m)

print("\nLet's print a few random TUPA procedures to see their naming style:")
for p in list(unique_proceds)[:15]:
    print(" -", p)
