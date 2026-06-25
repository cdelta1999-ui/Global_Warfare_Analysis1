import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/mapbox';
import type { FillLayer, LineLayer, CircleLayer } from 'mapbox-gl';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as RechartsLegend,
} from 'recharts';
import { Target, Anchor, ShieldAlert, X, Crosshair, MapPin, Database, ActivitySquare, Gem, Ship, Wifi, Rocket, BookOpen, AlertTriangle, BrainCircuit, TrendingUp, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = atob("cGsuZXlKMUlqb2lhVzFsZGpFM09EZ3ZJbjAua1hYclBVMnZxbWFXWGtoMEswQWJEdw==");

const wviLayer: Omit<FillLayer, 'source'> = {
  id: 'data', type: 'fill',
  paint: {
    'fill-color': ['interpolate', ['linear'], ['get', 'WVI'],
      0, 'rgba(0,0,0,0)', 30, '#1a1a4e', 50, '#f5a623', 75, '#ff4b4b', 100, '#b90000'],
    'fill-opacity': 0.55
  }
};

const shippingRouteLayer: Omit<LineLayer, 'source'> = {
  id: 'shipping-routes', type: 'line',
  paint: { 
    'line-color': [
      'interpolate', ['linear'], ['get', 'volume'],
      0, '#60a5fa', 
      50, '#3b82f6', 
      80, '#2563eb', 
      100, '#1e3a8a' 
    ], 
    'line-width': ['interpolate', ['linear'], ['get', 'volume'], 0, 1.5, 50, 3, 100, 5], 
    'line-opacity': 0.8, 
    'line-dasharray': [2, 1] 
  }
};

const navalPatrolLayer: Omit<CircleLayer, 'source'> = {
  id: 'naval-patrols', type: 'circle',
  paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': 'rgba(255,255,255,0.6)' }
};

const chokePointLayer: Omit<CircleLayer, 'source'> = {
  id: 'choke-points', type: 'circle',
  paint: { 'circle-radius': 10, 'circle-color': '#ff4b4b', 'circle-opacity': 0.6, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,75,75,0.4)' }
};

const digitalLifelineLineLayer: Omit<LineLayer, 'source'> = {
  id: 'digital-lifelines-lines', type: 'line',
  filter: ['==', '$type', 'LineString'],
  paint: { 
    'line-color': [
      'interpolate', ['linear'], ['get', 'capacity'],
      0, '#c4b5fd', 
      50, '#8b5cf6', 
      100, '#6d28d9'
    ], 
    'line-width': ['interpolate', ['linear'], ['get', 'capacity'], 0, 2, 100, 6], 
    'line-opacity': 0.8, 
    'line-blur': 1 
  }
};

const digitalLifelinePointLayer: Omit<CircleLayer, 'source'> = {
  id: 'digital-lifelines-points', type: 'circle',
  filter: ['==', '$type', 'Point'],
  paint: { 'circle-radius': 8, 'circle-color': '#a78bfa', 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(167,139,250,0.5)' }
};

const strategicResourceLayer: Omit<CircleLayer, 'source'> = {
  id: 'strategic-resources', type: 'circle',
  paint: { 'circle-radius': 9, 'circle-color': '#34d399', 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(52,211,153,0.5)' }
};

const asymmetricLayer: Omit<CircleLayer, 'source'> = {
  id: 'asymmetric-vulnerabilities', type: 'circle',
  paint: { 'circle-radius': 9, 'circle-color': '#f5a623', 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(245,166,35,0.5)' }
};

const activeHotspotLayer: Omit<CircleLayer, 'source'> = {
  id: 'active-hotspots-layer', type: 'circle',
  paint: {
    'circle-radius': 12,
    'circle-color': '#ff4b4b',
    'circle-opacity': 0.85,
    'circle-stroke-width': 4,
    'circle-stroke-color': 'rgba(255,75,75,0.4)',
    'circle-blur': 0.2
  }
};

const WAR_COLORS: Record<string, string> = {
  'Proxy / Grey-Zone': '#a78bfa',
  'Cyber / Digital': '#00f2fe',
  'Naval Blockade': '#3b82f6',
  'Border Skirmish': '#f5a623',
  'Full Conventional': '#ff4b4b',
  'Maritime Escalation': '#3b82f6',
  'Continental Choke Point': '#f5a623',
  'Economic Coercion Target': '#34d399',
  'Digital Subversion': '#00f2fe',
  'Cyber Severance': '#00f2fe',
  'Naval Interdiction': '#3b82f6',
  'Proxy Infiltration': '#a78bfa',
  'Environmental Hostage-Taking': '#34d399',
  'Financial Paralysis': '#a78bfa',
  'Aerospace Corridor Denial': '#f5a623',
  'Data Severance': '#00f2fe',
  'Plausible Deniability Sabotage': '#a78bfa',
  'Global Agricultural Choke': '#34d399',
  'Asymmetric Supply Disruption': '#f5a623',
  'Shipping Blockade': '#ff4b4b',
  'Mineral Export Sabotage': '#34d399',
  'Resource Corridor Paralysis': '#f5a623',
};

const PILLAR_COLORS: Record<string, string> = { 'cyber': '#00f2fe', 'economic': '#f5a623', 'kinetic': '#ff4b4b' };

const CustomLegend = ({ payload }: any) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '6px 0' }}>
    {payload?.map((entry: any, i: number) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.68rem', color: 'rgba(136,146,176,0.9)' }}>{entry.value}</span>
      </div>
    ))}
  </div>
);

// SVG ring component – fills based on score (0-100)
const WVIRing = ({ score, color }: { score: number; color: string }) => {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x="50" y="50" dominantBaseline="central" textAnchor="middle"
        fill={color} fontSize="22" fontWeight="800" fontFamily="'JetBrains Mono', monospace">
        {score}
      </text>
    </svg>
  );
};

interface MapViewProps {
  worldGeoJson: any; flowMaps: any; chokePoints: any; digitalLifelines: any; strategicResources: any; asymmetricVuln: any;
  showShipping: boolean; showPatrols: boolean; showChokePoints: boolean; showDigital: boolean; showStrategic: boolean; showAsymmetric: boolean;
  activeHotspotGeoJson: any; selectedCountry: string | null;
  onHoverChange: (info: any) => void; onCountryClick: (c: string) => void; onInfraClick: (i: any) => void; onClear: () => void;
  mapRef: React.RefObject<MapRef>;
}

const MapView = memo(({ worldGeoJson, flowMaps, chokePoints, digitalLifelines, strategicResources, asymmetricVuln, showShipping, showPatrols, showChokePoints, showDigital, showStrategic, showAsymmetric, activeHotspotGeoJson, selectedCountry, onHoverChange, onCountryClick, onInfraClick, onClear, mapRef }: MapViewProps) => {
  const [cursor, setCursor] = useState('grab');

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const f = event.features?.[0];
    setCursor(f ? 'pointer' : 'grab');
    onHoverChange(f ? { feature: f, x: event.point.x, y: event.point.y } : null);
  }, [onHoverChange]);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const f = event.features?.[0];
    if (!f) { onClear(); return; }
    if (f.source === 'data' && f.properties?.name) {
      onCountryClick(f.properties.name);
    } else {
      onInfraClick({ source: f.source || 'hotspot', properties: f.properties });
    }
  }, [onCountryClick, onInfraClick, onClear]);

  return (
    <Map ref={mapRef} initialViewState={{ longitude: 30, latitude: 20, zoom: 2.2, pitch: 30 }}
      mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={['data', 'choke-points', 'naval-patrols', 'digital-lifelines-lines', 'digital-lifelines-points', 'strategic-resources', 'asymmetric-vulnerabilities', 'shipping-routes', 'active-hotspots-layer']}
      onMouseMove={handleMouseMove} onClick={handleClick} cursor={cursor}
    >
      {worldGeoJson && <Source id="data" type="geojson" data={worldGeoJson}><Layer {...wviLayer} /></Source>}
      {showShipping && flowMaps?.shipping_routes && <Source id="shipping" type="geojson" data={flowMaps.shipping_routes}><Layer {...shippingRouteLayer} /></Source>}
      {showPatrols && flowMaps?.naval_patrols && <Source id="patrols" type="geojson" data={flowMaps.naval_patrols}><Layer {...navalPatrolLayer} /></Source>}
      {showChokePoints && chokePoints && <Source id="chokepoints" type="geojson" data={chokePoints}><Layer {...chokePointLayer} /></Source>}
      {showDigital && digitalLifelines && (
        <Source id="digital" type="geojson" data={digitalLifelines}>
          <Layer {...digitalLifelineLineLayer} /><Layer {...digitalLifelinePointLayer} />
        </Source>
      )}
      {showStrategic && strategicResources && <Source id="strategic" type="geojson" data={strategicResources}><Layer {...strategicResourceLayer} /></Source>}
      {showAsymmetric && asymmetricVuln && <Source id="asymmetric" type="geojson" data={asymmetricVuln}><Layer {...asymmetricLayer} /></Source>}
      {selectedCountry && activeHotspotGeoJson && (
        <Source id="active-hotspots-source" type="geojson" data={activeHotspotGeoJson}>
          <Layer {...activeHotspotLayer} />
        </Source>
      )}
    </Map>
  );
}, (p, n) =>
  p.worldGeoJson === n.worldGeoJson && p.flowMaps === n.flowMaps && p.chokePoints === n.chokePoints &&
  p.digitalLifelines === n.digitalLifelines && p.strategicResources === n.strategicResources &&
  p.asymmetricVuln === n.asymmetricVuln && p.showShipping === n.showShipping && p.showPatrols === n.showPatrols &&
  p.showChokePoints === n.showChokePoints && p.showDigital === n.showDigital && p.showStrategic === n.showStrategic &&
  p.showAsymmetric === n.showAsymmetric && p.activeHotspotGeoJson === n.activeHotspotGeoJson &&
  p.selectedCountry === n.selectedCountry && p.onHoverChange === n.onHoverChange &&
  p.onCountryClick === n.onCountryClick && p.onInfraClick === n.onInfraClick && p.onClear === n.onClear
);

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const [worldGeoJson, setWorldGeoJson] = useState<any>(null);
  const API_BASE = import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL : import.meta.env.BASE_URL;
  const EXT = import.meta.env.VITE_BACKEND_URL ? '' : '.json';
  const [flowMaps, setFlowMaps] = useState<any>(null);
  const [chokePoints, setChokePoints] = useState<any>(null);
  const [digitalLifelines, setDigitalLifelines] = useState<any>(null);
  const [strategicResources, setStrategicResources] = useState<any>(null);
  const [asymmetricVuln, setAsymmetricVuln] = useState<any>(null);
  
  // Toggles
  const [showShipping, setShowShipping] = useState(true);
  const [showPatrols, setShowPatrols] = useState(false);
  const [showChokePoints, setShowChokePoints] = useState(true);
  const [showDigital, setShowDigital] = useState(true);
  const [showStrategic, setShowStrategic] = useState(true);
  const [showAsymmetric, setShowAsymmetric] = useState(true);

  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedInfra, setSelectedInfra] = useState<any>(null);
  const [showDoctrine, setShowDoctrine] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  
  const [forecastData, setForecastData] = useState<any>(null);
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'hotspots'>('timeline');
  const [displayTimeline, setDisplayTimeline] = useState<any[]>([]);
  const [showWarPrediction, setShowWarPrediction] = useState(false);
  const [warPredictionData, setWarPredictionData] = useState<any>(null);
  const [expandedRegion, setExpandedRegion] = useState<number | null>(null);

  // Lazy-load timeline: show last 10 years first, then full history
  useEffect(() => {
    if (!forecastData?.timeline?.length) { setDisplayTimeline([]); return; }
    setDisplayTimeline(forecastData.timeline.slice(-10));
    const t = setTimeout(() => setDisplayTimeline(forecastData.timeline), 300);
    return () => clearTimeout(t);
  }, [forecastData]);

  const fetchPipelineStatus = () => {
    const url = import.meta.env.VITE_BACKEND_URL
      ? API_BASE + 'api/pipeline/status'
      : API_BASE + 'api/pipeline_status.json';
    fetch(url).then(r => r.json()).then(setPipelineStatus).catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      fetch(import.meta.env.BASE_URL + 'world.geo.json').then(r => r.json()),
      fetch(API_BASE + `api/map_data${EXT}`).then(r => r.json()),
      fetch(API_BASE + `api/flow_maps${EXT}`).then(r => r.json()),
      fetch(API_BASE + `api/choke_points${EXT}`).then(r => r.json()),
      fetch(API_BASE + `api/digital_lifelines${EXT}`).then(r => r.json()),
      fetch(API_BASE + `api/strategic_resources${EXT}`).then(r => r.json()),
      fetch(API_BASE + `api/asymmetric_vulnerabilities${EXT}`).then(r => r.json())
    ]).then(([geoData, backendData, flowData, chokeData, digitalData, strategicData, asymmetricData]) => {
      const wviMap: Record<string, number> = {};
      backendData.data.forEach((d: any) => { wviMap[d.Country] = d.WVI; });
      const features = geoData.features.map((f: any) => ({
        ...f, properties: { ...f.properties, WVI: wviMap[f.properties.name] || 0 }
      }));
      setWorldGeoJson({ ...geoData, features });
      setFlowMaps(flowData);
      setChokePoints(chokeData);
      setDigitalLifelines(digitalData);
      setStrategicResources(strategicData);
      setAsymmetricVuln(asymmetricData);
    });

    fetchPipelineStatus();
    const interval = setInterval(fetchPipelineStatus, 30000);

    fetch(API_BASE + `api/war_prediction${EXT}`).then(r => r.json()).then(setWarPredictionData).catch(console.error);

    return () => clearInterval(interval);
  }, []);

  const onHoverChange = useCallback((info: any) => setHoverInfo(info), []);

  const onCountryClick = useCallback((country: string) => {
    setSelectedCountry(country);
    setSelectedInfra(null);
    setActiveTab('timeline');
    fetch(`${API_BASE}api/forecast/${encodeURIComponent(country)}${EXT}`)
      .then(r => r.json()).then(setForecastData).catch(console.error);
    fetch(`${API_BASE}api/intelligence/${encodeURIComponent(country)}${EXT}`)
      .then(r => r.json()).then(setIntelligenceData).catch(console.error);
  }, [API_BASE, EXT]);

  const onInfraClick = useCallback((infra: any) => {
    setSelectedInfra(infra);
    setSelectedCountry(null);
  }, []);

  const onClear = useCallback(() => {
    setSelectedCountry(null);
    setSelectedInfra(null);
  }, []);

  const handleHotspotClick = (lng: number | null, lat: number | null) => {
    if (lng != null && lat != null) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 5, duration: 1500 });
    }
  };

  const reactiveWVI = useMemo(() => {
    if (!intelligenceData) return 0;
    if (intelligenceData.computed_wvi != null) return intelligenceData.computed_wvi;
    if (!intelligenceData.pillars) return 0;
    const { cyber, economic, kinetic, fragmentation } = intelligenceData.pillars;
    const C = cyber?.overall_score ?? 0;
    const E = economic?.overall_score ?? 0;
    const K = kinetic?.overall_score ?? 0;
    const F = fragmentation?.score ?? 0;
    return Math.min(100, Math.round(0.25 * C + 0.30 * E + 0.30 * K + 0.15 * F));
  }, [intelligenceData]);

  const warTypeBarData = useMemo(() => {
    if (!forecastData?.war_type_probabilities) return [];
    return Object.entries(forecastData.war_type_probabilities).map(([name, prob]) => ({
      name, probability: Math.round((prob as number) * 100), color: WAR_COLORS[name] || '#8892b0'
    })).sort((a, b) => b.probability - a.probability);
  }, [forecastData]);

  const activeHotspotGeoJson = useMemo(() => {
    if (!forecastData?.future_hotspots) return null;
    const features = forecastData.future_hotspots
      .filter((h: any) => h.lng != null && h.lat != null)
      .map((h: any) => ({
        type: 'Feature',
        properties: { ...h, name: h.region },
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] }
      }));
    if (features.length === 0) return null;
    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [forecastData]);

  const wviColor = reactiveWVI > 75 ? '#ff4b4b' : reactiveWVI > 50 ? '#f5a623' : '#34d399';

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ─── Map (memoized – only re-renders on map-relevant state changes) ─── */}
      <MapView
        mapRef={mapRef}
        worldGeoJson={worldGeoJson} flowMaps={flowMaps} chokePoints={chokePoints}
        digitalLifelines={digitalLifelines} strategicResources={strategicResources} asymmetricVuln={asymmetricVuln}
        showShipping={showShipping} showPatrols={showPatrols} showChokePoints={showChokePoints}
        showDigital={showDigital} showStrategic={showStrategic} showAsymmetric={showAsymmetric}
        activeHotspotGeoJson={activeHotspotGeoJson} selectedCountry={selectedCountry}
        onHoverChange={onHoverChange} onCountryClick={onCountryClick} onInfraClick={onInfraClick} onClear={onClear}
      />

      {/* ─── Title ─── */}
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none', textAlign: 'center' }}>
        <h1 className="glow-text" style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-0.03em' }}>BLEED, DON'T BREAK</h1>
        <p className="label-text" style={{ marginTop: 6, letterSpacing: '0.2em' }}>PARALYSIS OVER POWER · WOUND VULNERABILITY INDEX</p>
      </div>

      {/* ─── Strategic Doctrine Button ─── */}
      <button className="strategic-doctrine-btn" onClick={() => setShowDoctrine(true)}>
        <BookOpen size={16} /> Strategic Doctrine
      </button>

      {/* ─── War Prediction Button ─── */}
      <button className="strategic-doctrine-btn" onClick={() => setShowWarPrediction(true)}
        style={{ top: 72, borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa', boxShadow: '0 4px 20px rgba(167,139,250,0.15)' }}>
        <BrainCircuit size={16} /> War Prediction AI
      </button>

      {/* ─── Live Database Toggle ─── */}
      <button className="live-database-btn" onClick={() => setShowPipeline(!showPipeline)}>
        <div className="live-dot" /> LIVE DATABASE
      </button>

      {/* ─── Strategic Doctrine Modal ─── */}
      {showDoctrine && (
        <>
          <div className="doctrine-backdrop" onClick={() => setShowDoctrine(false)} />
          <div className="glass-panel doctrine-modal fade-in">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-cyan)' }} className="glow-text">The Behavioral Blueprint</h2>
              <button onClick={() => setShowDoctrine(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
              <h3 style={{ marginTop: 0, color: 'var(--accent-amber)' }}>The "Cabbage Strategy" (Incremental Friction)</h3>
              <p>In the South China Sea, China doesn't send aircraft carriers to seize an island. They send civilian fishing militias, followed by coast guard vessels, followed by naval ships over the horizon. They wrap the target in layers—like a cabbage—slowly suffocating the adversary through legal ambiguity and civilian proxy forces.</p>
              
              <h3 style={{ color: 'var(--accent-green)' }}>Civil-Military Fusion & Tech Packaging</h3>
              <p>China understands that global leverage isn't just about making weapons; it's about controlling commercial supply chains. By dominating the back-end processing of rare earth minerals (even those mined in the US or Africa), they create an invisible choke point. If they halt processing, global tech manufacturing stalls.</p>
              
              <h3 style={{ color: '#a78bfa' }}>The Demographic Sociological Shift</h3>
              <p>Looking through a sociological lens at demographic patterns explains why nations choose these tactics. Superpowers with rapidly aging populations (like China and Russia) have inverted demographic pyramids. They cannot sustain massive infantry casualties without triggering domestic collapse. Therefore, their strategic behavior naturally shifts toward drone swarms, cyber warfare, and economic coercion—tactics that inflict high damage with low human cost.</p>

              <h2 style={{ color: 'var(--accent-cyan)', marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Deep Dive: Expanding the Current Black Swans</h2>
              <p>Applying this behavioral lens to the regions you've already identified reveals exactly how they will be weaponized:</p>

              <h3 style={{ color: 'var(--accent-amber)' }}>Subsea Data Nodes (Cornwall & Fortaleza)</h3>
              <p>The pattern here is plausible deniability. A nation doesn't bomb these landing stations. Instead, a "rogue" commercial fishing trawler drops its anchor over a critical transatlantic fiber-optic bundle, dragging and snapping it. The ensuing internet outage paralyzes banking in London or São Paulo for days. It is an economic wound disguised as a maritime accident.</p>

              <h3 style={{ color: 'var(--accent-green)' }}>The Tibetan "Water Tower"</h3>
              <p>The behavioral pattern is environmental hostage-taking. By building mega-dams on the upper Brahmaputra, the flow of water isn't necessarily stopped outright, but it is heavily regulated. During a border standoff, releasing sudden torrents of water (causing floods downstream) or withholding it (exacerbating droughts) allows the upstream power to devastate downstream agricultural yields without military engagement.</p>

              <h3 style={{ color: '#a78bfa' }}>Secondary Tech-Packaging Hubs (Penang)</h3>
              <p>The strategy is asymmetric disruption. Why attack Taiwan—which is a heavily fortified "porcupine"—when you can quietly fund a ransomware attack on a power grid in Malaysia? The microchips may be printed in Taipei, but if they cannot be tested and packaged in Penang, the global supply chain halts just the same, but with zero geopolitical fallout.</p>

              <h2 style={{ color: 'var(--accent-cyan)', marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Predicting New Black Swan Targets (Next-Gen Wounding Zones)</h2>
              <p>Based on the behavioral patterns of resource monopolization and demographic-driven asymmetric warfare, here are four new, highly unconventional regions your predictive model should map:</p>

              <h3 style={{ color: 'var(--accent-amber)' }}>A. The Global Agricultural Choke Point: Western Sahara & Morocco</h3>
              <p><strong>The Target:</strong> The world's phosphate reserves. Over 70% of the earth's remaining high-quality phosphate rock (the non-renewable foundation of all global synthetic fertilizers) is located here.</p>
              <p><strong>The Wounding Strategy:</strong> If a superpower fuels a localized proxy conflict or blockade in this specific desert region, global fertilizer prices will skyrocket. The resulting agricultural yield drops would trigger famine and massive economic inflation in rival nations within a single harvest cycle. It is a slow, demographic weapon.</p>

              <h3 style={{ color: 'var(--accent-green)' }}>B. The Mineral "Neurology": The Lithium Triangle & DRC Transport Corridors</h3>
              <p><strong>The Target:</strong> The Atacama Desert (Chile/Bolivia/Argentina) and the transport roads out of the Democratic Republic of Congo (DRC).</p>
              <p><strong>The Wounding Strategy:</strong> Future militaries and economies run on batteries. Instead of attacking a nation's military bases, rivals will weaponize local labor unions, fund eco-terrorist sabotage, or buy up the specific port terminals where lithium and cobalt leave South America and Africa. Paralyzing these specific, narrow export routes starves the West and Asian rivals of the materials needed for EV transition and next-gen military tech.</p>

              <h3 style={{ color: '#a78bfa' }}>C. Equatorial Aerospace Corridors: French Guiana & Northern Brazil</h3>
              <p><strong>The Target:</strong> The world's premier space launch real estate. The Earth's rotation provides the most fuel-efficient trajectory for satellite launches near the equator.</p>
              <p><strong>The Wounding Strategy:</strong> From an aerospace strategic perspective, controlling the physical Earth-to-orbit corridor is as critical as controlling the oceans. Heavy diplomatic and economic coercion aimed at South American and African nations situated on the equator could deny rival space agencies and commercial satellite providers (like SpaceX or defense contractors) access to optimal launch trajectories, severely slowing down their orbital capabilities.</p>

              <h3 style={{ color: '#ff4b4b' }}>D. The Digital Financial Gateway: The Marseille-Mumbai Fiber Route</h3>
              <p><strong>The Target:</strong> The specific maritime route carrying the SEA-ME-WE (South East Asia–Middle East–Western Europe) subsea cable network.</p>
              <p><strong>The Wounding Strategy:</strong> As nations rapidly digitize their financial ecosystems (like India's UPI or digital sovereign currencies), they become hyper-reliant on real-time server handshakes across continents. A coordinated "grey-zone" disruption in the highly congested Mediterranean or Arabian Sea segments of this route wouldn't kill anyone, but it would freeze international digital payments, paralyzing gig economies and stock markets for hours or days.</p>
            </div>
          </div>
        </>
      )}

      {/* ─── War Prediction AI Modal ─── */}
      {showWarPrediction && warPredictionData && (
        <>
          <div className="doctrine-backdrop" onClick={() => setShowWarPrediction(false)} />
          <div className="glass-panel doctrine-modal fade-in" style={{ width: '88vw', maxWidth: 1100, height: '85vh' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BrainCircuit size={20} style={{ color: '#a78bfa' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#a78bfa' }} className="glow-text">War Prediction AI · HVEN-R Model v2.1</h2>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                  Historical · Volatility · Escalation · Neighbor · Resource — Multi-dimensional Conflict Forecast
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Global Risk Index */}
                <div style={{ textAlign: 'center', background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)', borderRadius: 10, padding: '8px 16px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ff4b4b', fontFamily: "'JetBrains Mono', monospace" }}>{warPredictionData.global_war_risk_index}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,75,75,0.7)', letterSpacing: '0.1em', marginTop: 2 }}>GLOBAL RISK INDEX</div>
                  <div style={{ fontSize: '0.62rem', color: '#f5a623', marginTop: 2, fontWeight: 700 }}>{warPredictionData.trajectory}</div>
                </div>
                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#ff4b4b', fontWeight: 700 }}>{warPredictionData.active_wars}</span> active wars
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#f5a623', fontWeight: 700 }}>{warPredictionData.countries_in_conflict}</span> countries in conflict
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>{warPredictionData.displaced_persons_millions}M</span> displaced
                  </div>
                </div>
                <button onClick={() => setShowWarPrediction(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left: Ranked regions */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 4 }}>TOP FUTURE WAR-PRONE REGIONS</div>
                {warPredictionData.top_regions.map((region: any, idx: number) => {
                  const scoreColor = region.prediction_score >= 85 ? '#ff4b4b' : region.prediction_score >= 75 ? '#f5a623' : '#00f2fe';
                  const isExpanded = expandedRegion === idx;
                  return (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isExpanded ? scoreColor + '40' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
                      {/* Region header */}
                      <div style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                        onClick={() => setExpandedRegion(isExpanded ? null : idx)}>
                        {/* Rank */}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${scoreColor}20`, border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: scoreColor }}>{region.rank}</span>
                        </div>
                        {/* Name + trajectory */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{region.region}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>{region.timeframe}</div>
                        </div>
                        {/* Score + badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: scoreColor, background: `${scoreColor}15`, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em' }}>{region.trajectory}</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: scoreColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{region.prediction_score}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>RISK</div>
                          </div>
                          {/* HVEN mini bars */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {Object.entries(region.hven_scores).map(([k, v]: any) => (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.52rem', color: 'var(--text-dim)', width: 12 }}>{k}</span>
                                <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                  <div style={{ height: '100%', width: `${v}%`, background: scoreColor, borderRadius: 2, opacity: 0.7 }} />
                                </div>
                                <span style={{ fontSize: '0.52rem', color: 'var(--text-dim)', width: 18 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          {/* Key countries */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                            {region.key_countries.map((c: string, i: number) => (
                              <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', color: 'var(--text-secondary)' }}>{c}</span>
                            ))}
                          </div>

                          {/* Conflict type distribution */}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>PREDICTED CONFLICT TYPE DISTRIBUTION</div>
                            {Object.entries(region.conflict_type_distribution).map(([type, prob]: any) => (
                              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', width: 150, flexShrink: 0 }}>{type}</span>
                                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                  <div style={{ height: '100%', width: `${prob * 100}%`, background: WAR_COLORS[type] || scoreColor, borderRadius: 2, opacity: 0.8 }} />
                                </div>
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', width: 32, textAlign: 'right' }}>{Math.round(prob * 100)}%</span>
                              </div>
                            ))}
                          </div>

                          {/* Behavioral patterns */}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>BEHAVIORAL PATTERN ANALYSIS</div>
                            {region.behavioral_patterns.map((bp: any, i: number) => {
                              const intColor = bp.intensity === 'CRITICAL' ? '#ff4b4b' : bp.intensity === 'HIGH' ? '#f5a623' : '#34d399';
                              return (
                                <div key={i} style={{ background: `${intColor}08`, border: `1px solid ${intColor}20`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: intColor }}>{bp.pattern}</span>
                                    <span style={{ fontSize: '0.58rem', color: intColor, background: `${intColor}20`, padding: '1px 6px', borderRadius: 3, letterSpacing: '0.08em' }}>{bp.intensity}</span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{bp.description}</p>
                                  {bp.historical_precedent && (
                                    <div style={{ marginTop: 6, fontSize: '0.62rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                      Precedent: {bp.historical_precedent}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* LLM Reasoning */}
                          <div style={{ marginTop: 12, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <BrainCircuit size={13} style={{ color: '#a78bfa' }} />
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em' }}>AI REASONING CHAIN</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{region.reasoning}</p>
                          </div>

                          {/* Trigger factors */}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>CRITICAL TRIGGER FACTORS</div>
                            {region.trigger_factors.map((tf: string, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff4b4b', flexShrink: 0, marginTop: 5 }} />
                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,120,120,0.85)' }}>{tf}</span>
                              </div>
                            ))}
                          </div>

                          {/* Escalation pathway */}
                          <div style={{ marginTop: 10, background: 'rgba(255,75,75,0.05)', border: '1px solid rgba(255,75,75,0.15)', borderRadius: 6, padding: '8px 12px' }}>
                            <span style={{ fontSize: '0.62rem', color: '#ff4b4b', fontWeight: 700, letterSpacing: '0.08em' }}>ESCALATION PATHWAY: </span>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>{region.escalation_pathway}</span>
                          </div>

                          {/* Indicators to watch */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 5 }}>INDICATORS TO MONITOR</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {region.indicators_to_watch.map((ind: string, i: number) => (
                                <span key={i} style={{ fontSize: '0.62rem', background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.15)', borderRadius: 4, padding: '2px 8px', color: 'rgba(0,242,254,0.8)' }}>{ind}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Emerging Flashpoints */}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginTop: 8, marginBottom: 4 }}>EMERGING FLASHPOINTS (WATCH LIST)</div>
                {warPredictionData.emerging_flashpoints.map((fp: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f5a623', fontFamily: "'JetBrains Mono', monospace" }}>{fp.risk_score}</div>
                      <div style={{ fontSize: '0.52rem', color: 'rgba(245,166,35,0.6)', letterSpacing: '0.1em' }}>RISK</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f5a623' }}>{fp.flashpoint}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2, marginBottom: 6 }}>{fp.timeframe}</div>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{fp.driver}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Behavioral Archetypes + Methodology */}
              <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '16px 16px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 10 }}>BEHAVIORAL ARCHETYPES</div>
                {warPredictionData.behavioral_archetypes.map((arch: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa' }}>{arch.archetype}</span>
                      <span style={{ fontSize: '0.6rem', color: '#f5a623', fontWeight: 700 }}>×{arch.probability_amplifier}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.67rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{arch.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {arch.affected_regions.map((r: string, j: number) => (
                        <span key={j} style={{ fontSize: '0.58rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 3, padding: '1px 6px', color: 'rgba(167,139,250,0.8)' }}>{r}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Global trajectory */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 10 }}>GLOBAL RISK TRAJECTORY (5-YEAR)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                    {Object.entries(warPredictionData.global_risk_trajectory).map(([yr, val]: any) => {
                      const barH = (val / 100) * 72;
                      const barColor = val >= 75 ? '#ff4b4b' : val >= 65 ? '#f5a623' : '#34d399';
                      return (
                        <div key={yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: '0.58rem', color: barColor, fontWeight: 700 }}>{val}</span>
                          <div style={{ width: '100%', background: `${barColor}20`, borderRadius: 3 }}>
                            <div style={{ height: barH, background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>{yr}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Methodology */}
                <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 8 }}>METHODOLOGY</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#a78bfa', marginBottom: 8 }}>{warPredictionData.methodology.formula}</div>
                  {Object.entries(warPredictionData.methodology.components).map(([k, v]: any) => (
                    <div key={k} style={{ marginBottom: 5 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f5a623', fontFamily: "'JetBrains Mono', monospace" }}>{k}: </span>
                      <span style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.55)' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, fontSize: '0.6rem', color: 'var(--text-dim)', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                    Sources: {warPredictionData.sources.join(' · ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Pipeline Sidebar (Only if nothing selected) ─── */}
      {showPipeline && pipelineStatus && (
        <div className="glass-panel pipeline-sidebar slide-in-left" style={{ top: 80 }}>
          <div style={{ padding: '16px 16px 8px 16px' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-cyan)' }}>
              <Database size={16} /> Data Pipeline
            </h2>
            <p className="label-text" style={{ marginTop: 4, marginBottom: 0 }}>ETL Master Sync Status</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipelineStatus.sources.map((src: any, i: number) => {
              const sType = src.status.toLowerCase();
              const badgeColor = sType === 'live' ? '#34d399' : sType === 'syncing' ? '#00f2fe' : '#f5a623';
              return (
                <div key={i} className="pipeline-card">
                  <div className="pipeline-header">
                    <span className="pipeline-name">{src.source}</span>
                    <div className={`pipeline-status ${sType}`}>
                      <div className={`status-dot ${sType}`} style={{ backgroundColor: sType === 'syncing' ? undefined : badgeColor }} />
                      {src.status}
                    </div>
                  </div>
                  <div className="pipeline-meta">
                    <span>{src.frequency.split(' ')[0]}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{src.records_processed.toLocaleString()} recs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Intelligence Dossier (Infrastructure Selected) ─── */}
      {selectedInfra && (
        <div className="glass-panel dossier-panel slide-in-left" style={{ top: 80 }}>
          <div className="dossier-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="dossier-type">
                  {selectedInfra.source === 'digital' && <><Wifi size={12} style={{ display: 'inline', marginRight: 4 }} /> Digital Lifeline</>}
                  {selectedInfra.source === 'strategic' && <><Gem size={12} style={{ display: 'inline', marginRight: 4 }} /> Strategic Resource</>}
                  {selectedInfra.source === 'asymmetric' && <><Rocket size={12} style={{ display: 'inline', marginRight: 4 }} /> Asymmetric Vuln</>}
                  {selectedInfra.source === 'chokepoints' && <><ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} /> Choke Point</>}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedInfra.properties.name}</h2>
              </div>
              <button onClick={() => setSelectedInfra(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
          </div>
          <div className="dossier-body">
            {selectedInfra.properties.wounding_strategy ? (
              <>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> Wounding Strategy
                </h4>
                <p>{selectedInfra.properties.wounding_strategy}</p>
              </>
            ) : (
              <p>Detailed strategic intelligence is currently classified or syncing.</p>
            )}

            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Node Metadata</h4>
              <ul style={{ paddingLeft: 16, margin: 0, color: 'var(--text-dim)' }}>
                {Object.entries(selectedInfra.properties).map(([k, v]) => {
                  if (k === 'name' || k === 'wounding_strategy') return null;
                  return <li key={k} style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k}:</strong> {v as any}</li>;
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── Map Toggles ─── */}
      <div className="glass-panel" style={{ position: 'absolute', top: 24, right: 24, padding: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8, width: 230 }}>
        <div className="label-text" style={{ marginBottom: 4, color: 'var(--text-primary)' }}>Infrastructure Overlays</div>
        
        <button className={`control-btn ${showDigital ? 'active' : ''}`} onClick={() => setShowDigital(!showDigital)}>
          <Wifi size={14} style={{ color: '#a78bfa' }} /> Digital Lifelines
        </button>
        <button className={`control-btn ${showStrategic ? 'active' : ''}`} onClick={() => setShowStrategic(!showStrategic)}>
          <Gem size={14} style={{ color: '#34d399' }} /> Strategic Resources
        </button>
        <button className={`control-btn ${showAsymmetric ? 'active' : ''}`} onClick={() => setShowAsymmetric(!showAsymmetric)}>
          <Rocket size={14} style={{ color: '#f5a623' }} /> Asymmetric Vulns
        </button>
        <button className={`control-btn ${showShipping ? 'active' : ''}`} onClick={() => setShowShipping(!showShipping)}>
          <Anchor size={14} style={{ color: '#00f2fe' }} /> Maritime Routes
        </button>
        <button className={`control-btn ${showPatrols ? 'active' : ''}`} onClick={() => setShowPatrols(!showPatrols)}>
          <Ship size={14} style={{ color: '#00f2fe' }} /> Naval Patrols
        </button>
        <button className={`control-btn ${showChokePoints ? 'active' : ''}`} onClick={() => setShowChokePoints(!showChokePoints)}>
          <ShieldAlert size={14} style={{ color: '#ff4b4b' }} /> Choke Points
        </button>
      </div>

      {/* ─── Legend ─── */}
      {!selectedCountry && (
        <div className="glass-panel slide-in-bottom" style={{ position: 'absolute', bottom: 24, right: 24, padding: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
           <div className="label-text" style={{ color: 'var(--text-primary)' }}>Map Legend</div>
           
           <div className="legend-item"><div className="legend-dot" style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }}></div> Digital Lifelines</div>
           <div className="legend-item"><div className="legend-dot" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }}></div> Strategic Resources</div>
           <div className="legend-item"><div className="legend-dot" style={{ background: '#f5a623', boxShadow: '0 0 8px #f5a623' }}></div> Asymmetric Vulns</div>
           <div className="legend-item"><div className="legend-dot" style={{ background: '#ff4b4b', boxShadow: '0 0 8px #ff4b4b' }}></div> Choke Points</div>
           <div className="legend-item"><div className="legend-dot" style={{ background: '#00f2fe' }}></div> Maritime Routes</div>
           
           <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>
           <div className="label-text">WVI Heatmap Scale</div>
           <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
             <div style={{ flex: 1, background: '#1a1a4e' }}></div>
             <div style={{ flex: 1, background: '#f5a623' }}></div>
             <div style={{ flex: 1, background: '#ff4b4b' }}></div>
             <div style={{ flex: 1, background: '#b90000' }}></div>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
             <span>0</span><span>100</span>
           </div>
        </div>
      )}

      {/* ─── Hover Tooltip ─── */}
      {hoverInfo && (
        <div style={{
          position: 'absolute', left: hoverInfo.x + 14, top: hoverInfo.y - 10,
          background: 'rgba(12,14,22,0.92)', backdropFilter: 'blur(16px)',
          padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
          pointerEvents: 'none', color: 'white', zIndex: 30, maxWidth: 220
        }}>
          {hoverInfo.feature.source === 'data' && (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#ff4b4b', fontSize: '0.85rem', marginTop: 3 }}>WVI {hoverInfo.feature.properties.WVI}</div>
            </>
          )}
          {hoverInfo.feature.source === 'chokepoints' && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><ShieldAlert size={13} style={{ color: '#ff4b4b' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#ff4b4b', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.risk}</div>
            </>
          )}
          {hoverInfo.feature.source === 'shipping' && (
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Anchor size={13} style={{ color: '#00f2fe' }} /> {hoverInfo.feature.properties.name}</div>
          )}
          {hoverInfo.feature.source === 'digital' && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Wifi size={13} style={{ color: '#a78bfa' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#a78bfa', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.type || 'Fiber Route'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for Dossier</div>
            </>
          )}
          {hoverInfo.feature.source === 'strategic' && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Gem size={13} style={{ color: '#34d399' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#34d399', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.mineral}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for Dossier</div>
            </>
          )}
          {hoverInfo.feature.source === 'asymmetric' && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Rocket size={13} style={{ color: '#f5a623' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#f5a623', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.type}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for Dossier</div>
            </>
          )}
          {(hoverInfo.feature.source === 'active-hotspots-source' || hoverInfo.feature.layer?.id === 'active-hotspots-layer') && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Target size={13} style={{ color: '#ff4b4b' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#ff4b4b', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.threat}</div>
            </>
          )}
        </div>
      )}

      {/* ─── Country Dashboard ─── */}
      {selectedCountry && forecastData && intelligenceData && (
        <div className="glass-panel slide-in-bottom" style={{ position: 'absolute', bottom: 20, left: '2%', right: '2%', display: 'flex', gap: 0, height: '45vh', zIndex: 20, overflow: 'hidden' }}>
          {/* Col 1 – WVI + Fragmentation */}
          <div style={{ flex: '0 0 220px', padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Target size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedCountry}</span>
            </div>
            <WVIRing score={reactiveWVI} color={wviColor} />
            <span className="label-text" style={{ marginTop: 8 }}>Computed WVI</span>
            <span style={{ fontSize: '0.68rem', color: wviColor, marginTop: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
              {reactiveWVI > 75 ? 'CRITICAL' : reactiveWVI > 50 ? 'ELEVATED' : 'STABLE'}
            </span>

            {/* Fragmentation sub-score */}
            {intelligenceData.pillars?.fragmentation && (() => {
              const frag = intelligenceData.pillars.fragmentation;
              return (
                <div style={{ width: '100%', marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ff4b4b', letterSpacing: '0.12em' }}>FRAGMENTATION</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff4b4b' }}>{frag.score}/100</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,75,75,0.15)', borderRadius: 2, marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${frag.score}%`, background: 'linear-gradient(90deg, rgba(255,75,75,0.6), #ff4b4b)', borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(frag.primary_drivers || []).map((d: string, i: number) => (
                      <div key={i} style={{ fontSize: '0.67rem', color: 'rgba(255,120,120,0.85)', paddingLeft: 7, borderLeft: '2px solid rgba(255,75,75,0.45)' }}>{d}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="divider-v" />

          {/* Col 2 */}
          <div style={{ flex: '0 0 280px', padding: '20px 18px', display: 'flex', flexDirection: 'column' }}>
            <div className="label-text" style={{ marginBottom: 12 }}>
              <ActivitySquare size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Intelligence Telemetry
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(intelligenceData.pillars)
                .filter(([pillar]) => pillar !== 'fragmentation')
                .map(([pillar, data]: any) => (
                  <div key={pillar}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: PILLAR_COLORS[pillar] || '#8892b0', textTransform: 'uppercase' }}>{pillar} Pillar</span>
                      <span className="metric-value" style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{data.overall_score}/100</span>
                    </div>
                    {(data.sources || []).map((src: any, i: number) => (
                      <div key={i} className="intel-card">
                        <div className="intel-header">
                          <span className="intel-source">{src.name}</span>
                          <span className="intel-score" style={{ color: PILLAR_COLORS[pillar] || '#8892b0' }}>{src.score}</span>
                        </div>
                        <div className="intel-metric">
                          <span>{src.metric}</span>
                          <span className="metric-value">{src.raw_value} <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>{src.unit}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          <div className="divider-v" />

          {/* Col 3 */}
          <div style={{ flex: '0 0 250px', padding: '20px 18px', display: 'flex', flexDirection: 'column' }}>
            <div className="label-text" style={{ marginBottom: 12 }}>
              <Crosshair size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Predicted War Type
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warTypeBarData} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(136,146,176,0.6)' }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.75)' }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(12,14,22,0.92)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: '0.78rem' }}
                    formatter={(v: any) => [`${v}%`, 'Probability']} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={14}>
                    {warTypeBarData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="divider-v" />

          {/* Col 4 */}
          <div style={{ flex: 1, padding: '20px 18px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {([ { id: 'timeline' as const, label: 'Conflict Timeline' }, { id: 'hotspots' as const, label: 'Future Attack Regions' } ]).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activeTab === tab.id ? 'rgba(0,242,254,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 8, padding: '6px 14px', color: activeTab === tab.id ? '#00f2fe' : 'rgba(136,146,176,0.8)',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s ease'
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {activeTab === 'timeline' && (
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayTimeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCivil" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff4b4b" stopOpacity={0.35} /><stop offset="100%" stopColor="#ff4b4b" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gNonState" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00f2fe" stopOpacity={0.35} /><stop offset="100%" stopColor="#00f2fe" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gInter" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5a623" stopOpacity={0.35} /><stop offset="100%" stopColor="#f5a623" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gOneSided" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.35} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="Year" stroke="rgba(136,146,176,0.4)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(136,146,176,0.4)" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(12,14,22,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: '0.78rem' }} itemStyle={{ fontSize: '0.75rem' }} labelStyle={{ color: '#00f2fe', fontWeight: 700, marginBottom: 4 }} />
                    <RechartsLegend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="Intra-State (Civil War)" stroke="#ff4b4b" strokeWidth={2} fill="url(#gCivil)" />
                    <Area type="monotone" dataKey="Internal armed conflict" stroke="#ff6b6b" strokeWidth={2} fill="url(#gCivil)" />
                    <Area type="monotone" dataKey="Full Conventional" stroke="#ff4b4b" strokeWidth={2} fill="url(#gCivil)" />
                    <Area type="monotone" dataKey="Non-State (Cartel/Militia)" stroke="#00f2fe" strokeWidth={2} fill="url(#gNonState)" />
                    <Area type="monotone" dataKey="Proxy / Grey-Zone" stroke="#a78bfa" strokeWidth={2} fill="url(#gNonState)" />
                    <Area type="monotone" dataKey="Inter-State (Conventional)" stroke="#f5a623" strokeWidth={2} fill="url(#gInter)" />
                    <Area type="monotone" dataKey="Interstate armed conflict" stroke="#f5a623" strokeWidth={2} fill="url(#gInter)" />
                    <Area type="monotone" dataKey="One-Sided Violence" stroke="#34d399" strokeWidth={2} fill="url(#gOneSided)" />
                    <Area type="monotone" dataKey="Border Skirmish" stroke="#34d399" strokeWidth={2} fill="url(#gOneSided)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === 'hotspots' && forecastData.future_hotspots && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {forecastData.future_hotspots.map((h: any, i: number) => {
                  const probPct = Math.round(h.probability * 100);
                  const barColor = WAR_COLORS[h.threat] || (probPct > 70 ? '#ff4b4b' : probPct > 50 ? '#f5a623' : '#34d399');
                  return (
                    <div key={i} onClick={() => handleHotspotClick(h.lng, h.lat)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={13} style={{ color: barColor }} />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.region}</span>
                        </div>
                        <span className="metric-value" style={{ color: barColor, fontSize: '0.85rem' }}>{probPct}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{h.threat}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                          {h.lat != null && h.lng != null ? `${h.lat.toFixed(2)}°, ${h.lng.toFixed(2)}°` : 'Conceptual Target'}
                        </span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${probPct}%`, background: `linear-gradient(90deg, ${barColor}66, ${barColor})` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => { setSelectedCountry(null); setForecastData(null); setIntelligenceData(null); }} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, zIndex: 5 }}><X size={18} /></button>
        </div>
      )}
    </div>
  );
}
