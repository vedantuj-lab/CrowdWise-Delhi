import {
  DEMO_DATASET_METADATA,
  DEMO_ROUTES,
  STOP_BY_ID,
  buildDemoSegmentCrowding,
  getTimeBandFromHour,
} from '../../data/demo/delhiTransitData';
import {
  Confidence,
  ConfidenceLevel,
  CrowdingLevel,
  DayType,
  EstimateType,
  Journey,
  JourneySearchRequest,
  JourneySearchResponse,
  JourneySegment,
  Route,
  Stop,
} from '../../types/transit';

const CROWDING_SCORE: Record<CrowdingLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
  insufficient_data: 3.5, // Penalized when ranking least_crowded
};

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  insufficient_data: 0,
};

function parseMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 8 * 60;
  return h * 60 + m;
}

function formatMinutes(totalMin: number): string {
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function estimateLegDurationMinutes(stops: Stop[]): { minutes: number; distanceKm: number } {
  let distanceKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    distanceKm += haversineKm(
      { lat: stops[i].stop_lat, lng: stops[i].stop_lng },
      { lat: stops[i + 1].stop_lat, lng: stops[i + 1].stop_lng }
    );
  }
  const roadDistanceKm = Math.max(1.2, Number((distanceKm * 1.24).toFixed(1)));
  // Realistic Delhi urban bus average speed ~18-21 km/h plus dwell
  const minutes = Math.max(6, Math.round((roadDistanceKm / 19.5) * 60 + (stops.length - 1) * 1.4));
  return { minutes, distanceKm: roadDistanceKm };
}

function getNextScheduledDeparture(baseMinutes: number, headway: number, offsetMod: number): number {
  const earliestService = 5 * 60 + 30;
  const latestService = 22 * 60 + 45;
  const candidate = Math.max(baseMinutes, earliestService);
  if (candidate > latestService) {
    return earliestService + offsetMod;
  }
  const wait = (headway - ((candidate - earliestService + offsetMod) % headway)) % headway;
  return candidate + (wait === 0 ? 2 : wait);
}

function rollUpConfidence(segments: JourneySegment[]): Confidence {
  let lowest = segments[0].crowding.confidence;
  for (const seg of segments) {
    if (CONFIDENCE_RANK[seg.crowding.confidence.level] < CONFIDENCE_RANK[lowest.level]) {
      lowest = seg.crowding.confidence;
    }
  }
  return lowest;
}

function rollUpCrowding(segments: JourneySegment[]): {
  worstLevel: CrowdingLevel;
  busiestSegmentId: string;
} {
  let worst = segments[0];
  for (const seg of segments) {
    if (CROWDING_SCORE[seg.crowding.crowdingLevel] > CROWDING_SCORE[worst.crowding.crowdingLevel]) {
      worst = seg;
    }
  }
  return { worstLevel: worst.crowding.crowdingLevel, busiestSegmentId: worst.segmentId };
}

function buildLegSegment(
  route: Route,
  directionId: 0 | 1,
  stopSequenceIds: string[],
  startIdx: number,
  endIdx: number,
  depMin: number,
  legIndex: number,
  dayType: DayType,
  transferWaitMinutes?: number
): JourneySegment {
  const sliceIds = stopSequenceIds.slice(startIdx, endIdx + 1);
  const stops = sliceIds.map((id) => STOP_BY_ID[id]).filter(Boolean);
  const fromStop = stops[0];
  const toStop = stops[stops.length - 1];
  const { minutes, distanceKm } = estimateLegDurationMinutes(stops);
  const arrMin = depMin + minutes;
  const depHour = Math.floor(((depMin % 1440) + 1440) % 1440 / 60);
  const timeBand = getTimeBandFromHour(depHour);

  // Pick worst segment crowding along sub-stops of this leg so corridor bottlenecks show honestly
  let representativeCrowding = buildDemoSegmentCrowding(
    route,
    directionId,
    fromStop.stop_id,
    toStop.stop_id,
    timeBand,
    dayType
  );

  for (let i = 0; i < stops.length - 1; i++) {
    const subEst = buildDemoSegmentCrowding(
      route,
      directionId,
      stops[i].stop_id,
      stops[i + 1].stop_id,
      timeBand,
      dayType
    );
    if (
      subEst.crowdingLevel === 'insufficient_data' &&
      representativeCrowding.crowdingLevel !== 'insufficient_data' &&
      i === 0
    ) {
      representativeCrowding = subEst;
    } else if (
      subEst.crowdingLevel !== 'insufficient_data' &&
      CROWDING_SCORE[subEst.crowdingLevel] > CROWDING_SCORE[representativeCrowding.crowdingLevel]
    ) {
      representativeCrowding = subEst;
    }
  }

  return {
    segmentId: `LEG_${route.route_id}_${directionId}_${fromStop.stop_id}_${toStop.stop_id}_${legIndex}`,
    legIndex,
    routeId: route.route_id,
    routeShortName: route.route_short_name,
    routeLongName: route.route_long_name,
    agencyId: route.agency_id,
    agencyName: route.agency_name,
    directionId,
    directionLabel: directionId === 0 ? route.direction_0_label : route.direction_1_label,
    tripId: `TRP_${route.route_short_name}_${directionId}_${formatMinutes(depMin).replace(':', '')}`,
    fromStop,
    toStop,
    intermediateStops: stops.slice(1, -1),
    departureTime: formatMinutes(depMin),
    arrivalTime: formatMinutes(arrMin),
    durationMinutes: minutes,
    distanceKm,
    path: stops.map((s) => ({ lat: s.stop_lat, lng: s.stop_lng })),
    crowding: representativeCrowding,
    isTransferWaitBefore: Boolean(transferWaitMinutes && transferWaitMinutes > 0),
    transferWaitMinutes,
  };
}

export function planDemoGtfsJourneys(req: JourneySearchRequest): JourneySearchResponse {
  const originStop = STOP_BY_ID[req.originStopId];
  const destinationStop = STOP_BY_ID[req.destinationStopId];
  const baseMinutes = parseMinutes(req.departureTime || '08:30');
  const parsedDate = req.departureDate ? new Date(`${req.departureDate}T12:00:00`) : new Date();
  const dayOfWeek = Number.isNaN(parsedDate.getTime()) ? 1 : parsedDate.getDay();
  const dayType: DayType = dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
  const timeBand = getTimeBandFromHour(Math.floor(baseMinutes / 60));

  if (!originStop || !destinationStop || originStop.stop_id === destinationStop.stop_id) {
    return {
      query: req,
      dayType,
      timeBand,
      journeys: [],
      fastestJourneyId: null,
      balancedJourneyId: null,
      leastCrowdedJourneyId: null,
      notice:
        originStop && destinationStop && originStop.stop_id === destinationStop.stop_id
          ? 'Origin and destination stops are identical. Select two different GTFS stops.'
          : 'No valid GTFS stops matched your selection.',
      isDemo: true,
    };
  }

  const candidateJourneys: Journey[] = [];
  const seenKeys = new Set<string>();

  // 1. Direct GTFS bus journeys
  for (const route of DEMO_ROUTES) {
    for (const dir of [0, 1] as const) {
      const seq = dir === 0 ? route.stops_direction_0 : route.stops_direction_1;
      const startIdx = seq.indexOf(originStop.stop_id);
      const endIdx = seq.indexOf(destinationStop.stop_id);
      if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
        const depMin = getNextScheduledDeparture(baseMinutes, route.headway_minutes, dir * 5);
        const leg = buildLegSegment(route, dir, seq, startIdx, endIdx, depMin, 0, dayType);
        const { worstLevel, busiestSegmentId } = rollUpCrowding([leg]);
        const overallConf = rollUpConfidence([leg]);
        const reliableForLeast =
          overallConf.level !== 'insufficient_data' &&
          overallConf.level !== 'low' &&
          worstLevel !== 'insufficient_data';

        const key = `DIRECT_${route.route_id}_${dir}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          candidateJourneys.push({
            journeyId: `JRN_${route.route_short_name}_${dir}_${originStop.stop_id}_${destinationStop.stop_id}`,
            originStop,
            destinationStop,
            departureDate: req.departureDate,
            departureTime: leg.departureTime,
            arrivalTime: leg.arrivalTime,
            totalDurationMinutes: leg.durationMinutes + (depMin - baseMinutes),
            transferCount: 0,
            transferWaitMinutes: 0,
            routesSummary: [route.route_short_name],
            agenciesSummary: [route.agency_id],
            overallCrowding: worstLevel,
            overallConfidence: overallConf,
            dominantEstimateType: leg.crowding.estimateType,
            busiestSegmentId,
            segments: [leg],
            rankingCategories: [],
            recommendationReason: null,
            isReliableForLeastCrowded: reliableForLeast,
            isDemo: true,
          });
        }
      }
    }
  }

  // 2. Valid 1-transfer GTFS bus journeys
  for (const routeA of DEMO_ROUTES) {
    for (const dirA of [0, 1] as const) {
      const seqA = dirA === 0 ? routeA.stops_direction_0 : routeA.stops_direction_1;
      const startA = seqA.indexOf(originStop.stop_id);
      if (startA === -1) continue;

      for (let tIdxA = startA + 1; tIdxA < seqA.length; tIdxA++) {
        const transferStopId = seqA[tIdxA];
        if (transferStopId === destinationStop.stop_id) continue;

        for (const routeB of DEMO_ROUTES) {
          if (routeB.route_id === routeA.route_id) continue;
          for (const dirB of [0, 1] as const) {
            const seqB = dirB === 0 ? routeB.stops_direction_0 : routeB.stops_direction_1;
            const tIdxB = seqB.indexOf(transferStopId);
            const endB = seqB.indexOf(destinationStop.stop_id);
            if (tIdxB !== -1 && endB !== -1 && tIdxB < endB) {
              const key = `XFER_${routeA.route_id}_${transferStopId}_${routeB.route_id}`;
              if (seenKeys.has(key)) continue;

              const depMinA = getNextScheduledDeparture(baseMinutes, routeA.headway_minutes, dirA * 4);
              const legA = buildLegSegment(routeA, dirA, seqA, startA, tIdxA, depMinA, 0, dayType);
              const arrMinA = depMinA + legA.durationMinutes;
              // Minimum 5-minute transfer buffer at hub stop
              const depMinB = getNextScheduledDeparture(arrMinA + 5, routeB.headway_minutes, dirB * 3);
              const waitMin = depMinB - arrMinA;
              if (waitMin > 28) continue;

              const legB = buildLegSegment(routeB, dirB, seqB, tIdxB, endB, depMinB, 1, dayType, waitMin);
              const totalMinutes = depMinB + legB.durationMinutes - baseMinutes;
              const segments = [legA, legB];
              const { worstLevel, busiestSegmentId } = rollUpCrowding(segments);
              const overallConf = rollUpConfidence(segments);
              const dominantEstimateType: EstimateType = legA.crowding.estimateType;
              const reliableForLeast =
                overallConf.level !== 'insufficient_data' &&
                overallConf.level !== 'low' &&
                worstLevel !== 'insufficient_data';

              seenKeys.add(key);
              candidateJourneys.push({
                journeyId: `JRN_${routeA.route_short_name}_${routeB.route_short_name}_${transferStopId}_${originStop.stop_id}_${destinationStop.stop_id}`,
                originStop,
                destinationStop,
                departureDate: req.departureDate,
                departureTime: legA.departureTime,
                arrivalTime: legB.arrivalTime,
                totalDurationMinutes: totalMinutes,
                transferCount: 1,
                transferWaitMinutes: waitMin,
                routesSummary: [routeA.route_short_name, routeB.route_short_name],
                agenciesSummary: Array.from(new Set([routeA.agency_id, routeB.agency_id])),
                overallCrowding: worstLevel,
                overallConfidence: overallConf,
                dominantEstimateType,
                busiestSegmentId,
                segments,
                rankingCategories: [],
                recommendationReason: null,
                isReliableForLeastCrowded: reliableForLeast,
                isDemo: true,
              });
            }
          }
        }
      }
    }
  }

  if (candidateJourneys.length === 0) {
    return {
      query: req,
      dayType,
      timeBand,
      journeys: [],
      fastestJourneyId: null,
      balancedJourneyId: null,
      leastCrowdedJourneyId: null,
      notice:
        'No direct or single-transfer bus journey found in the current GTFS fixture for this stop pair.',
      isDemo: true,
    };
  }

  // Keep concise, diverse top results (up to 6: prioritize direct + best transfers)
  candidateJourneys.sort((a, b) => {
    if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });
  const topJourneys = candidateJourneys.slice(0, 6);

  // Rank A: Fastest
  const fastest = [...topJourneys].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];

  // Rank B: Balanced (duration + crowding + transfer burden)
  const balanced = [...topJourneys].sort((a, b) => {
    const scoreA =
      a.totalDurationMinutes +
      CROWDING_SCORE[a.overallCrowding] * 9 +
      a.transferCount * 10;
    const scoreB =
      b.totalDurationMinutes +
      CROWDING_SCORE[b.overallCrowding] * 9 +
      b.transferCount * 10;
    return scoreA - scoreB;
  })[0];

  // Rank C: Least Crowded (ONLY among reliable confidence options!)
  const reliableOptions = topJourneys.filter((j) => j.isReliableForLeastCrowded);
  const leastCrowded =
    reliableOptions.length > 0
      ? [...reliableOptions].sort((a, b) => {
          const cDiff = CROWDING_SCORE[a.overallCrowding] - CROWDING_SCORE[b.overallCrowding];
          if (cDiff !== 0) return cDiff;
          return a.totalDurationMinutes - b.totalDurationMinutes;
        })[0]
      : null;

  for (const j of topJourneys) {
    const cats: ('fastest' | 'balanced' | 'least_crowded')[] = [];
    if (fastest && j.journeyId === fastest.journeyId) cats.push('fastest');
    if (balanced && j.journeyId === balanced.journeyId) cats.push('balanced');
    if (leastCrowded && j.journeyId === leastCrowded.journeyId) cats.push('least_crowded');
    j.rankingCategories = cats;

    if (leastCrowded && j.journeyId === leastCrowded.journeyId) {
      j.recommendationReason =
        'Recommended because this option has lower estimated historical demand on the busiest journey segment with sufficient confidence coverage.';
    } else if (fastest && j.journeyId === fastest.journeyId) {
      j.recommendationReason =
        'Prioritised for shortest scheduled GTFS duration including wait and transfer buffers.';
    } else if (balanced && j.journeyId === balanced.journeyId) {
      j.recommendationReason =
        'Balances scheduled travel time, transfer count, and historical corridor demand.';
    } else if (!j.isReliableForLeastCrowded) {
      j.recommendationReason =
        'Excluded from Least Crowded ranking because segment confidence or sample coverage is currently insufficient.';
    }
  }

  // Re-order according to user preference
  topJourneys.sort((a, b) => {
    if (req.preference === 'fastest') {
      return a.totalDurationMinutes - b.totalDurationMinutes;
    }
    if (req.preference === 'least_crowded') {
      if (a.isReliableForLeastCrowded !== b.isReliableForLeastCrowded) {
        return a.isReliableForLeastCrowded ? -1 : 1;
      }
      const cDiff = CROWDING_SCORE[a.overallCrowding] - CROWDING_SCORE[b.overallCrowding];
      return cDiff !== 0 ? cDiff : a.totalDurationMinutes - b.totalDurationMinutes;
    }
    // balanced
    const sA = a.totalDurationMinutes + CROWDING_SCORE[a.overallCrowding] * 9 + a.transferCount * 10;
    const sB = b.totalDurationMinutes + CROWDING_SCORE[b.overallCrowding] * 9 + b.transferCount * 10;
    return sA - sB;
  });

  return {
    query: req,
    dayType,
    timeBand,
    journeys: topJourneys,
    fastestJourneyId: fastest?.journeyId ?? null,
    balancedJourneyId: balanced?.journeyId ?? null,
    leastCrowdedJourneyId: leastCrowded?.journeyId ?? null,
    notice: `${DEMO_DATASET_METADATA.disclaimer} Schedules generated from demonstration GTFS stop sequences.`,
    isDemo: true,
  };
}

export function findDemoJourneyById(journeyId: string): Journey | null {
  // Parse encoded journeyId if needed or search across all stop pairs matching origin/destination IDs
  const parts = journeyId.split('_');
  if (parts.length < 5) return null;
  const originStopId = `${parts[parts.length - 6] === 'DL' ? '' : ''}`;
  void originStopId;
  // Robust match: extract DL_STP_XXX tokens
  const matches = journeyId.match(/DL_STP_\d{3}/g);
  if (!matches || matches.length < 2) return null;
  const orig = matches[matches.length - 2];
  const dest = matches[matches.length - 1];
  const res = planDemoGtfsJourneys({
    originStopId: orig,
    destinationStopId: dest,
    departureDate: new Date().toISOString().slice(0, 10),
    departureTime: '09:00',
    preference: 'balanced',
  });
  return res.journeys.find((j) => j.journeyId === journeyId) ?? res.journeys[0] ?? null;
}

export function findNearbyDemoStops(lat: number, lng: number, radiusKm = 6): Array<Stop & { distanceKm: number }> {
  return DEMO_STOPS_WITH_DISTANCE(lat, lng).filter((s) => s.distanceKm <= radiusKm);
}

function DEMO_STOPS_WITH_DISTANCE(lat: number, lng: number) {
  return Object.values(STOP_BY_ID)
    .map((stop) => ({
      ...stop,
      distanceKm: Number(haversineKm({ lat, lng }, { lat: stop.stop_lat, lng: stop.stop_lng }).toFixed(2)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
