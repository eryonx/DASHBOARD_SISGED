import pandas as pd
import time

t0 = time.time()
df = pd.read_excel('temp_reporte.xlsx', sheet_name='Sheet1', usecols=[3, 4, 9, 19, 20])
print(f"Loaded Excel in {time.time() - t0:.2f} seconds")

print("\n--- Unique Values ---")
print("Origen:", df.iloc[:, 0].unique())
print("Clasificacion:", df.iloc[:, 1].unique())
print("Tupa:", df.iloc[:, 2].unique())
print("Est. Derivado:", df.iloc[:, 3].unique())
print("Est. Cut:", df.iloc[:, 4].unique())
