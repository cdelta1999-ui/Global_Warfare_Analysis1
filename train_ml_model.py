import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

def train_models():
    print("Loading master data for ML training...")
    try:
        df = pd.read_parquet('master_df.parquet')
    except Exception as e:
        print(f"Error loading master_df: {e}")
        return

    print("Engineering ML features...")
    # Group by Country and Year to get annual summaries
    annual = df.groupby(['Country', 'Year']).agg({
        'Fatalities': 'sum'
    }).reset_index()

    # Find dominant type per year per country
    types_count = df.groupby(['Country', 'Year', 'Type']).size().reset_index(name='count')
    dominant_types = types_count.sort_values('count', ascending=False).drop_duplicates(['Country', 'Year'])
    
    annual = pd.merge(annual, dominant_types[['Country', 'Year', 'Type']], on=['Country', 'Year'], how='left')
    annual.rename(columns={'Type': 'Dominant_Type'}, inplace=True)

    # Sort to create lag features
    annual = annual.sort_values(['Country', 'Year'])

    # Create Lag features (previous year's data)
    annual['Prev_Fatalities'] = annual.groupby('Country')['Fatalities'].shift(1).fillna(0)
    annual['Prev_2_Fatalities'] = annual.groupby('Country')['Fatalities'].shift(2).fillna(0)
    annual['Prev_Dominant_Type'] = annual.groupby('Country')['Dominant_Type'].shift(1)
    annual['Prev_Dominant_Type'] = annual['Prev_Dominant_Type'].fillna('Unknown')

    # Target Variables (Next Year)
    annual['Next_Dominant_Type'] = annual.groupby('Country')['Dominant_Type'].shift(-1)
    annual['Next_Fatalities'] = annual.groupby('Country')['Fatalities'].shift(-1)

    # Drop rows where we don't have targets (the last year of each country)
    train_df = annual.dropna(subset=['Next_Dominant_Type', 'Next_Fatalities'])

    print("Encoding categorical variables...")
    le_country = LabelEncoder()
    le_type = LabelEncoder()

    # Fit encoders on all possible values
    le_country.fit(annual['Country'])
    all_types = list(set(annual['Dominant_Type'].unique()) | set(annual['Prev_Dominant_Type'].unique()) | {'Unknown'})
    le_type.fit(all_types)

    train_df['Country_Code'] = le_country.transform(train_df['Country'])
    train_df['Prev_Type_Code'] = le_type.transform(train_df['Prev_Dominant_Type'])
    train_df['Target_Type_Code'] = le_type.transform(train_df['Next_Dominant_Type'])

    # Features: Country, Year, Prev Fatalities, Prev 2 Fatalities, Prev Type
    X = train_df[['Country_Code', 'Year', 'Prev_Fatalities', 'Prev_2_Fatalities', 'Prev_Type_Code']]
    
    y_class = train_df['Target_Type_Code']
    y_reg = train_df['Next_Fatalities']

    print("Training Random Forest Classifier (Attack Type Predictor)...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    clf.fit(X, y_class)

    print("Training Random Forest Regressor (Infiltration / Escalation Predictor)...")
    reg = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    reg.fit(X, y_reg)

    print("Saving models and encoders...")
    joblib.dump(clf, 'attack_type_classifier.pkl')
    joblib.dump(reg, 'escalation_regressor.pkl')
    joblib.dump(le_country, 'le_country.pkl')
    joblib.dump(le_type, 'le_type.pkl')
    
    # Save the latest state for each country to easily predict the *actual* future in Streamlit
    latest_state = annual.groupby('Country').last().reset_index()
    latest_state.to_parquet('latest_country_state.parquet')

    print("ML Pipeline Complete!")

if __name__ == "__main__":
    train_models()
