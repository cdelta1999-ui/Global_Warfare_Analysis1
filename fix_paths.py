import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = {
    "fetch('http://localhost:8000/api/pipeline/status')": "fetch(import.meta.env.BASE_URL + 'api/pipeline_status.json')",
    "fetch('http://localhost:8000/api/map_data')": "fetch(import.meta.env.BASE_URL + 'api/map_data.json')",
    "fetch('http://localhost:8000/api/flow_maps')": "fetch(import.meta.env.BASE_URL + 'api/flow_maps.json')",
    "fetch('http://localhost:8000/api/choke_points')": "fetch(import.meta.env.BASE_URL + 'api/choke_points.json')",
    "fetch('http://localhost:8000/api/digital_lifelines')": "fetch(import.meta.env.BASE_URL + 'api/digital_lifelines.json')",
    "fetch('http://localhost:8000/api/strategic_resources')": "fetch(import.meta.env.BASE_URL + 'api/strategic_resources.json')",
    "fetch('http://localhost:8000/api/asymmetric_vulnerabilities')": "fetch(import.meta.env.BASE_URL + 'api/asymmetric_vulnerabilities.json')",
    "fetch(`/api/forecast/${country}.json`)": "fetch(`${import.meta.env.BASE_URL}api/forecast/${country}.json`)",
    "fetch(`/api/intelligence/${country}.json`)": "fetch(`${import.meta.env.BASE_URL}api/intelligence/${country}.json`)",
    "fetch(`http://localhost:8000/api/forecast/${country}`)": "fetch(`${import.meta.env.BASE_URL}api/forecast/${country}.json`)",
    "fetch(`http://localhost:8000/api/intelligence/${country}`)": "fetch(`${import.meta.env.BASE_URL}api/intelligence/${country}.json`)",
    "fetch('/world.geo.json')": "fetch(import.meta.env.BASE_URL + 'world.geo.json')"
}

for old, new in replacements.items():
    code = code.replace(old, new)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed API paths in App.tsx for gh-pages deployment.")
