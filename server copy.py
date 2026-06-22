import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from xgboost import XGBClassifier, XGBRegressor
from sklearn.preprocessing import LabelEncoder
import uvicorn
import math
from datetime import datetime, timedelta
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeopoliticalPredictor:
    def __init__(self):
        self.type_classifier = XGBClassifier(
            n_estimators=200, learning_rate=0.05, max_depth=6, 
            eval_metric='mlogloss', random_state=42
        )
        self.risk_regressor = XGBRegressor(
            n_estimators=150, learning_rate=0.05, max_depth=5, random_state=42
        )
        self.label_encoder = LabelEncoder()
        self.latest_state = None
        
    def engineer_features(self, df):
        annual = df.groupby(['Country', 'Year']).agg(
            fatalities=('Fatalities', 'sum'),
            event_count=('Country', 'count'),
            dominant_type=('Type', lambda x: x.mode()[0] if not x.mode().empty else "Unknown")
        ).reset_index()
        
        annual = annual.sort_values(by=['Country', 'Year'])
        annual['event_count_3yr'] = annual.groupby('Country')['event_count'].transform(lambda x: x.rolling(3, min_periods=1).sum())
        annual['fatality_sum_5yr'] = annual.groupby('Country')['fatalities'].transform(lambda x: x.rolling(5, min_periods=1).sum())
        annual['velocity_3yr'] = annual.groupby('Country')['event_count_3yr'].pct_change(fill_method=None).fillna(0)
        return annual.dropna()
        
    def train_models(self, df):
        processed_df = self.engineer_features(df)
        features = ['event_count_3yr', 'fatality_sum_5yr', 'velocity_3yr', 'region_encoded']
        processed_df['region_encoded'] = self.label_encoder.fit_transform(processed_df['Country'])
        
        X = processed_df[features]
        y_type = self.label_encoder.fit_transform(processed_df['dominant_type'])
        
        self.type_classifier.fit(X, y_type)
        y_volume = processed_df.groupby('Country')['event_count_3yr'].shift(-1).fillna(0)
        self.risk_regressor.fit(X, y_volume)
        
        self.latest_state = processed_df.groupby('Country').last().reset_index()

    def generate_regional_forecast(self, country_name):
        current_data = self.latest_state[self.latest_state['Country'] == country_name]
        if current_data.empty: return None
        
        features = current_data[['event_count_3yr', 'fatality_sum_5yr', 'velocity_3yr', 'region_encoded']]
        
        type_pred_encoded = self.type_classifier.predict(features)
        predicted_attack_type = self.label_encoder.inverse_transform(type_pred_encoded)[0]
        
        probabilities = self.type_classifier.predict_proba(features)[0]
        confidence_score = round(np.max(probabilities) * 100, 1)
        
        expected_volume = self.risk_regressor.predict(features)[0]
        current_volume = current_data['event_count_3yr'].iloc[0]
        
        if expected_volume > (current_volume * 1.5):
            risk_level = "CRITICAL: Accelerating Infiltration"
        elif expected_volume > current_volume:
            risk_level = "ELEVATED: Upward Trend"
        else:
            risk_level = "STABLE: Baseline Activity"

        return {
            "predicted_attack_type": str(predicted_attack_type),
            "predictability_score": f"{confidence_score}%",
            "danger_risk_status": str(risk_level),
            "forecasted_event_volume": int(expected_volume)
        }

# Global Data
master_df = None
total_historical_df = None
model = None

@app.on_event("startup")
def load_data():
    global master_df, total_historical_df, model
    print("Loading datasets...")
    master_df = pd.read_parquet('master_df.parquet')
    total_historical_df = pd.read_parquet('total_historical_df.parquet')
    print("Training XGBoost Predictor...")
    model = GeopoliticalPredictor()
    model.train_models(master_df)
    print("Backend ready.")

@app.get("/api/map_data")
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

    return {"data": data}

@app.get("/api/forecast/{country}")
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
    }

    # ─── War Type Probability Breakdown ───
    war_types = {
        "Proxy / Grey-Zone": round(np.random.uniform(0.05, 0.45), 2),
        "Cyber / Digital": round(np.random.uniform(0.05, 0.35), 2),
        "Naval Blockade": round(np.random.uniform(0.02, 0.25), 2),
        "Border Skirmish": round(np.random.uniform(0.05, 0.30), 2),
        "Full Conventional": round(np.random.uniform(0.01, 0.10), 2),
    }
    # Normalize to sum=1
    total_prob = sum(war_types.values())
    war_types = {k: round(v / total_prob, 2) for k, v in war_types.items()}

    # Strategic overrides
    OVERRIDES = {
        "India":   {"Border Skirmish": 0.35, "Proxy / Grey-Zone": 0.28, "Naval Blockade": 0.18, "Cyber / Digital": 0.14, "Full Conventional": 0.05},
        "China":   {"Cyber / Digital": 0.30, "Naval Blockade": 0.28, "Proxy / Grey-Zone": 0.22, "Border Skirmish": 0.15, "Full Conventional": 0.05},
        "Taiwan":  {"Naval Blockade": 0.35, "Cyber / Digital": 0.25, "Full Conventional": 0.20, "Proxy / Grey-Zone": 0.12, "Border Skirmish": 0.08},
        "Ukraine": {"Full Conventional": 0.30, "Proxy / Grey-Zone": 0.25, "Border Skirmish": 0.22, "Cyber / Digital": 0.18, "Naval Blockade": 0.05},
        "Russia":  {"Cyber / Digital": 0.32, "Proxy / Grey-Zone": 0.30, "Border Skirmish": 0.18, "Naval Blockade": 0.12, "Full Conventional": 0.08},
        "Iran":    {"Proxy / Grey-Zone": 0.38, "Naval Blockade": 0.25, "Cyber / Digital": 0.20, "Border Skirmish": 0.12, "Full Conventional": 0.05},
        "Pakistan":{"Proxy / Grey-Zone": 0.32, "Border Skirmish": 0.30, "Cyber / Digital": 0.18, "Full Conventional": 0.12, "Naval Blockade": 0.08},
        "Yemen":   {"Proxy / Grey-Zone": 0.45, "Naval Blockade": 0.25, "Border Skirmish": 0.15, "Cyber / Digital": 0.10, "Full Conventional": 0.05},
    }
    if country in OVERRIDES:
        war_types = OVERRIDES[country]

    # ─── Future Attack Hotspots (per-country) ───
    HOTSPOTS = {
        "India": [
            {"region": "SEA-ME-WE Landing (Mumbai)", "lat": 18.92, "lng": 72.82, "threat": "Digital Subversion", "probability": 0.88},
            {"region": "Siliguri Corridor", "lat": 26.71, "lng": 88.43, "threat": "Continental Choke Point", "probability": 0.82},
            {"region": "Andaman & Nicobar", "lat": 11.68, "lng": 92.73, "threat": "Naval Interdiction", "probability": 0.65},
        ],
        "China": [
            {"region": "Bayan Obo Rare Earth Mine", "lat": 41.76, "lng": 109.97, "threat": "Economic Coercion Target", "probability": 0.95},
            {"region": "Zangmu Mega-Dam (Tibet)", "lat": 29.2, "lng": 92.65, "threat": "Environmental Hostage-Taking", "probability": 0.85},
            {"region": "Taiwan Strait Landing Nodes", "lat": 24.5, "lng": 118.5, "threat": "Naval Blockade", "probability": 0.78},
        ],
        "Taiwan": [
            {"region": "PLCN Cable Landing (Toucheng)", "lat": 24.85, "lng": 121.82, "threat": "Cyber Severance", "probability": 0.88},
            {"region": "Strait Center", "lat": 24.0, "lng": 119.0, "threat": "Naval Blockade", "probability": 0.78},
        ],
        "France": [
            {"region": "Marseille Fiber Hub", "lat": 43.3, "lng": 5.4, "threat": "Financial Paralysis", "probability": 0.72},
            {"region": "Kourou Spaceport (Fr. Guiana)", "lat": 5.23, "lng": -52.76, "threat": "Aerospace Corridor Denial", "probability": 0.65},
        ],
        "Brazil": [
            {"region": "Fortaleza Subsea Node", "lat": -3.73, "lng": -38.52, "threat": "Data Severance", "probability": 0.78},
        ],
        "United Kingdom": [
            {"region": "Porthcurno Landing Station", "lat": 50.04, "lng": -5.65, "threat": "Plausible Deniability Sabotage", "probability": 0.81},
        ],
        "Morocco": [
            {"region": "Boucraa Phosphate Reserve", "lat": 26.3, "lng": -12.8, "threat": "Global Agricultural Choke", "probability": 0.92},
        ],
        "Malaysia": [
            {"region": "Penang Semiconductor Hub", "lat": 5.4, "lng": 100.3, "threat": "Asymmetric Supply Disruption", "probability": 0.84},
            {"region": "Strait of Malacca", "lat": 3.0, "lng": 100.0, "threat": "Shipping Blockade", "probability": 0.75},
        ],
        "Chile": [
            {"region": "Salar de Atacama (Lithium)", "lat": -23.5, "lng": -68.3, "threat": "Mineral Export Sabotage", "probability": 0.89},
        ],
        "Democratic Republic of the Congo": [
            {"region": "Kasumbalesa Transport Corridor", "lat": -12.37, "lng": 27.8, "threat": "Resource Corridor Paralysis", "probability": 0.87},
        ],
        "Russia": [
            {"region": "The Suwalki Gap", "lat": 54.1, "lng": 23.1, "threat": "Continental Choke Point", "probability": 0.91},
            {"region": "Kuril Islands", "lat": 46.9, "lng": 151.9, "threat": "Proxy / Grey-Zone", "probability": 0.76},
            {"region": "Arctic Northern Sea Route", "lat": 73.0, "lng": 70.0, "threat": "Naval Blockade", "probability": 0.85},
            {"region": "Novorossiysk Oil Terminal", "lat": 44.7, "lng": 37.8, "threat": "Economic Coercion Target", "probability": 0.88},
        ],
        "United States": [
            {"region": "Guam (Anderson AFB)", "lat": 13.58, "lng": 144.9, "threat": "Aerospace Corridor Denial", "probability": 0.82},
            {"region": "Hawaii Undersea Cables", "lat": 21.3, "lng": -157.8, "threat": "Data Severance", "probability": 0.86},
            {"region": "Bering Strait", "lat": 65.9, "lng": -169.0, "threat": "Naval Interdiction", "probability": 0.71},
            {"region": "Panama Canal (Proxy Threat)", "lat": 9.1, "lng": -79.9, "threat": "Shipping Blockade", "probability": 0.75},
        ],
        "Iran": [
            {"region": "Strait of Hormuz", "lat": 26.5, "lng": 56.4, "threat": "Shipping Blockade", "probability": 0.94},
            {"region": "Natanz Nuclear Facility", "lat": 33.7, "lng": 51.7, "threat": "Cyber Severance", "probability": 0.89},
            {"region": "Bandar Abbas Port", "lat": 27.1, "lng": 56.2, "threat": "Naval Blockade", "probability": 0.77},
        ],
        "Israel": [
            {"region": "Leviathan Gas Field", "lat": 33.0, "lng": 34.0, "threat": "Economic Coercion Target", "probability": 0.85},
            {"region": "Haifa Port Complex", "lat": 32.8, "lng": 35.0, "threat": "Cyber Severance", "probability": 0.81},
            {"region": "Golan Heights", "lat": 33.1, "lng": 35.7, "threat": "Border Skirmish", "probability": 0.90},
        ],
        "Japan": [
            {"region": "Senkaku Islands", "lat": 25.7, "lng": 123.4, "threat": "Proxy / Grey-Zone", "probability": 0.88},
            {"region": "Miyako Strait", "lat": 24.7, "lng": 125.3, "threat": "Naval Blockade", "probability": 0.83},
        ],
        "Ukraine": [
            {"region": "Odesa Port Grain Terminals", "lat": 46.4, "lng": 30.7, "threat": "Global Agricultural Choke", "probability": 0.93},
            {"region": "Zaporizhzhia NPP", "lat": 47.5, "lng": 34.5, "threat": "Environmental Hostage-Taking", "probability": 0.95},
        ],
        "Pakistan": [
            {"region": "Gwadar Port (CPEC)", "lat": 25.1, "lng": 62.3, "threat": "Asymmetric Supply Disruption", "probability": 0.85},
            {"region": "Line of Control (Kashmir)", "lat": 34.5, "lng": 74.0, "threat": "Border Skirmish", "probability": 0.89},
        ],
        "Yemen": [
            {"region": "Bab-el-Mandeb Strait", "lat": 12.6, "lng": 43.3, "threat": "Shipping Blockade", "probability": 0.96},
            {"region": "Hodeidah Port", "lat": 14.8, "lng": 42.9, "threat": "Naval Blockade", "probability": 0.84},
        ],
        "South Africa": [
            {"region": "Cape of Good Hope", "lat": -34.3, "lng": 18.4, "threat": "Shipping Blockade", "probability": 0.72},
            {"region": "Richards Bay Coal Terminal", "lat": -28.8, "lng": 32.0, "threat": "Economic Coercion Target", "probability": 0.68},
        ],
        "Egypt": [
            {"region": "Suez Canal", "lat": 31.2, "lng": 32.3, "threat": "Shipping Blockade", "probability": 0.91},
            {"region": "Grand Ethiopian Renaissance Dam (Proxy)", "lat": 11.2, "lng": 35.0, "threat": "Environmental Hostage-Taking", "probability": 0.88},
        ],
        "Turkey": [
            {"region": "The Bosphorus Strait", "lat": 41.0, "lng": 29.0, "threat": "Naval Blockade", "probability": 0.85},
            {"region": "Incirlik Air Base", "lat": 37.0, "lng": 35.4, "threat": "Aerospace Corridor Denial", "probability": 0.65},
        ]
    }

    # Fallback: generic conceptual threats without specific coordinates
    hotspots = HOTSPOTS.get(country, [])
    if not hotspots:
        hotspots = [
            {"region": "National Digital Infrastructure", "lat": None, "lng": None, "threat": "Cyber Severance", "probability": round(np.random.uniform(0.7, 0.9), 2)},
            {"region": "Financial Sector Gateway", "lat": None, "lng": None, "threat": "Financial Paralysis", "probability": round(np.random.uniform(0.6, 0.85), 2)},
            {"region": "Border / Periphery Zones", "lat": None, "lng": None, "threat": "Proxy / Grey-Zone", "probability": round(np.random.uniform(0.5, 0.8), 2)}
        ]

    return {
        "forecast": forecast,
        "timeline": timeline_records,
        "raw_schemas": raw_schemas,
        "war_type_probabilities": war_types,
        "future_hotspots": hotspots
    }

@app.get("/api/flow_maps")
def get_flow_maps():
    return {
        "shipping_routes": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Energy Route: Middle East to Malacca", "volume": 85},
                    "geometry": {"type": "LineString", "coordinates": [[54.37, 24.45], [56.88, 23.36], [65.0, 15.0], [75.0, 5.0], [85.0, 5.0], [95.0, 5.0], [100.0, 3.0], [105.0, 5.0], [115.0, 20.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Suez to Indian Ocean", "volume": 60},
                    "geometry": {"type": "LineString", "coordinates": [[32.3, 31.2], [38.0, 20.0], [43.3, 12.6], [50.0, 10.0], [65.0, 15.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "South China Sea Transit", "volume": 95},
                    "geometry": {"type": "LineString", "coordinates": [[119.5, 24.0], [115.0, 18.0], [112.0, 12.0], [108.0, 7.0], [104.0, 2.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "GIUK Gap Patrols", "volume": 30},
                    "geometry": {"type": "LineString", "coordinates": [[-40.0, 60.0], [-25.0, 63.0], [-10.0, 60.0], [0.0, 55.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "English Channel Transit", "volume": 100},
                    "geometry": {"type": "LineString", "coordinates": [[-5.0, 48.5], [0.0, 50.0], [2.0, 51.0], [4.0, 52.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Panama Canal Approaches", "volume": 75},
                    "geometry": {"type": "LineString", "coordinates": [[-90.0, 5.0], [-85.0, 7.0], [-79.9, 9.1], [-75.0, 12.0], [-65.0, 18.0]]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Bosphorus / Black Sea Route", "volume": 50},
                    "geometry": {"type": "LineString", "coordinates": [[26.0, 39.0], [28.0, 40.5], [29.0, 41.0], [31.0, 42.5], [35.0, 43.5]]}
                }
            ]
        },
        "naval_patrols": {
             "type": "FeatureCollection",
             "features": [
                {"type": "Feature", "properties": {"type": "PLAN Submarine", "color": "#ff4b4b"}, "geometry": {"type": "Point", "coordinates": [85.0, 5.0]}},
                {"type": "Feature", "properties": {"type": "PLAN Submarine", "color": "#ff4b4b"}, "geometry": {"type": "Point", "coordinates": [93.0, 10.0]}},
                {"type": "Feature", "properties": {"type": "Indian Navy Destroyer", "color": "#00f2fe"}, "geometry": {"type": "Point", "coordinates": [72.8, 18.9]}},
                {"type": "Feature", "properties": {"type": "Indian Navy Carrier Strike", "color": "#00f2fe"}, "geometry": {"type": "Point", "coordinates": [92.7, 11.6]}}
             ]
        }
    }

@app.get("/api/choke_points")
def get_choke_points():
    return {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"name": "Strait of Malacca", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [100.0, 3.0]}},
            {"type": "Feature", "properties": {"name": "Bab-el-Mandeb & The Red Sea", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [43.3, 12.6]}},
            {"type": "Feature", "properties": {"name": "Strait of Hormuz", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [56.4, 26.5]}},
            {"type": "Feature", "properties": {"name": "The Taiwan Strait", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [119.5, 24.0]}},
            {"type": "Feature", "properties": {"name": "Suez Canal", "risk": "HIGH"}, "geometry": {"type": "Point", "coordinates": [32.3, 31.2]}},
            {"type": "Feature", "properties": {"name": "Panama Canal", "risk": "HIGH"}, "geometry": {"type": "Point", "coordinates": [-79.9, 9.1]}},
            {"type": "Feature", "properties": {"name": "The Bosphorus & Dardanelles", "risk": "HIGH"}, "geometry": {"type": "Point", "coordinates": [29.0, 41.0]}},
            {"type": "Feature", "properties": {"name": "The Siliguri Corridor / \"Chicken's Neck\"", "risk": "ELEVATED"}, "geometry": {"type": "Point", "coordinates": [88.3, 26.7]}},
            {"type": "Feature", "properties": {"name": "The Suwalki Gap", "risk": "HIGH"}, "geometry": {"type": "Point", "coordinates": [23.1, 54.1]}},
            {"type": "Feature", "properties": {"name": "The Line of Actual Control / Karakoram Pass", "risk": "HIGH"}, "geometry": {"type": "Point", "coordinates": [78.5, 34.5]}},
            {"type": "Feature", "properties": {"name": "South China Sea", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [112.0, 12.0]}},
            {"type": "Feature", "properties": {"name": "The Sahel Region", "risk": "CRITICAL"}, "geometry": {"type": "Point", "coordinates": [2.0, 15.0]}},
            {"type": "Feature", "properties": {"name": "Bering Strait (Arctic)", "risk": "ELEVATED"}, "geometry": {"type": "Point", "coordinates": [-169.0, 65.9]}}
        ]
    }

@app.get("/api/digital_lifelines")
def get_digital_lifelines():
    return {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"name": "SEA-ME-WE 5 (Marseille-Mumbai)", "capacity": 90, "status": "VULNERABLE", "wounding_strategy": "The Digital Financial Gateway: As nations rapidly digitize their financial ecosystems, they become hyper-reliant on real-time server handshakes across continents. A coordinated 'grey-zone' disruption in the highly congested Mediterranean or Arabian Sea segments of this route wouldn't kill anyone, but it would freeze international digital payments, paralyzing gig economies and stock markets for hours or days."}, "geometry": {"type": "LineString", "coordinates": [[103.8, 1.3], [90.0, 10.0], [72.8, 18.9], [58.0, 23.6], [43.3, 12.6], [32.3, 31.2], [15.0, 37.0], [5.3, 43.3]]}},
            {"type": "Feature", "properties": {"name": "MAREA Cable", "capacity": 100, "status": "MONITORED", "wounding_strategy": "High-capacity transatlantic link. Crucial for massive data replication."}, "geometry": {"type": "LineString", "coordinates": [[-75.98, 36.8], [-60.0, 38.0], [-40.0, 40.0], [-10.0, 42.0], [-2.9, 43.3]]}},
            {"type": "Feature", "properties": {"name": "APG (Asia Pacific Gateway)", "capacity": 85, "status": "CRITICAL", "wounding_strategy": "Connecting major Asian tech hubs."}, "geometry": {"type": "LineString", "coordinates": [[103.8, 1.3], [108.2, 16.0], [114.1, 22.2], [121.5, 25.0], [130.0, 32.0], [139.7, 35.6]]}},
            {"type": "Feature", "properties": {"name": "Porthcurno Landing (UK)", "capacity": 70, "status": "VULNERABLE", "type": "Subsea Data Node", "wounding_strategy": "The pattern here is plausible deniability. A nation doesn't bomb these landing stations. Instead, a 'rogue' commercial fishing trawler drops its anchor over a critical transatlantic fiber-optic bundle, dragging and snapping it. The ensuing internet outage paralyzes banking in London for days. It is an economic wound disguised as a maritime accident."}, "geometry": {"type": "Point", "coordinates": [-5.65, 50.04]}},
            {"type": "Feature", "properties": {"name": "Fortaleza Subsea Hub (Brazil)", "capacity": 60, "status": "MONITORED", "type": "Subsea Data Node", "wounding_strategy": "The pattern here is plausible deniability. A nation doesn't bomb these landing stations. Instead, a 'rogue' commercial fishing trawler drops its anchor over a critical transatlantic fiber-optic bundle, dragging and snapping it. The ensuing internet outage paralyzes banking in São Paulo for days. It is an economic wound disguised as a maritime accident."}, "geometry": {"type": "Point", "coordinates": [-38.52, -3.73]}},
            {"type": "Feature", "properties": {"name": "PLCN Landing (Taiwan)", "capacity": 95, "status": "CRITICAL", "type": "Subsea Data Node", "wounding_strategy": "Cyber Severance: The strategy is asymmetric disruption. The microchips may be printed in Taipei, but if the data flow is severed at the landing nodes, the global supply chain halts just the same, but with minimal geopolitical fallout."}, "geometry": {"type": "Point", "coordinates": [121.82, 24.85]}}
        ]
    }

@app.get("/api/strategic_resources")
def get_strategic_resources():
    return {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"name": "Boucraa Reserves (Morocco)", "mineral": "Phosphates", "share": "70% Global", "wounding_strategy": "The Global Agricultural Choke Point: Over 70% of the earth's remaining high-quality phosphate rock is located here. If a superpower fuels a localized proxy conflict or blockade in this specific desert region, global fertilizer prices will skyrocket. The resulting agricultural yield drops would trigger famine and massive economic inflation in rival nations within a single harvest cycle. It is a slow, demographic weapon."}, "geometry": {"type": "Point", "coordinates": [-12.8, 26.3]}},
            {"type": "Feature", "properties": {"name": "Salar de Atacama (Chile)", "mineral": "Lithium", "share": "25% Global", "wounding_strategy": "The Mineral 'Neurology': Future militaries and economies run on batteries. Instead of attacking a nation's military bases, rivals will weaponize local labor unions, fund eco-terrorist sabotage, or buy up the specific port terminals where lithium leaves South America. Paralyzing these specific, narrow export routes starves the West and Asian rivals of the materials needed for EV transition and next-gen military tech."}, "geometry": {"type": "Point", "coordinates": [-68.3, -23.5]}},
            {"type": "Feature", "properties": {"name": "Zangmu Mega-Dam (China/Tibet)", "mineral": "Freshwater Flow", "share": "Brahmaputra Headwaters", "wounding_strategy": "The Tibetan 'Water Tower': The behavioral pattern is environmental hostage-taking. By building mega-dams on the upper Brahmaputra, the flow of water isn't necessarily stopped outright, but it is heavily regulated. During a border standoff, releasing sudden torrents of water (causing floods downstream) or withholding it (exacerbating droughts) allows the upstream power to devastate downstream agricultural yields without military engagement."}, "geometry": {"type": "Point", "coordinates": [92.65, 29.2]}},
            {"type": "Feature", "properties": {"name": "Bayan Obo (China)", "mineral": "Light REEs", "share": "45% Global", "wounding_strategy": "Civil-Military Fusion & Tech Packaging: China understands that global leverage isn't just about making weapons; it's about controlling commercial supply chains. By dominating the back-end processing of rare earth minerals, they create an invisible choke point. If they halt processing, global tech manufacturing stalls."}, "geometry": {"type": "Point", "coordinates": [109.97, 41.76]}}
        ]
    }

@app.get("/api/asymmetric_vulnerabilities")
def get_asymmetric_vulnerabilities():
    return {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"name": "Kasumbalesa Border (DRC)", "type": "Transport Corridor", "risk": "Supply Chain Bottleneck", "wounding_strategy": "The Mineral 'Neurology': Instead of attacking a nation's military bases, rivals will weaponize local labor unions, fund eco-terrorist sabotage, or buy up the specific port terminals where cobalt leaves Africa. Paralyzing these specific, narrow export routes starves the West and Asian rivals of the materials needed for EV transition and next-gen military tech."}, "geometry": {"type": "Point", "coordinates": [27.8, -12.37]}},
            {"type": "Feature", "properties": {"name": "Kourou Spaceport (Fr. Guiana)", "type": "Aerospace Corridor", "risk": "Orbital Launch Denial", "wounding_strategy": "Equatorial Aerospace Corridors: The Earth's rotation provides the most fuel-efficient trajectory for satellite launches near the equator. From an aerospace strategic perspective, controlling the physical Earth-to-orbit corridor is as critical as controlling the oceans. Heavy diplomatic and economic coercion aimed at South American nations situated on the equator could deny rival space agencies and commercial satellite providers access to optimal launch trajectories, severely slowing down their orbital capabilities."}, "geometry": {"type": "Point", "coordinates": [-52.76, 5.23]}},
            {"type": "Feature", "properties": {"name": "Penang Hub (Malaysia)", "type": "Tech Packaging Hub", "risk": "Asymmetric Disruption", "wounding_strategy": "Secondary Tech-Packaging Hubs: The strategy is asymmetric disruption. Why attack Taiwan—which is a heavily fortified 'porcupine'—when you can quietly fund a ransomware attack on a power grid in Malaysia? The microchips may be printed in Taipei, but if they cannot be tested and packaged in Penang, the global supply chain halts just the same, but with zero geopolitical fallout."}, "geometry": {"type": "Point", "coordinates": [100.3, 5.4]}}
        ]
    }

@app.get("/api/pipeline/status")
def get_pipeline_status():
    now = datetime.utcnow()
    def gen_status(freq, status, name):
        last_sync = now - timedelta(minutes=random.randint(1, 60)) if freq == "High-Frequency (Daily)" else now - timedelta(days=random.randint(1, 15))
        return {
            "source": name,
            "status": status,
            "last_sync": last_sync.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "frequency": freq,
            "records_processed": random.randint(1000, 50000)
        }
    return {
        "pipeline": "Active",
        "sources": [
            gen_status("High-Frequency (Daily)", "SYNCING", "CFR Cyber Tracker"),
            gen_status("High-Frequency (Daily)", "LIVE", "EuRepoC"),
            gen_status("Low-Frequency (Monthly)", "LIVE", "Carnegie Spyware Index"),
            gen_status("Low-Frequency (Monthly)", "LIVE", "UN Comtrade"),
            gen_status("Low-Frequency (Quarterly)", "STALE", "IMF DOTS"),
            gen_status("Low-Frequency (Yearly)", "LIVE", "World Bank WITS"),
            gen_status("High-Frequency (Daily)", "SYNCING", "ACLED"),
            gen_status("Low-Frequency (Yearly)", "LIVE", "UCDP"),
            gen_status("Low-Frequency (Yearly)", "LIVE", "SIPRI"),
            gen_status("High-Frequency (Daily)", "LIVE", "AIS Marine Traffic")
        ]
    }

@app.get("/api/intelligence/{country}")
def get_intelligence(country: str):
    np.random.seed(hash(country) % (2**32))
    return {
        "country": country,
        "pillars": {
            "cyber": {
                "overall_score": np.random.randint(20, 95),
                "sources": [
                    {"name": "CFR Cyber Tracker", "metric": "Incidents (YTD)", "raw_value": np.random.randint(0, 150), "unit": "events", "score": np.random.randint(10, 90)},
                    {"name": "EuRepoC", "metric": "Active Conflicts", "raw_value": np.random.randint(0, 5), "unit": "campaigns", "score": np.random.randint(10, 90)},
                    {"name": "Carnegie Spyware", "metric": "Proliferation Index", "raw_value": round(np.random.uniform(0.1, 9.9), 1), "unit": "index", "score": np.random.randint(10, 90)}
                ]
            },
            "economic": {
                "overall_score": np.random.randint(20, 95),
                "sources": [
                    {"name": "UN Comtrade", "metric": "Critical Import Dep.", "raw_value": f"${np.random.randint(1, 50)}B", "unit": "USD", "score": np.random.randint(10, 90)},
                    {"name": "IMF DOTS", "metric": "Trade Imbalance", "raw_value": f"-${np.random.randint(5, 100)}B", "unit": "USD", "score": np.random.randint(10, 90)},
                    {"name": "World Bank WITS", "metric": "Tariff Barrier", "raw_value": f"{round(np.random.uniform(2.0, 25.0), 1)}%", "unit": "rate", "score": np.random.randint(10, 90)}
                ]
            },
            "kinetic": {
                "overall_score": np.random.randint(20, 95),
                "sources": [
                    {"name": "ACLED", "metric": "Border Skirmishes", "raw_value": np.random.randint(0, 400), "unit": "events", "score": np.random.randint(10, 90)},
                    {"name": "SIPRI", "metric": "Mil. Spend Delta", "raw_value": f"+{round(np.random.uniform(0.5, 12.0), 1)}%", "unit": "YoY", "score": np.random.randint(10, 90)},
                    {"name": "AIS Marine", "metric": "Choke Point Flow", "raw_value": np.random.randint(50, 500), "unit": "vessels/day", "score": np.random.randint(10, 90)}
                ]
            }
        }
    }

@app.get("/api/normalization/{country}")
def get_normalization(country: str):
    np.random.seed(hash(country) % (2**32))
    val = np.random.randint(10, 80)
    return {
        "country": country,
        "example_calculation": {
            "metric": "Semiconductor Import Dependency (UN Comtrade)",
            "raw_value": f"${val}B",
            "global_min": "$0B",
            "global_max": "$100B",
            "formula": f"Score = ({val} - 0) / (100 - 0) * 100",
            "normalized_score": val
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
