export type UserRole = 'public' | 'commuter' | 'operator' | 'admin';

export type CrowdingLevel =
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high'
  | 'insufficient_data';

export type ConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'insufficient_data';

export type EstimateType =
  | 'observed_ticketing'
  | 'reconstructed_load'
  | 'model_predicted'
  | 'insufficient_data';

export type TimeBand =
  | 'early_morning'
  | 'morning_peak'
  | 'midday'
  | 'afternoon'
  | 'evening_peak'
  | 'late_evening';

export type JourneyPreference = 'fastest' | 'balanced' | 'least_crowded';

export type DayType = 'weekday' | 'weekend';

export interface Agency {
  agency_id: string;
  agency_name: string;
  agency_short_name: string;
  agency_url?: string;
}

export interface Stop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: number;
  stop_lng: number;
  zone_id: string;
  corridor: string;
  routes_served: string[];
  avg_daily_boardings_demo: number | null;
  has_shelter: boolean;
  isDemo: boolean;
}

export interface ShapePoint {
  lat: number;
  lng: number;
  sequence: number;
}

export interface RouteSegmentTemplate {
  segmentId: string;
  routeId: string;
  directionId: 0 | 1;
  fromStopId: string;
  toStopId: string;
  sequence: number;
  scheduledMinutes: number;
  distanceKm: number;
  path: Array<{ lat: number; lng: number }>;
}

export interface Route {
  route_id: string;
  agency_id: string;
  agency_name: string;
  route_short_name: string;
  route_long_name: string;
  route_type: 3; // GTFS Bus
  is_ac: boolean;
  headway_minutes: number;
  service_span: string;
  direction_0_label: string;
  direction_1_label: string;
  direction_status: 'verified' | 'partial' | 'ambiguous';
  stops_direction_0: string[];
  stops_direction_1: string[];
  shape_direction_0: Array<{ lat: number; lng: number }>;
  shape_direction_1: Array<{ lat: number; lng: number }>;
  isDemo: boolean;
}

export interface Trip {
  trip_id: string;
  route_id: string;
  direction_id: 0 | 1;
  service_id: 'WEEKDAY' | 'WEEKEND';
  trip_headsign: string;
  departure_time: string;
  verified_vehicle_capacity: number | null;
}

export interface StopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence: number;
  arrival_time: string;
  departure_time: string;
}

export interface ConfidenceEvidence {
  observationsCount: number;
  routeMatchingQuality: 'high' | 'medium' | 'low';
  stopMatchingQuality: 'high' | 'medium' | 'low';
  directionMatchingQuality: 'high' | 'medium' | 'low';
  historicalCoverageLabel: string;
  demandVariability: 'low' | 'moderate' | 'high';
  modelValidationStatus: 'evaluated_demo' | 'baseline_only' | 'not_evaluated';
  dataFreshness: string;
}

export interface Confidence {
  level: ConfidenceLevel;
  explanation: string;
  evidence: ConfidenceEvidence;
}

export interface DataCoverage {
  sampleCount: number;
  daysObserved: number;
  expectedDays: number;
  coverageLabel: string;
  sufficientForRanking: boolean;
}

export interface CrowdingEstimate {
  crowdingLevel: CrowdingLevel;
  estimateType: EstimateType;
  confidence: Confidence;
  coverage: DataCoverage;
  timeBand: TimeBand;
  dayType: DayType;
  observedTicketingDemand: number | null;
  reconstructedPassengerLoad: number | null;
  predictedDemand: number | null;
  verifiedVehicleCapacity: number | null;
  occupancyRatioPercent: number | null;
  relativeDemandIndexLabel: string;
  dataFreshness: string;
  disclaimer: string;
  isDemo: boolean;
}

export interface JourneySegment {
  segmentId: string;
  legIndex: number;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  agencyId: string;
  agencyName: string;
  directionId: 0 | 1;
  directionLabel: string;
  tripId: string;
  fromStop: Stop;
  toStop: Stop;
  intermediateStops: Stop[];
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  distanceKm: number;
  path: Array<{ lat: number; lng: number }>;
  crowding: CrowdingEstimate;
  isTransferWaitBefore?: boolean;
  transferWaitMinutes?: number;
}

export interface Journey {
  journeyId: string;
  originStop: Stop;
  destinationStop: Stop;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  transferCount: number;
  transferWaitMinutes: number;
  routesSummary: string[];
  agenciesSummary: string[];
  overallCrowding: CrowdingLevel;
  overallConfidence: Confidence;
  dominantEstimateType: EstimateType;
  busiestSegmentId: string;
  segments: JourneySegment[];
  rankingCategories: ('fastest' | 'balanced' | 'least_crowded')[];
  recommendationReason: string | null;
  isReliableForLeastCrowded: boolean;
  isDemo: boolean;
}

export interface JourneySearchRequest {
  originStopId: string;
  destinationStopId: string;
  departureDate: string;
  departureTime: string;
  preference: JourneyPreference;
}

export interface JourneySearchResponse {
  query: JourneySearchRequest;
  dayType: DayType;
  timeBand: TimeBand;
  journeys: Journey[];
  fastestJourneyId: string | null;
  balancedJourneyId: string | null;
  leastCrowdedJourneyId: string | null;
  notice: string;
  isDemo: boolean;
}

export interface SavedJourney {
  id: string;
  label: string;
  savedAt: string;
  journey: Journey;
  isDemo: boolean;
}

export interface SearchHistoryEntry {
  id: string;
  originStopId: string;
  originStopName: string;
  destinationStopId: string;
  destinationStopName: string;
  departureDate: string;
  departureTime: string;
  preference: JourneyPreference;
  searchedAt: string;
  resultsCount: number;
}

export interface OperatorOverview {
  totalTicketRecordsProcessed: number;
  passengerCountsRepresented: number;
  routesCovered: number;
  totalGtfsRoutes: number;
  stopsCovered: number;
  totalGtfsStops: number;
  routeMatchingRate: number;
  stopMatchingRate: number;
  dataPeriod: string;
  lastProcessingTime: string;
  modelVersion: string;
  dataCoverageStatus: 'partial_demo' | 'complete' | 'degraded';
  dailyVolumeSeries: Array<{
    date: string;
    dayType: DayType;
    ticketRecords: number;
    passengerCount: number;
  }>;
  agencyBreakdown: Array<{
    agency: string;
    routes: number;
    ticketRecords: number;
    matchRate: number;
  }>;
  isDemo: boolean;
}

export interface RouteAnalyticsSummary {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  agencyId: string;
  agencyName: string;
  stopCount: number;
  directionStatus: 'verified' | 'partial' | 'ambiguous';
  observedTicketingDemand: number;
  historicalDemandCategory: CrowdingLevel;
  coveragePercent: number;
  confidence: ConfidenceLevel;
  weekdayAvgTickets: number;
  weekendAvgTickets: number;
  hourlyDistribution: Array<{
    hour: string;
    timeBand: TimeBand;
    observedTickets: number;
    predictedDemand: number | null;
  }>;
  isDemo: boolean;
}

export interface SegmentAnalyticsRow {
  segmentId: string;
  routeId: string;
  routeShortName: string;
  directionId: 0 | 1;
  directionLabel: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  timeBand: TimeBand;
  dayType: DayType;
  observedTicketingDemand: number | null;
  reconstructedPassengerLoad: number | null;
  predictedDemand: number | null;
  crowdingLevel: CrowdingLevel;
  confidence: Confidence;
  sampleCount: number;
  coveragePercent: number;
  estimateType: EstimateType;
  isDemo: boolean;
}

export interface HotspotRecord {
  hotspotId: string;
  routeId: string;
  routeShortName: string;
  segmentId: string;
  fromStopName: string;
  toStopName: string;
  peakTimeBand: TimeBand;
  classificationLabel: string;
  evidenceBasis: 'ticketing_only' | 'reconstructed_load';
  observedPeakDemand: number;
  reconstructedPeakLoad: number | null;
  repeatPeakDaysObserved: number;
  weekdayVsWeekendRatio: number;
  crowdingLevel: CrowdingLevel;
  confidence: ConfidenceLevel;
  lat: number;
  lng: number;
  isDemo: boolean;
}

export interface TimeBandAnalysis {
  timeBand: TimeBand;
  label: string;
  hoursRange: string;
  weekdayTicketVolume: number;
  weekendTicketVolume: number;
  avgReconstructedLoadIndex: number | null;
  note: string;
}

export interface ModelMetrics {
  modelId: string;
  modelName: string;
  modelType: 'baseline_mean' | 'baseline_median' | 'random_forest' | 'xgboost';
  version: string;
  status: 'candidate' | 'baseline' | 'evaluation_pending';
  trainingRange: string;
  validationRange: string;
  testRange: string;
  mae: number;
  rmse: number;
  rSquared: number | null;
  precision: number;
  recall: number;
  f1Score: number;
  coveragePercent: number;
  notes: string;
  isDemo: boolean;
}

export interface ModelPerformancePayload {
  evaluationProtocol: string;
  selectedProductionModel: string | null;
  selectionNote: string;
  models: ModelMetrics[];
  byRoute: Array<{
    routeShortName: string;
    mae: number;
    f1Score: number;
    coveragePercent: number;
    confidence: ConfidenceLevel;
  }>;
  byTimeBand: Array<{
    timeBandLabel: string;
    mae: number;
    f1Score: number;
    sampleCount: number;
  }>;
  confidenceCalibration: Array<{
    bucket: ConfidenceLevel;
    segmentSharePercent: number;
    observedErrorMae: number;
    description: string;
  }>;
  leastReliableAreas: Array<{
    category: string;
    affectedRoutesOrSegments: string;
    primaryCause: string;
    mitigation: string;
  }>;
  isDemo: boolean;
}

export interface ModelVersionRecord {
  versionId: string;
  modelName: string;
  algorithm: string;
  createdAt: string;
  datasetPeriod: string;
  deploymentState: 'demo_candidate' | 'staging_only' | 'archived';
  chronologicalSplit: string;
  notes: string;
}

export interface DataQualityCheck {
  checkId: string;
  domain: 'ticketing' | 'gtfs' | 'gps' | 'passenger_load';
  checkName: string;
  status: 'passed' | 'warning' | 'failed';
  affectedRecords: number;
  totalChecked: number;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendedAction: string;
}

export interface DataQualityReport {
  runId: string;
  processingDate: string;
  datasetPeriod: string;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  checks: DataQualityCheck[];
  isDemo: boolean;
}

export interface DataSourceRecord {
  sourceId: string;
  name: string;
  sourceType: 'static_gtfs' | 'e_ticketing_csv' | 'etm_data' | 'historical_gps' | 'gtfs_rt_positions';
  status: 'demo_loaded' | 'schema_ready' | 'not_connected';
  requiredFilesOrFields: string[];
  recordCount: number | null;
  dataPeriod: string;
  lastUpdated: string;
  checksumSha256: string | null;
  notes: string;
}

export interface IngestionJob {
  jobId: string;
  sourceType: DataSourceRecord['sourceType'];
  fileName: string;
  fileSizeBytes: number;
  status: 'validated_demo' | 'rejected_schema' | 'queued';
  submittedAt: string;
  totalRowsInspected: number;
  acceptedRows: number;
  rejectedRows: number;
  checksumPreview: string;
  logs: string[];
  rejectedReasons: Array<{ row: number; field: string; reason: string }>;
  isDemo: boolean;
}

export interface VehiclePosition {
  vehicleId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  freshnessState: 'fresh' | 'stale' | 'unknown';
}

export interface VehiclePositionsResponse {
  feedStatus: 'available' | 'unavailable';
  message: string;
  lastChecked: string;
  expectedEndpoint: string;
  positions: VehiclePosition[];
}

export interface UserPreferences {
  defaultPreference: JourneyPreference;
  showConfidenceDetails: boolean;
  showDemoBanners: boolean;
  preferredOriginStopId: string | null;
  compactTables: boolean;
  highContrastBadges: boolean;
  language?: 'en' | 'hi';
  notifyPeakAlerts?: boolean;
  notifyDisruptions?: boolean;
  reducedMotion?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  isDemoAccount: boolean;
  preferences: UserPreferences;
  favouriteStopIds: string[];
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active_demo' | 'suspended_demo';
  lastActive: string;
  passwordResetRequestedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  target: string;
  outcome: 'success' | 'blocked' | 'demo_simulated';
  details: string;
}

export interface ReportExportRequest {
  reportType:
    | 'route_demand'
    | 'segment_demand'
    | 'peak_hour'
    | 'weekday_weekend'
    | 'data_quality'
    | 'model_performance'
    | 'hotspot';
  format: 'csv' | 'pdf_preview';
  routeId?: string;
  timeBand?: TimeBand | 'all';
}

export interface DemandBreakdownPayload {
  totalPassengerCount: number;
  byTicketType: Array<{
    ticketTypeId: string;
    label: string;
    passengerCount: number;
    ticketRecords: number;
    sharePercent: number;
  }>;
  acVsNonAc: Array<{
    fleetType: string;
    isAc: boolean;
    passengerCount: number;
    ticketRecords: number;
    sharePercent: number;
    avgOccupancyHint: string;
  }>;
  topStopsByPassengerCount: Array<{
    stopId: string;
    stopName: string;
    corridor: string;
    passengerCount: number;
    ticketRecords: number;
  }>;
  hourlyPassengerDistribution: Array<{
    hour: string;
    passengerCount: number;
    ticketRecords: number;
  }>;
  isDemo: boolean;
}

export interface PipelineStage {
  stageNumber: number;
  stageKey: string;
  name: string;
  description: string;
  status: 'completed_demo' | 'warning_demo' | 'awaiting_backend' | 'failed_demo';
  durationSeconds: number | null;
  recordsProcessed: number | null;
  warningsCount: number;
  errorsCount: number;
  lastRunAt: string;
  logLines: string[];
}

export interface SystemSettingsConfig {
  environmentMode: 'demo' | 'api';
  gtfsRefreshSchedule: string;
  auditRetentionDays: number;
  minSampleThresholdForLeastCrowded: number;
  defaultMapLayer: 'roadmap' | 'satellite';
  enableDemandHeatmapByDefault: boolean;
  enforceStrictConfidenceGate: boolean;
  notifyOperatorsOnQualityFailure: boolean;
  updatedAt: string;
}

