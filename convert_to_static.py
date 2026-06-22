import os
import json
import urllib.request
import time
import subprocess

API_ENDPOINTS = [
    '/api/pipeline/status',
    '/api/map_data',
    '/api/flow_maps',
    '/api/choke_points',
    '/api/digital_lifelines',
    '/api/strategic_resources',
    '/api/asymmetric_vulnerabilities',
]

COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Angola", "Argentina", "Armenia", "Australia", "Austria",
    "Austria-Hungary", "Azerbaijan", "Baden", "Bahrain", "Bangladesh", "Bavaria", "Belgium", "Benin",
    "Bhutan", "Bolivia", "Bosnia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
    "Burkina Faso", "Burma", "Burundi", "Cambodia", "Cameroon", "Canada", "Central African Republic",
    "Chad", "Chile", "China", "China (PRC)", "Colombia", "Comoros", "Congo (Brazzaville)", "Costa Rica",
    "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechoslovakia", "Democratic Republic of the Congo",
    "Denmark", "Djibouti", "Dominican Republic", "DRC", "Ecuador", "Egypt", "El Salvador", "Eritrea",
    "Estonia", "Ethiopia", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
    "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
    "Hungary", "India", "Indonesia", "Iran", "Iraq", "Israel", "Italy", "Ivory Coast", "Japan",
    "Jordan", "Kenya", "Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
    "Liberia", "Libya", "Lithuania", "Madagascar (Malagasy)", "Malaysia", "Mali", "Mauritania",
    "Mexico", "Moldova", "Mongolia", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal",
    "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Panama", "Papua New Guinea", "Paraguay", "Persia", "Peru",
    "Philippines", "Poland", "Portugal", "Qatar", "Republic of the Congo", "Rhodesia", "Romania",
    "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Republic of Serbia", "Sierra Leone",
    "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "South Sudan",
    "South Vietnam", "South Yemen", "Spain", "Sri Lanka", "Sudan", "Suriname", "Syrian Arab Republic",
    "Taiwan", "Taiwan (ROC)", "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago",
    "Tunisia", "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
    "United States", "United States of America", "Uruguay", "USSR", "Uzbekistan", "Venezuela",
    "Vietnam", "Yemen", "Yugoslavia", "Zaire", "Zimbabwe",
]


def generate_static_files():
    # Start the server
    print("Starting python server...")
    server_process = subprocess.Popen(['python', 'server.py'])
    print("Waiting 30s for server (XGBoost training)...")
    time.sleep(30)  # Wait for server to start and train model

    base_url = 'http://localhost:8000'
    out_dir = 'frontend/public/api'
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'forecast'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'intelligence'), exist_ok=True)

    try:
        # Fetch endpoints
        for endpoint in API_ENDPOINTS:
            url = base_url + endpoint
            print(f"Fetching {url}...")
            try:
                response = urllib.request.urlopen(url)
                data = json.loads(response.read())
                
                filename = endpoint.split('/')[-1]
                if filename == 'status': filename = 'pipeline_status'
                
                filepath = os.path.join(out_dir, f"{filename}.json")
                with open(filepath, 'w') as f:
                    json.dump(data, f)
            except Exception as e:
                print(f"Failed to fetch {url}: {e}")

        # Fetch countries
        for country in COUNTRIES:
            # Forecast
            try:
                url = base_url + f"/api/forecast/{urllib.parse.quote(country)}"
                response = urllib.request.urlopen(url)
                data = json.loads(response.read())
                with open(os.path.join(out_dir, 'forecast', f"{country}.json"), 'w') as f:
                    json.dump(data, f)
            except Exception as e:
                pass
                
            # Intelligence
            try:
                url = base_url + f"/api/intelligence/{urllib.parse.quote(country)}"
                response = urllib.request.urlopen(url)
                data = json.loads(response.read())
                with open(os.path.join(out_dir, 'intelligence', f"{country}.json"), 'w') as f:
                    json.dump(data, f)
            except Exception as e:
                pass
                
    finally:
        server_process.terminate()
        server_process.wait()
        print("Server terminated.")

if __name__ == '__main__':
    generate_static_files()
