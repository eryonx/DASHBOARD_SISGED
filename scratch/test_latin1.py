import pandas as pd

def test_encoding(path, encoding):
    print(f"\nTesting {path} with {encoding}...")
    try:
        df = pd.read_csv(path, sep=';', encoding=encoding, nrows=20)
        # Find Órgano column
        organo_col = [c for c in df.columns if 'rgano' in c.lower() or 'organo' in c.lower()]
        if organo_col:
            print(f"Órgano values parsed with {encoding}:")
            print([repr(v) for v in df[organo_col[0]].unique()])
        else:
            print("Órgano column not found. Columns are:")
            print([repr(c) for c in df.columns])
            
        grupo_col = [c for c in df.columns if 'grupo' in c.lower()]
        if grupo_col:
            print(f"Grupo values parsed with {encoding} (first few):")
            print([repr(v) for v in df[grupo_col[0]].unique()[:5]])
    except Exception as e:
        print(f"Error: {e}")

test_encoding("Reporte_Ingresados_Pendientes SC.csv", "latin1")
test_encoding("Reporte_Ingresados_Pendientes SC.csv", "cp1252")
test_encoding("Reporte_Ingresados_Pendientes.csv", "latin1")

