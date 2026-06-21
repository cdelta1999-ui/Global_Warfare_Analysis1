# Global Warfare Analysis & Strategic Forecasting Command

This project provides an advanced, live predictive matrix and interactive geographical dashboard for analyzing global geopolitical risks, conflict timelines, and strategic vulnerabilities.

## What Was Built

The solution spans both a dynamic machine learning pipeline and rich interactive dashboards to assess the **Wound Vulnerability Index (WVI)** and predict future asymmetrical and conventional conflicts.

### 1. Machine Learning Pipelines
- **Data Engineering:** We aggregated master geopolitical data (from sources like ACLED, UCDP, CFR Cyber Tracker) into rolling lags and predictive features (e.g., `event_count_3yr`, `fatality_sum_5yr`, `velocity_3yr`).
- **Offline Models (`train_ml_model.py`):** Random Forest Classifiers and Regressors trained to predict attack types and escalate infiltration volumes.
- **Dynamic Models (`server.py` & `app.py`):** Real-time XGBoost pipelines that train on the fly to generate regional forecasts, risk probabilities, and predictable conflict volumes based on the latest geopolitical state.

### 2. Backend API (`server.py`)
A robust FastAPI server that powers the frontend with several strategic endpoints:
- **`/api/forecast/{country}`:** Returns ML-driven predictive matrices including danger status (e.g., "CRITICAL: Accelerating Infiltration") and predicted war types (Proxy, Cyber, Naval Blockade, etc.).
- **`/api/map_data`:** Generates WVI (Wound Vulnerability Index) scores for global heatmapping.
- **`/api/flow_maps`:** Tracks major global shipping routes, choke points, and naval patrols.
- **`/api/digital_lifelines` & `/api/strategic_resources`:** Maps critical subsea data nodes, tech-packaging hubs, and mineral reserves (like phosphates and lithium).
- **`/api/asymmetric_vulnerabilities`:** Highlights new vectors of attack, such as aerospace corridors and supply chain bottlenecks.

### 3. Interactive Frontends
- **React Dashboard (`frontend/src/App.tsx`):** A premium, glassmorphic UI built with Mapbox GL and Recharts. It features toggles for infrastructure overlays, an interactive world map for country selection, an intelligence dossier sidebar, and a detailed predictive breakdown of conflict timelines and future attack regions.
- **Streamlit App (`app.py`):** An alternative, rapid-deployment dashboard visualizing the global map and forecasting data with Plotly integration.

## Real-Time Data & Dataset Metrics

The analysis leverages a continuously processing ETL pipeline drawing from multiple high-frequency intelligence sources.
- **Countries Analyzed:** 178 sovereign states and distinct territories.
- **Total Conflict Events Processed:** 4,983 multi-year historical events across all warfare types.
- **Total Historical Fatalities:** ~42.31 Million casualties spanning conventional, proxy, and civil conflicts.

## Key Findings & Strategic Analysis

The predictive analysis highlighted several key findings and "next-gen" wounding zones that extend beyond conventional military conflict:

1. **The "Cabbage Strategy" (Incremental Friction):** Nations are increasingly wrapping targets in layers of civilian proxy forces and legal ambiguity, slowly suffocating adversaries through economic coercion rather than direct military engagement.
2. **Asymmetric Supply Disruption:** Secondary tech-packaging hubs (like Penang) and transport corridors (like those in the DRC) are highly vulnerable. Sabotaging these nodes halts global supply chains with minimal geopolitical fallout compared to attacking primary fortified states.
3. **The Global Agricultural Choke Point:** Areas holding vast reserves of critical agricultural minerals (e.g., Moroccan phosphates) represent immense demographic weapons. Localized conflicts in these areas could trigger global famine and inflation.
4. **Digital Financial Gateways:** Disruption of major subsea cable routes (like the SEA-ME-WE route) represents a massive vulnerability capable of paralyzing digital economies and gig markets without a single kinetic strike.
5. **Environmental Hostage-Taking:** The control of headwaters and mega-dams (such as those in Tibet) allows powers to devastate downstream nations' agriculture via orchestrated floods or droughts.

## How to Run

1. **Start the FastAPI Backend:**
   ```bash
   python server.py
   ```
2. **Start the React Frontend:**
   Navigate to the `frontend` directory and run:
   ```bash
   npm install
   npm run dev
   ```
3. **Alternatively, run the Streamlit App:**
   ```bash
   streamlit run app.py
   ```
