import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Crosshair, MapPin, Search } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DelhiTransitMap } from '../../components/maps/DelhiTransitMap';
import {
  DemoDataTag,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import { Route, Stop } from '../../types/transit';

export function NearbyStopsPage() {
  const { favouriteStopIds, toggleFavouriteStop, pushToast } = useAppState();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stops, setStops] = useState<Array<Stop & { distanceKm?: number }>>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStops = async (qVal: string, loc: { lat: number; lng: number } | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.searchStops({
        q: qVal,
        lat: loc?.lat,
        lng: loc?.lng,
        radiusKm: loc ? 18 : undefined,
      });
      setStops(res.stops);
      if (res.stops.length > 0 && !selectedStop) {
        setSelectedStop(res.stops[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Delhi stops.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops(query, coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      pushToast('Geolocation not available in this browser.', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        pushToast('Updated stop distances from your location.', 'success');
      },
      () => {
        pushToast('Location permission declined. Use manual Delhi stop search.', 'info');
      },
      { timeout: 6000 }
    );
  };

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Nearby Stops">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Nearby Delhi Bus Stops
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Stops are uniquely identified by GTFS{' '}
              <span className="font-mono text-emerald-300">stop_id</span> so duplicate stop names
              (such as Kashmere Gate bays) never collide.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseLocation}
            className="cw-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            <span>Detect My Location</span>
          </button>
        </div>

        {/* Manual Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchStops(query, coords);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--cw-text-muted)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by stop name, stop_id, corridor (e.g., ITO, Kashmere Gate, Ring Road)..."
              className="cw-input w-full rounded-lg pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="cw-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0"
          >
            Search Stops
          </button>
        </form>

        <DelhiTransitMap
          stops={stops}
          selectedStopId={selectedStop?.stop_id}
          onSelectStop={(s) => setSelectedStop(s)}
          userLocation={coords}
          onUserLocationDetected={(c) => setCoords(c)}
          heightClass="h-[360px]"
          title="Delhi GTFS Stop Discovery Map"
        />

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && (
          <ErrorState message={error} onRetry={() => fetchStops(query, coords)} />
        )}

        {!loading && !error && stops.length === 0 && (
          <EmptyState
            title="No bus stops matched"
            description="No GTFS stops matched your search or radius filter."
            actionLabel="Show All Stops"
            onAction={() => {
              setQuery('');
              setCoords(null);
              fetchStops('', null);
            }}
          />
        )}

        {!loading && !error && stops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stops.map((stop) => {
              const isFav = favouriteStopIds.includes(stop.stop_id);
              return (
                <div
                  key={stop.stop_id}
                  className={`cw-card rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors ${
                    selectedStop?.stop_id === stop.stop_id
                      ? 'border-emerald-400/70'
                      : 'hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--cw-text-muted)]">
                          <span>{stop.stop_id}</span>
                          <span>·</span>
                          <span>{stop.stop_code}</span>
                          {stop.distanceKm !== undefined && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-300 font-semibold">
                                {stop.distanceKm} km away
                              </span>
                            </>
                          )}
                        </div>
                        <Link
                          to={`/stops/${stop.stop_id}`}
                          className="mt-0.5 block text-base font-semibold text-white hover:text-emerald-300 transition-colors"
                        >
                          {stop.stop_name}
                        </Link>
                        <p className="text-xs text-[var(--cw-text-secondary)] mt-0.5">
                          {stop.stop_desc}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavouriteStop(stop.stop_id)}
                        aria-label={isFav ? 'Remove favourite stop' : 'Save favourite stop'}
                        className={`rounded-lg border p-2 transition-colors ${
                          isFav
                            ? 'border-yellow-400/50 bg-yellow-500/20 text-yellow-200'
                            : 'border-white/15 bg-white/5 text-[var(--cw-text-muted)] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-2.5 text-xs text-[var(--cw-text-secondary)]">
                      <span className="font-medium text-white">Routes:</span>{' '}
                      {stop.routes_served.join(', ')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/planner?origin=${stop.stop_id}`)}
                      className="cw-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      Use as Origin
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/planner?destination=${stop.stop_id}`)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white"
                    >
                      Use as Destination
                    </button>
                    <Link
                      to={`/stops/${stop.stop_id}`}
                      className="ml-auto text-xs font-semibold text-emerald-300 hover:underline"
                    >
                      Stop Schedule →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function StopDetailPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stopId) return;
    setLoading(true);
    transitApi
      .getStopDetail(stopId)
      .then((res) => {
        setStop(res.stop);
        setRoutes(res.routes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Stop not found.'))
      .finally(() => setLoading(false));
  }, [stopId]);

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Stop Detail">
      <div className="space-y-6">
        <Link
          to="/nearby-stops"
          className="text-sm font-medium text-[var(--cw-text-secondary)] hover:text-white"
        >
          ← Back to Nearby Stops
        </Link>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && stop && (
          <>
            <div className="cw-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--cw-text-muted)]">
                  <span>{stop.stop_id}</span>
                  <span>·</span>
                  <span>{stop.stop_code}</span>
                  <DemoDataTag />
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-white">
                  {stop.stop_name}
                </h1>
                <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">{stop.stop_desc}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/planner?origin=${stop.stop_id}`)}
                  className="cw-btn-primary rounded-lg px-4 py-2 text-xs font-semibold"
                >
                  Plan from here
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/planner?destination=${stop.stop_id}`)}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Travel to here
                </button>
              </div>
            </div>

            <DelhiTransitMap
              stops={[stop]}
              selectedStopId={stop.stop_id}
              heightClass="h-[300px]"
              title={stop.stop_name}
            />

            <section className="cw-card rounded-2xl p-5">
              <h2 className="text-base font-semibold text-white mb-3">
                GTFS Bus Routes Serving This Stop
              </h2>
              <div className="divide-y divide-white/10">
                {routes.map((r) => (
                  <div
                    key={r.route_id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <span className="font-semibold text-white">
                          Bus {r.route_short_name} — {r.route_long_name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--cw-text-muted)] pl-6">
                        {r.agency_name} · Span {r.service_span} · Scheduled every{' '}
                        {r.headway_minutes} min
                      </div>
                    </div>
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
