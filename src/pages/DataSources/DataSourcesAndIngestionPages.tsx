import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  FileText,
  Info,
  RefreshCw,
  Upload,
  Workflow,
  XCircle,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import {
  DemoDataTag,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import { DataSourceRecord, IngestionJob, PipelineStage } from '../../types/transit';

export function DataSourcesPage() {
  const [sources, setSources] = useState<DataSourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getDataSources();
      setSources(res.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data sources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <WorkspaceLayout section="admin" breadcrumb="Data Sources">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Transit Data Source Registry
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Strict source isolation: Static GTFS, historical e-ticketing CSV, separate ETM exports,
              historical GPS archives, and GTFS-RT feeds are schema-tracked independently.
            </p>
          </div>
          <DemoDataTag label="SOURCE REGISTRY" />
        </div>

        <div className="rounded-xl border border-amber-500/35 bg-amber-950/35 px-4 py-3 text-xs text-amber-100 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          <span>
            <strong className="text-white">Important architecture constraint:</strong> Large external
            datasets (such as the 124 GB uncompressed historical GPS archive) must be processed in
            the external Python/PostGIS pipeline—never uploaded directly into browser memory.
          </span>
        </div>

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} onRetry={loadSources} />}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4">
            {sources.map((src) => (
              <section key={src.sourceId} className="cw-card rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="cw-card-alt rounded-xl p-2 text-violet-300">
                      <Database className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">{src.name}</h2>
                      <div className="text-xs text-[var(--cw-text-muted)] mt-0.5">
                        Source ID: <span className="font-mono text-violet-300">{src.sourceId}</span>{' '}
                        · Period: {src.dataPeriod}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-block rounded border px-2.5 py-0.5 text-xs font-mono font-medium ${
                      src.status === 'schema_ready' || src.status === 'demo_loaded'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                        : 'bg-white/10 text-[var(--cw-text-secondary)] border-white/15'
                    }`}
                  >
                    {src.status === 'schema_ready' || src.status === 'demo_loaded'
                      ? 'CONNECTED'
                      : 'NOT CONNECTED'}
                  </span>
                </div>

                <p className="text-xs text-[var(--cw-text-secondary)]">{src.notes}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-t border-white/10 pt-3">
                  <div>
                    <div className="text-[var(--cw-text-muted)]">Required Files / Columns</div>
                    <div className="mt-1 font-mono text-[11px] text-white leading-relaxed">
                      {src.requiredFilesOrFields.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--cw-text-muted)]">Record Count</div>
                    <div className="mt-1 font-mono tabular-nums font-semibold text-violet-200">
                      {src.recordCount !== null ? src.recordCount.toLocaleString() : 'Not connected'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--cw-text-muted)]">Checksum &amp; Last Updated</div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--cw-text-secondary)]">
                      {src.checksumSha256 || 'N/A'} · {src.lastUpdated}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function DataIngestionPage() {
  const { pushToast } = useAppState();
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [sourceType, setSourceType] = useState<DataSourceRecord['sourceType']>('e_ticketing_csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [sampleRowCount, setSampleRowCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getDataSources();
      setJobs(res.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ingestion jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setParsedHeaders([]);
    setSampleRowCount(0);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        setParsedHeaders(headers);
        setSampleRowCount(Math.max(0, lines.length - 1));
      }
    };
    reader.readAsText(file.slice(0, 128 * 1024));
  };

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      pushToast('Please choose a sample CSV or GTFS TXT file to inspect.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await transitApi.submitDemoIngestion({
        sourceType,
        fileName: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        headers: parsedHeaders,
        sampleRowCount,
      });
      setJobs((prev) => [res.job, ...prev]);
      pushToast(
        res.job.status === 'validated_demo'
          ? 'Demo schema validation passed.'
          : 'Schema check flagged missing required columns.',
        res.job.status === 'validated_demo' ? 'success' : 'warning'
      );
      setSelectedFile(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to validate file.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSamplePreset = (preset: 'valid_eticketing' | 'invalid_etm') => {
    if (preset === 'valid_eticketing') {
      setSourceType('e_ticketing_csv');
      const headers = [
        'passenger_count',
        'amount',
        'vehicle_number',
        'ticket_type_id',
        'end_stop_name',
        'route',
        'start_stop_name',
        'created_at',
        'is_ac',
      ];
      const csvBody = `${headers.join(',')}\n2,15,DL1PC8412,TKT_GENERAL,Nehru Place,405,Kashmere Gate,2026-10-31T08:45:00+05:30,false`;
      const sampleFile = new File([csvBody], 'sample_eticketing_oct_valid.csv', { type: 'text/csv' });
      setSelectedFile(sampleFile);
      setParsedHeaders(headers);
      setSampleRowCount(1250);
      pushToast('Loaded valid E-Ticketing sample CSV preset (1,250 rows).', 'info');
    } else {
      setSourceType('etm_data');
      const headers = ['etm_device_id', 'route_code', 'stage_from', 'stage_to'];
      const csvBody = `${headers.join(',')}\nETM_8821,543,SKK-ISBT,LN-RR`;
      const sampleFile = new File([csvBody], 'sample_etm_missing_pax.csv', { type: 'text/csv' });
      setSelectedFile(sampleFile);
      setParsedHeaders(headers);
      setSampleRowCount(420);
      pushToast('Loaded invalid ETM schema sample (missing pax_count) to test rejection.', 'info');
    }
  };

  return (
    <WorkspaceLayout section="admin" breadcrumb="Data Ingestion">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Dataset Schema Validator &amp; Demo Ingestion Jobs
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Inspect sample CSV/TXT headers against CrowdWise schema contracts. Clearly operates as
              a frontend demonstration validator without altering production datasets.
            </p>
          </div>
          <DemoDataTag label="DEMO VALIDATOR ONLY" />
        </div>

        {/* Upload / Inspection Form */}
        <form onSubmit={handleValidateSubmit} className="cw-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span className="text-xs font-semibold text-violet-200">
              Quick Demo Presets (No Local File Needed):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadSamplePreset('valid_eticketing')}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 transition-colors"
              >
                Load Valid E-Ticketing Sample
              </button>
              <button
                type="button"
                onClick={() => loadSamplePreset('invalid_etm')}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors"
              >
                Load Invalid ETM Schema Sample
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ing-type"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Dataset Source Schema
              </label>
              <select
                id="ing-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as DataSourceRecord['sourceType'])}
                className="cw-input w-full rounded-lg px-3 py-2 text-xs"
              >
                <option value="e_ticketing_csv">
                  E-Ticketing Historical CSV (passenger_count, amount, vehicle_number, route, ...)
                </option>
                <option value="static_gtfs">
                  Static GTFS stops.txt (stop_id, stop_name, stop_lat, stop_lon)
                </option>
                <option value="etm_data">
                  Separate ETM Source (etm_device_id, route_code, stage_from, stage_to, pax_count)
                </option>
                <option value="historical_gps">
                  Historical GPS Sample CSV (vehicle_id, lat, lng, timestamp)
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ing-file"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Select Small Sample CSV/TXT (Headers Inspected Client-Side)
              </label>
              <input
                id="ing-file"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="cw-input w-full rounded-lg px-3 py-1.5 text-xs file:mr-3 file:rounded file:border-0 file:bg-violet-600 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="cw-card-alt rounded-xl p-3 text-xs space-y-1">
              <div className="font-semibold text-white">
                Ready for Schema Check: {selectedFile.name} (
                {Math.max(1, Math.round(selectedFile.size / 1024))} KB · {sampleRowCount} sample rows detected)
              </div>
              <div className="font-mono text-[11px] text-violet-300">
                Detected columns: {parsedHeaders.length > 0 ? parsedHeaders.join(', ') : 'None'}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[var(--cw-text-muted)]">
              Note: This demonstration endpoint checks schema columns and creates an inspection log
              without claiming full ETL training.
            </span>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="cw-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{submitting ? 'Validating Schema...' : 'Run Demo Schema Validation'}</span>
            </button>
          </div>
        </form>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} onRetry={loadJobs} />}

        {!loading && !error && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">
              Recent Validation &amp; Ingestion History ({jobs.length})
            </h2>
            {jobs.map((job) => (
              <div key={job.jobId} className="cw-card rounded-2xl p-5 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-300" aria-hidden="true" />
                    <span className="font-mono font-semibold text-white">{job.jobId}</span>
                    <span className="text-[var(--cw-text-secondary)]">· {job.fileName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${
                      job.status === 'validated_demo'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                        : 'bg-rose-500/15 text-rose-200 border-rose-400/40'
                    }`}
                  >
                    {job.status === 'validated_demo' ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3 w-3" aria-hidden="true" />
                    )}
                    {job.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] border-t border-white/10 pt-2">
                  <div>
                    <span className="text-[var(--cw-text-muted)]">Rows Inspected:</span>{' '}
                    <span className="font-mono font-semibold text-white">
                      {job.totalRowsInspected.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--cw-text-muted)]">Accepted / Rejected:</span>{' '}
                    <span className="font-mono font-semibold text-white">
                      {job.acceptedRows.toLocaleString()} / {job.rejectedRows.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--cw-text-muted)]">Checksum Preview:</span>{' '}
                    <span className="font-mono text-violet-300">{job.checksumPreview}</span>
                  </div>
                  <div>
                    <span className="text-[var(--cw-text-muted)]">Submitted:</span>{' '}
                    <span className="font-mono text-[var(--cw-text-secondary)]">
                      {new Date(job.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#05030B] border border-white/10 text-violet-100 p-3 font-mono text-[11px] space-y-1">
                  {job.logs.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>

                {job.rejectedReasons.length > 0 && (
                  <div className="text-rose-300 space-y-1">
                    <div className="font-semibold">Schema Rejections:</div>
                    {job.rejectedReasons.map((r, i) => (
                      <div key={i} className="font-mono text-[11px]">
                        Row {r.row} · {r.field}: {r.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function DataProcessingPipelinePage() {
  const { pushToast } = useAppState();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [expandedStage, setExpandedStage] = useState<number | null>(1);
  const [retryingStage, setRetryingStage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getPipelineStages();
      setStages(res.stages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 14-stage pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleRetry = async (stageNumber: number) => {
    setRetryingStage(stageNumber);
    try {
      const res = await transitApi.retryPipelineStage(stageNumber);
      setStages((prev) =>
        prev.map((s) => (s.stageNumber === stageNumber ? res.stage : s))
      );
      pushToast(res.message, 'info');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Retry failed.', 'error');
    } finally {
      setRetryingStage(null);
    }
  };

  const completedCount = stages.filter((s) => s.status === 'completed_demo').length;
  const warningCount = stages.filter((s) => s.status === 'warning_demo').length;
  const awaitingCount = stages.filter(
    (s) => s.status === 'awaiting_backend' || s.status === 'failed_demo'
  ).length;

  return (
    <WorkspaceLayout section="admin" breadcrumb="Pipeline (14 Stages)">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Workflow className="h-6 w-6 text-violet-400" aria-hidden="true" />
              <span>14-Stage Data Processing Pipeline</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              End-to-end GTFS, ticketing, GPS reconstruction, and model evaluation pipeline tracker
              (Demonstration fixture synced with Stage 2 Antigravity architecture).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DemoDataTag label="DEMO PIPELINE TRACKER" />
            <button
              type="button"
              onClick={loadPipeline}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        {!loading && !error && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="cw-card rounded-2xl p-4">
              <div className="text-xs text-[var(--cw-text-muted)]">Total Architecture Stages</div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                {stages.length}
              </div>
              <div className="mt-1 text-[11px] text-violet-300">GTFS → Audit &amp; Reports</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/35 p-4">
              <div className="text-xs text-emerald-200">Completed (Demo Fixture)</div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-emerald-300">
                {completedCount}
              </div>
              <div className="mt-1 text-[11px] text-emerald-200/80">Validated sample outputs</div>
            </div>
            <div className="rounded-2xl border border-amber-500/35 bg-amber-950/35 p-4">
              <div className="text-xs text-amber-200">Warnings / Partial Match</div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-amber-300">
                {warningCount}
              </div>
              <div className="mt-1 text-[11px] text-amber-200/80">Manual alias review</div>
            </div>
            <div className="rounded-2xl border border-fuchsia-500/35 bg-fuchsia-950/35 p-4">
              <div className="text-xs text-fuchsia-200">Awaiting External ETL</div>
              <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-fuchsia-300">
                {awaitingCount}
              </div>
              <div className="mt-1 text-[11px] text-fuchsia-200/80">
                Requires Python/PostGIS cluster
              </div>
            </div>
          </section>
        )}

        {loading && <LoadingSkeleton rows={6} />}
        {error && !loading && <ErrorState message={error} onRetry={loadPipeline} />}

        {!loading && !error && (
          <div className="space-y-3">
            {stages.map((st) => {
              const isOpen = expandedStage === st.stageNumber;
              return (
                <section key={st.stageKey} className="cw-card rounded-2xl overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-violet-300">
                          STAGE {st.stageNumber.toString().padStart(2, '0')}
                        </span>
                        <h2 className="text-sm sm:text-base font-semibold text-white">
                          {st.name}
                        </h2>
                        {st.status === 'completed_demo' && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] text-emerald-200">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            COMPLETED (DEMO)
                          </span>
                        )}
                        {st.status === 'warning_demo' && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] text-amber-200">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            WARNING ({st.warningsCount})
                          </span>
                        )}
                        {st.status === 'awaiting_backend' && (
                          <span className="inline-flex items-center gap-1 rounded border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-0.5 font-mono text-[11px] text-fuchsia-200">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            AWAITING BACKEND ETL
                          </span>
                        )}
                        {st.status === 'failed_demo' && (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] text-rose-200">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            FAILED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--cw-text-secondary)]">{st.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs">
                      <div className="text-right font-mono">
                        <div className="text-white">
                          {st.recordsProcessed !== null
                            ? `${st.recordsProcessed.toLocaleString()} records`
                            : 'External ETL needed'}
                        </div>
                        <div className="text-[11px] text-[var(--cw-text-muted)]">
                          {st.durationSeconds !== null
                            ? `${st.durationSeconds}s · Warnings: ${st.warningsCount}`
                            : 'Not executed in browser'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={retryingStage === st.stageNumber}
                        onClick={() => handleRetry(st.stageNumber)}
                        className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
                      >
                        {retryingStage === st.stageNumber ? 'Running...' : 'Retry Check'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedStage(isOpen ? null : st.stageNumber)}
                        aria-label={`Toggle logs for stage ${st.stageNumber}`}
                        className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white"
                      >
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-white/10 bg-[#05030B] p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--cw-text-muted)]">
                        <span>Stage Key: {st.stageKey}</span>
                        <span>Last Run: {new Date(st.lastRunAt).toLocaleString()}</span>
                      </div>
                      <div className="font-mono text-[11px] text-violet-100 space-y-1">
                        {st.logLines.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
