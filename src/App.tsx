import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { ErrorBoundary } from './components/common/StateBlocks';
import { RoleGuard } from './components/common/RoleGuard';

// Public & Auth
import LandingPage from './pages/LandingPage/LandingPage';
import {
  AboutPage,
  CrowdednessGuidePage,
  HowItWorksPage,
  MethodologyPage,
} from './pages/Public/PublicInfoPages';
import AuthPage from './pages/Login/AuthPage';

// Commuter
import CommuterDashboardPage from './pages/CommuterDashboard/CommuterDashboardPage';
import JourneyPlannerPage from './pages/JourneyPlanner/JourneyPlannerPage';
import JourneyResultsPage from './pages/JourneyResults/JourneyResultsPage';
import JourneyDetailsPage from './pages/JourneyDetails/JourneyDetailsPage';
import { NearbyStopsPage, StopDetailPage } from './pages/NearbyStops/NearbyStopsPage';
import {
  JourneyHistoryPage,
  SavedJourneysPage,
  SettingsPage,
} from './pages/SavedJourneys/SavedAndHistoryPages';

// Operator
import OperatorDashboardPage from './pages/OperatorDashboard/OperatorDashboardPage';
import RouteAnalyticsPage from './pages/RouteAnalytics/RouteAnalyticsPage';
import SegmentDemandPage from './pages/DemandAnalytics/SegmentDemandPage';
import HotspotAnalyticsPage from './pages/HotspotAnalytics/HotspotAnalyticsPage';
import TimeAnalysisPage from './pages/TimeAnalysis/TimeAnalysisPage';
import ModelPerformancePage from './pages/ModelPerformance/ModelPerformancePage';
import DataQualityPage from './pages/DataQuality/DataQualityPage';
import {
  ReportsPage,
  VehiclePositionsPage,
} from './pages/OperatorExtras/VehiclePositionsAndReportsPages';

// Admin
import {
  AdminDashboardPage,
  AdminSettingsPage,
  AdminUsersPage,
  AuditLogsPage,
  ModelManagementPage,
  RouteManagementPage,
  StopManagementPage,
  SystemMonitoringPage,
} from './pages/AdminDashboard/AdminPages';
import {
  DataIngestionPage,
  DataProcessingPipelinePage,
  DataSourcesPage,
} from './pages/DataSources/DataSourcesAndIngestionPages';

function GlobalOverlays() {
  const { mapsQuotaExceeded, toasts, dismissToast } = useAppState();

  return (
    <>
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-4 py-2.5 text-xs text-amber-100"
        >
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" aria-hidden="true" />
              <span>
                Google Maps Demo API Key quota reached for this preview. Provide your own key or
                check your quota to continue using the map.{' '}
                <a
                  href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline text-amber-200 hover:text-white"
                >
                  View Quota Guidance
                </a>
              </span>
            </div>
            <span className="font-mono text-[11px] text-amber-300">
              GTFS schematic fallback active
            </span>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border bg-[#0B1222]/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-2xl ${
                toast.type === 'success'
                  ? 'border-emerald-400/50 text-emerald-100'
                  : toast.type === 'warning'
                  ? 'border-amber-400/50 text-amber-100'
                  : toast.type === 'error'
                  ? 'border-rose-400/50 text-rose-100'
                  : 'border-white/20 text-slate-100'
              }`}
            >
              <div className="flex items-start gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle
                    className="h-4 w-4 text-amber-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : toast.type === 'error' ? (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span className="leading-relaxed">{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function NotFoundPage() {
  return (
    <div
      data-cw-theme="public"
      className="cw-canvas min-h-screen flex items-center justify-center bg-[#080D1A] p-4"
    >
      <div className="cw-card max-w-md w-full rounded-2xl p-8 text-center space-y-4">
        <div className="font-mono text-xs uppercase tracking-wider text-teal-300">404</div>
        <h1 className="font-display text-2xl font-bold text-white">Page Not Found</h1>
        <p className="text-sm text-[var(--cw-text-secondary)]">
          The requested CrowdWise Delhi transit route or workspace screen does not exist.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/" className="cw-btn-primary rounded-lg px-4 py-2 text-xs font-semibold">
            Back to Home
          </Link>
          <Link
            to="/planner"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            Plan a Journey
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppStateProvider>
          <BrowserRouter>
            <GlobalOverlays />
            <Routes>
              {/* Public Landing & Explanations */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/crowdedness-guide" element={<CrowdednessGuidePage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/login/:roleTab" element={<AuthPage />} />

              {/* Public & Commuter Journey Planning */}
              <Route path="/planner" element={<JourneyPlannerPage />} />
              <Route path="/results" element={<JourneyResultsPage />} />
              <Route path="/journeys/results" element={<JourneyResultsPage />} />
              <Route path="/journeys/:journeyId" element={<JourneyDetailsPage />} />
              <Route path="/nearby-stops" element={<NearbyStopsPage />} />
              <Route path="/stops/:stopId" element={<StopDetailPage />} />

              {/* Commuter Protected Workspace */}
              <Route
                path="/commuter"
                element={
                  <RoleGuard
                    allowedRoles={['commuter', 'operator', 'admin']}
                    demoUpgradeRole="commuter"
                  >
                    <CommuterDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/saved"
                element={
                  <RoleGuard
                    allowedRoles={['commuter', 'operator', 'admin']}
                    demoUpgradeRole="commuter"
                  >
                    <SavedJourneysPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/history"
                element={
                  <RoleGuard
                    allowedRoles={['commuter', 'operator', 'admin']}
                    demoUpgradeRole="commuter"
                  >
                    <JourneyHistoryPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleGuard
                    allowedRoles={['commuter', 'operator', 'admin']}
                    demoUpgradeRole="commuter"
                  >
                    <SettingsPage />
                  </RoleGuard>
                }
              />

              {/* Operator Analytics Workspace */}
              <Route
                path="/operator"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <OperatorDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/routes"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <RouteAnalyticsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/routes/:routeId"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <RouteAnalyticsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/segments"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <SegmentDemandPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/hotspots"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <HotspotAnalyticsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/time-analysis"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <TimeAnalysisPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/model-performance"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <ModelPerformancePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/data-quality"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <DataQualityPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/vehicles"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <VehiclePositionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/operator/reports"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']} demoUpgradeRole="operator">
                    <ReportsPage />
                  </RoleGuard>
                }
              />

              {/* Administrator Console */}
              <Route
                path="/admin"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <AdminDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <AdminUsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/pipeline"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <DataProcessingPipelinePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/data-sources"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <DataSourcesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/ingestion"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <DataIngestionPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/routes"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <RouteManagementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/stops"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <StopManagementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/models"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <ModelManagementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/monitoring"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <SystemMonitoringPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <AuditLogsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RoleGuard allowedRoles={['admin']} demoUpgradeRole="admin">
                    <AdminSettingsPage />
                  </RoleGuard>
                }
              />

              {/* Redirects & 404 */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AppStateProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
