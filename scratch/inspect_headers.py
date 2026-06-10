import openpyxl

wb = openpyxl.load_workbook("temp_reporte.xlsx", read_only=True)
sheet = wb["Sheet1"]
for row in sheet.iter_rows(max_row=1, values_only=True):
    headers = list(row)
    break

print("Headers:")
for i, h in enumerate(headers):
    print(f"{i}: {h}")
wb.close()
