import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { JourneySearchForm } from '../../components/journey/JourneySearchForm';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import { DemoEstimateDisclaimer } from '../../components/common/StateBlocks';
import {
  DEMO_ROUTES,
  DEMO_STOPS,
  STOP_BY_ID,
  buildDemoSegmentCrowding,
} from '../../data/demo/delhiTransitData';
import { JourneyPreference } from '../../types/transit';

const PRESET_CORRIDORS = [
  {
    label: 'Kashmere Gate → Nehru Place (Morning Peak)',
    origin: 'DL_STP_001',
    destination: 'DL_STP_014',
    time: '08:45',
  },
  {
    label: 'Shivaji Stadium → Hauz Khas / IIT Gate (Evening Peak)',
    origin: 'DL_STP_007',
    destination: 'DL_STP_013',
    time: '18:15',
  },
  {
    label: 'Anand Vihar ISBT → Dhaula Kuan (Midday)',
    origin: 'DL_STP_021',
    destination: 'DL_STP_018',
    time: '12:30',
  },
];

export default function JourneyPlannerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialOrigin = searchParams.get('origin') || 'DL_STP_001';
  const initialDestination = searchParams.get('destination') || 'DL_STP_014';

  const networkSegments = useMemo<MapSegmentOverlay[]>(() => {
    const list: MapSegmentOverlay[] = [];
    for (const route of DEMO_ROUTES.slice(0, 5)) {
      const seq = route.stops_direction_0;
      for (let i = 0; i < seq.length - 1; i++) {
        const fromStop = STOP_BY_ID[seq[i]];
        const toStop = STOP_BY_ID[seq[i + 1]];
        if (!fromStop || !toStop) continue;
        list.push({
          segmentId: `${route.route_id}_0_${fromStop.stop_id}_${toStop.stop_id}`,
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
    }
    return list;
  }, []);

  const handleSearch = (params: {
    origin: string;
    destination: string;
    date: string;
    time: string;
    preference: JourneyPreference;
  }) => {
    const sp = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      time: params.time,
      pref: params.preference,
    });
    navigate(`/results?${sp.toString()}`);
  };

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Plan a Journey">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Delhi Bus Journey Planner
          </h1>
          <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
            Search stop-to-stop bus journeys using GTFS route sequences and compare segment-level
            crowdedness estimates.
          </p>
        </div>

        <DemoEstimateDisclaimer compact />

        <div className="space-y-4">
          <JourneySearchForm
            initialOrigin={initialOrigin}
            initialDestination={initialDestination}
            onSearchSubmitted={handleSearch}
          />

          <div className="cw-card rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-yellow-300 mb-2.5">
              <RouteIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sample Delhi Bus Corridors</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_CORRIDORS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    handleSearch({
                      origin: preset.origin,
                      destination: preset.destination,
                      date: new Date().toISOString().slice(0, 10),
                      time: preset.time,
                      preference: 'balanced',
                    })
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--cw-text-secondary)] hover:border-emerald-400/50 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DelhiTransitMap
          stops={DEMO_STOPS}
          segments={networkSegments}
          selectedStopId={initialOrigin}
          onSelectStop={(stop) => {
            const sp = new URLSearchParams({
              origin: stop.stop_id,
              destination: initialDestination === stop.stop_id ? 'DL_STP_014' : initialDestination,
            });
            navigate(`/planner?${sp.toString()}`, { replace: true });
          }}
          title="Interactive Delhi GTFS Bus Corridors (Morning Peak Sample)"
        />
      </div>
    </WorkspaceLayout>
  );
}
