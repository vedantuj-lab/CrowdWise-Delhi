import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Circle,
  Map as GoogleMap,
  InfoWindow,
  Pin,
  Polyline,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Crosshair,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Plus,
  Radio,
  Satellite,
  X,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import {
  CrowdingEstimate,
  CrowdingLevel,
  Stop,
  VehiclePositionsResponse,
} from '../../types/transit';
import { ConfidenceBadge, ESTIMATE_TYPE_LABELS } from '../crowding/ConfidenceBadge';
import { CROWDING_META, CrowdingBadge } from '../crowding/CrowdingBadge';
import { DemoDataTag } from '../common/StateBlocks';

export interface MapSegmentOverlay {
  segmentId: string;
  routeShortName: string;
  directionLabel: string;
  fromStop: Stop;
  toStop: Stop;
  path: Array<{ lat: number; lng: number }>;
  crowding: CrowdingEstimate;
}

interface DelhiTransitMapProps {
  stops?: Stop[];
  segments?: MapSegmentOverlay[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (segment: MapSegmentOverlay) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stop: Stop) => void;
  userLocation?: { lat: number; lng: number } | null;
  onUserLocationDetected?: (coords: { lat: number; lng: number }) => void;
  heightClass?: string;
  showHeatmapDefault?: boolean;
  title?: string;
}

const DELHI_CENTER = { lat: 28.6139, lng: 77.209 };

const LEVEL_HEX: Record<CrowdingLevel, string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  very_high: '#F43F5E',
  insufficient_data: '#64748B',
};

const ROUTE_COLORS: Record<string, string> = {
  '405': '#14B8A6',
  '502': '#3B82F6',
  '543': '#F97316',
  '85EXT': '#FACC15',
  '729': '#22D3EE',
  '764': '#A855F7',
  '620': '#10B981',
  '429': '#EC4899',
  '534': '#38BDF8',
  '347': '#FB7185',
};

function getSegmentColor(seg: MapSegmentOverlay, colorMode: 'crowding' | 'route'): string {
  if (colorMode === 'route') {
    return ROUTE_COLORS[seg.routeShortName] || '#38BDF8';
  }
  return LEVEL_HEX[seg.crowding.crowdingLevel] || LEVEL_HEX.insufficient_data;
}

function MapCameraController({
  center,
  zoom,
  stops,
  segments,
  recenterSignal,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  stops: Stop[];
  segments: MapSegmentOverlay[];
  recenterSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (segments.length > 0 || stops.length > 1) {
      let north = -Infinity;
      let south = Infinity;
      let east = -Infinity;
      let west = Infinity;
      let hasPoints = false;

      const extend = (lat: number, lng: number) => {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng > east) east = lng;
        if (lng < west) west = lng;
        hasPoints = true;
      };

      for (const s of stops) {
        extend(s.stop_lat, s.stop_lng);
      }
      for (const seg of segments) {
        for (const p of seg.path) {
          extend(p.lat, p.lng);
        }
      }
      if (hasPoints) {
        map.fitBounds({ north, south, east, west }, { top: 48, right: 48, bottom: 48, left: 48 });
        return;
      }
    }
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, recenterSignal, segments, stops, center, zoom]);

  return null;
}

function InteractiveGoogleMapInner({
  stops,
  segments,
  selectedSegmentId,
  onSelectSegment,
  selectedStopId,
  onSelectStop,
  userLocation,
  mapTypeId,
  showHeatmap,
  colorMode,
  zoom,
  center,
  recenterSignal,
  onMapsLoadError,
}: {
  stops: Stop[];
  segments: MapSegmentOverlay[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (segment: MapSegmentOverlay) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stop: Stop) => void;
  userLocation?: { lat: number; lng: number } | null;
  mapTypeId: 'roadmap' | 'satellite';
  showHeatmap: boolean;
  colorMode: 'crowding' | 'route';
  zoom: number;
  center: { lat: number; lng: number };
  recenterSignal: number;
  onMapsLoadError: () => void;
}) {
  const status = useApiLoadingStatus();
  const [infoStop, setInfoStop] = useState<Stop | null>(null);

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onMapsLoadError();
    }
  }, [status, onMapsLoadError]);

  const heatmapCircles = useMemo(() => {
    if (!showHeatmap) return [];
    const weightMap: Record<CrowdingLevel, { radius: number; opacity: number; color: string }> = {
      low: { radius: 420, opacity: 0.16, color: '#10B981' },
      moderate: { radius: 550, opacity: 0.22, color: '#F59E0B' },
      high: { radius: 700, opacity: 0.28, color: '#F97316' },
      very_high: { radius: 850, opacity: 0.36, color: '#F43F5E' },
      insufficient_data: { radius: 0, opacity: 0, color: '#64748B' },
    };
    return segments
      .filter((s) => s.crowding.crowdingLevel !== 'insufficient_data')
      .map((s) => {
        const midLat = (s.fromStop.stop_lat + s.toStop.stop_lat) / 2;
        const midLng = (s.fromStop.stop_lng + s.toStop.stop_lng) / 2;
        const cfg = weightMap[s.crowding.crowdingLevel];
        return { id: s.segmentId, center: { lat: midLat, lng: midLng }, ...cfg };
      });
  }, [showHeatmap, segments]);

  return (
    <GoogleMap
      defaultCenter={DELHI_CENTER}
      defaultZoom={12}
      center={center}
      zoom={zoom}
      mapId="DEMO_MAP_ID"
      mapTypeId={mapTypeId}
      gestureHandling="greedy"
      disableDefaultUI
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      className="h-full w-full"
    >
      <MapCameraController
        center={center}
        zoom={zoom}
        stops={stops}
        segments={segments}
        recenterSignal={recenterSignal}
      />

      {segments.map((seg) => {
        const isSelected = selectedSegmentId === seg.segmentId;
        const color = getSegmentColor(seg, colorMode);
        return (
          <Polyline
            key={seg.segmentId}
            path={seg.path}
            strokeColor={color}
            strokeOpacity={isSelected ? 1 : 0.88}
            strokeWeight={isSelected ? 7.5 : 4.5}
            onClick={() => onSelectSegment?.(seg)}
          />
        );
      })}

      {heatmapCircles.map((c) => (
        <Circle
          key={`heat_${c.id}`}
          center={c.center}
          radius={c.radius}
          fillColor={c.color}
          fillOpacity={c.opacity}
          strokeWeight={0}
        />
      ))}

      {stops.map((stop) => {
        const isSelected = selectedStopId === stop.stop_id;
        return (
          <AdvancedMarker
            key={stop.stop_id}
            position={{ lat: stop.stop_lat, lng: stop.stop_lng }}
            title={`${stop.stop_name} (${stop.stop_code})`}
            onClick={() => {
              setInfoStop(stop);
              onSelectStop?.(stop);
            }}
          >
            <Pin
              background={isSelected ? '#14B8A6' : '#0F172A'}
              borderColor={isSelected ? '#FACC15' : '#FFFFFF'}
              glyphColor="#FFFFFF"
              scale={isSelected ? 1.15 : 0.88}
            />
          </AdvancedMarker>
        );
      })}

      {userLocation && (
        <AdvancedMarker position={userLocation} title="Your detected location">
          <div className="h-4 w-4 rounded-full border-2 border-white bg-teal-500 shadow-md" />
        </AdvancedMarker>
      )}

      {infoStop && (
        <InfoWindow
          position={{ lat: infoStop.stop_lat, lng: infoStop.stop_lng }}
          onCloseClick={() => setInfoStop(null)}
        >
          <div className="max-w-xs p-1 text-slate-900">
            <div className="text-xs font-mono text-slate-500">
              {infoStop.stop_id} · {infoStop.stop_code}
            </div>
            <div className="mt-0.5 text-sm font-semibold">{infoStop.stop_name}</div>
            <div className="mt-0.5 text-xs text-slate-600">{infoStop.stop_desc}</div>
            <div className="mt-1.5 text-[11px] text-slate-600">
              Bus routes: {infoStop.routes_served.join(', ')}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

// Honest GTFS Coordinate Schematic Fallback (when Maps key missing or quota reached)
function GtfsSchematicPreview({
  stops,
  segments,
  selectedSegmentId,
  onSelectSegment,
  selectedStopId,
  onSelectStop,
  colorMode,
  reasonMessage,
}: {
  stops: Stop[];
  segments: MapSegmentOverlay[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (segment: MapSegmentOverlay) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stop: Stop) => void;
  colorMode: 'crowding' | 'route';
  reasonMessage: string;
}) {
  const allPoints = useMemo(() => {
    const pts: Array<{ lat: number; lng: number }> = [];
    for (const s of stops) pts.push({ lat: s.stop_lat, lng: s.stop_lng });
    for (const seg of segments) {
      for (const p of seg.path) pts.push(p);
    }
    if (pts.length === 0) {
      pts.push({ lat: 28.54, lng: 77.08 }, { lat: 28.7, lng: 77.32 });
    }
    return pts;
  }, [stops, segments]);

  const bounds = useMemo(() => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of allPoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    const padLat = Math.max(0.015, (maxLat - minLat) * 0.16);
    const padLng = Math.max(0.02, (maxLng - minLng) * 0.16);
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [allPoints]);

  const project = useCallback(
    (lat: number, lng: number) => {
      const w = 800;
      const h = 440;
      const x = ((lng - bounds.minLng) / Math.max(0.001, bounds.maxLng - bounds.minLng)) * w;
      const y = h - ((lat - bounds.minLat) / Math.max(0.001, bounds.maxLat - bounds.minLat)) * h;
      return { x, y };
    },
    [bounds]
  );

  return (
    <div className="relative h-full w-full bg-[#070C18] text-slate-100 overflow-hidden select-none">
      <svg
        viewBox="0 0 800 440"
        className="h-full w-full"
        role="img"
        aria-label="Delhi GTFS Bus Network Coordinate Schematic"
      >
        <defs>
          <pattern id="gtfs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="800" height="440" fill="#070C18" />
        <rect width="800" height="440" fill="url(#gtfs-grid)" />

        {segments.map((seg) => {
          const pts = seg.path
            .map((p) => {
              const { x, y } = project(p.lat, p.lng);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          const isSelected = selectedSegmentId === seg.segmentId;
          const color = getSegmentColor(seg, colorMode);
          return (
            <polyline
              key={seg.segmentId}
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isSelected ? 6.5 : 3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cursor-pointer opacity-90 hover:opacity-100"
              onClick={() => onSelectSegment?.(seg)}
            />
          );
        })}

        {stops.map((stop) => {
          const { x, y } = project(stop.stop_lat, stop.stop_lng);
          const isSelected = selectedStopId === stop.stop_id;
          return (
            <g
              key={stop.stop_id}
              transform={`translate(${x},${y})`}
              className="cursor-pointer"
              onClick={() => onSelectStop?.(stop)}
            >
              <circle
                r={isSelected ? 7 : 5}
                fill={isSelected ? '#14B8A6' : '#F8FAFC'}
                stroke="#070C18"
                strokeWidth={2}
              />
              <text
                x={8}
                y={4}
                fontSize={10}
                fill={isSelected ? '#5EEAD4' : '#CBD5E1'}
                className="font-sans pointer-events-none"
              >
                {stop.stop_name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute top-3 left-3 max-w-md rounded-lg border border-slate-700 bg-[#0B1222]/90 px-3 py-2 text-xs text-slate-200 backdrop-blur">
        <div className="font-semibold text-amber-300">GTFS Coordinate Schematic Preview</div>
        <p className="mt-0.5 text-[11px] text-slate-300">{reasonMessage}</p>
      </div>
    </div>
  );
}

export function DelhiTransitMap({
  stops = [],
  segments = [],
  selectedSegmentId,
  onSelectSegment,
  selectedStopId,
  onSelectStop,
  userLocation,
  onUserLocationDetected,
  heightClass = 'h-[440px]',
  showHeatmapDefault = false,
  title = 'Delhi Bus Network & Segment Crowding Map',
}: DelhiTransitMapProps) {
  const { mapsApiKey, mapsQuotaExceeded, pushToast } = useAppState();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showHeatmap, setShowHeatmap] = useState(showHeatmapDefault);
  const [colorMode, setColorMode] = useState<'crowding' | 'route'>('crowding');
  const [showVehicles, setShowVehicles] = useState(false);
  const [vehicleState, setVehicleState] = useState<VehiclePositionsResponse | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [center, setCenter] = useState(DELHI_CENTER);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [mapsRuntimeError, setMapsRuntimeError] = useState(false);
  const [activeSegment, setActiveSegment] = useState<MapSegmentOverlay | null>(null);

  useEffect(() => {
    if (selectedSegmentId) {
      const found = segments.find((s) => s.segmentId === selectedSegmentId);
      if (found) setActiveSegment(found);
    }
  }, [selectedSegmentId, segments]);

  const handleSelectSegment = useCallback(
    (seg: MapSegmentOverlay) => {
      setActiveSegment(seg);
      onSelectSegment?.(seg);
    },
    [onSelectSegment]
  );

  const handleToggleVehicles = async () => {
    const next = !showVehicles;
    setShowVehicles(next);
    if (next) {
      const res = await transitApi.getVehiclePositions();
      setVehicleState(res);
      if (res.feedStatus === 'unavailable') {
        pushToast('GTFS-Realtime vehicle feed unavailable — no synthetic bus markers shown.', 'info');
      }
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      pushToast('Browser geolocation is not available on this device.', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setZoom(14);
        onUserLocationDetected?.(coords);
        pushToast('Centered map near your current location.', 'success');
      },
      () => {
        pushToast('Location permission denied. You can still search Delhi stops manually.', 'info');
      },
      { timeout: 6000 }
    );
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        setIsFullscreen((v) => !v);
      }
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const useLiveGoogleMap = Boolean(mapsApiKey) && !mapsQuotaExceeded && !mapsRuntimeError;

  const fallbackReason = mapsQuotaExceeded
    ? 'Google Maps Platform quota reached in this session; displaying GTFS vector coordinates.'
    : mapsRuntimeError
    ? 'Google Maps failed to initialize (check API key restrictions); displaying GTFS coordinate schematic.'
    : 'Google Maps API key is not configured. Add VITE_GOOGLE_MAPS_API_KEY to enable interactive map tiles.';

  return (
    <div
      ref={containerRef}
      className={`cw-card rounded-2xl overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl' : ''
      }`}
    >
      {/* Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[var(--cw-surface-alt)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <DemoDataTag label="GTFS GEOMETRY" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {useLiveGoogleMap && (
            <>
              <button
                type="button"
                onClick={() =>
                  setMapTypeId((m) => (m === 'roadmap' ? 'satellite' : 'roadmap'))
                }
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  mapTypeId === 'satellite'
                    ? 'border-teal-400/50 bg-teal-500/20 text-teal-200'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Satellite className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{mapTypeId === 'satellite' ? 'Satellite' : 'Standard'}</span>
              </button>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(18, z + 1))}
                aria-label="Zoom in"
                className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(9, z - 1))}
                aria-label="Zoom out"
                className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCenter(DELHI_CENTER);
                  setZoom(12);
                  setRecenterSignal((s) => s + 1);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Recenter</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setColorMode((c) => (c === 'crowding' ? 'route' : 'crowding'))}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              colorMode === 'route'
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{colorMode === 'route' ? 'Route Colors' : 'Crowding Colors'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeatmap((h) => !h)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              showHeatmap
                ? 'border-orange-400/50 bg-orange-500/20 text-orange-200'
                : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Demand Density</span>
          </button>

          <button
            type="button"
            onClick={handleToggleVehicles}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              showVehicles
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Vehicle Feed</span>
          </button>

          <button
            type="button"
            onClick={handleLocateUser}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0"
          >
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            <span>My Location</span>
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* GTFS-RT Feed Unavailable Banner when Vehicle Layer enabled */}
      {showVehicles && vehicleState && (
        <div className="border-b border-white/10 bg-[#050914] px-4 py-2 text-xs text-slate-200 flex items-center justify-between gap-3">
          <span>
            <strong className="text-amber-300">Vehicle Feed Unavailable:</strong>{' '}
            {vehicleState.message}
          </span>
          <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
            Expected: {vehicleState.expectedEndpoint}
          </span>
        </div>
      )}

      {/* Map Viewport + Segment Side Panel */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1 min-h-0' : heightClass}`}>
        {useLiveGoogleMap && mapsApiKey ? (
          <APIProvider apiKey={mapsApiKey} libraries={['marker']} language="en" region="IN">
            <InteractiveGoogleMapInner
              stops={stops}
              segments={segments}
              selectedSegmentId={selectedSegmentId || activeSegment?.segmentId}
              onSelectSegment={handleSelectSegment}
              selectedStopId={selectedStopId}
              onSelectStop={onSelectStop}
              userLocation={userLocation}
              mapTypeId={mapTypeId}
              showHeatmap={showHeatmap}
              colorMode={colorMode}
              zoom={zoom}
              center={center}
              recenterSignal={recenterSignal}
              onMapsLoadError={() => setMapsRuntimeError(true)}
            />
          </APIProvider>
        ) : (
          <GtfsSchematicPreview
            stops={stops}
            segments={segments}
            selectedSegmentId={selectedSegmentId || activeSegment?.segmentId}
            onSelectSegment={handleSelectSegment}
            selectedStopId={selectedStopId}
            onSelectStop={onSelectStop}
            colorMode={colorMode}
            reasonMessage={fallbackReason}
          />
        )}

        {/* Selected Segment Information Panel */}
        {activeSegment && (
          <div className="absolute bottom-3 right-3 z-20 w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-700 bg-[#0B1222]/95 p-3.5 shadow-2xl backdrop-blur text-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-teal-300">
                  Route {activeSegment.routeShortName} · {activeSegment.directionLabel}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {activeSegment.fromStop.stop_name} → {activeSegment.toStop.stop_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSegment(null)}
                aria-label="Close segment details"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <CrowdingBadge level={activeSegment.crowding.crowdingLevel} compact />
              <ConfidenceBadge confidence={activeSegment.crowding.confidence} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 text-xs">
              <div>
                <dt className="text-slate-400">Time Band</dt>
                <dd className="font-medium capitalize text-white">
                  {activeSegment.crowding.timeBand.replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Coverage</dt>
                <dd className="font-mono tabular-nums font-medium text-white">
                  {activeSegment.crowding.coverage.coverageLabel}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">Estimate Type</dt>
                <dd className="font-medium text-white">
                  {ESTIMATE_TYPE_LABELS[activeSegment.crowding.estimateType]}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-amber-300">{activeSegment.crowding.disclaimer}</p>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[var(--cw-surface-alt)] px-4 py-2 text-xs text-[var(--cw-text-secondary)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-white">
            {colorMode === 'route' ? 'Distinct Route Colors:' : 'Segment Demand Legend:'}
          </span>
          {colorMode === 'crowding'
            ? (['low', 'moderate', 'high', 'very_high', 'insufficient_data'] as CrowdingLevel[]).map(
                (lvl) => (
                  <span key={lvl} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-4 rounded-sm"
                      style={{ backgroundColor: CROWDING_META[lvl].hex }}
                    />
                    <span>{CROWDING_META[lvl].shortLabel}</span>
                  </span>
                )
              )
            : Object.entries(ROUTE_COLORS)
                .slice(0, 6)
                .map(([num, hex]) => (
                  <span key={num} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: hex }} />
                    <span>Bus {num}</span>
                  </span>
                ))}
        </div>
        <span className="text-[11px] text-[var(--cw-text-muted)]">
          Click any segment polyline or bus stop pin to inspect GTFS &amp; crowding metadata.
        </span>
      </div>
    </div>
  );
}
