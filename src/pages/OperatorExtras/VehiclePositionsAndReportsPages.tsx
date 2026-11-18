import { useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Radio,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import {
  DEMO_DATASET_METADATA,
  DEMO_ROUTES,
  DEMO_STOPS,
  STOP_BY_ID,
  buildDemoSegmentCrowding,
} from '../../data/demo/delhiTransitData';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import { ReportExportRequest, TimeBand, VehiclePositionsResponse } from '../../types/transit';

export function VehiclePositionsPage() {
  const [feed, setFeed] = useState<VehiclePositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getVehiclePositions();
      setFeed(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check GTFS-Realtime status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFeed();
  }, []);

  const referenceSegments: MapSegmentOverlay[] = DEMO_ROUTES.slice(0, 4).flatMap((route) => {
    const out: MapSegmentOverlay[] = [];
    for (let i = 0; i < route.stops_direction_0.length - 1; i++) {
      const fromStop = STOP_BY_ID[route.stops_direction_0[i]];
      const toStop = STOP_BY_ID[route.stops_direction_0[i + 1]];
      if (!fromStop || !toStop) continue;
      out.push({
        segmentId: `${route.route_id}_REF_${i}`,
        routeShortName: route.route_short_name,
        directionLabel: route.direction_0_label,
        fromStop,
        toStop,
        path: [
          { lat: fromStop.stop_lat, lng: fromStop.stop_lng },
          { lat: toStop.stop_lat, lng: toStop.stop_lng },
        ],
        crowding: buildDemoSegmentCrowding(
          route,
          0,
          fromStop.stop_id,
          toStop.stop_id,
          'morning_peak',
          'weekday'
        ),
      });
    }
    return out;
  });

  return (
    <WorkspaceLayout section="operator" breadcrumb="Vehicle Positions">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              GTFS-Realtime Vehicle Positions
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Live bus telemetry monitor. When GTFS-Realtime feeds are inactive, the interface
              explicitly reports unavailable status without simulating buses.
            </p>
          </div>
          <button
            type="button"
            onClick={checkFeed}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Re-check Feed Status</span>
          </button>
        </div>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} onRetry={checkFeed} />}

        {!loading && !error && feed && (
          <>
            <section
              role="status"
              className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                feed.feedStatus === 'available'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100'
                  : 'border-orange-500/40 bg-orange-950/40 text-orange-100'
              }`}
            >
              <div className="flex items-start gap-3">
                {feed.feedStatus === 'available' ? (
                  <Radio className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <ShieldAlert
                    className="h-5 w-5 text-orange-300 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    Feed Status:{' '}
                    <span className="font-mono uppercase text-orange-300">
                      {feed.feedStatus === 'available' ? 'CONNECTED' : 'UNAVAILABLE'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{feed.message}</p>
                  <div className="text-[11px] font-mono text-[var(--cw-text-secondary)] pt-1">
                    Expected Proxy: {feed.expectedEndpoint} · Checked:{' '}
                    {new Date(feed.lastChecked).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-[var(--cw-text-muted)]">Active Vehicles Rendered</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-white">
                  {feed.positions.length}
                </div>
              </div>
            </section>

            {/* Map still renders static GTFS corridor/stop context cleanly */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Static GTFS Reference Layer (No Fabricated Live Vehicles)
                </h2>
                <DemoDataTag label="STATIC GTFS REFERENCE" />
              </div>
              <DelhiTransitMap
                stops={DEMO_STOPS}
                segments={referenceSegments}
                title="Static GTFS Corridor Layer (No Live Vehicles Active)"
                heightClass="h-[400px]"
              />
            </section>

            <section className="cw-card rounded-2xl p-5 space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-white">
                Expected GTFS-RT Schema Contract (Antigravity Integration)
              </h3>
              <p className="text-[var(--cw-text-secondary)]">
                Once connected to the FastAPI backend proxy,{' '}
                <code className="font-mono text-cyan-300">GET /api/vehicles/positions</code> returns
                validated protobuf records containing:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 font-mono text-[11px]">
                {[
                  'vehicleId',
                  'routeId',
                  'latitude',
                  'longitude',
                  'timestamp + freshnessState',
                ].map((f) => (
                  <div key={f} className="cw-card-alt rounded-lg px-2.5 py-1.5 text-cyan-200">
                    {f}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}

const REPORT_TYPES: Array<{
  type: ReportExportRequest['reportType'];
  title: string;
  description: string;
  fields: string;
}> = [
  {
    type: 'route_demand',
    title: 'Route Demand Summary',
    description:
      'Route-level ticketing totals, direction verification status, coverage %, and confidence.',
    fields: 'route_id, route_short_name, agency, direction_status, observed_demand, confidence',
  },
  {
    type: 'segment_demand',
    title: 'Segment Demand & Load Matrix',
    description:
      'Stop-to-stop estimates with Observed Ticketing, Reconstructed Load, and Model Predicted values kept distinct.',
    fields: 'segment_id, from_stop, to_stop, time_band, observed, reconstructed, predicted, confidence',
  },
  {
    type: 'peak_hour',
    title: 'Peak-Hour Profiles',
    description:
      'Six operational time bands comparing boarding ticket issuances and average load indices.',
    fields: 'time_band, hours_range, weekday_ticket_volume, weekend_ticket_volume, load_index',
  },
  {
    type: 'weekday_weekend',
    title: 'Weekday vs. Weekend Comparison',
    description:
      'Differential weekday commuter surge versus Saturday/Sunday operational demand ratios.',
    fields: 'time_band, weekday_tickets, weekend_tickets, weekday_weekend_ratio',
  },
  {
    type: 'hotspot',
    title: 'High-Demand Segment Hotspots',
    description:
      'Top congestion pressure segments classified by evidence basis (ticketing-only vs. reconstructed corridor).',
    fields: 'hotspot_id, route, from_stop, to_stop, peak_band, evidence_basis, observed_peak',
  },
  {
    type: 'data_quality',
    title: 'Data Quality Audit Log',
    description:
      'Outcomes across ticketing, static GTFS, historical GPS, and passenger load validation checks.',
    fields: 'check_id, domain, check_name, status, affected_records, severity',
  },
  {
    type: 'model_performance',
    title: 'Model Benchmark Report',
    description:
      'Chronological holdout MAE, RMSE, R², Precision, Recall, F1, and coverage metrics.',
    fields: 'model_id, model_name, version, status, mae, rmse, r_squared, f1_score',
  },
];

export function ReportsPage() {
  const { pushToast } = useAppState();
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedBand, setSelectedBand] = useState<TimeBand | 'all'>('all');
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [lastExportMeta, setLastExportMeta] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<
    (typeof REPORT_TYPES)[number] | null
  >(null);

  const handleDownload = async (reportType: ReportExportRequest['reportType']) => {
    setActiveExport(reportType);
    try {
      await transitApi.downloadCsvReport({
        reportType,
        format: 'csv',
        routeId: selectedRoute !== 'ALL' ? selectedRoute : undefined,
        timeBand: selectedBand,
      });
      setLastExportMeta(
        `Exported ${reportType}.csv at ${new Date().toLocaleTimeString()} (with dataset period, estimate type, model version & assumption headers).`
      );
      pushToast(`Generated ${reportType} CSV export.`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to generate CSV.', 'error');
    } finally {
      setActiveExport(null);
    }
  };

  return (
    <WorkspaceLayout section="operator" breadcrumb="Reports & Exports">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Transit Reports, CSV &amp; PDF Print Exports
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Every exported CSV and printable summary embeds mandatory metadata headers: dataset
              period, processing timestamp, estimate type, model version, and assumptions.
            </p>
          </div>
          <DemoDataTag label="DEMO EXPORT GENERATOR" />
        </div>

        <DemoEstimateDisclaimer compact />

        <section className="cw-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="rep-route"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Optional Route Filter
            </label>
            <select
              id="rep-route"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="cw-input w-full rounded-lg px-3 py-2 text-xs"
            >
              <option value="ALL">All Routes</option>
              {DEMO_ROUTES.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  Bus {r.route_short_name} — {r.route_long_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rep-band"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Optional Time Band Filter
            </label>
            <select
              id="rep-band"
              value={selectedBand}
              onChange={(e) => setSelectedBand(e.target.value as TimeBand | 'all')}
              className="cw-input w-full rounded-lg px-3 py-2 text-xs"
            >
              <option value="all">All Time Bands</option>
              <option value="early_morning">Early Morning</option>
              <option value="morning_peak">Morning Peak</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening_peak">Evening Peak</option>
              <option value="late_evening">Late Evening</option>
            </select>
          </div>
        </section>

        {lastExportMeta && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/35 px-4 py-2.5 text-xs text-emerald-200">
            {lastExportMeta}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_TYPES.map((rep) => (
            <div
              key={rep.type}
              className="cw-card rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-white text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    <span>{rep.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-orange-300">CSV / PDF</span>
                </div>
                <p className="text-xs text-[var(--cw-text-secondary)] leading-relaxed">
                  {rep.description}
                </p>
                <div className="pt-1 font-mono text-[11px] text-[var(--cw-text-muted)]">
                  Columns: {rep.fields}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={activeExport === rep.type}
                  onClick={() => handleDownload(rep.type)}
                  className="cw-btn-primary flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {activeExport === rep.type ? 'Generating CSV...' : 'Download Demo CSV'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewReport(rep)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  <span>PDF / Print Preview</span>
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Printable PDF Summary Preview Modal */}
        {previewReport && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="cw-print-sheet max-w-2xl w-full rounded-2xl border border-white/20 bg-[#0B1222] text-white p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">
                    CrowdWise Delhi · Printable Report Sheet (DEMO DATA)
                  </div>
                  <h2 className="mt-1 font-display text-xl font-bold">{previewReport.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="no-print rounded-lg p-1.5 text-[var(--cw-text-muted)] hover:bg-white/10 hover:text-white"
                  aria-label="Close print preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="cw-card-alt rounded-xl p-3">
                  <dt className="text-[var(--cw-text-muted)]">Dataset Period</dt>
                  <dd className="mt-0.5 font-mono text-white">{DEMO_DATASET_METADATA.period}</dd>
                </div>
                <div className="cw-card-alt rounded-xl p-3">
                  <dt className="text-[var(--cw-text-muted)]">Active Scope</dt>
                  <dd className="mt-0.5 font-mono text-white">
                    Route: {selectedRoute} · Time Band: {selectedBand}
                  </dd>
                </div>
                <div className="cw-card-alt rounded-xl p-3">
                  <dt className="text-[var(--cw-text-muted)]">Model / Benchmark Tag</dt>
                  <dd className="mt-0.5 font-mono text-cyan-300">
                    {DEMO_DATASET_METADATA.modelVersion}
                  </dd>
                </div>
                <div className="cw-card-alt rounded-xl p-3">
                  <dt className="text-[var(--cw-text-muted)]">Generated Timestamp</dt>
                  <dd className="mt-0.5 font-mono text-white">{new Date().toISOString()}</dd>
                </div>
              </dl>

              <div className="cw-card-alt rounded-xl p-4 text-xs space-y-2">
                <div className="font-semibold text-white">Included Schema Fields</div>
                <p className="font-mono text-cyan-300">{previewReport.fields}</p>
                <p className="text-[var(--cw-text-secondary)]">{previewReport.description}</p>
                <p className="text-[11px] text-orange-300">
                  Disclaimer: Demonstration estimate — not a live passenger count. Observed
                  ticketing counts, reconstructed loads, and model predictions remain distinct.
                </p>
              </div>

              <div className="no-print flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-[var(--cw-text-secondary)] hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="cw-btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
