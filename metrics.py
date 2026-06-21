import pandas as pd
df = pd.read_parquet('master_df.parquet')
print(f'Countries: {df["Country"].nunique()}')
print(f'Total Events: {len(df)}')
print(f'Total Fatalities: {df["Fatalities"].sum()}')
