with open("Reporte_Ingresados_Pendientes SC.csv", "rb") as f:
    headers = f.readline()
    print("Header bytes:", headers)
    
    # Read first 10 lines
    for i in range(10):
        line = f.readline()
        # Find the last element (Órgano is the last column, separator is ;)
        parts = line.split(b';')
        if len(parts) > 22:
            print(f"Row {i} Organo bytes:", parts[22])
