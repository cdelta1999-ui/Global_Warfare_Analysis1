import sys

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Introduce API_URL variable after imports
code = code.replace(
    'const MAPBOX_TOKEN =',
    'const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.BASE_URL;\nconst EXT = import.meta.env.VITE_API_URL ? "" : ".json";\n\nconst MAPBOX_TOKEN ='
)

# Replace fetch for pipeline_status
code = code.replace(
    "fetch(import.meta.env.BASE_URL + 'api/pipeline_status.json')",
    "fetch(API_BASE + 'api/pipeline_status' + EXT)"
)

# Replace Promise.all fetches
old_fetches = """    Promise.all([
      fetch(import.meta.env.BASE_URL + 'world.geo.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/map_data.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/flow_maps.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/choke_points.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/digital_lifelines.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/strategic_resources.json').then(r => r.json()),
      fetch(import.meta.env.BASE_URL + 'api/asymmetric_vulnerabilities.json').then(r => r.json())
    ])"""

new_fetches = """    Promise.all([
      fetch(import.meta.env.BASE_URL + 'world.geo.json').then(r => r.json()),
      fetch(API_BASE + 'api/map_data' + EXT).then(r => r.json()),
      fetch(API_BASE + 'api/flow_maps' + EXT).then(r => r.json()),
      fetch(API_BASE + 'api/choke_points' + EXT).then(r => r.json()),
      fetch(API_BASE + 'api/digital_lifelines' + EXT).then(r => r.json()),
      fetch(API_BASE + 'api/strategic_resources' + EXT).then(r => r.json()),
      fetch(API_BASE + 'api/asymmetric_vulnerabilities' + EXT).then(r => r.json())
    ])"""

code = code.replace(old_fetches, new_fetches)

# Replace country specific fetches
old_country_fetches = """      fetch(`${import.meta.env.BASE_URL}api/forecast/${country}.json`)
        .then(r => r.json()).then(setForecastData).catch(console.error);
        
      fetch(`${import.meta.env.BASE_URL}api/intelligence/${country}.json`)
        .then(r => r.json()).then(setIntelligenceData).catch(console.error);"""

new_country_fetches = """      fetch(`${API_BASE}api/forecast/${country}${EXT}`)
        .then(r => r.json()).then(setForecastData).catch(console.error);
        
      fetch(`${API_BASE}api/intelligence/${country}${EXT}`)
        .then(r => r.json()).then(setIntelligenceData).catch(console.error);"""

code = code.replace(old_country_fetches, new_country_fetches)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.tsx patched successfully!")
