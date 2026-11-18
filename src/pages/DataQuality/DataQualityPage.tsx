import { useEffect, useState } from 'react';
import { AlertTriangle, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import { DataQualityCheck, DataQualityReport } from '../../types/transit';

export default function DataQualityPage() {
  const { pushToast } = useAppState();
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [domainFilter, setDomainFilter] = useState<'all' | DataQualityCheck['domain']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DataQualityCheck['status']>('all');
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuality = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getDataQuality();
      setReport(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data quality audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuality();
  }, []);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await transitApi.downloadCsvReport({ reportType: 'data_quality', format: 'csv' });
      pushToast('Downloaded Data Quality CSV report.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const filteredChecks = (report?.checks || []).filter((c) => {
    if (domainFilter !== 'all' && c.domain !== domainFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <WorkspaceLayout section="operator" breadcrumb="Data Quality">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Data Quality &amp; Matching Audit
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Automated validation across e-ticketing records, static GTFS integrity, GPS
              availability, and load reconstruction rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DemoDataTag label="DEMO QUALITY AUDIT" />
            <button
              type="button"
              disabled={downloading || !report}
              onClick={handleDownloadCsv}
              className="cw-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{downloading ? 'Exporting...' : 'Download Audit CSV'}</span>
            </button>
          </div>
        </div>

        <DemoEstimateDisclaimer compact />

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} onRetry={loadQuality} />}

        {!loading && !error && report && (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Total Checks Executed</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {report.totalChecks}
                </div>
                <div className="mt-1 font-mono text-[11px] text-[var(--cw-text-muted)]">
                  {report.runId}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/35 p-4">
                <div className="text-xs text-emerald-200">Passed Checks</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-emerald-300">
                  {report.passedChecks}
                </div>
                <div className="mt-1 text-[11px] text-emerald-200/80">Within threshold</div>
              </div>

              <div className="rounded-2xl border border-amber-500/35 bg-amber-950/35 p-4">
                <div className="text-xs text-amber-200">Warnings</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-amber-300">
                  {report.warningChecks}
                </div>
                <div className="mt-1 text-[11px] text-amber-200/80">Requires alias review</div>
              </div>

              <div className="rounded-2xl border border-rose-500/35 bg-rose-950/35 p-4">
                <div className="text-xs text-rose-200">Failed / Blocked</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-rose-300">
                  {report.failedChecks}
                </div>
                <div className="mt-1 text-[11px] text-rose-200/80">
                  Downgraded or awaiting ETL
                </div>
              </div>
            </section>

            {/* Filters */}
            <section className="cw-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div>
                <label
                  htmlFor="dq-domain"
                  className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  Data Domain
                </label>
                <select
                  id="dq-domain"
                  value={domainFilter}
                  onChange={(e) =>
                    setDomainFilter(e.target.value as 'all' | DataQualityCheck['domain'])
                  }
                  className="cw-input rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="all">All Domains ({report.checks.length})</option>
                  <option value="ticketing">Ticketing CSV</option>
                  <option value="gtfs">Static GTFS</option>
                  <option value="gps">Historical GPS</option>
                  <option value="passenger_load">Passenger Load Reconstruction</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="dq-status"
                  className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  Check Outcome
                </label>
                <select
                  id="dq-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | DataQualityCheck['status'])
                  }
                  className="cw-input rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="passed">Passed</option>
                  <option value="warning">Warning</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="ml-auto text-xs text-[var(--cw-text-muted)]">
                Dataset: <span className="font-medium text-white">{report.datasetPeriod}</span>
              </div>
            </section>

            {/* Check Table */}
            <section className="cw-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Check ID &amp; Domain</th>
                      <th className="px-4 py-3 font-semibold">Validation Check</th>
                      <th className="px-4 py-3 font-semibold">Outcome</th>
                      <th className="px-4 py-3 font-semibold text-right">Affected / Checked</th>
                      <th className="px-4 py-3 font-semibold">Finding &amp; Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredChecks.map((check) => (
                      <tr key={check.checkId} className="hover:bg-white/[0.04] align-top">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-semibold text-white">{check.checkId}</div>
                          <div className="text-[11px] uppercase tracking-wide text-[var(--cw-text-muted)]">
                            {check.domain.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-white max-w-xs">
                          {check.checkName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {check.status === 'passed' && (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                              Passed
                            </span>
                          )}
                          {check.status === 'warning' && (
                            <span className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              Warning
                            </span>
                          )}
                          {check.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-200">
                              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-cyan-300 whitespace-nowrap">
                          {check.affectedRecords.toLocaleString()} /{' '}
                          {check.totalChecked.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 space-y-1 max-w-md">
                          <div className="text-[var(--cw-text-secondary)]">
                            {check.description}
                          </div>
                          <div className="text-cyan-300 font-medium">
                            Action: {check.recommendedAction}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
