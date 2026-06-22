import pandas as pd
import numpy as np

def clean_country_names(df, col):
    # Basic cleaning to extract the primary country if there's a comma list
    # e.g., "Russia, Ukraine" -> "Russia" (for simple mapping to GeoJSON)
    # We'll just take the first country before the comma.
    df['Country'] = df[col].astype(str).str.split(',').str[0].str.strip()
    return df

def process_data():
    print("Starting data processing...")
    master_list = []

    # 1. inter_state_war.csv
    try:
        df_inter = pd.read_csv('inter_state_war.csv')
        df_inter = df_inter[['StartYear1', 'StateName', 'BatDeath']].copy()
        df_inter.rename(columns={'StartYear1': 'Year', 'BatDeath': 'Fatalities'}, inplace=True)
        df_inter = clean_country_names(df_inter, 'StateName')
        df_inter['Type'] = "Inter-State (Conventional)"
        master_list.append(df_inter[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading inter_state_war: {e}")

    # 2. intra_state_war.csv
    try:
        df_intra = pd.read_csv('intra_state_war.csv')
        df_intra['Fatalities'] = pd.to_numeric(df_intra['SideADeaths'], errors='coerce').fillna(0) + \
                                 pd.to_numeric(df_intra['SideBDeaths'], errors='coerce').fillna(0)
        df_intra = df_intra[['StartYear1', 'SideA', 'Fatalities']].copy()
        df_intra.rename(columns={'StartYear1': 'Year'}, inplace=True)
        df_intra = clean_country_names(df_intra, 'SideA')
        df_intra['Type'] = "Intra-State (Civil War)"
        master_list.append(df_intra[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading intra_state_war: {e}")

    # 3. extra_state_war.csv
    try:
        df_extra = pd.read_csv('extra_state_war.csv')
        df_extra['Fatalities'] = pd.to_numeric(df_extra['BatDeath'], errors='coerce').fillna(0) + \
                                 pd.to_numeric(df_extra['NonStateDeaths'], errors='coerce').fillna(0)
        df_extra = df_extra[['StartYear1', 'SideA', 'Fatalities']].copy()
        df_extra.rename(columns={'StartYear1': 'Year'}, inplace=True)
        df_extra = clean_country_names(df_extra, 'SideA')
        df_extra['Type'] = "Extra-State"
        master_list.append(df_extra[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading extra_state_war: {e}")

    # 4. non_state_war.csv
    try:
        df_non = pd.read_csv('non_state_war.csv')
        df_non = df_non[['StartYear', 'SideA1', 'TotalCombatDeaths']].copy()
        df_non.rename(columns={'StartYear': 'Year', 'TotalCombatDeaths': 'Fatalities'}, inplace=True)
        df_non = clean_country_names(df_non, 'SideA1')
        df_non['Type'] = "Non-State (Cartel/Militia)"
        master_list.append(df_non[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading non_state_war: {e}")

    # 5. onesided_violence_1989_2021.csv
    try:
        df_onesided = pd.read_csv('onesided_violence_1989_2021.csv')
        df_onesided = df_onesided[['year', 'location', 'best_fatality_estimate']].copy()
        df_onesided.rename(columns={'year': 'Year', 'best_fatality_estimate': 'Fatalities'}, inplace=True)
        df_onesided = clean_country_names(df_onesided, 'location')
        df_onesided['Type'] = "One-Sided Violence"
        master_list.append(df_onesided[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading onesided_violence: {e}")

    # 6. UcdpPrioConflict_v26_1.xlsx
    try:
        df_ucdp = pd.read_excel('UcdpPrioConflict_v26_1.xlsx')
        # Filter for relevant columns
        df_ucdp = df_ucdp[['year', 'location', 'type_of_conflict', 'intensity_level']].copy()
        df_ucdp.rename(columns={'year': 'Year'}, inplace=True)
        df_ucdp = clean_country_names(df_ucdp, 'location')
        
        # Map conflict types to strings if they are numeric
        type_mapping = {
            1: "Extrasystemic armed conflict",
            2: "Interstate armed conflict",
            3: "Internal armed conflict",
            4: "Internationalized internal armed conflict"
        }
        df_ucdp['Type'] = df_ucdp['type_of_conflict'].map(type_mapping).fillna("UCDP Conflict")
        
        # Estimate fatalities from intensity (1 = 25-999, 2 = >1000). Use rough midpoints or minimums.
        df_ucdp['Fatalities'] = df_ucdp['intensity_level'].apply(lambda x: 1000 if x == 2 else 100)
        
        master_list.append(df_ucdp[['Year', 'Country', 'Fatalities', 'Type']])
    except Exception as e:
        print(f"Error loading UcdpPrioConflict: {e}")

    print("Concatenating all datasets...")
    if master_list:
        master_df = pd.concat(master_list, ignore_index=True)
        
        master_df['Year'] = pd.to_numeric(master_df['Year'], errors='coerce')
        master_df['Fatalities'] = pd.to_numeric(master_df['Fatalities'], errors='coerce').fillna(0)
        
        # Drop invalid years
        master_df = master_df.dropna(subset=['Year'])
        master_df['Year'] = master_df['Year'].astype(int)
        
        # Standardize some common country name mismatches to fit GeoJSON (johan/world.geo.json)
        country_mapping = {
            "United States of America": "United States of America",
            "USA": "United States of America",
            "UK": "United Kingdom",
            "Democratic Republic of Congo": "Democratic Republic of the Congo",
            "DR Congo (Zaire)": "Democratic Republic of the Congo",
            "Congo": "Republic of the Congo",
            "Ivory Coast": "Ivory Coast",
            "Russia (Soviet Union)": "Russia",
            "Yemen (North Yemen)": "Yemen",
            "Vietnam (North Vietnam)": "Vietnam",
            "Serbia (Yugoslavia)": "Republic of Serbia",
            "Myanmar (Burma)": "Myanmar",
            "Cambodia (Kampuchea)": "Cambodia",
            "Macedonia": "Macedonia",
            "Bosnia-Herzegovina": "Bosnia and Herzegovina",
            "Syria": "Syrian Arab Republic"
        }
        master_df['Country'] = master_df['Country'].replace(country_mapping)
        
        master_df.to_parquet('master_df.parquet')
        print("Successfully saved to master_df.parquet")
        
        # Create total_historical_df
        total_historical_df = master_df.groupby('Country', as_index=False)['Fatalities'].sum()
        total_historical_df.to_parquet('total_historical_df.parquet')
        print("Successfully saved to total_historical_df.parquet")
        
    else:
        print("No data was loaded!")

if __name__ == "__main__":
    process_data()
