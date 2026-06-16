import pandas as pd
import sys

def inspect_file(name, path):
    print(f"\n===== Inspecting {name}: {path} =====")
    try:
        # Load with pandas
        df = pd.read_csv(path, sep=';', encoding='utf-8-sig', encoding_errors='replace')
        print(f"Loaded {len(df)} rows.")
        print("Columns:", list(df.columns))
        
        # Plazo values
        if 'Plazo' in df.columns:
            print("Unique 'Plazo' values:", df['Plazo'].value_counts(dropna=False).head(15).to_dict())
        else:
            print("'Plazo' column NOT found!")

        # Grupo values
        if 'Grupo' in df.columns:
            print("Unique 'Grupo' values (first 10):", df['Grupo'].value_counts(dropna=False).head(10).to_dict())
        elif 'GRUPO' in df.columns:
            print("Unique 'GRUPO' values (first 10):", df['GRUPO'].value_counts(dropna=False).head(10).to_dict())

        # Oficina Padre values
        for col in ['Oficina Padre', 'OFICINA PADRE']:
            if col in df.columns:
                print(f"Unique '{col}' values (first 10):", df[col].value_counts(dropna=False).head(10).to_dict())

        # Órgano values
        for col in ['Órgano', 'ÓRGANO', 'rgano', 'RGANO']:
            matching_cols = [c for c in df.columns if col.lower() in c.lower()]
            for mc in matching_cols:
                print(f"Unique '{mc}' values:", df[mc].value_counts(dropna=False).to_dict())

    except Exception as e:
        print(f"Error loading {path}: {e}")

inspect_file("OD (Reporte_Ingresados_Pendientes.csv)", "Reporte_Ingresados_Pendientes.csv")
inspect_file("SC (Reporte_Ingresados_Pendientes SC.csv)", "Reporte_Ingresados_Pendientes SC.csv")

