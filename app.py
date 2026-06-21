import streamlit as st
import plotly.express as px
import pandas as pd
import numpy as np
import json
from xgboost import XGBClassifier, XGBRegressor
from sklearn.preprocessing import LabelEncoder

# 1. Page Configuration
st.set_page_config(page_title="World-Class Geopolitical Map", layout="wide", initial_sidebar_state="collapsed")

# 2. Premium CSS Injection
st.markdown("""
<style>
    /* Absolute Premium Dark Space Background */
    .reportview-container {
        background: radial-gradient(circle at 50% -20%, #2a2a35, #08080a 70%);
        color: #ffffff;
        font-family: 'Inter', sans-serif;
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* True Glassmorphism Styling */
    .glass-panel {
        background: rgba(15, 15, 20, 0.45);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        margin-top: 20px;
        animation: floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        opacity: 0;
        transform: translateY(20px);
    }
    
    @keyframes floatUp {
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    h1.main-title {
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 900;
        letter-spacing: -1px;
        text-align: center;
        font-size: 3rem;
        margin-bottom: 5px;
    }
    
    p.subtitle {
        text-align: center;
        color: #8892b0;
        letter-spacing: 2px;
        text-transform: uppercase;
        font-size: 0.9rem;
        margin-bottom: 40px;
    }
</style>
""", unsafe_allow_html=True)

st.markdown("<h1 class='main-title'>STRATEGIC FORECASTING COMMAND</h1>", unsafe_allow_html=True)
st.markdown("<p class='subtitle'>Live XGBoost Predictive Matrix</p>", unsafe_allow_html=True)

# 3. Machine Learning Class (As provided by User, adapted for yearly data)
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
        
    def engineer_features(self, df):
        # Group raw events by Country and Year
        annual = df.groupby(['Country', 'Year']).agg(
            fatalities=('Fatalities', 'sum'),
            event_count=('Country', 'count'),
            dominant_type=('Type', lambda x: x.mode()[0] if not x.mode().empty else "Unknown")
        ).reset_index()
        
        annual = annual.sort_values(by=['Country', 'Year'])
        
        # Rolling Lag Features (adapted to years instead of days)
        annual['event_count_3yr'] = annual.groupby('Country')['event_count'].transform(lambda x: x.rolling(3, min_periods=1).sum())
        annual['fatality_sum_5yr'] = annual.groupby('Country')['fatalities'].transform(lambda x: x.rolling(5, min_periods=1).sum())
        
        # Velocity
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
        
        # Save the latest data state to serve predictions
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
            "predicted_attack_type": predicted_attack_type,
            "predictability_score": f"{confidence_score}%",
            "danger_risk_status": risk_level,
            "forecasted_event_volume": int(expected_volume)
        }

# 4. Data Caching & Training
@st.cache_resource
def get_trained_model(df):
    model = GeopoliticalPredictor()
    model.train_models(df)
    return model

@st.cache_data
def load_data():
    master_df = pd.read_parquet('master_df.parquet')
    total_historical_df = pd.read_parquet('total_historical_df.parquet')
    with open('world.geo.json', 'r', encoding='utf-8') as f:
        world_geojson = json.load(f)
    return master_df, total_historical_df, world_geojson

master_df, total_historical_df, world_geojson = load_data()
model = get_trained_model(master_df)

# 5. UI Layout Structure
top_chart_container = st.container()
bottom_map_container = st.container()

with bottom_map_container:
    map_fig = px.choropleth_mapbox(
        total_historical_df,
        geojson=world_geojson,
        locations='Country',
        featureidkey='properties.name',
        color='Fatalities',
        mapbox_style="carto-darkmatter",
        color_continuous_scale=px.colors.sequential.Agsunset,
        zoom=1.2, center={"lat": 15, "lon": 0},
        opacity=0.7
    )
    map_fig.update_layout(
        margin={"r":0,"t":0,"l":0,"b":0},
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    map_selection = st.plotly_chart(map_fig, on_select="rerun", use_container_width=True, key="map_select")

with top_chart_container:
    if map_selection and map_selection.get("selection", {}).get("points"):
        clicked_country = map_selection["selection"]["points"][0]["location"]
        
        forecast = model.generate_regional_forecast(clicked_country)
        
        if forecast:
            st.markdown('<div class="glass-panel">', unsafe_allow_html=True)
            st.markdown(f"<h3 style='color: white;'>Target Acquired: {clicked_country}</h3>", unsafe_allow_html=True)
            
            # CSS for metrics
            st.markdown("""
            <style>
                .custom-metric { text-align: center; padding: 10px; }
                .c-label { color: #8892b0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
                .c-val { color: #ffffff; font-size: 1.5rem; font-weight: 800; margin-top: 5px; }
                .c-crit { color: #ff4b4b; }
            </style>
            """, unsafe_allow_html=True)
            
            c1, c2, c3 = st.columns(3)
            with c1:
                st.markdown(f'<div class="custom-metric"><div class="c-label">Predicted Vector</div><div class="c-val" style="color: #4facfe;">{forecast["predicted_attack_type"]}</div></div>', unsafe_allow_html=True)
            with c2:
                st.markdown(f'<div class="custom-metric"><div class="c-label">Predictability Matrix</div><div class="c-val">{forecast["predictability_score"]}</div></div>', unsafe_allow_html=True)
            with c3:
                color_class = "c-crit" if "CRITICAL" in forecast["danger_risk_status"] else ""
                st.markdown(f'<div class="custom-metric"><div class="c-label">Infiltration Risk</div><div class="c-val {color_class}">{forecast["danger_risk_status"]}</div></div>', unsafe_allow_html=True)
            
            # Draw chart
            country_timeline = master_df[master_df['Country'] == clicked_country]
            grouped = country_timeline.groupby(['Year', 'Type'], as_index=False)['Fatalities'].sum()
            trend_chart = px.line(grouped, x='Year', y='Fatalities', color='Type')
            trend_chart.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font_color='white', margin=dict(t=40, b=0, l=0, r=0))
            st.plotly_chart(trend_chart, use_container_width=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div style="text-align:center; padding: 20px; color: #8892b0;"><i>Awaiting Map Interaction...</i></div>', unsafe_allow_html=True)
