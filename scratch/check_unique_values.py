import openpyxl

wb = openpyxl.load_workbook("temp_reporte.xlsx", read_only=True)
sheet = wb["Sheet1"]

orig_vals = set()
clas_vals = set()
tupa_vals = set()
est_d_vals = set()
est_c_vals = set()

row_count = 0
for row in sheet.iter_rows(min_row=2, values_only=True):
    row_count += 1
    orig_vals.add(row[3])
    clas_vals.add(row[4])
    tupa_vals.add(row[9])
    est_d_vals.add(row[19])
    est_c_vals.add(row[20])
    if row_count % 50000 == 0:
        print(f"Processed {row_count} rows...")

wb.close()

print("\n--- Unique Values ---")
print("Origen:", orig_vals)
print("Clasificacion:", clas_vals)
print("Tupa:", tupa_vals)
print("Est. Derivado:", est_d_vals)
print("Est. Cut:", est_c_vals)
