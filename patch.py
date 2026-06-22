import sys

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports
code = code.replace('import pandas as pd', 'import pandas as pd\nfrom database import SessionLocal\nimport models')

# Replace load_data
old_load_data = '''@app.on_event("startup")
def load_data():
    global master_df, total_historical_df, model
    print("Loading datasets...")
    master_df = pd.read_parquet('master_df.parquet')
    total_historical_df = pd.read_parquet('total_historical_df.parquet')
    print("Training XGBoost Predictor...")
    model = GeopoliticalPredictor()
    model.train_models(master_df)
    print("Backend ready.")'''

new_load_data = '''@app.on_event("startup")
def load_data():
    global master_df, model
    print("Loading datasets...")
    try:
        master_df = pd.read_parquet('master_df.parquet')
        print("Training XGBoost Predictor...")
        model = GeopoliticalPredictor()
        model.train_models(master_df)
    except:
        model = None
    print("Backend ready.")'''
code = code.replace(old_load_data, new_load_data)

# Replace get_map_data
old_map = '''@app.get("/api/map_data")
def get_map_data():
    # Return country fatalities for the map shading
    # Filter out NaNs if any
    clean_df = total_historical_df.dropna(subset=['Country', 'Fatalities'])
    data = clean_df.to_dict(orient='records')
    
    for row in data:
        # Seed by country name to ensure consistency
        np.random.seed(hash(row['Country']) % (2**32))
        grievance = np.random.randint(20, 80)
        scarcity = np.random.randint(10, 90)
        power_vacuum = np.random.randint(0, 50)
        interdependence = np.random.randint(30, 90)
        nuclear = 100 if row['Country'] in ['China', 'India', 'Pakistan', 'Russia', 'United States', 'France', 'United Kingdom', 'Israel'] else 0
        
        raw_wvi = (grievance + scarcity + power_vacuum) - (interdependence + nuclear)
        wvi = max(0, min(100, int((raw_wvi + 100) / 2)))
        
        # Strategic overrides
        if row['Country'] in ['China', 'India']: wvi = np.random.randint(60, 85)
        if row['Country'] in ['Taiwan', 'Yemen', 'Ukraine']: wvi = np.random.randint(85, 99)
        
        row['WVI'] = wvi

    return {"data": data}'''

new_map = '''@app.get("/api/map_data")
def get_map_data():
    db = SessionLocal()
    try:
        countries = db.query(models.CountryStat).all()
        data = []
        for c in countries:
            data.append({
                "Country": c.country_name,
                "Fatalities": c.total_fatalities,
                "WVI": c.wvi_index
            })
        return {"data": data}
    finally:
        db.close()'''
code = code.replace(old_map, new_map)

# Replace get_forecast start
old_forecast = '''@app.get("/api/forecast/{country}")
def get_forecast(country: str):
    forecast = model.generate_regional_forecast(country)
    
    country_timeline = master_df[master_df['Country'] == country]
    grouped = country_timeline.groupby(['Year', 'Type'], as_index=False)['Fatalities'].sum()
    
    timeline_pivot = grouped.pivot(index='Year', columns='Type', values='Fatalities').fillna(0).reset_index()
    timeline_records = timeline_pivot.to_dict(orient='records')
    
    np.random.seed(hash(country) % (2**32))
    
    # ─── Normalized Pillar Scores ───
    s_k = np.random.randint(10, 90)
    s_c = np.random.randint(10, 90)
    s_e = np.random.randint(10, 90)
    if country in ['India', 'Taiwan', 'Ukraine']: s_k = np.random.randint(60, 95)
    if country in ['China', 'Russia', 'United States', 'Iran']: s_c = np.random.randint(70, 99)
    if country in ['Taiwan', 'Japan', 'South Korea']: s_e = np.random.randint(70, 95)
    
    raw_schemas = {
        "kinetic": {"normalized_score": s_k, "source": "ACLED"},
        "cyber": {"normalized_score": s_c, "source": "CFR_Cyber_Tracker"},
        "economic": {"normalized_score": s_e, "source": "UN_Comtrade_IMF"}
    }'''

new_forecast = '''@app.get("/api/forecast/{country}")
def get_forecast(country: str):
    forecast = None
    if model:
        forecast = model.generate_regional_forecast(country)
        
    db = SessionLocal()
    try:
        c_stat = db.query(models.CountryStat).filter(models.CountryStat.country_name == country).first()
        events = db.query(models.ConflictEvent).filter(models.ConflictEvent.country_name == country).all()
        
        timeline_dict = {}
        for ev in events:
            if ev.year not in timeline_dict:
                timeline_dict[ev.year] = {}
            timeline_dict[ev.year][ev.conflict_type] = timeline_dict[ev.year].get(ev.conflict_type, 0) + ev.fatalities
            
        timeline_records = []
        for year, types in timeline_dict.items():
            record = {"Year": year}
            record.update(types)
            timeline_records.append(record)
            
        timeline_records.sort(key=lambda x: x["Year"])

        if c_stat:
            s_k, s_c, s_e = c_stat.kinetic_score, c_stat.cyber_score, c_stat.economic_score
        else:
            s_k, s_c, s_e = 50, 50, 50

        raw_schemas = {
            "kinetic": {"normalized_score": s_k, "source": "ACLED DB"},
            "cyber": {"normalized_score": s_c, "source": "CFR_Cyber_Tracker DB"},
            "economic": {"normalized_score": s_e, "source": "UN_Comtrade_IMF DB"}
        }
    finally:
        db.close()'''
code = code.replace(old_forecast, new_forecast)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched successfully.')
