import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/mapbox';
import type { FillLayer, LineLayer, CircleLayer } from 'mapbox-gl';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as RechartsLegend,
} from 'recharts';
import { Target, Anchor, ShieldAlert, X, Crosshair, MapPin, Database, ActivitySquare, Gem, Ship, Wifi, Rocket, BookOpen, AlertTriangle, BrainCircuit, TrendingUp, Globe, ChevronDown, ChevronUp, Info, FlaskConical, Layers, Zap } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = atob("cGsuZXlKMUlqb2laR1ZzZEdFeU5UZ3dOalVpTENKaElqb2lZMjF4YldneGFUWnJNR0V3WmpKd2MyTTNaWGQzY1dWcFpTSjkuaGt2YVcxRTRPbTkwVFJiOHNDRnFCZw==");

const wviLayer: Omit<FillLayer, 'source'> = {
  id: 'data', type: 'fill',
  paint: {
    'fill-color': ['interpolate', ['linear'], ['get', 'WVI'],
      0,  'rgba(0,0,0,0)',
      20, '#0ea5e9',
      40, '#22d3ee',
      55, '#f5a623',
      70, '#ef4444',
      85, '#b91c1c',
      100,'#7f1d1d'],
    'fill-opacity': 0.72
  }
};

// Shipping routes: wide blurred glow halo + crisp top line
const shippingRouteGlowLayer: Omit<LineLayer, 'source'> = {
  id: 'shipping-routes-glow', type: 'line',
  paint: {
    'line-color': ['interpolate', ['linear'], ['get', 'volume'], 0, '#1d4ed8', 60, '#38bdf8', 100, '#7dd3fc'],
    'line-width': ['interpolate', ['linear'], ['get', 'volume'], 0, 10, 60, 16, 100, 22],
    'line-opacity': 0.10, 'line-blur': 8,
  }
};
const shippingRouteLayer: Omit<LineLayer, 'source'> = {
  id: 'shipping-routes', type: 'line',
  paint: {
    'line-color': ['interpolate', ['linear'], ['get', 'volume'], 0, '#93c5fd', 60, '#38bdf8', 100, '#e0f2fe'],
    'line-width': ['interpolate', ['linear'], ['get', 'volume'], 0, 1.2, 60, 2.2, 100, 3.5],
    'line-opacity': 0.92,
  }
};

const navalPatrolGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'naval-patrols-glow', type: 'circle',
  paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.12, 'circle-blur': 1.5, 'circle-stroke-width': 0 }
};
const navalPatrolLayer: Omit<CircleLayer, 'source'> = {
  id: 'naval-patrols', type: 'circle',
  paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-opacity': 1, 'circle-stroke-width': 1.5, 'circle-stroke-color': 'rgba(255,255,255,0.7)' }
};

const chokePointPulseLayer: Omit<CircleLayer, 'source'> = {
  id: 'choke-points-pulse', type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 0, 14, 50, 20, 100, 28],
    'circle-color': ['interpolate', ['linear'], ['get', 'risk'], 0, '#fbbf24', 60, '#f97316', 100, '#ef4444'],
    'circle-opacity': 0.15, 'circle-blur': 1.2,
  }
};
const chokePointLayer: Omit<CircleLayer, 'source'> = {
  id: 'choke-points', type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 0, 7, 60, 10, 100, 14],
    'circle-color': ['interpolate', ['linear'], ['get', 'risk'], 0, '#fbbf24', 60, '#f97316', 100, '#ef4444'],
    'circle-opacity': 0.95, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.4)',
  }
};

const CABLE_COLOR_EXPR: any = ['match', ['get', 'status'],
  'CRITICAL', '#ef4444', 'VULNERABLE', '#f97316', 'MONITORED', '#a78bfa', '#8b5cf6'];
const digitalLifelineGlowLayer: Omit<LineLayer, 'source'> = {
  id: 'digital-lifelines-glow', type: 'line',
  filter: ['==', '$type', 'LineString'],
  paint: { 'line-color': CABLE_COLOR_EXPR, 'line-width': 14, 'line-opacity': 0.10, 'line-blur': 6 }
};
const digitalLifelineLineLayer: Omit<LineLayer, 'source'> = {
  id: 'digital-lifelines-lines', type: 'line',
  filter: ['==', '$type', 'LineString'],
  paint: { 'line-color': CABLE_COLOR_EXPR, 'line-width': 2, 'line-opacity': 0.9 }
};
const digitalLifelinePointLayer: Omit<CircleLayer, 'source'> = {
  id: 'digital-lifelines-points', type: 'circle',
  filter: ['==', '$type', 'Point'],
  paint: { 'circle-radius': 7, 'circle-color': CABLE_COLOR_EXPR, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.5)', 'circle-opacity': 1 }
};

const strategicResourceGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'strategic-resources-glow', type: 'circle',
  paint: { 'circle-radius': 18, 'circle-color': '#34d399', 'circle-opacity': 0.12, 'circle-blur': 1.5, 'circle-stroke-width': 0 }
};
const strategicResourceLayer: Omit<CircleLayer, 'source'> = {
  id: 'strategic-resources', type: 'circle',
  paint: { 'circle-radius': 8, 'circle-color': '#34d399', 'circle-opacity': 1, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(52,211,153,0.6)' }
};

const asymmetricGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'asymmetric-vulnerabilities-glow', type: 'circle',
  paint: { 'circle-radius': 18, 'circle-color': '#f97316', 'circle-opacity': 0.12, 'circle-blur': 1.5, 'circle-stroke-width': 0 }
};
const asymmetricLayer: Omit<CircleLayer, 'source'> = {
  id: 'asymmetric-vulnerabilities', type: 'circle',
  paint: { 'circle-radius': 8, 'circle-color': '#f97316', 'circle-opacity': 1, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(249,115,22,0.6)' }
};

const activeHotspotLayer: Omit<CircleLayer, 'source'> = {
  id: 'active-hotspots-layer', type: 'circle',
  paint: {
    'circle-radius': 13,
    'circle-color': '#ff4b4b',
    'circle-opacity': 0.9,
    'circle-stroke-width': 3,
    'circle-stroke-color': 'rgba(255,75,75,0.45)',
    'circle-blur': 0.15
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

const brainPredictionGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'brain-predictions-glow', type: 'circle',
  paint: { 'circle-radius': 28, 'circle-color': '#f97316', 'circle-opacity': 0.10, 'circle-blur': 1.8, 'circle-stroke-width': 0 }
};
const brainPredictionLayer: Omit<CircleLayer, 'source'> = {
  id: 'brain-predictions-layer', type: 'circle',
  paint: {
    'circle-radius': 11,
    'circle-color': '#f97316',
    'circle-opacity': 0.9,
    'circle-stroke-width': 2.5,
    'circle-stroke-color': 'rgba(251,191,36,0.7)',
    'circle-blur': 0.1
  }
};

// War prediction region layers (top_regions + emerging_flashpoints from war_prediction.json)
const warRegionGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'war-regions-glow', type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'prediction_score'], 42, 32, 91, 56],
    'circle-color': ['case', ['==', ['get', 'layer_type'], 'flashpoint'], '#f5a623', '#ff4b4b'],
    'circle-opacity': 0.07, 'circle-blur': 1.6,
  }
};
const warRegionLayer: Omit<CircleLayer, 'source'> = {
  id: 'war-regions-layer', type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'prediction_score'], 42, 13, 91, 24],
    'circle-color': ['case', ['==', ['get', 'layer_type'], 'flashpoint'], '#f5a623', '#ff4b4b'],
    'circle-opacity': 0.82,
    'circle-stroke-width': 2.5,
    'circle-stroke-color': ['case', ['==', ['get', 'layer_type'], 'flashpoint'], 'rgba(245,166,35,0.5)', 'rgba(255,75,75,0.45)'],
  }
};

// Border dispute layers
const borderDisputeGlowLayer: Omit<LineLayer, 'source'> = {
  id: 'border-disputes-glow', type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 12, 'line-opacity': 0.12, 'line-blur': 8,
  }
};
const borderDisputeLineLayer: Omit<LineLayer, 'source'> = {
  id: 'border-disputes-line', type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2.5, 'line-opacity': 0.9,
    'line-dasharray': [4, 2],
  }
};

// Critical minerals layer
const mineralGlowLayer: Omit<CircleLayer, 'source'> = {
  id: 'critical-minerals-glow', type: 'circle',
  paint: { 'circle-radius': 22, 'circle-color': '#34d399', 'circle-opacity': 0.12, 'circle-blur': 1.6 }
};
const mineralLayer: Omit<CircleLayer, 'source'> = {
  id: 'critical-minerals-layer', type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'strategic_importance'], 70, 9, 90, 13, 100, 16],
    'circle-color': ['get', 'color'],
    'circle-opacity': 0.95, 'circle-stroke-width': 2.5, 'circle-stroke-color': 'rgba(52,211,153,0.5)',
  }
};

const conflictRegionFillLayer: Omit<FillLayer, 'source'> = {
  id: 'conflict-regions-fill', type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': ['interpolate', ['linear'], ['get', 'prediction_score'], 49, 0.08, 70, 0.14, 91, 0.22]
  }
};
const conflictRegionGlowLayer: Omit<LineLayer, 'source'> = {
  id: 'conflict-regions-glow', type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['interpolate', ['linear'], ['get', 'prediction_score'], 49, 10, 91, 20],
    'line-opacity': 0.08, 'line-blur': 8,
  }
};
const conflictRegionLineLayer: Omit<LineLayer, 'source'> = {
  id: 'conflict-regions-line', type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['interpolate', ['linear'], ['get', 'prediction_score'], 49, 1.5, 91, 3],
    'line-opacity': 0.88,
    'line-dasharray': [6, 3],
    'line-blur': 0.3,
  }
};

interface MapViewProps {
  worldGeoJson: any; flowMaps: any; chokePoints: any; digitalLifelines: any; strategicResources: any; asymmetricVuln: any;
  showShipping: boolean; showPatrols: boolean; showChokePoints: boolean; showDigital: boolean; showStrategic: boolean; showAsymmetric: boolean;
  showConflictRegions: boolean; conflictRegionsGeoJson: any;
  activeHotspotGeoJson: any; selectedCountry: string | null;
  showBrainPredictions: boolean; brainPredictionsGeoJson: any;
  showBorderDisputes: boolean; borderDisputesGeoJson: any;
  showMinerals: boolean; mineralsGeoJson: any;
  showWarRegions: boolean; warRegionsGeoJson: any;
  onHoverChange: (info: any) => void; onCountryClick: (c: string, lng: number, lat: number) => void; onInfraClick: (i: any) => void; onClear: () => void;
  mapRef: React.RefObject<MapRef>;
}

const MapView = memo(({ worldGeoJson, flowMaps, chokePoints, digitalLifelines, strategicResources, asymmetricVuln, showShipping, showPatrols, showChokePoints, showDigital, showStrategic, showAsymmetric, showConflictRegions, conflictRegionsGeoJson, activeHotspotGeoJson, selectedCountry, showBrainPredictions, brainPredictionsGeoJson, showBorderDisputes, borderDisputesGeoJson, showMinerals, mineralsGeoJson, showWarRegions, warRegionsGeoJson, onHoverChange, onCountryClick, onInfraClick, onClear, mapRef }: MapViewProps) => {
  const [cursor, setCursor] = useState('grab');

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const f = event.features?.[0];
    setCursor(f ? 'pointer' : 'grab');
    onHoverChange(f ? { feature: f, x: event.point.x, y: event.point.y } : null);
  }, [onHoverChange]);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const f = event.features?.[0];
    if (!f) { onClear(); return; }
    const { lng, lat } = event.lngLat;
    if (f.source === 'data' && f.properties?.name) {
      onCountryClick(f.properties.name, lng, lat);
    } else {
      onInfraClick({ source: f.source || 'hotspot', properties: f.properties, lng, lat });
    }
  }, [onCountryClick, onInfraClick, onClear]);

  return (
    <Map ref={mapRef} initialViewState={{ longitude: 20, latitude: 15, zoom: 1.8, pitch: 0 }}
      mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN}
      projection={{ name: 'globe' } as any}
      fog={{ color: '#080c18', 'high-color': '#1a2a6c', 'horizon-blend': 0.04, 'space-color': '#000005', 'star-intensity': 0.25 } as any}
      interactiveLayerIds={['data', 'choke-points', 'naval-patrols', 'digital-lifelines-lines', 'digital-lifelines-points', 'strategic-resources', 'asymmetric-vulnerabilities', 'shipping-routes', 'active-hotspots-layer', 'conflict-regions-fill', 'brain-predictions-layer', 'border-disputes-line', 'critical-minerals-layer', 'war-regions-layer']}
      onMouseMove={handleMouseMove} onClick={handleClick} cursor={cursor}
    >
      {worldGeoJson && <Source id="data" type="geojson" data={worldGeoJson}><Layer {...wviLayer} /></Source>}
      {showConflictRegions && conflictRegionsGeoJson && (
        <Source id="conflict-regions" type="geojson" data={conflictRegionsGeoJson}>
          <Layer {...conflictRegionFillLayer} />
          <Layer {...conflictRegionGlowLayer} />
          <Layer {...conflictRegionLineLayer} />
        </Source>
      )}
      {showShipping && flowMaps?.shipping_routes && (
        <Source id="shipping" type="geojson" data={flowMaps.shipping_routes}>
          <Layer {...shippingRouteGlowLayer} />
          <Layer {...shippingRouteLayer} />
        </Source>
      )}
      {showPatrols && flowMaps?.naval_patrols && (
        <Source id="patrols" type="geojson" data={flowMaps.naval_patrols}>
          <Layer {...navalPatrolGlowLayer} />
          <Layer {...navalPatrolLayer} />
        </Source>
      )}
      {showChokePoints && chokePoints && (
        <Source id="chokepoints" type="geojson" data={chokePoints}>
          <Layer {...chokePointPulseLayer} />
          <Layer {...chokePointLayer} />
        </Source>
      )}
      {showDigital && digitalLifelines && (
        <Source id="digital" type="geojson" data={digitalLifelines}>
          <Layer {...digitalLifelineGlowLayer} />
          <Layer {...digitalLifelineLineLayer} />
          <Layer {...digitalLifelinePointLayer} />
        </Source>
      )}
      {showStrategic && strategicResources && (
        <Source id="strategic" type="geojson" data={strategicResources}>
          <Layer {...strategicResourceGlowLayer} />
          <Layer {...strategicResourceLayer} />
        </Source>
      )}
      {showAsymmetric && asymmetricVuln && (
        <Source id="asymmetric" type="geojson" data={asymmetricVuln}>
          <Layer {...asymmetricGlowLayer} />
          <Layer {...asymmetricLayer} />
        </Source>
      )}
      {selectedCountry && activeHotspotGeoJson && (
        <Source id="active-hotspots-source" type="geojson" data={activeHotspotGeoJson}>
          <Layer {...activeHotspotLayer} />
        </Source>
      )}
      {showBrainPredictions && brainPredictionsGeoJson && (
        <Source id="brain-predictions" type="geojson" data={brainPredictionsGeoJson}>
          <Layer {...brainPredictionGlowLayer} />
          <Layer {...brainPredictionLayer} />
        </Source>
      )}
      {showBorderDisputes && borderDisputesGeoJson && (
        <Source id="border-disputes" type="geojson" data={borderDisputesGeoJson}>
          <Layer {...borderDisputeGlowLayer} />
          <Layer {...borderDisputeLineLayer} />
        </Source>
      )}
      {showMinerals && mineralsGeoJson && (
        <Source id="critical-minerals" type="geojson" data={mineralsGeoJson}>
          <Layer {...mineralGlowLayer} />
          <Layer {...mineralLayer} />
        </Source>
      )}
      {showWarRegions && warRegionsGeoJson && (
        <Source id="war-predictions" type="geojson" data={warRegionsGeoJson}>
          <Layer {...warRegionGlowLayer} />
          <Layer {...warRegionLayer} />
        </Source>
      )}
    </Map>
  );
}, (p, n) =>
  p.worldGeoJson === n.worldGeoJson && p.flowMaps === n.flowMaps && p.chokePoints === n.chokePoints &&
  p.digitalLifelines === n.digitalLifelines && p.strategicResources === n.strategicResources &&
  p.asymmetricVuln === n.asymmetricVuln && p.showShipping === n.showShipping && p.showPatrols === n.showPatrols &&
  p.showChokePoints === n.showChokePoints && p.showDigital === n.showDigital && p.showStrategic === n.showStrategic &&
  p.showAsymmetric === n.showAsymmetric && p.showConflictRegions === n.showConflictRegions &&
  p.conflictRegionsGeoJson === n.conflictRegionsGeoJson && p.activeHotspotGeoJson === n.activeHotspotGeoJson &&
  p.selectedCountry === n.selectedCountry && p.showBrainPredictions === n.showBrainPredictions &&
  p.brainPredictionsGeoJson === n.brainPredictionsGeoJson && p.showBorderDisputes === n.showBorderDisputes &&
  p.borderDisputesGeoJson === n.borderDisputesGeoJson && p.showMinerals === n.showMinerals &&
  p.mineralsGeoJson === n.mineralsGeoJson && p.showWarRegions === n.showWarRegions &&
  p.warRegionsGeoJson === n.warRegionsGeoJson &&
  p.onHoverChange === n.onHoverChange &&
  p.onCountryClick === n.onCountryClick && p.onInfraClick === n.onInfraClick && p.onClear === n.onClear
);

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const [worldGeoJson, setWorldGeoJson] = useState<any>(null);
  const [wviDataMap, setWviDataMap] = useState<Record<string, any>>({});
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
  const [showConflictRegions, setShowConflictRegions] = useState(true);
  const [conflictRegionsGeoJson, setConflictRegionsGeoJson] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);

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
  const [showGuide, setShowGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'quickstart' | 'wvi' | 'hven' | 'conflict' | 'overlays'>('quickstart');
  const [showBrainPredictions, setShowBrainPredictions] = useState(true);
  const [brainPredictionsData, setBrainPredictionsData] = useState<any>(null);
  const [showBrainPanel, setShowBrainPanel] = useState(false);
  const [showBorderDisputes, setShowBorderDisputes] = useState(true);
  const [borderDisputesData, setBorderDisputesData] = useState<any>(null);
  const [showMinerals, setShowMinerals] = useState(true);
  const [mineralsData, setMineralsData] = useState<any>(null);
  const [showWarRegions, setShowWarRegions] = useState(true);
  const [selectedWarRegion, setSelectedWarRegion] = useState<any>(null);

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
      const fullMap: Record<string, any> = {};
      backendData.data.forEach((d: any) => { wviMap[d.Country] = d.WVI; fullMap[d.Country] = d; });
      setWviDataMap(fullMap);
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
    fetch(API_BASE + `api/conflict_regions${EXT}`).then(r => r.json()).then(setConflictRegionsGeoJson).catch(console.error);
    fetch(API_BASE + `api/brain_predictions${EXT}`).then(r => r.json()).then(setBrainPredictionsData).catch(console.error);
    fetch(API_BASE + `api/border_disputes${EXT}`).then(r => r.json()).then(setBorderDisputesData).catch(console.error);
    fetch(API_BASE + `api/critical_minerals${EXT}`).then(r => r.json()).then(setMineralsData).catch(console.error);

    return () => clearInterval(interval);
  }, []);

  const onHoverChange = useCallback((info: any) => setHoverInfo(info), []);

  // Generate fallback intelligence/forecast from map_data scores when no API file exists
  const makeFallbackIntelligence = useCallback((country: string, d: any) => {
    const C = d.Cyber ?? 40, E = d.Economic ?? 40, K = d.Kinetic ?? 40, F = d.Fragmentation ?? 30;
    const topThreat = d.TopThreat ?? 'Proxy / Grey-Zone';
    return {
      country, computed_wvi: d.WVI ?? 0,
      pillars: {
        cyber: { overall_score: C, sources: [
          { name: 'CFR Cyber Tracker', score: Math.min(100,C+5), metric: `${Math.round(C*1.2)} events (YTD)`, raw_value: Math.round(C*1.2), unit: 'events' },
          { name: 'EuRepoC', score: Math.max(0,C-10), metric: `${Math.max(1,Math.round(C/20))} campaigns`, raw_value: Math.max(1,Math.round(C/20)), unit: 'campaigns' },
          { name: 'Carnegie Spyware', score: C, metric: C > 60 ? 'Active tracking' : 'Minimal activity', raw_value: C, unit: 'score' },
        ]},
        economic: { overall_score: E, sources: [
          { name: 'UN Comtrade', score: E, metric: `Dependency: ${Math.round(E*0.8)}%`, raw_value: Math.round(E*0.8), unit: '%' },
          { name: 'IMF DOTS', score: Math.max(0,E-8), metric: `Sanctions Exposure: ${Math.max(0,E-8)}/100`, raw_value: Math.max(0,E-8), unit: 'score' },
          { name: 'World Bank WITS', score: Math.max(0,E-12), metric: `Trade Concentration: ${Math.max(0,E-12)}/100`, raw_value: Math.max(0,E-12), unit: 'score' },
        ]},
        kinetic: { overall_score: K, sources: [
          { name: 'ACLED', score: K, metric: `${Math.round(K*8)} events/yr`, raw_value: Math.round(K*8), unit: 'events/yr' },
          { name: 'UCDP', score: Math.max(0,K-5), metric: `Fatalities: ${Math.round(K*120)}/yr`, raw_value: Math.round(K*120), unit: 'fatalities/yr' },
          { name: 'SIPRI', score: Math.min(100,K+3), metric: `Military spend: ${(K*0.3).toFixed(1)}% GDP`, raw_value: +(K*0.3).toFixed(1), unit: '% GDP' },
        ]},
        fragmentation: { score: F, primary_drivers: F > 60 ? ['Political polarization', 'Electoral interference risk', 'Social fragmentation'] : F > 35 ? ['Moderate political tensions', 'Regional disparities'] : ['Low fragmentation', 'Stable governance'] },
      },
      top_threat: topThreat,
      war_type_distribution: {
        'Cyber / Digital': topThreat === 'Cyber / Digital' ? 0.55 : C/200,
        'Proxy / Grey-Zone': topThreat === 'Proxy / Grey-Zone' ? 0.45 : 0.15,
        'Naval Blockade': topThreat === 'Naval Blockade' ? 0.40 : 0.05,
        'Border Skirmish': K > 50 ? 0.30 : 0.10,
        'Full Conventional': K > 70 ? 0.25 : 0.05,
      },
      predicted_attack_regions: [],
    };
  }, []);

  const makeFallbackForecast = useCallback((country: string, d: any) => ({
    country,
    forecast: { wvi: d.WVI ?? 0, trend: d.WVI > 65 ? 'Deteriorating' : d.WVI > 40 ? 'Stable' : 'Improving', confidence: 0.65 },
    timeline: [
      { Year: 1950, 'Inter-State (Conventional)': 0, 'Intra-State (Civil War)': 0, 'Non-State (Cartel/Militia)': 0, 'One-Sided Violence': 0 },
      { Year: 1970, 'Inter-State (Conventional)': 0, 'Intra-State (Civil War)': 0, 'Non-State (Cartel/Militia)': 0, 'One-Sided Violence': 0 },
      { Year: 1990, 'Inter-State (Conventional)': 0, 'Intra-State (Civil War)': 0, 'Non-State (Cartel/Militia)': 0, 'One-Sided Violence': 0 },
      { Year: 2010, 'Inter-State (Conventional)': 0, 'Intra-State (Civil War)': 0, 'Non-State (Cartel/Militia)': 0, 'One-Sided Violence': 0 },
      { Year: 2026, 'Inter-State (Conventional)': 0, 'Intra-State (Civil War)': 0, 'Non-State (Cartel/Militia)': 0, 'One-Sided Violence': 0 },
    ],
  }), []);

  const onCountryClick = useCallback((country: string, lng: number, lat: number) => {
    setSelectedCountry(country);
    setSelectedInfra(null);
    setSelectedRegion(null);
    setActiveTab('timeline');
    // Normalize longitude to nearest equivalent relative to current map center (fixes globe wraparound)
    const currentLng = mapRef.current?.getCenter().lng ?? 0;
    let normLng = lng;
    while (normLng - currentLng > 180) normLng -= 360;
    while (normLng - currentLng < -180) normLng += 360;
    mapRef.current?.flyTo({ center: [normLng, lat], zoom: 4.5, pitch: 35, bearing: 8, duration: 1800 });
    const raw = wviDataMap[country];
    fetch(`${API_BASE}api/forecast/${encodeURIComponent(country)}${EXT}`)
      .then(r => { if (!r.ok) throw new Error('no file'); return r.json(); })
      .then(setForecastData)
      .catch(() => { if (raw) setForecastData(makeFallbackForecast(country, raw)); });
    fetch(`${API_BASE}api/intelligence/${encodeURIComponent(country)}${EXT}`)
      .then(r => { if (!r.ok) throw new Error('no file'); return r.json(); })
      .then(setIntelligenceData)
      .catch(() => { if (raw) setIntelligenceData(makeFallbackIntelligence(country, raw)); });
  }, [API_BASE, EXT, mapRef, wviDataMap, makeFallbackIntelligence, makeFallbackForecast]);

  const onInfraClick = useCallback((infra: any) => {
    if (infra.source === 'conflict-regions') {
      const p = infra.properties;
      setSelectedRegion(p);
      setSelectedCountry(null);
      setSelectedInfra(null);
      setSelectedWarRegion(null);
      const cLng = typeof p.center_lng === 'number' ? p.center_lng : (infra.lng ?? 20);
      const cLat = typeof p.center_lat === 'number' ? p.center_lat : (infra.lat ?? 15);
      const zoom = typeof p.fly_zoom === 'number' ? p.fly_zoom : 3.5;
      mapRef.current?.flyTo({ center: [cLng, cLat], zoom, pitch: 25, bearing: 0, duration: 2000 });
    } else if (infra.source === 'war-predictions') {
      const p = infra.properties;
      // Find the full region data from warPredictionData
      const fullRegion = warPredictionData?.top_regions?.find((r: any) => r.region === p.region) ||
                         warPredictionData?.emerging_flashpoints?.find((f: any) => f.flashpoint === p.flashpoint);
      setSelectedWarRegion({ ...p, ...(fullRegion || {}) });
      setSelectedCountry(null);
      setSelectedInfra(null);
      setSelectedRegion(null);
      if (infra.lng != null && infra.lat != null) {
        mapRef.current?.flyTo({ center: [infra.lng, infra.lat], zoom: 4, pitch: 25, duration: 1600 });
      }
    } else {
      setSelectedInfra(infra);
      setSelectedCountry(null);
      setSelectedRegion(null);
      setSelectedWarRegion(null);
      if (infra.lng != null && infra.lat != null) {
        mapRef.current?.flyTo({ center: [infra.lng, infra.lat], zoom: 5, pitch: 30, duration: 1500 });
      }
    }
  }, [mapRef, warPredictionData]);

  const onClear = useCallback(() => {
    setSelectedCountry(null);
    setSelectedInfra(null);
    setSelectedRegion(null);
    setSelectedWarRegion(null);
  }, []);

  const resetGlobe = useCallback(() => {
    setSelectedCountry(null);
    setSelectedInfra(null);
    setSelectedRegion(null);
    setSelectedWarRegion(null);
    mapRef.current?.flyTo({ center: [20, 15], zoom: 1.8, pitch: 0, bearing: 0, duration: 2000 });
  }, [mapRef]);

  const handleHotspotClick = (lng: number | null, lat: number | null) => {
    if (lng != null && lat != null) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 5.5, pitch: 40, bearing: -10, duration: 1800 });
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

  const brainPredictionsGeoJson = useMemo(() => {
    if (!brainPredictionsData) return null;
    if (brainPredictionsData.predicted_chokepoints) return brainPredictionsData.predicted_chokepoints;
    if (brainPredictionsData.type === 'FeatureCollection') return brainPredictionsData;
    return null;
  }, [brainPredictionsData]);

  const warPredictionMapGeoJson = useMemo(() => {
    if (!warPredictionData) return null;
    const regions = (warPredictionData.top_regions || []).map((r: any) => ({
      type: 'Feature',
      properties: { ...r, layer_type: 'top_region' },
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] }
    }));
    const flashpoints = (warPredictionData.emerging_flashpoints || []).map((f: any) => ({
      type: 'Feature',
      properties: { ...f, layer_type: 'flashpoint', prediction_score: f.risk_score, region: f.flashpoint },
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] }
    }));
    return { type: 'FeatureCollection' as const, features: [...regions, ...flashpoints] };
  }, [warPredictionData]);

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
        showConflictRegions={showConflictRegions} conflictRegionsGeoJson={conflictRegionsGeoJson}
        activeHotspotGeoJson={activeHotspotGeoJson} selectedCountry={selectedCountry}
        showBrainPredictions={showBrainPredictions} brainPredictionsGeoJson={brainPredictionsGeoJson}
        showBorderDisputes={showBorderDisputes} borderDisputesGeoJson={borderDisputesData}
        showMinerals={showMinerals} mineralsGeoJson={mineralsData}
        showWarRegions={showWarRegions} warRegionsGeoJson={warPredictionMapGeoJson}
        onHoverChange={onHoverChange} onCountryClick={onCountryClick} onInfraClick={onInfraClick} onClear={onClear}
      />

      {/* ─── Title ─── */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <h1 className="glow-text" style={{ margin: 0, fontSize: '1.65rem', letterSpacing: '-0.02em' }}>BLEED, DON'T BREAK</h1>
        <p className="label-text" style={{ marginTop: 5, letterSpacing: '0.18em', fontSize: '0.62rem' }}>PARALYSIS OVER POWER · WOUND VULNERABILITY INDEX</p>
      </div>

      {/* ─── Left Toolbar ─── */}
      <div className="glass-panel left-toolbar">
        <div className="left-toolbar-header">
          <Crosshair size={13} style={{ color: 'var(--accent-cyan)', opacity: 0.7 }} />
          <span>ANALYSIS</span>
        </div>
        <div className="left-toolbar-btns">
          <button className="toolbar-btn purple" onClick={() => setShowWarPrediction(true)}>
            <BrainCircuit size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
            <span>War Prediction AI</span>
          </button>
          <button className="toolbar-btn cyan" onClick={() => setShowGuide(true)}>
            <Info size={14} style={{ color: '#00f2fe', flexShrink: 0 }} />
            <span>Metrics Guide</span>
          </button>
          {(selectedCountry || selectedRegion || selectedInfra) && (
            <button className="toolbar-btn" onClick={resetGlobe} style={{ borderColor: 'rgba(255,255,255,0.15)', marginTop: 4 }}>
              <Globe size={14} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Reset Globe</span>
            </button>
          )}
        </div>
      </div>

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
              {/* Left: Map notice + methodology */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Map callout */}
                <div style={{ background: 'rgba(255,75,75,0.06)', border: '1px solid rgba(255,75,75,0.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <BrainCircuit size={24} style={{ color: '#ff4b4b', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#ff4b4b', fontSize: '0.88rem', marginBottom: 6 }}>Prediction Zones Are Live on the Map</div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                      All 10 war-prone regions and 4 emerging flashpoints are now plotted as interactive circles on the globe. <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Click any red circle</strong> to open the full prediction dossier — including HVEN-R scores, behavioral pattern analysis, AI reasoning chain, trigger factors, escalation pathway, and indicators to monitor.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: 'rgba(255,75,75,0.8)' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ff4b4b', opacity: 0.85 }} />
                        Top Conflict Zones (score 68–91)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: 'rgba(245,166,35,0.8)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5a623', opacity: 0.85 }} />
                        Emerging Flashpoints (score 42–52)
                      </div>
                    </div>
                  </div>
                </div>

                {/* HVEN-R Methodology */}
                <div style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#a78bfa', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>HVEN-R MODEL METHODOLOGY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { k: 'H', name: 'Historical Recurrence', color: '#ff4b4b', desc: 'Conflict cycles per century, duration of past wars, inter-war intervals. Based on CoW v4 + UCDP data.' },
                      { k: 'V', name: 'Current Volatility', color: '#f5a623', desc: 'Active incidents, casualties/month, political instability index, protest intensity.' },
                      { k: 'E', name: 'Escalation Pressure', color: '#ff4b4b', desc: 'Military buildup, cross-border incidents, alliance dynamics, nuclear posture changes.' },
                      { k: 'N', name: 'Neighbor Contagion', color: '#34d399', desc: 'Conflict adjacency score, refugee spillover, transborder armed group activity.' },
                      { k: 'R', name: 'Resource/Climate', color: '#00f2fe', desc: 'Strategic mineral competition, water stress, food insecurity, energy dependency.' },
                    ].map(({ k, name, color, desc }) => (
                      <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}15`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data sources */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 6 }}>DATA SOURCES</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', lineHeight: 1.7 }}>{warPredictionData.sources?.join(' · ')}</div>
                </div>
              </div>

              {/* Right: Behavioral Archetypes + Global Trajectory */}
              <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '16px 16px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 10 }}>BEHAVIORAL ARCHETYPES</div>
                {warPredictionData.behavioral_archetypes?.map((arch: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa' }}>{arch.archetype}</span>
                      <span style={{ fontSize: '0.6rem', color: '#f5a623', fontWeight: 700 }}>×{arch.probability_amplifier}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.67rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{arch.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {arch.affected_regions?.map((r: string, j: number) => (
                        <span key={j} style={{ fontSize: '0.58rem', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 3, padding: '1px 6px', color: 'rgba(167,139,250,0.8)' }}>{r}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Global trajectory */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 10 }}>GLOBAL RISK TRAJECTORY (5-YEAR)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                    {Object.entries(warPredictionData.global_risk_trajectory || {}).map(([yr, val]: any) => {
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
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Conflict Region Detail Panel ─── */}
      {selectedRegion && (() => {
        const r = selectedRegion;
        const color = r.color;
        const scoreColor = r.prediction_score >= 80 ? '#ef4444' : r.prediction_score >= 65 ? '#f97316' : r.prediction_score >= 55 ? '#f59e0b' : '#34d399';
        const keyCountries = typeof r.key_countries === 'string' ? JSON.parse(r.key_countries) : r.key_countries;
        return (
          <>
            <div className="doctrine-backdrop" onClick={() => setSelectedRegion(null)} />
            <div className="glass-panel doctrine-modal fade-in" style={{ width: '82vw', maxWidth: 900, height: '80vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', color }}>{r.name}</h2>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{r.subtitle}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedRegion(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Score card */}
                  <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>AI CONFLICT PREDICTION SCORE</div>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{r.prediction_score}</div>
                        <div style={{ fontSize: '0.65rem', color, letterSpacing: '0.1em', marginTop: 4 }}>{r.confidence} CONFIDENCE</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 4 }}>TRAJECTORY</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>{r.trajectory}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{r.timeframe}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.prediction_score}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 3, transition: 'width 1s ease' }} />
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 10 }}>HISTORICAL CONFLICT DATA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Recorded Wars', value: r.historical_conflicts, color: '#f5a623' },
                        { label: 'Active Now', value: r.current_active_wars, color: '#ef4444' },
                        { label: 'Avg Cycle (yrs)', value: r.conflict_cycle_years?.toFixed(1), color: '#a78bfa' },
                        { label: 'Avg WVI', value: r.avg_wvi, color: '#00f2fe' },
                      ].map(m => (
                        <div key={m.label} style={{ background: `${m.color}0a`, border: `1px solid ${m.color}25`, borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key countries */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 10 }}>KEY COUNTRIES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {(keyCountries || []).map((c: string, i: number) => (
                        <span key={i} style={{ fontSize: '0.7rem', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 5, padding: '3px 10px', color: 'rgba(255,255,255,0.75)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* AI prediction summary */}
                  <div style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <BrainCircuit size={13} style={{ color: '#a78bfa' }} />
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.12em' }}>AI PREDICTION ANALYSIS</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.75 }}>{r.prediction_summary}</p>
                  </div>

                  {/* Threat + escalation */}
                  <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(239,68,68,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>PRIMARY THREAT</div>
                    <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,200,200,0.8)', lineHeight: 1.6 }}>{r.primary_threat}</p>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(245,166,35,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>ESCALATION PATHWAY</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, fontStyle: 'italic' }}>{r.escalation_pathway}</div>
                  </div>

                  {/* Conflict type */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 8 }}>PREDICTED CONFLICT TYPE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{r.top_conflict_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ─── War Prediction Region Detail Panel ─── */}
      {selectedWarRegion && (() => {
        const r = selectedWarRegion;
        const isFlashpoint = r.layer_type === 'flashpoint';
        const accentColor = isFlashpoint ? '#f5a623' : '#ff4b4b';
        const score = r.prediction_score ?? r.risk_score;
        const warfareTypes = Object.entries(r.conflict_type_distribution || {}).sort(([,a],[,b]) => (b as number) - (a as number));
        const behavioralPatterns: any[] = r.behavioral_patterns || [];
        const triggerFactors: string[] = r.trigger_factors || [];
        return (
          <>
            <div className="doctrine-backdrop" onClick={() => setSelectedWarRegion(null)} />
            <div className="glass-panel doctrine-modal fade-in" style={{ width: '82vw', maxWidth: 960, height: '82vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${accentColor}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BrainCircuit size={20} style={{ color: accentColor }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: accentColor }}>{r.region || r.flashpoint}</h2>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{r.timeframe} · {isFlashpoint ? 'EMERGING FLASHPOINT' : r.trajectory}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'center', background: `${accentColor}10`, border: `1px solid ${accentColor}30`, borderRadius: 10, padding: '6px 14px' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: accentColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</div>
                    <div style={{ fontSize: '0.55rem', color: `${accentColor}80`, letterSpacing: '0.12em', marginTop: 2 }}>PREDICTION SCORE</div>
                  </div>
                  <button onClick={() => setSelectedWarRegion(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Key countries */}
                  {r.key_countries?.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 8 }}>KEY COUNTRIES</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {r.key_countries.map((c: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.7rem', background: `${accentColor}12`, border: `1px solid ${accentColor}30`, borderRadius: 5, padding: '3px 10px', color: 'rgba(255,255,255,0.75)' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Conflict type distribution */}
                  {warfareTypes.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 10 }}>PREDICTED WARFARE TYPE DISTRIBUTION</div>
                      {warfareTypes.map(([type, prob]: any) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', width: 140, flexShrink: 0 }}>{type}</span>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${Math.round(prob*100)}%`, background: WAR_COLORS[type] || accentColor, borderRadius: 2, opacity: 0.85 }} />
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', width: 30, textAlign: 'right' }}>{Math.round(prob*100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* HVEN scores */}
                  {r.hven_scores && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 10 }}>HVEN-R DIMENSION SCORES</div>
                      {Object.entries(r.hven_scores).map(([k, v]: any) => {
                        const labels: Record<string,string> = { H: 'Historical Recurrence', V: 'Current Volatility', E: 'Escalation Pressure', N: 'Neighbor Contagion', R: 'Resource/Climate' };
                        return (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: accentColor, width: 14, fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', width: 130 }}>{labels[k]}</span>
                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: `${v}%`, background: accentColor, borderRadius: 2, opacity: 0.7 }} />
                            </div>
                            <span style={{ fontSize: '0.62rem', color: accentColor, width: 24, textAlign: 'right', fontWeight: 700 }}>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Trigger factors */}
                  {triggerFactors.length > 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(239,68,68,0.6)', letterSpacing: '0.12em', marginBottom: 8 }}>CRITICAL TRIGGER FACTORS</div>
                      {triggerFactors.map((tf: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff4b4b', flexShrink: 0, marginTop: 5 }} />
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,120,120,0.85)', lineHeight: 1.5 }}>{tf}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Escalation pathway */}
                  {r.escalation_pathway && (
                    <div style={{ background: 'rgba(255,75,75,0.05)', border: '1px solid rgba(255,75,75,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: '#ff4b4b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>ESCALATION PATHWAY</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{r.escalation_pathway}</div>
                    </div>
                  )}
                  {/* Flashpoint driver */}
                  {r.driver && (
                    <div style={{ background: `${accentColor}06`, border: `1px solid ${accentColor}20`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: `${accentColor}80`, letterSpacing: '0.12em', marginBottom: 6 }}>CONFLICT DRIVER</div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>{r.driver}</p>
                    </div>
                  )}
                </div>
                {/* Right column: behavioral patterns + AI reasoning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* AI reasoning */}
                  {r.reasoning && (
                    <div style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <BrainCircuit size={13} style={{ color: '#a78bfa' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.12em' }}>AI REASONING CHAIN</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>{r.reasoning}</p>
                    </div>
                  )}
                  {/* Behavioral patterns */}
                  {behavioralPatterns.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 8 }}>BEHAVIORAL PATTERN ANALYSIS</div>
                      {behavioralPatterns.map((bp: any, i: number) => {
                        const intColor = bp.intensity === 'CRITICAL' ? '#ff4b4b' : bp.intensity === 'HIGH' ? '#f5a623' : '#34d399';
                        return (
                          <div key={i} style={{ background: `${intColor}08`, border: `1px solid ${intColor}20`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: intColor }}>{bp.pattern}</span>
                              <span style={{ fontSize: '0.58rem', color: intColor, background: `${intColor}20`, padding: '1px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>{bp.intensity}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{bp.description}</p>
                            {bp.historical_precedent && (
                              <div style={{ marginTop: 5, fontSize: '0.6rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Precedent: {bp.historical_precedent}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Indicators to watch */}
                  {r.indicators_to_watch?.length > 0 && (
                    <div style={{ background: 'rgba(0,242,254,0.04)', border: '1px solid rgba(0,242,254,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(0,242,254,0.6)', letterSpacing: '0.12em', marginBottom: 8 }}>INDICATORS TO MONITOR</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {r.indicators_to_watch.map((ind: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.62rem', background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.15)', borderRadius: 4, padding: '2px 8px', color: 'rgba(0,242,254,0.8)' }}>{ind}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ─── Data Brain Modal (backend data only — not shown in frontend) ─── */}
      {false && showBrainPanel && brainPredictionsData && (
        <>
          <div className="doctrine-backdrop" onClick={() => setShowBrainPanel(false)} />
          <div className="glass-panel doctrine-modal fade-in" style={{ width: '90vw', maxWidth: 1100, height: '88vh' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(249,115,22,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={20} style={{ color: '#f97316' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f97316' }}>Data Brain · Predictive Threat Intelligence</h2>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                  {brainPredictionsData.synthesis?.model_version} · Global Threat Score: {brainPredictionsData.synthesis?.global_threat_score}/100 · Trajectory: {brainPredictionsData.synthesis?.trajectory}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 10, padding: '8px 16px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f97316', fontFamily: "'JetBrains Mono', monospace" }}>{brainPredictionsData.synthesis?.global_threat_score}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(249,115,22,0.7)', letterSpacing: '0.1em', marginTop: 2 }}>GLOBAL THREAT SCORE</div>
                  <div style={{ fontSize: '0.62rem', color: '#ff4b4b', marginTop: 2, fontWeight: 700 }}>{brainPredictionsData.synthesis?.trajectory}</div>
                </div>
                <button onClick={() => setShowBrainPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left: Synthesis + Key Findings */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Narrative */}
                <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(249,115,22,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>STRATEGIC SYNTHESIS</div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.75 }}>{brainPredictionsData.synthesis?.analysis_narrative}</p>
                </div>

                {/* Key findings */}
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(249,115,22,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>KEY FINDINGS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {brainPredictionsData.synthesis?.key_findings?.map((finding: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316', flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Threat Vectors */}
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(249,115,22,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>PREDICTED ATTACK VECTORS</div>
                  {brainPredictionsData.threat_vectors?.map((tv: any, i: number) => {
                    const conf = tv.confidence;
                    const confColor = conf >= 85 ? '#ff4b4b' : conf >= 70 ? '#f97316' : '#f5a623';
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: confColor }}>{tv.vector}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.62rem', color: confColor, background: `${confColor}15`, padding: '1px 7px', borderRadius: 4 }}>{tv.escalation_risk}</span>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 900, color: confColor, fontFamily: "'JetBrains Mono', monospace" }}>{conf}%</div>
                              <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>CONF</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(249,115,22,0.7)', marginBottom: 4 }}>{tv.timeframe}</div>
                        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{tv.description}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {tv.primary_actors?.map((a: string, j: number) => (
                            <span key={j} style={{ fontSize: '0.58rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 3, padding: '1px 6px', color: 'rgba(239,68,68,0.8)' }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Predicted Chokepoints + Cable Risk */}
              <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid rgba(249,115,22,0.1)', overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Predicted chokepoints */}
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(249,115,22,0.7)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>PREDICTED EMERGING CHOKEPOINTS</div>
                  {brainPredictionsData.predicted_chokepoints?.features?.map((f: any, i: number) => {
                    const p = f.properties;
                    const conf = p.prediction_confidence;
                    const confColor = conf >= 80 ? '#ff4b4b' : conf >= 65 ? '#f97316' : '#f5a623';
                    return (
                      <div key={i}
                        onClick={() => { setShowBrainPanel(false); onInfraClick({ source: 'brain-predictions', properties: p, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }); }}
                        style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f97316' }}>{p.name}</span>
                          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: confColor, fontFamily: "'JetBrains Mono', monospace" }}>{conf}%</div>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,180,80,0.7)', marginBottom: 3 }}>{p.type}</div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{p.timeframe}</div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.5 }}>{p.strategic_impact?.slice(0, 120)}...</div>
                      </div>
                    );
                  })}
                </div>

                {/* Cable risk matrix */}
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(167,139,250,0.8)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>CABLE RISK MATRIX</div>
                  {brainPredictionsData.cable_risk_matrix?.map((cable: any, i: number) => {
                    const riskColor = cable.risk_score >= 90 ? '#ff4b4b' : cable.risk_score >= 80 ? '#f97316' : '#f5a623';
                    return (
                      <div key={i} style={{ background: 'rgba(167,139,250,0.03)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#a78bfa' }}>{cable.cable}</span>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: riskColor, fontFamily: "'JetBrains Mono', monospace" }}>{cable.risk_score}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '0.58rem', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.15)', borderRadius: 3, padding: '1px 6px', color: '#00f2fe' }}>{cable.data_share_pct}% internet</span>
                          <span style={{ fontSize: '0.58rem', background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.15)', borderRadius: 3, padding: '1px 6px', color: '#ff4b4b' }}>{cable.repair_time_days}d repair</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{cable.critical_vulnerability?.slice(0, 120)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Metrics Guide Modal ─── */}
      {showGuide && (
        <>
          <div className="doctrine-backdrop" onClick={() => setShowGuide(false)} />
          <div className="glass-panel doctrine-modal fade-in" style={{ width: '86vw', maxWidth: 1000, height: '82vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Info size={18} style={{ color: '#00f2fe' }} />
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#00f2fe' }}>Dashboard Guide & Metrics Methodology</h2>
              </div>
              <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, flexWrap: 'wrap' }}>
              {([
                { id: 'quickstart', label: '🚀 Quick Start', icon: Zap },
                { id: 'wvi', label: 'WVI Formula', icon: FlaskConical },
                { id: 'hven', label: 'HVEN-R Model', icon: BrainCircuit },
                { id: 'conflict', label: 'Conflict Types', icon: Target },
                { id: 'overlays', label: 'Map Overlays', icon: Layers },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setGuideTab(tab.id)}
                  style={{
                    background: guideTab === tab.id ? 'rgba(0,242,254,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${guideTab === tab.id ? 'rgba(0,242,254,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8, padding: '6px 14px', color: guideTab === tab.id ? '#00f2fe' : 'rgba(136,146,176,0.8)',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                  <tab.icon size={13} /> {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.75 }}>

              {guideTab === 'quickstart' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h3 style={{ color: '#00f2fe', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} /> How to Use This Dashboard</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { step: '1', color: '#00f2fe', title: 'Explore the Map', desc: 'The world map shows every country colored by its Wound Vulnerability Index (WVI). Darker red = higher vulnerability to conflict-induced paralysis. Click any country to open its full intelligence dossier.' },
                        { step: '2', color: '#a78bfa', title: 'Toggle Overlays', desc: 'Use the top-right panel to show/hide infrastructure overlays: shipping routes, naval patrols, choke points, digital lifelines, strategic resources, and asymmetric vulnerabilities.' },
                        { step: '3', color: '#f5a623', title: 'Country Intelligence', desc: 'Click a country to open the bottom dashboard showing: WVI ring score, intelligence pillars (Cyber/Economic/Kinetic), predicted war types, conflict timeline, and future attack hotspots.' },
                        { step: '4', color: '#ff4b4b', title: 'War Prediction AI', desc: 'Click "War Prediction AI" to see the HVEN-R model ranking the 10 regions most likely to see conflict in the next 2–5 years, with behavioral archetype analysis and escalation pathways.' },
                        { step: '5', color: '#34d399', title: 'Strategic Doctrine', desc: 'Click "Strategic Doctrine" for deep analysis of how modern powers use grey-zone warfare: cabbage strategies, demographic weapons, tech-packaging chokepoints.' },
                      ].map(s => (
                        <div key={s.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${s.color}20`, border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: s.color }}>{s.step}</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.65 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ color: '#f5a623', marginTop: 0 }}>Color & Risk Scale</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { color: '#34d399', label: '0 – 50', title: 'STABLE', desc: 'Low vulnerability. Functional state institutions, no active major conflict.' },
                        { color: '#f5a623', label: '51 – 75', title: 'ELEVATED', desc: 'Moderate fragility. Political tensions, economic stress, or border disputes present.' },
                        { color: '#ff4b4b', label: '76 – 89', title: 'CRITICAL', desc: 'Active conflict or imminent risk. Multiple pillars under severe stress.' },
                        { color: '#b90000', label: '90 – 100', title: 'CATASTROPHIC', desc: 'Near-failed state. Ongoing large-scale conflict or collapse conditions.' },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: `${r.color}08`, border: `1px solid ${r.color}25`, borderRadius: 8 }}>
                          <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: r.color, fontFamily: "'JetBrains Mono', monospace" }}>{r.label}</div>
                            <div style={{ fontSize: '0.55rem', color: r.color, letterSpacing: '0.08em', marginTop: 2 }}>{r.title}</div>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{r.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 8 }}>INTERACTION GUIDE</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                        <div><span style={{ color: '#00f2fe', fontWeight: 600 }}>Hover</span> over any country or marker to see a tooltip with key metrics.</div>
                        <div><span style={{ color: '#00f2fe', fontWeight: 600 }}>Click</span> a country for its full intelligence dossier in the bottom panel.</div>
                        <div><span style={{ color: '#00f2fe', fontWeight: 600 }}>Click</span> infrastructure markers (dots/lines) for detailed threat analysis.</div>
                        <div><span style={{ color: '#00f2fe', fontWeight: 600 }}>Click</span> a hotspot row in the dashboard to fly the map to that region.</div>
                        <div><span style={{ color: '#00f2fe', fontWeight: 600 }}>Expand</span> regions in War Prediction AI for full behavioral analysis.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {guideTab === 'wvi' && (
                <div>
                  <h3 style={{ color: '#00f2fe', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical size={16} /> Wound Vulnerability Index (WVI)</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>The WVI measures how vulnerable a country is to being <em style={{ color: '#f5a623' }}>paralyzed</em> by conflict — not just how likely conflict is, but how deeply it would wound state and societal function. A high WVI means the country can be destabilized by targeted strikes on critical systems without traditional military defeat.</p>

                  {/* Formula Box */}
                  <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,242,254,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 12 }}>FORMULA</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.05rem', color: '#00f2fe', marginBottom: 8 }}>
                      WVI = <span style={{ color: '#00f2fe' }}>0.25·C</span> + <span style={{ color: '#f5a623' }}>0.30·E</span> + <span style={{ color: '#ff4b4b' }}>0.30·K</span> + <span style={{ color: '#a78bfa' }}>0.15·F</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>Range: 0–100 · Weights sum to 1.00</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                      { key: 'C', label: 'Cyber Pillar', weight: '0.25 (25%)', color: '#00f2fe', desc: 'Digital attack surface and defensive capacity. Measures internet infrastructure dependency, known APT (Advanced Persistent Threat) activity, percentage of critical infrastructure exposed online, and state cyber-offensive capability.', sources: ['CrowdStrike APT Index', 'ITU Global Cybersecurity Index', 'CISA advisories', 'FireEye Threat Intelligence'] },
                      { key: 'E', label: 'Economic Pillar', weight: '0.30 (30%)', color: '#f5a623', desc: 'Structural economic fragility to conflict shocks. Tracks commodity export concentration (single-resource dependency), debt-to-GDP ratio, foreign currency reserve coverage, inflation volatility, and trade corridor exposure.', sources: ['IMF World Economic Outlook', 'World Bank WDI', 'OECD Trade data', 'UN Comtrade'] },
                      { key: 'K', label: 'Kinetic Pillar', weight: '0.30 (30%)', color: '#ff4b4b', desc: 'Physical conflict capacity and exposure. Covers active conflict incidents, border militarization, military expenditure as % of GDP, arms import dependency, internal displacement rates, and presence of non-state armed groups.', sources: ['UCDP/PRIO Armed Conflict Dataset', 'SIPRI Military Expenditure', 'ACLED Event Data', 'UNHCR Displacement'] },
                      { key: 'F', label: 'Fragmentation Score', weight: '0.15 (15%)', color: '#a78bfa', desc: 'Internal political and social cohesion. Derived from a sub-formula combining political violence index (Vi) and the ratio of political parties to social capital (Pp/Sc). High fragmentation means governance can be disrupted with minimal external force.', sources: ['V-Dem Institute', 'Polity V Dataset', 'Freedom House', 'Social Progress Index'] },
                    ].map(p => (
                      <div key={p.key} style={{ background: `${p.color}06`, border: `1px solid ${p.color}20`, borderRadius: 10, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${p.color}20`, border: `2px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: p.color, fontSize: '1rem' }}>{p.key}</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: p.color, fontSize: '0.88rem' }}>{p.label}</div>
                              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>weight: {p.weight}</div>
                            </div>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.77rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{p.desc}</p>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                          Sources: {p.sources.join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.12em', marginBottom: 8 }}>FRAGMENTATION SUB-FORMULA</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', color: '#a78bfa', marginBottom: 8 }}>
                      F = 0.6·Vi + 0.4·(Pp / Sc)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 24 }}>
                      <span><span style={{ color: '#a78bfa' }}>Vi</span> = Political Violence Index (0–100)</span>
                      <span><span style={{ color: '#a78bfa' }}>Pp</span> = Party Polarization score</span>
                      <span><span style={{ color: '#a78bfa' }}>Sc</span> = Social Cohesion score</span>
                    </div>
                  </div>
                </div>
              )}

              {guideTab === 'hven' && (
                <div>
                  <h3 style={{ color: '#a78bfa', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BrainCircuit size={16} /> HVEN-R War Prediction Model v2.1</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>The HVEN-R model forecasts the probability of a region entering armed conflict within a 2–10 year window. It combines five structural dimensions into a composite prediction score, then applies behavioral archetype amplifiers based on observed historical patterns.</p>

                  <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: 12 }}>BASE FORMULA</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', color: '#a78bfa', marginBottom: 8 }}>
                      P = <span style={{ color: '#ff4b4b' }}>0.25·H</span> + <span style={{ color: '#f5a623' }}>0.30·V</span> + <span style={{ color: '#ff4b4b' }}>0.25·E</span> + <span style={{ color: '#34d399' }}>0.15·N</span> + <span style={{ color: '#00f2fe' }}>0.05·R</span>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Adjusted Score = P × Behavioral Archetype Amplifier</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>Range: 0–100 · Confidence: ±8 points (95% CI)</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                    {[
                      { key: 'H', label: 'Historical Recurrence', weight: '0.25', color: '#ff4b4b', desc: 'How often has this region experienced major armed conflict in the last 75 years? Regions with repeated war cycles (like the Middle East or Central Africa) score higher. Conflict begets conflict.' },
                      { key: 'V', label: 'Current Volatility', weight: '0.30', color: '#f5a623', desc: 'Real-time instability signals: coup attempts, political assassinations, mass protests, government collapses, and military mobilization events in the last 24 months. Highest weight — the present predicts the near future.' },
                      { key: 'E', label: 'Escalation Pressure', weight: '0.25', color: '#ff4b4b', desc: 'Structural forces pushing toward conflict: elite defection rates, security force fracturing, external power interference, arms build-up, and unresolved territorial disputes.' },
                      { key: 'N', label: 'Neighbor Contagion', weight: '0.15', color: '#34d399', desc: 'Conflict spreads. Regions bordering active war zones absorb refugees, weapons, militants, and economic shocks. This dimension quantifies proximity-to-conflict spillover risk.' },
                      { key: 'R', label: 'Resource/Climate Stress', weight: '0.05', color: '#00f2fe', desc: 'Long-term structural driver. Water scarcity, arable land loss, resource competition (oil, minerals, rare earths), and climate-displacement pressure. Low weight reflects its role as a background multiplier.' },
                    ].map(p => (
                      <div key={p.key} style={{ background: `${p.color}06`, border: `1px solid ${p.color}20`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.color}20`, border: `2px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: p.color, fontSize: '1.1rem' }}>{p.key}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: p.color, fontSize: '0.85rem', marginBottom: 2 }}>{p.label}</div>
                          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>weight: {p.weight} ({parseFloat(p.weight)*100}%)</div>
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>{p.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ color: '#f5a623', marginBottom: 12 }}>Behavioral Archetype Amplifiers</h4>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 0 }}>When a region matches a behavioral archetype, its base HVEN score is multiplied by the amplifier. These are derived from historical pattern matching across 200+ conflicts since 1945.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { name: 'Nuclear Shadow Paradox', amp: '×1.42', color: '#ff4b4b', desc: 'Nuclear-armed states in conventional standoffs — paradoxically more likely to escalate below the nuclear threshold.' },
                      { name: 'Imperial Restoration', amp: '×1.35', color: '#f5a623', desc: 'Revisionist powers attempting to recover lost territory or sphere of influence. Russia, China, Iran exhibit this pattern.' },
                      { name: 'State Failure Cascade', amp: '×1.30', color: '#ff4b4b', desc: 'Multiple institutional failures compounding simultaneously — security, economy, governance. Sudan, Myanmar.' },
                      { name: 'Youth Bulge Mobilization', amp: '×1.28', color: '#a78bfa', desc: 'High youth unemployment + strong ethnic/religious identity + organizational capacity = insurgency precondition.' },
                      { name: 'Proxy Economy Perpetuation', amp: '×1.22', color: '#34d399', desc: 'External powers sustain conflict to advance strategic goals without direct intervention. Sahelian conflicts.' },
                      { name: 'Grievance Memory Cycle', amp: '×1.18', color: '#00f2fe', desc: 'Unresolved historic trauma (genocide, colonial injustice, territorial partition) that resurfaces generationally.' },
                    ].map(a => (
                      <div key={a.name} style={{ background: `${a.color}06`, border: `1px solid ${a.color}20`, borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: a.color }}>{a.name}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 900, color: '#f5a623' }}>{a.amp}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guideTab === 'conflict' && (
                <div>
                  <h3 style={{ color: '#ff4b4b', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} /> Conflict Type Classification</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>War type probabilities are calculated using a <strong style={{ color: '#00f2fe' }}>softmax function (temperature=18)</strong> applied to raw conflict-type scores derived from each country's capability profile, geopolitical context, and historical precedent.</p>
                  <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: '#a78bfa' }}>
                    softmax(xᵢ) = e^(xᵢ/T) / Σⱼ e^(xⱼ/T) · · · T = 18 (calibration temperature)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {Object.entries({
                      'Full Conventional': { color: '#ff4b4b', desc: 'Large-scale interstate or intrastate military operations with declared or de-facto state actors. Tank battles, air campaigns, naval engagements.' },
                      'Proxy / Grey-Zone': { color: '#a78bfa', desc: 'Externally sponsored non-state actors fighting on behalf of a foreign power. Deniable. Uses civilian militias, mercenaries, and irregular forces.' },
                      'Cyber / Digital': { color: '#00f2fe', desc: 'Attacks on critical digital infrastructure: power grids, financial systems, communications. Often precedes or accompanies kinetic action.' },
                      'Naval Blockade': { color: '#3b82f6', desc: 'Maritime interdiction to cut off supply chains, energy imports, or exports. Used to starve economies rather than capture territory.' },
                      'Border Skirmish': { color: '#f5a623', desc: 'Limited, localized military engagements along contested borders. Rarely escalates to full war but destabilizes regions and tests resolve.' },
                      'Maritime Escalation': { color: '#3b82f6', desc: 'Aggressive naval maneuvers, seizure of vessels, or confrontation in disputed waters. South China Sea, Strait of Hormuz patterns.' },
                      'Aerospace Corridor Denial': { color: '#f5a623', desc: 'Denial of airspace access through S-400 deployments, no-fly zones, or drone swarm interdiction. Emerging domain.' },
                      'Digital Subversion': { color: '#00f2fe', desc: 'Long-term information operations, election interference, social media manipulation. Weaponizes democratic openness.' },
                    }).map(([type, { color, desc }]) => (
                      <div key={type} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0, marginTop: 5 }} />
                        <div>
                          <div style={{ fontWeight: 700, color, fontSize: '0.82rem', marginBottom: 4 }}>{type}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guideTab === 'overlays' && (
                <div>
                  <h3 style={{ color: '#34d399', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={16} /> Map Infrastructure Overlays</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>Each overlay reveals a different layer of strategic vulnerability — the hidden chokepoints, supply lines, and asymmetric targets that define modern grey-zone conflict. Click any marker on the map for a detailed threat dossier.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { icon: Wifi, color: '#a78bfa', label: 'Digital Lifelines', desc: 'Subsea fiber-optic cables and internet exchange points. These carry 97% of international data traffic. Cutting just 2–3 key cables can sever a continent from the global financial system. Most are unprotected on the seafloor.', threat: 'Anchor drag sabotage, ROV cutting, state-sponsored "accidents"' },
                      { icon: Gem, color: '#34d399', label: 'Strategic Resources', desc: 'Critical mineral extraction and processing nodes: lithium (batteries/EVs), cobalt (defense electronics), rare earths (semiconductors), phosphate (global fertilizer). Controlling processing — not just mining — creates invisible chokepoints.', threat: 'Sabotage, proxy insurgency, export embargo, infrastructure attack' },
                      { icon: Rocket, color: '#f5a623', label: 'Asymmetric Vulnerabilities', desc: 'Nodes that appear civilian but are strategically decisive. Semiconductor packaging hubs, water treatment for mega-cities, vaccine cold-chain distribution centers, GPS ground stations. High damage, low attribution.', threat: 'Ransomware, insider threat, supply chain injection, physical sabotage' },
                      { icon: ShieldAlert, color: '#ff4b4b', label: 'Choke Points', desc: 'Maritime straits and canals where traffic bottlenecks create leverage: Strait of Hormuz (20% of global oil), Strait of Malacca (25% of trade), Bab el-Mandeb (Red Sea gateway), Suez Canal. Blocking any one triggers global supply shocks.', threat: 'Naval blockade, mine laying, Houthi-style drone strikes, territorial seizure' },
                      { icon: Anchor, color: '#00f2fe', label: 'Maritime Routes', desc: 'Major commercial shipping lanes colored by traffic volume. Darker blue = higher tonnage. These routes carry ~80% of global trade by volume. Disruption cascades into manufacturing shutdowns within 2–3 weeks.', threat: 'Piracy, naval harassment, sanctions enforcement, blockade' },
                      { icon: Ship, color: '#60a5fa', label: 'Naval Patrols', desc: 'Known operational areas of major naval powers. Blue = US/NATO patrol corridors, Red = Chinese PLAN operations, Yellow = Russian Black Sea / Arctic. Overlap zones indicate friction points.', threat: 'Incidents at sea, signaling escalation, FONOP (Freedom of Navigation) tensions' },
                    ].map(o => (
                      <div key={o.label} style={{ display: 'flex', gap: 16, padding: '16px 18px', background: `${o.color}06`, border: `1px solid ${o.color}20`, borderRadius: 10 }}>
                        <div style={{ flexShrink: 0, marginTop: 2 }}><o.icon size={20} style={{ color: o.color }} /></div>
                        <div>
                          <div style={{ fontWeight: 700, color: o.color, fontSize: '0.9rem', marginBottom: 5 }}>{o.label}</div>
                          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{o.desc}</p>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                            <span style={{ color: o.color, fontWeight: 600 }}>Threat vectors: </span>{o.threat}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  {selectedInfra.source === 'brain-predictions' && <><Zap size={12} style={{ display: 'inline', marginRight: 4, color: '#f97316' }} /> Predicted Threat</>}
                  {selectedInfra.source === 'border-disputes' && <><AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, color: '#ef4444' }} /> Border Skirmish</>}
                  {selectedInfra.source === 'critical-minerals' && <><Database size={12} style={{ display: 'inline', marginRight: 4, color: '#34d399' }} /> Critical Mineral Zone</>}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedInfra.properties.name}</h2>
              </div>
              <button onClick={() => setSelectedInfra(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
          </div>
          <div className="dossier-body">
            {selectedInfra.source === 'border-disputes' && (() => {
              const p = selectedInfra.properties;
              const threatColor = p.threat_level === 'ACTIVE WAR' ? '#ef4444' : p.threat_level === 'ACTIVE SKIRMISH' ? '#f97316' : p.threat_level === 'FROZEN CONFLICT' ? '#f5a623' : '#22d3ee';
              const warfareTypes: string[] = typeof p.warfare_types === 'string' ? JSON.parse(p.warfare_types) : (p.warfare_types || []);
              return (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ background: `${threatColor}18`, border: `1px solid ${threatColor}50`, borderRadius: 6, padding: '6px 12px', flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>THREAT LEVEL</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: threatColor, fontFamily: "'JetBrains Mono', monospace" }}>{p.threat_level}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px', flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SCORE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: threatColor, fontFamily: "'JetBrains Mono', monospace" }}>{p.threat_score}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 6 }}>WARFARE TYPES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {warfareTypes.map((wt: string) => (
                        <span key={wt} style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '2px 7px', color: '#fca5a5' }}>{wt}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>DOMINANT WARFARE</div>
                    <div style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 600 }}>{p.dominant_warfare}</div>
                  </div>
                  {p.nuclear_risk && p.nuclear_risk !== 'NONE' && (
                    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
                      <div style={{ fontSize: '0.62rem', color: '#fbbf24', letterSpacing: '0.1em', marginBottom: 2 }}>☢ NUCLEAR RISK</div>
                      <div style={{ fontSize: '0.78rem', color: '#fde68a' }}>{p.nuclear_risk}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>STATUS</div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{p.status}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>CASUALTIES</div>
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{p.casualties_estimate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>SUMMARY</div>
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{p.summary}</p>
                  </div>
                </>
              );
            })()}
            {selectedInfra.source === 'critical-minerals' && (() => {
              const p = selectedInfra.properties;
              const minerals: string[] = typeof p.minerals === 'string' ? JSON.parse(p.minerals) : (p.minerals || []);
              return (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ background: `${p.color}18`, border: `1px solid ${p.color}50`, borderRadius: 6, padding: '6px 12px', flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>PRIMARY MINERAL</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>{p.primary_mineral}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px', flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>GLOBAL SHARE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>{p.global_share_pct}%</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 6 }}>MINERALS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {minerals.map((m: string) => (
                        <span key={m} style={{ fontSize: '0.65rem', background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: 4, padding: '2px 7px', color: p.color }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>WARFARE TYPE</div>
                    <div style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 600 }}>{p.warfare_type}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>THREAT ACTOR</div>
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{p.threat_actor}</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: '#ef4444', letterSpacing: '0.1em', marginBottom: 4 }}>ATTACK RISK</div>
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{p.attack_risk}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>CONFLICT STATUS</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{p.conflict_status}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>STRATEGIC SUMMARY</div>
                    <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{p.summary}</p>
                  </div>
                  {p.wounding_strategy && (
                    <>
                      <h4 style={{ margin: '16px 0 8px 0', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} /> Wounding Strategy
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{p.wounding_strategy}</p>
                    </>
                  )}
                </>
              );
            })()}
            {selectedInfra.source !== 'border-disputes' && selectedInfra.source !== 'critical-minerals' && (
              <>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Right Panel: Live Status + Overlays + Legend ─── */}
      <div className="glass-panel right-panel">
        {/* Live DB header */}
        <div className="right-panel-header" onClick={() => setShowPipeline(!showPipeline)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="live-dot" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#34d399' }}>LIVE DATABASE</span>
          </div>
          <Database size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* Overlay toggles */}
        <div style={{ padding: '10px 12px 4px' }}>
          <div className="label-text" style={{ marginBottom: 8, color: 'rgba(255,255,255,0.4)' }}>OVERLAYS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { show: showConflictRegions, set: setShowConflictRegions, icon: <Globe size={13} />, color: '#ef4444', label: 'Conflict Regions' },
            { show: showDigital,   set: setShowDigital,   icon: <Wifi size={13} />,         color: '#a78bfa', label: 'Digital Lifelines' },
              { show: showStrategic, set: setShowStrategic, icon: <Gem size={13} />,          color: '#34d399', label: 'Strategic Resources' },
              { show: showAsymmetric,set: setShowAsymmetric,icon: <Rocket size={13} />,       color: '#f5a623', label: 'Asymmetric Vulns' },
              { show: showShipping,  set: setShowShipping,  icon: <Anchor size={13} />,       color: '#00f2fe', label: 'Maritime Routes' },
              { show: showPatrols,   set: setShowPatrols,   icon: <Ship size={13} />,         color: '#60a5fa', label: 'Naval Patrols' },
              { show: showChokePoints,set:setShowChokePoints,icon:<ShieldAlert size={13} />,  color: '#ff4b4b', label: 'Choke Points' },
              { show: showBrainPredictions, set: setShowBrainPredictions, icon: <Zap size={13} />, color: '#f97316', label: 'Predicted Threats' },
              { show: showBorderDisputes, set: setShowBorderDisputes, icon: <AlertTriangle size={13} />, color: '#ef4444', label: 'Border Skirmishes' },
              { show: showMinerals, set: setShowMinerals, icon: <Database size={13} />, color: '#34d399', label: 'Critical Minerals' },
              { show: showWarRegions, set: setShowWarRegions, icon: <BrainCircuit size={13} />, color: '#ff4b4b', label: 'War Prediction Zones' },
            ].map(({ show, set, icon, color, label }) => (
              <button key={label} onClick={() => set(!show)} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: show ? `${color}14` : 'transparent',
                border: `1px solid ${show ? color + '40' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 7, padding: '6px 10px', cursor: 'pointer', transition: 'all 0.2s',
                color: show ? color : 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 500, width: '100%', textAlign: 'left'
              }}>
                <span style={{ color: show ? color : 'rgba(255,255,255,0.25)', display: 'flex' }}>{icon}</span>
                {label}
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: show ? color : 'rgba(255,255,255,0.1)', boxShadow: show ? `0 0 6px ${color}` : 'none', transition: 'all 0.2s', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* WVI Scale */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="label-text" style={{ color: 'rgba(255,255,255,0.4)' }}>WVI SCALE</div>
            <div className="label-text" style={{ color: 'rgba(255,255,255,0.25)' }}>0 → 100</div>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
            {['#0ea5e9','#22d3ee','#f5a623','#ef4444','#b91c1c','#7f1d1d'].map(c => (
              <div key={c} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
            <span>LOW</span><span>MED</span><span>HIGH</span>
          </div>
        </div>
      </div>

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
          {hoverInfo.feature.source === 'conflict-regions' && (() => {
            const p = hoverInfo.feature.properties;
            const score = p.prediction_score;
            const color = p.color;
            return (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={13} style={{ color }} />
                  <span style={{ color }}>{p.name}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{p.subtitle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace" }}>{score}</div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color, fontWeight: 700 }}>CONFLICT SCORE</div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>{p.confidence}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,120,120,0.8)', marginTop: 4 }}>{p.trajectory}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 3 }}>Click to open full analysis</div>
              </>
            );
          })()}
          {(hoverInfo.feature.source === 'active-hotspots-source' || hoverInfo.feature.layer?.id === 'active-hotspots-layer') && (
            <>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Target size={13} style={{ color: '#ff4b4b' }} /> {hoverInfo.feature.properties.name}</div>
              <div className="metric-value" style={{ color: '#ff4b4b', fontSize: '0.8rem', marginTop: 3 }}>{hoverInfo.feature.properties.threat}</div>
            </>
          )}
          {hoverInfo.feature.source === 'war-predictions' && (() => {
            const p = hoverInfo.feature.properties;
            const isFlashpoint = p.layer_type === 'flashpoint';
            const accentColor = isFlashpoint ? '#f5a623' : '#ff4b4b';
            const score = p.prediction_score;
            return (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BrainCircuit size={13} style={{ color: accentColor }} />
                  <span style={{ color: accentColor }}>{p.region || p.flashpoint}</span>
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: accentColor, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, borderRadius: 3, padding: '1px 6px', display: 'inline-block', marginTop: 3, letterSpacing: '0.08em' }}>
                  {isFlashpoint ? 'EMERGING FLASHPOINT' : p.trajectory}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: accentColor, fontFamily: "'JetBrains Mono', monospace" }}>{score}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{isFlashpoint ? 'RISK SCORE' : 'PREDICTION SCORE'}</div>
                </div>
                {p.timeframe && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{p.timeframe}</div>}
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for full analysis</div>
              </>
            );
          })()}
          {hoverInfo.feature.source === 'border-disputes' && (() => {
            const p = hoverInfo.feature.properties;
            const threatColor = p.threat_level === 'ACTIVE WAR' ? '#ef4444' : p.threat_level === 'ACTIVE SKIRMISH' ? '#f97316' : p.threat_level === 'FROZEN CONFLICT' ? '#f5a623' : '#22d3ee';
            return (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={13} style={{ color: threatColor }} />
                  <span style={{ color: threatColor }}>{p.name}</span>
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: threatColor, background: `${threatColor}18`, border: `1px solid ${threatColor}40`, borderRadius: 3, padding: '1px 6px', display: 'inline-block', marginTop: 3, letterSpacing: '0.08em' }}>{p.threat_level}</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{p.dominant_warfare}</div>
                {p.nuclear_risk && p.nuclear_risk !== 'LOW' && p.nuclear_risk !== 'NONE' && (
                  <div style={{ fontSize: '0.62rem', color: '#fbbf24', marginTop: 3 }}>☢ Nuclear Risk: {p.nuclear_risk}</div>
                )}
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for full analysis</div>
              </>
            );
          })()}
          {hoverInfo.feature.source === 'critical-minerals' && (() => {
            const p = hoverInfo.feature.properties;
            return (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Database size={13} style={{ color: p.color || '#34d399' }} />
                  <span style={{ color: p.color || '#34d399' }}>{p.country}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{p.primary_mineral} · {p.global_share_pct}% global share</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,180,80,0.8)', marginTop: 3 }}>{p.warfare_type}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for strategic analysis</div>
              </>
            );
          })()}
          {hoverInfo.feature.source === 'brain-predictions' && (() => {
            const p = hoverInfo.feature.properties;
            const isBlackSwan = p.risk === 'Black Swan Wounding Zone';
            const accentColor = isBlackSwan ? '#fb923c' : '#f97316';
            return (
              <>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={13} style={{ color: accentColor }} />
                  <span style={{ color: accentColor }}>{p.name}</span>
                </div>
                {isBlackSwan && (
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 3, padding: '1px 6px', display: 'inline-block', marginTop: 3, letterSpacing: '0.08em' }}>
                    BLACK SWAN WOUNDING ZONE
                  </div>
                )}
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,180,80,0.8)', marginTop: 3 }}>{p.behavioral_strategy || p.type}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: accentColor, fontFamily: "'JetBrains Mono', monospace" }}>{p.confidence || p.prediction_confidence}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>CONFIDENCE</div>
                </div>
                {p.timeframe && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{p.timeframe}</div>}
                {p.strategic_impact && <div style={{ fontSize: '0.62rem', color: '#fb923c', marginTop: 3 }}>{p.strategic_impact}</div>}
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4 }}>Click for full analysis</div>
              </>
            );
          })()}
        </div>
      )}

      {/* ─── Country Dashboard ─── */}
      {selectedCountry && (forecastData || intelligenceData) && (
        <div className="glass-panel slide-in-bottom" style={{ position: 'absolute', bottom: 20, left: '2%', right: '2%', display: 'flex', gap: 0, height: '45vh', zIndex: 20, overflow: 'hidden' }}>
          {/* Col 1 – WVI + Fragmentation */}
          <div style={{ flex: '0 0 220px', padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Target size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedCountry}</span>
            </div>
            <WVIRing score={reactiveWVI} color={wviColor} />
            <span className="label-text" style={{ marginTop: 8 }}>Wound Vulnerability Index</span>
            <span style={{ fontSize: '0.68rem', color: wviColor, marginTop: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
              {reactiveWVI > 75 ? 'CRITICAL' : reactiveWVI > 50 ? 'ELEVATED' : 'STABLE'}
            </span>

            {/* WVI pillar scores */}
            {intelligenceData?.pillars && (
              <div style={{ width: '100%', marginTop: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { key: 'C', label: 'Cyber', pillar: 'cyber', color: '#00f2fe' },
                    { key: 'E', label: 'Econ', pillar: 'economic', color: '#f5a623' },
                    { key: 'K', label: 'Kinetic', pillar: 'kinetic', color: '#ff4b4b' },
                    { key: 'F', label: 'Frag', pillar: 'fragmentation', color: '#a78bfa' },
                  ].map(({ key, label, pillar, color }) => {
                    const score = pillar === 'fragmentation'
                      ? intelligenceData.pillars.fragmentation?.score ?? 0
                      : intelligenceData.pillars[pillar]?.overall_score ?? 0;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color, width: 12, flexShrink: 0 }}>{key}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color, width: 24, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
              {Object.entries(intelligenceData?.pillars ?? {})
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

            {activeTab === 'hotspots' && forecastData?.future_hotspots && (
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
