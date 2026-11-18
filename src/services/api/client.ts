import {
  AdminUserRecord,
  AuditLogEntry,
  DataQualityReport,
  DataSourceRecord,
  DemandBreakdownPayload,
  HotspotRecord,
  IngestionJob,
  Journey,
  JourneySearchRequest,
  JourneySearchResponse,
  ModelPerformancePayload,
  ModelVersionRecord,
  OperatorOverview,
  PipelineStage,
  ReportExportRequest,
  Route,
  RouteAnalyticsSummary,
  SavedJourney,
  SearchHistoryEntry,
  SegmentAnalyticsRow,
  Stop,
  SystemSettingsConfig,
  TimeBandAnalysis,
  UserPreferences,
  UserProfile,
  VehiclePositionsResponse,
} from '../../types/transit';

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  dataMode: 'api' as const,
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errMsg = data.error;
    } catch {
      // ignore json parse failure
    }
    throw new ApiError(errMsg, response.status);
  }
  return response.json() as Promise<T>;
}

export const transitApi = {
  async getHealth(): Promise<{
    status: string;
    service: string;
    mode: string;
    uptimeSeconds: number;
    mapsConfigured: boolean;
    datasetPeriod: string;
    modelVersion: string;
    timestamp: string;
  }> {
    return requestJson('/health');
  },

  async getMapsConfig(): Promise<{ configured: boolean; apiKey: string | null }> {
    try {
      return await requestJson('/maps/config');
    } catch {
      const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      return { configured: Boolean(envKey), apiKey: envKey || null };
    }
  },

  async searchStops(params: {
    q?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<{ stops: Array<Stop & { distanceKm?: number }>; total: number; isDemo: boolean }> {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.lat !== undefined) sp.set('lat', String(params.lat));
    if (params.lng !== undefined) sp.set('lng', String(params.lng));
    if (params.radiusKm !== undefined) sp.set('radiusKm', String(params.radiusKm));
    return requestJson(`/stops/search?${sp.toString()}`);
  },

  async getStopDetail(stopId: string): Promise<{ stop: Stop; routes: Route[]; isDemo: boolean }> {
    return requestJson(`/stops/${encodeURIComponent(stopId)}`);
  },

  async getRoutes(agency?: string): Promise<{ routes: Route[]; total: number; isDemo: boolean }> {
    const query = agency && agency !== 'ALL' ? `?agency=${encodeURIComponent(agency)}` : '';
    return requestJson(`/routes${query}`);
  },

  async getRouteDetail(routeId: string): Promise<{
    route: Route;
    stopsDir0: Stop[];
    stopsDir1: Stop[];
    analytics: RouteAnalyticsSummary | null;
    isDemo: boolean;
  }> {
    return requestJson(`/routes/${encodeURIComponent(routeId)}`);
  },

  async searchJourneys(req: JourneySearchRequest): Promise<JourneySearchResponse> {
    return requestJson('/journeys/search', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getJourneyById(journeyId: string): Promise<{ journey: Journey; isDemo: boolean }> {
    return requestJson(`/journeys/${encodeURIComponent(journeyId)}`);
  },

  async getSavedJourneys(): Promise<{
    savedJourneys: SavedJourney[];
    favouriteStopIds: string[];
    isDemo: boolean;
  }> {
    return requestJson('/journeys/saved');
  },

  async saveJourney(journey: Journey, label?: string): Promise<{ saved: SavedJourney; alreadySaved?: boolean }> {
    return requestJson('/journeys/save', {
      method: 'POST',
      body: JSON.stringify({ journey, label }),
    });
  },

  async removeSavedJourney(id: string): Promise<{ deleted: boolean }> {
    return requestJson(`/journeys/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getSearchHistory(): Promise<{ history: SearchHistoryEntry[]; isDemo: boolean }> {
    return requestJson('/journeys/history');
  },

  async clearSearchHistory(): Promise<{ cleared: boolean }> {
    return requestJson('/journeys/history', { method: 'DELETE' });
  },

  async getRouteCrowding(
    routeId: string,
    params: { directionId: 0 | 1; timeBand: string; dayType: string }
  ) {
    const sp = new URLSearchParams({
      directionId: String(params.directionId),
      timeBand: params.timeBand,
      dayType: params.dayType,
    });
    return requestJson<{
      route: Route;
      directionId: 0 | 1;
      segments: Array<{ segmentId: string; fromStop: Stop; toStop: Stop; crowding: any }>;
      isDemo: boolean;
    }>(`/crowding/route/${encodeURIComponent(routeId)}?${sp.toString()}`);
  },

  async getAnalyticsOverview(filters?: {
    dateRange?: string;
    agency?: string;
    routeId?: string;
    timeBand?: string;
  }): Promise<OperatorOverview> {
    const sp = new URLSearchParams();
    if (filters?.dateRange) sp.set('dateRange', filters.dateRange);
    if (filters?.agency) sp.set('agency', filters.agency);
    if (filters?.routeId) sp.set('routeId', filters.routeId);
    if (filters?.timeBand) sp.set('timeBand', filters.timeBand);
    return requestJson(`/analytics/overview?${sp.toString()}`);
  },

  async getRouteAnalytics(agency?: string): Promise<{ routes: RouteAnalyticsSummary[]; isDemo: boolean }> {
    const sp = agency && agency !== 'ALL' ? `?agency=${encodeURIComponent(agency)}` : '';
    return requestJson(`/analytics/routes${sp}`);
  },

  async getSegmentAnalytics(params?: {
    routeId?: string;
    timeBand?: string;
  }): Promise<{ segments: SegmentAnalyticsRow[]; total: number; isDemo: boolean }> {
    const sp = new URLSearchParams();
    if (params?.routeId && params.routeId !== 'ALL') sp.set('routeId', params.routeId);
    if (params?.timeBand && params.timeBand !== 'ALL') sp.set('timeBand', params.timeBand);
    return requestJson(`/analytics/segments?${sp.toString()}`);
  },

  async getPeakHours(): Promise<{ timeBands: TimeBandAnalysis[]; note: string; isDemo: boolean }> {
    return requestJson('/analytics/peak-hours');
  },

  async getHotspots(params?: { routeId?: string; timeBand?: string }) {
    const sp = new URLSearchParams();
    if (params?.routeId && params.routeId !== 'ALL') sp.set('routeId', params.routeId);
    if (params?.timeBand && params.timeBand !== 'ALL') sp.set('timeBand', params.timeBand);
    return requestJson<{ hotspots: HotspotRecord[]; isDemo: boolean }>(
      `/analytics/hotspots?${sp.toString()}`
    );
  },

  async getDemandBreakdown(agency?: string): Promise<DemandBreakdownPayload> {
    const q = agency && agency !== 'ALL' ? `?agency=${encodeURIComponent(agency)}` : '';
    return requestJson<DemandBreakdownPayload>(`/analytics/demand-breakdown${q}`);
  },

  async getModelPerformance(): Promise<ModelPerformancePayload> {
    return requestJson('/model/performance');
  },

  async getModelVersions(): Promise<{ versions: ModelVersionRecord[]; isDemo: boolean }> {
    return requestJson('/model/versions');
  },

  async getDataQuality(): Promise<DataQualityReport> {
    return requestJson('/data/quality');
  },

  async getDataSources(): Promise<{
    sources: DataSourceRecord[];
    jobs: IngestionJob[];
    isDemo: boolean;
  }> {
    return requestJson('/data/sources');
  },

  async submitDemoIngestion(payload: {
    sourceType: DataSourceRecord['sourceType'];
    fileName: string;
    fileSizeBytes: number;
    headers: string[];
    sampleRowCount: number;
  }): Promise<{ job: IngestionJob; isDemo: boolean }> {
    return requestJson('/data/ingestion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getVehiclePositions(): Promise<VehiclePositionsResponse> {
    return requestJson('/vehicles/positions');
  },

  async getUserProfile(): Promise<{ profile: UserProfile; isDemo: boolean }> {
    return requestJson('/user/profile');
  },

  async updateUserPreferences(
    updates: Partial<UserPreferences> & { favouriteStopIds?: string[] }
  ): Promise<{ profile: UserProfile; isDemo: boolean }> {
    return requestJson('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getAdminOverview(): Promise<{
    usersCount: number;
    dataSourcesCount: number;
    routesCount: number;
    stopsCount: number;
    modelVersionsCount: number;
    ingestionJobsCount: number;
    auditLogsCount: number;
    isDemo: boolean;
  }> {
    return requestJson('/admin/overview');
  },

  async getAdminUsers(): Promise<{ users: AdminUserRecord[]; isDemo: boolean }> {
    return requestJson('/admin/users');
  },

  async createAdminUser(payload: {
    name: string;
    email: string;
    role: 'commuter' | 'operator' | 'admin';
  }): Promise<{ user: AdminUserRecord; isDemo: boolean }> {
    return requestJson('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAdminUser(
    id: string,
    updates: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      resetPassword?: boolean;
    }
  ): Promise<{ user: AdminUserRecord; isDemo: boolean }> {
    return requestJson(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async getPipelineStages(): Promise<{ stages: PipelineStage[]; isDemo: boolean }> {
    return requestJson('/admin/pipeline');
  },

  async retryPipelineStage(
    stageNumber: number
  ): Promise<{ stage: PipelineStage; message: string; isDemo: boolean }> {
    return requestJson('/admin/pipeline/retry', {
      method: 'POST',
      body: JSON.stringify({ stageNumber }),
    });
  },

  async runModelAdminAction(
    versionId: string,
    action: 'activate' | 'rollback'
  ): Promise<{ versions: ModelVersionRecord[]; updated: ModelVersionRecord; isDemo: boolean }> {
    return requestJson('/admin/models/action', {
      method: 'POST',
      body: JSON.stringify({ versionId, action }),
    });
  },

  async getSystemSettings(): Promise<{ settings: SystemSettingsConfig; isDemo: boolean }> {
    return requestJson('/admin/settings');
  },

  async updateSystemSettings(
    updates: Partial<SystemSettingsConfig>
  ): Promise<{ settings: SystemSettingsConfig; isDemo: boolean }> {
    return requestJson('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getAuditLogs(): Promise<{ logs: AuditLogEntry[]; isDemo: boolean }> {
    return requestJson('/admin/audit-logs');
  },

  async downloadCsvReport(req: ReportExportRequest): Promise<void> {
    const response = await fetch(`${API_CONFIG.baseUrl}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!response.ok) {
      throw new ApiError('Failed to generate export report.', response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crowdwise_delhi_${req.reportType}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
