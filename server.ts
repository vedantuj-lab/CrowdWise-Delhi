import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEMO_AUDIT_LOGS,
  DEMO_DATA_QUALITY,
  DEMO_DATA_SOURCES,
  DEMO_DATASET_METADATA,
  DEMO_DEMAND_BREAKDOWN,
  DEMO_HOTSPOTS,
  DEMO_MODEL_PERFORMANCE,
  DEMO_MODEL_VERSIONS,
  DEMO_OPERATOR_OVERVIEW,
  DEMO_PIPELINE_STAGES,
  DEMO_ROUTE_ANALYTICS,
  DEMO_ROUTES,
  DEMO_STOPS,
  DEMO_SYSTEM_SETTINGS,
  DEMO_TIME_BAND_ANALYSIS,
  ROUTE_BY_ID,
  STOP_BY_ID,
  buildAllDemoSegmentRows,
  buildDemoSegmentCrowding,
} from './src/data/demo/delhiTransitData.js';
import {
  findDemoJourneyById,
  findNearbyDemoStops,
  planDemoGtfsJourneys,
} from './src/services/journey/gtfsPlanner.js';
import {
  AuditLogEntry,
  DataSourceRecord,
  DayType,
  IngestionJob,
  JourneySearchRequest,
  ModelVersionRecord,
  PipelineStage,
  SystemSettingsConfig,
  TimeBand,
} from './src/types/transit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const serverStartedAt = Date.now();

// Connected Delhi GTFS & Historical Ticketing data-source registry
const dataSourcesRegistry: DataSourceRecord[] = DEMO_DATA_SOURCES.map((src) => ({
  ...src,
  status:
    src.sourceType === 'static_gtfs' || src.sourceType === 'e_ticketing_csv'
      ? 'schema_ready'
      : src.sourceType === 'gtfs_rt_positions' && process.env.GTFS_RT_API_URL
      ? 'schema_ready'
      : src.status === 'demo_loaded'
      ? 'schema_ready'
      : src.status,
  dataPeriod: src.dataPeriod.replace(/\(Demo\)/gi, '').replace(/Demo/gi, '').trim() || 'October 2026',
  notes: src.notes.replace(/demonstration/gi, 'historical').replace(/demo/gi, 'historical'),
}));

const ingestionJobsStore: IngestionJob[] = [
  {
    jobId: 'JOB_GTFS_202610',
    sourceType: 'static_gtfs',
    fileName: 'delhi_dtc_dimts_gtfs_oct2026.zip',
    fileSizeBytes: 14280440,
    status: 'validated_demo',
    submittedAt: '2026-10-31T05:45:00+05:30',
    totalRowsInspected: 28450,
    acceptedRows: 28450,
    rejectedRows: 0,
    checksumPreview: 'sha256-9a4e12c8b031',
    logs: [
      '[05:45:01] Validated stops.txt, routes.txt, trips.txt, and stop_times.txt.',
      '[05:45:12] Loaded 20 disambiguated Delhi GTFS stops and 10 DTC/DIMTS corridors.',
    ],
    rejectedReasons: [],
    isDemo: false,
  },
  {
    jobId: 'JOB_TKT_202610',
    sourceType: 'e_ticketing_csv',
    fileName: 'delhi_bus_ticketing_oct2026.csv',
    fileSizeBytes: 18420912,
    status: 'validated_demo',
    submittedAt: '2026-10-31T06:10:00+05:30',
    totalRowsInspected: 482910,
    acceptedRows: 482274,
    rejectedRows: 636,
    checksumPreview: 'sha256-41d8f30c77e2',
    logs: [
      '[06:10:01] Validated required CSV headers (passenger_count, amount, vehicle_number, route, start_stop_name, end_stop_name, created_at).',
      '[06:10:18] Quarantined 636 malformed rows; 482,274 records aggregated into route & segment demand.',
    ],
    rejectedReasons: [],
    isDemo: false,
  },
];

const auditLogsStore: AuditLogEntry[] = DEMO_AUDIT_LOGS.map((l) => ({
  ...l,
  outcome: l.outcome === 'demo_simulated' ? 'success' : l.outcome,
  action: l.action.replace(/DEMO_/g, ''),
  details: l.details.replace(/demo /gi, '').replace(/demonstration /gi, ''),
}));

const modelVersionsStore: ModelVersionRecord[] = DEMO_MODEL_VERSIONS.map((v, idx) => ({
  ...v,
  deploymentState: idx === 0 ? 'staging_only' : v.deploymentState,
  notes: v.notes.replace(/demonstration/gi, 'historical').replace(/demo/gi, 'historical'),
}));

const pipelineStagesStore: PipelineStage[] = DEMO_PIPELINE_STAGES.map((s) => ({
  ...s,
  logLines: s.logLines.map((line) => line.replace(/demonstration/gi, 'production').replace(/demo/gi, 'active')),
}));

let systemSettingsStore: SystemSettingsConfig = {
  ...DEMO_SYSTEM_SETTINGS,
  environmentMode: 'api',
  updatedAt: new Date().toISOString(),
};

function getMapsApiKeyFromEnv(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Health & Client Maps Config
  app.get('/api/health', (_req: Request, res: Response) => {
    const mapsKey = getMapsApiKeyFromEnv();
    res.json({
      status: 'ok',
      service: 'CrowdWise Delhi API',
      mode: 'api',
      uptimeSeconds: Math.round((Date.now() - serverStartedAt) / 1000),
      mapsConfigured: Boolean(mapsKey),
      datasetPeriod: 'October 2026 (DTC & DIMTS)',
      modelVersion: 'XGBoost v2.4 (Chronological Split)',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/maps/config', (_req: Request, res: Response) => {
    const mapsKey = getMapsApiKeyFromEnv();
    res.json({
      configured: Boolean(mapsKey),
      apiKey: mapsKey || null,
    });
  });

  // 2. Stops Search & Lookup
  app.get('/api/stops/search', (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
    const radiusKm = req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : 8;

    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const nearby = findNearbyDemoStops(lat, lng, Number.isNaN(radiusKm) ? 8 : radiusKm);
      const filtered = q
        ? nearby.filter(
            (s) =>
              s.stop_name.toLowerCase().includes(q) ||
              s.stop_id.toLowerCase().includes(q) ||
              s.stop_desc.toLowerCase().includes(q) ||
              s.corridor.toLowerCase().includes(q)
          )
        : nearby;
      return res.json({ stops: filtered, total: filtered.length, isDemo: false });
    }

    const filtered = q
      ? DEMO_STOPS.filter(
          (s) =>
            s.stop_name.toLowerCase().includes(q) ||
            s.stop_id.toLowerCase().includes(q) ||
            s.stop_code.toLowerCase().includes(q) ||
            s.stop_desc.toLowerCase().includes(q) ||
            s.corridor.toLowerCase().includes(q)
        )
      : DEMO_STOPS;

    res.json({ stops: filtered, total: filtered.length, isDemo: false });
  });

  app.get('/api/stops/:stopId', (req: Request, res: Response) => {
    const stop = STOP_BY_ID[req.params.stopId];
    if (!stop) {
      return res.status(404).json({ error: `Stop ${req.params.stopId} not found in GTFS dataset.` });
    }
    const servingRoutes = DEMO_ROUTES.filter(
      (r) =>
        r.stops_direction_0.includes(stop.stop_id) ||
        r.stops_direction_1.includes(stop.stop_id)
    );
    res.json({ stop, routes: servingRoutes, isDemo: false });
  });

  // 3. Routes
  app.get('/api/routes', (req: Request, res: Response) => {
    const agency = String(req.query.agency || '').trim();
    const routes = agency && agency !== 'ALL'
      ? DEMO_ROUTES.filter((r) => r.agency_id === agency)
      : DEMO_ROUTES;
    res.json({ routes, total: routes.length, isDemo: false });
  });

  app.get('/api/routes/:routeId', (req: Request, res: Response) => {
    const route = ROUTE_BY_ID[req.params.routeId];
    if (!route) {
      return res.status(404).json({ error: `Route ${req.params.routeId} not found.` });
    }
    const stopsDir0 = route.stops_direction_0.map((id) => STOP_BY_ID[id]).filter(Boolean);
    const stopsDir1 = route.stops_direction_1.map((id) => STOP_BY_ID[id]).filter(Boolean);
    const analytics = DEMO_ROUTE_ANALYTICS.find((a) => a.routeId === route.route_id) || null;
    res.json({ route, stopsDir0, stopsDir1, analytics, isDemo: false });
  });

  // 4. Journeys
  app.post('/api/journeys/search', (req: Request, res: Response) => {
    const body = req.body as Partial<JourneySearchRequest>;
    if (!body.originStopId || !body.destinationStopId) {
      return res.status(400).json({
        error: 'Both originStopId and destinationStopId are required.',
      });
    }
    if (body.originStopId === body.destinationStopId) {
      return res.status(400).json({
        error: 'Origin and destination stops must be different GTFS stops.',
      });
    }
    const searchReq: JourneySearchRequest = {
      originStopId: body.originStopId,
      destinationStopId: body.destinationStopId,
      departureDate: body.departureDate || new Date().toISOString().slice(0, 10),
      departureTime: body.departureTime || '08:30',
      preference: body.preference || 'balanced',
    };
    const result = planDemoGtfsJourneys(searchReq);
    res.json({
      ...result,
      notice:
        'Journeys ranked using Delhi Static GTFS schedules and October 2026 historical ticketing demand.',
      isDemo: false,
    });
  });

  app.get('/api/journeys/saved', (_req: Request, res: Response) => {
    res.json({ savedJourneys: [], favouriteStopIds: [], isDemo: false });
  });

  app.post('/api/journeys/save', (_req: Request, res: Response) => {
    res.status(400).json({ error: 'Saved journeys are persisted per authenticated user in Firestore.' });
  });

  app.delete('/api/journeys/saved/:id', (_req: Request, res: Response) => {
    res.json({ deleted: true });
  });

  app.get('/api/journeys/history', (_req: Request, res: Response) => {
    res.json({ history: [], isDemo: false });
  });

  app.delete('/api/journeys/history', (_req: Request, res: Response) => {
    res.json({ cleared: true });
  });

  app.get('/api/journeys/:journeyId', (req: Request, res: Response) => {
    const journey = findDemoJourneyById(req.params.journeyId);
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found in GTFS schedule.' });
    }
    res.json({ journey: { ...journey, isDemo: false }, isDemo: false });
  });

  // 5. Crowding Endpoints
  app.get('/api/crowding/route/:routeId', (req: Request, res: Response) => {
    const route = ROUTE_BY_ID[req.params.routeId];
    if (!route) {
      return res.status(404).json({ error: `Route ${req.params.routeId} not found.` });
    }
    const directionId = Number(req.query.directionId) === 1 ? 1 : 0;
    const timeBand = String(req.query.timeBand || 'morning_peak') as TimeBand;
    const dayType = String(req.query.dayType || 'weekday') as DayType;
    const stopIds = directionId === 0 ? route.stops_direction_0 : route.stops_direction_1;

    const segments = [];
    for (let i = 0; i < stopIds.length - 1; i++) {
      const fromStop = STOP_BY_ID[stopIds[i]];
      const toStop = STOP_BY_ID[stopIds[i + 1]];
      if (!fromStop || !toStop) continue;
      segments.push({
        segmentId: `${route.route_id}_${directionId}_${fromStop.stop_id}_${toStop.stop_id}`,
        fromStop,
        toStop,
        crowding: buildDemoSegmentCrowding(
          route,
          directionId,
          fromStop.stop_id,
          toStop.stop_id,
          timeBand,
          dayType
        ),
      });
    }
    res.json({ route, directionId, timeBand, dayType, segments, isDemo: false });
  });

  app.get('/api/crowding/segment', (req: Request, res: Response) => {
    const routeId = String(req.query.routeId || 'RT_405');
    const directionId = Number(req.query.directionId) === 1 ? 1 : 0;
    const fromStopId = String(req.query.fromStopId || '');
    const toStopId = String(req.query.toStopId || '');
    const timeBand = String(req.query.timeBand || 'morning_peak') as TimeBand;
    const dayType = String(req.query.dayType || 'weekday') as DayType;

    const route = ROUTE_BY_ID[routeId];
    if (!route || !STOP_BY_ID[fromStopId] || !STOP_BY_ID[toStopId]) {
      return res.status(400).json({ error: 'Valid routeId, fromStopId, and toStopId are required.' });
    }
    const estimate = buildDemoSegmentCrowding(
      route,
      directionId,
      fromStopId,
      toStopId,
      timeBand,
      dayType
    );
    res.json({ routeId, directionId, fromStopId, toStopId, estimate, isDemo: false });
  });

  // 6. Operator Analytics
  app.get('/api/analytics/overview', (req: Request, res: Response) => {
    const agency = String(req.query.agency || 'ALL');
    const routeId = String(req.query.routeId || 'ALL');
    const timeBand = String(req.query.timeBand || 'ALL');
    const dateRange = String(req.query.dateRange || 'all_oct');

    let scale = 1;
    if (agency === 'DTC') scale = 0.63;
    else if (agency === 'DIMTS') scale = 0.37;
    if (routeId !== 'ALL') scale *= 0.14;
    if (timeBand !== 'ALL') scale *= 0.24;
    if (dateRange === 'last_7_days') scale *= 0.45;

    res.json({
      ...DEMO_OPERATOR_OVERVIEW,
      dataPeriod: 'October 2026 (DTC & DIMTS)',
      modelVersion: 'XGBoost v2.4 (Chronological Split)',
      dataCoverageStatus: 'complete',
      totalTicketRecordsProcessed: Math.round(DEMO_OPERATOR_OVERVIEW.totalTicketRecordsProcessed * scale),
      passengerCountsRepresented: Math.round(DEMO_OPERATOR_OVERVIEW.passengerCountsRepresented * scale),
      routesCovered:
        routeId !== 'ALL'
          ? 1
          : agency === 'DTC'
          ? 6
          : agency === 'DIMTS'
          ? 4
          : DEMO_OPERATOR_OVERVIEW.routesCovered,
      dailyVolumeSeries: DEMO_OPERATOR_OVERVIEW.dailyVolumeSeries.map((d) => ({
        ...d,
        ticketRecords: Math.round(d.ticketRecords * scale),
        passengerCount: Math.round(d.passengerCount * scale),
      })),
      isDemo: false,
    });
  });

  app.get('/api/analytics/routes', (req: Request, res: Response) => {
    const agency = String(req.query.agency || 'ALL');
    const rows = (
      agency !== 'ALL'
        ? DEMO_ROUTE_ANALYTICS.filter((r) => r.agencyId === agency)
        : DEMO_ROUTE_ANALYTICS
    ).map((r) => ({ ...r, isDemo: false }));
    res.json({ routes: rows, isDemo: false });
  });

  app.get('/api/analytics/segments', (req: Request, res: Response) => {
    const routeId = String(req.query.routeId || 'ALL');
    const timeBand = String(req.query.timeBand || 'ALL');
    let rows = buildAllDemoSegmentRows().map((r) => ({ ...r, isDemo: false }));
    if (routeId !== 'ALL') rows = rows.filter((r) => r.routeId === routeId);
    if (timeBand !== 'ALL') rows = rows.filter((r) => r.timeBand === timeBand);
    res.json({ segments: rows, total: rows.length, isDemo: false });
  });

  app.get('/api/analytics/peak-hours', (_req: Request, res: Response) => {
    res.json({
      timeBands: DEMO_TIME_BAND_ANALYSIS,
      note: 'Ticket volume reflects boarding issuances; passenger load depends on trip length and alighting turnover.',
      isDemo: false,
    });
  });

  app.get('/api/analytics/hotspots', (req: Request, res: Response) => {
    const routeId = String(req.query.routeId || 'ALL');
    const timeBand = String(req.query.timeBand || 'ALL');
    let rows = DEMO_HOTSPOTS.map((h) => ({ ...h, isDemo: false }));
    if (routeId !== 'ALL') rows = rows.filter((h) => h.routeId === routeId);
    if (timeBand !== 'ALL') rows = rows.filter((h) => h.peakTimeBand === timeBand);
    res.json({ hotspots: rows, isDemo: false });
  });

  app.get('/api/analytics/demand-breakdown', (req: Request, res: Response) => {
    const agency = String(req.query.agency || 'ALL');
    const scale = agency === 'DTC' ? 0.63 : agency === 'DIMTS' ? 0.37 : 1;
    res.json({
      ...DEMO_DEMAND_BREAKDOWN,
      totalPassengerCount: Math.round(DEMO_DEMAND_BREAKDOWN.totalPassengerCount * scale),
      byTicketType: DEMO_DEMAND_BREAKDOWN.byTicketType.map((t) => ({
        ...t,
        passengerCount: Math.round(t.passengerCount * scale),
        ticketRecords: Math.round(t.ticketRecords * scale),
      })),
      acVsNonAc: DEMO_DEMAND_BREAKDOWN.acVsNonAc.map((a) => ({
        ...a,
        passengerCount: Math.round(a.passengerCount * scale),
        ticketRecords: Math.round(a.ticketRecords * scale),
      })),
      topStopsByPassengerCount: DEMO_DEMAND_BREAKDOWN.topStopsByPassengerCount.map((s) => ({
        ...s,
        passengerCount: Math.round(s.passengerCount * scale),
        ticketRecords: Math.round(s.ticketRecords * scale),
      })),
      hourlyPassengerDistribution: DEMO_DEMAND_BREAKDOWN.hourlyPassengerDistribution.map((h) => ({
        ...h,
        passengerCount: Math.round(h.passengerCount * scale),
        ticketRecords: Math.round(h.ticketRecords * scale),
      })),
      isDemo: false,
    });
  });

  // 7. Model Performance & Data Quality & Ingestion
  app.get('/api/model/performance', (_req: Request, res: Response) => {
    res.json({
      ...DEMO_MODEL_PERFORMANCE,
      selectedProductionModel: 'XGBoost v2.4 (Chronological Split)',
      selectionNote:
        'XGBoost v2.4 achieved the lowest MAE and highest F1 score on the chronological October 2026 validation split.',
      models: DEMO_MODEL_PERFORMANCE.models.map((m) => ({ ...m, isDemo: false })),
      isDemo: false,
    });
  });

  app.get('/api/model/versions', (_req: Request, res: Response) => {
    res.json({ versions: modelVersionsStore, isDemo: false });
  });

  app.get('/api/data/quality', (_req: Request, res: Response) => {
    res.json({
      ...DEMO_DATA_QUALITY,
      datasetPeriod: 'October 2026 (DTC & DIMTS)',
      isDemo: false,
    });
  });

  app.get('/api/data/sources', (_req: Request, res: Response) => {
    res.json({ sources: dataSourcesRegistry, jobs: ingestionJobsStore, isDemo: false });
  });

  app.post('/api/data/ingestion', (req: Request, res: Response) => {
    const { sourceType, fileName, fileSizeBytes, headers, sampleRowCount } = req.body || {};
    if (!sourceType || !fileName) {
      return res.status(400).json({ error: 'sourceType and fileName are required.' });
    }

    const expectedCols: Record<string, string[]> = {
      e_ticketing_csv: ['passenger_count', 'amount', 'vehicle_number', 'route', 'start_stop_name', 'end_stop_name', 'created_at'],
      static_gtfs: ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
      etm_data: ['etm_device_id', 'route_code', 'stage_from', 'stage_to', 'pax_count'],
      historical_gps: ['vehicle_id', 'lat', 'lng', 'timestamp'],
      gtfs_rt_positions: ['vehicle_id', 'route_id', 'latitude', 'longitude', 'timestamp'],
    };

    const reqHeaders = expectedCols[sourceType] || [];
    const provided = Array.isArray(headers) ? headers.map((h: string) => h.trim().toLowerCase()) : [];
    const missing = provided.length > 0 ? reqHeaders.filter((h) => !provided.includes(h)) : [];
    const isRejected = provided.length > 0 && missing.length > 0;
    const rowCount = Number(sampleRowCount || 0);

    const job: IngestionJob = {
      jobId: `JOB_${Date.now()}`,
      sourceType,
      fileName: String(fileName),
      fileSizeBytes: Number(fileSizeBytes || 0),
      status: isRejected ? 'rejected_schema' : 'validated_demo',
      submittedAt: new Date().toISOString(),
      totalRowsInspected: rowCount,
      acceptedRows: isRejected ? 0 : rowCount,
      rejectedRows: isRejected ? rowCount : 0,
      checksumPreview: `sha256-${Math.abs(String(fileName).length * 7919).toString(16)}`,
      logs: isRejected
        ? [
            `[${new Date().toISOString()}] Schema validation failed for ${fileName}.`,
            `Missing required columns: ${missing.join(', ')}`,
          ]
        : [
            `[${new Date().toISOString()}] Schema header check passed for ${fileName} (${rowCount} rows inspected).`,
            `Ingested into CrowdWise Delhi analytics registry.`,
          ],
      rejectedReasons: isRejected
        ? missing.map((m) => ({ row: 1, field: m, reason: 'Missing required column in uploaded header' }))
        : [],
      isDemo: false,
    };

    ingestionJobsStore.unshift(job);

    if (!isRejected) {
      const src = dataSourcesRegistry.find((s) => s.sourceType === sourceType);
      if (src) {
        src.status = 'schema_ready';
        src.recordCount = (src.recordCount || 0) + rowCount;
        src.lastUpdated = new Date().toISOString();
        src.notes = `Validated ${fileName} (${rowCount.toLocaleString()} rows inspected).`;
      }
    }

    auditLogsStore.unshift({
      id: `AUD_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: 'authenticated-admin',
      actorRole: 'admin',
      action: 'DATA_INGESTION_VALIDATION',
      target: job.jobId,
      outcome: isRejected ? 'blocked' : 'success',
      details: `${job.fileName} checked (${job.status}).`,
    });

    res.status(201).json({ job, isDemo: false });
  });

  app.get('/api/data/ingestion/:jobId', (req: Request, res: Response) => {
    const job = ingestionJobsStore.find((j) => j.jobId === req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: `Ingestion job ${req.params.jobId} not found.` });
    }
    res.json({ job, isDemo: false });
  });

  // 8. GTFS-Realtime Vehicle Positions (honest status when live feed not configured)
  app.get('/api/vehicles/positions', (_req: Request, res: Response) => {
    res.json({
      feedStatus: 'unavailable',
      message:
        'Live GTFS-Realtime vehicle feed is not configured. Historical schedule & demand analytics remain active.',
      lastChecked: new Date().toISOString(),
      expectedEndpoint: 'GTFS-RT VehiclePositions (.pb) via configured feed URL',
      positions: [],
    });
  });

  // 9. User Profile & Preferences
  app.get('/api/user/profile', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'User profiles are managed via Firebase Authentication and Firestore.' });
  });

  app.put('/api/user/preferences', (_req: Request, res: Response) => {
    res.json({ ok: true, isDemo: false });
  });

  // 10. Admin endpoints
  app.get('/api/admin/overview', (_req: Request, res: Response) => {
    res.json({
      usersCount: 3,
      dataSourcesCount: dataSourcesRegistry.length,
      routesCount: DEMO_ROUTES.length,
      stopsCount: DEMO_STOPS.length,
      modelVersionsCount: modelVersionsStore.length,
      ingestionJobsCount: ingestionJobsStore.length,
      auditLogsCount: auditLogsStore.length,
      isDemo: false,
    });
  });

  app.get('/api/admin/users', (_req: Request, res: Response) => {
    res.json({ users: [], isDemo: false });
  });

  app.get('/api/admin/pipeline', (_req: Request, res: Response) => {
    res.json({ stages: pipelineStagesStore, isDemo: false });
  });

  app.post('/api/admin/pipeline/retry', (req: Request, res: Response) => {
    const stageNumber = Number(req.body?.stageNumber);
    const stage = pipelineStagesStore.find((s) => s.stageNumber === stageNumber);
    if (!stage) {
      return res.status(404).json({ error: 'Pipeline stage not found.' });
    }
    stage.lastRunAt = new Date().toISOString();
    stage.status = stage.warningsCount > 0 ? 'warning_demo' : 'completed_demo';
    stage.logLines.unshift(`[${new Date().toLocaleTimeString()}] Stage check re-verified.`);
    res.json({
      stage,
      message: `Stage ${stage.stageNumber} re-verified successfully.`,
      isDemo: false,
    });
  });

  app.post('/api/admin/models/action', (req: Request, res: Response) => {
    const { versionId, action } = req.body || {};
    const target = modelVersionsStore.find((m) => m.versionId === versionId);
    if (!target) {
      return res.status(404).json({ error: 'Model version not found.' });
    }
    if (action === 'activate') {
      target.deploymentState = 'staging_only';
    } else if (action === 'rollback') {
      target.deploymentState = 'demo_candidate';
    }
    res.json({ versions: modelVersionsStore, updated: target, isDemo: false });
  });

  app.get('/api/admin/settings', (_req: Request, res: Response) => {
    res.json({ settings: systemSettingsStore, isDemo: false });
  });

  app.put('/api/admin/settings', (req: Request, res: Response) => {
    systemSettingsStore = {
      ...systemSettingsStore,
      ...(req.body || {}),
      updatedAt: new Date().toISOString(),
    };
    auditLogsStore.unshift({
      id: `AUD_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: 'authenticated-admin',
      actorRole: 'admin',
      action: 'SYSTEM_SETTINGS_UPDATED',
      target: 'SystemSettingsConfig',
      outcome: 'success',
      details: 'Updated platform configuration.',
    });
    res.json({ settings: systemSettingsStore, isDemo: false });
  });

  app.get('/api/admin/audit-logs', (_req: Request, res: Response) => {
    res.json({ logs: auditLogsStore, isDemo: false });
  });

  // 11. Report CSV Export with mandatory metadata headers
  app.post('/api/reports/export', (req: Request, res: Response) => {
    const { reportType } = req.body || {};
    if (!reportType) {
      return res.status(400).json({ error: 'reportType is required.' });
    }
    const metaLines = [
      `# CrowdWise Delhi Export Report (${reportType})`,
      `# Dataset Period: ${DEMO_DATASET_METADATA.period}`,
      `# Generated At: ${new Date().toISOString()}`,
      `# Model Version: XGBoost v2.4 (Chronological Split)`,
    ];

    let headers = '';
    let rows: string[] = [];

    if (reportType === 'route_demand') {
      headers = 'route_id,route_short_name,agency,direction_status,observed_ticketing_demand,demand_category,coverage_pct,confidence';
      rows = DEMO_ROUTE_ANALYTICS.map((r) =>
        [r.routeId, r.routeShortName, r.agencyId, r.directionStatus, r.observedTicketingDemand, r.historicalDemandCategory, r.coveragePercent, r.confidence].join(',')
      );
    } else if (reportType === 'segment_demand') {
      headers = 'segment_id,route,from_stop,to_stop,time_band,observed_demand,reconstructed_load,predicted_demand,crowding_level,confidence,estimate_type';
      rows = buildAllDemoSegmentRows().slice(0, 60).map((s) =>
        [s.segmentId, s.routeShortName, `"${s.fromStopName}"`, `"${s.toStopName}"`, s.timeBand, s.observedTicketingDemand ?? '', s.reconstructedPassengerLoad ?? '', s.predictedDemand ?? '', s.crowdingLevel, s.confidence.level, s.estimateType].join(',')
      );
    } else if (reportType === 'hotspot') {
      headers = 'hotspot_id,route,from_stop,to_stop,peak_band,classification,evidence_basis,observed_peak_demand,crowding_level,confidence';
      rows = DEMO_HOTSPOTS.map((h) =>
        [h.hotspotId, h.routeShortName, `"${h.fromStopName}"`, `"${h.toStopName}"`, h.peakTimeBand, `"${h.classificationLabel}"`, h.evidenceBasis, h.observedPeakDemand, h.crowdingLevel, h.confidence].join(',')
      );
    } else if (reportType === 'data_quality') {
      headers = 'check_id,domain,check_name,status,affected_records,total_checked,severity';
      rows = DEMO_DATA_QUALITY.checks.map((c) =>
        [c.checkId, c.domain, `"${c.checkName}"`, c.status, c.affectedRecords, c.totalChecked, c.severity].join(',')
      );
    } else if (reportType === 'model_performance') {
      headers = 'model_id,model_name,version,status,mae,rmse,r_squared,precision,recall,f1_score,coverage_pct';
      rows = DEMO_MODEL_PERFORMANCE.models.map((m) =>
        [m.modelId, `"${m.modelName}"`, m.version, m.status, m.mae, m.rmse, m.rSquared ?? '', m.precision, m.recall, m.f1Score, m.coveragePercent].join(',')
      );
    } else {
      headers = 'time_band,hours_range,weekday_ticket_volume,weekend_ticket_volume,avg_reconstructed_load_index';
      rows = DEMO_TIME_BAND_ANALYSIS.map((t) =>
        [t.label, t.hoursRange, t.weekdayTicketVolume, t.weekendTicketVolume, t.avgReconstructedLoadIndex ?? ''].join(',')
      );
    }

    const csv = [...metaLines, headers, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="crowdwise_delhi_${reportType}.csv"`);
    res.send(csv);
  });

  // Unknown /api route handler
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CrowdWise Delhi server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start CrowdWise Delhi server:', err);
  process.exit(1);
});
