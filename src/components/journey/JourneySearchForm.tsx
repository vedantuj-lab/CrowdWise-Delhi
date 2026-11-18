import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Calendar, Clock, Search } from 'lucide-react';
import { DEMO_STOPS } from '../../data/demo/delhiTransitData';
import { JourneyPreference } from '../../types/transit';

interface JourneySearchFormProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDate?: string;
  initialTime?: string;
  initialPreference?: JourneyPreference;
  compact?: boolean;
  onSearchSubmitted?: (params: {
    origin: string;
    destination: string;
    date: string;
    time: string;
    preference: JourneyPreference;
  }) => void;
}

export function JourneySearchForm({
  initialOrigin = 'DL_STP_001',
  initialDestination = 'DL_STP_014',
  initialDate,
  initialTime = '08:45',
  initialPreference = 'balanced',
  compact = false,
  onSearchSubmitted,
}: JourneySearchFormProps) {
  const navigate = useNavigate();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [date, setDate] = useState(initialDate || todayStr);
  const [time, setTime] = useState(initialTime);
  const [preference, setPreference] = useState<JourneyPreference>(initialPreference);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSwap = () => {
    setFormError(null);
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      setFormError('Please select both an origin and destination Delhi bus stop.');
      return;
    }
    if (origin === destination) {
      setFormError('Origin and destination stops must be different.');
      return;
    }
    setFormError(null);

    if (onSearchSubmitted) {
      onSearchSubmitted({ origin, destination, date, time, preference });
      return;
    }

    const sp = new URLSearchParams({
      origin,
      destination,
      date,
      time,
      pref: preference,
    });
    navigate(`/results?${sp.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`cw-card rounded-2xl ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        {/* Origin Stop */}
        <div className="lg:col-span-4">
          <label
            htmlFor="cw-origin"
            className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1.5"
          >
            Starting Delhi Bus Stop (GTFS)
          </label>
          <select
            id="cw-origin"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setFormError(null);
            }}
            className="cw-input w-full rounded-lg px-3 py-2.5 text-sm"
          >
            {DEMO_STOPS.map((stop) => (
              <option key={stop.stop_id} value={stop.stop_id}>
                {stop.stop_name} ({stop.stop_code}) — {stop.stop_desc}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="lg:col-span-1 flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap origin and destination"
            aria-label="Swap origin and destination stops"
            className="cw-input inline-flex h-10 w-10 items-center justify-center rounded-lg hover:border-[var(--cw-accent)] transition-colors"
          >
            <ArrowRightLeft className="h-4 w-4 text-[var(--cw-accent)]" aria-hidden="true" />
          </button>
        </div>

        {/* Destination Stop */}
        <div className="lg:col-span-4">
          <label
            htmlFor="cw-destination"
            className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1.5"
          >
            Destination Delhi Bus Stop (GTFS)
          </label>
          <select
            id="cw-destination"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setFormError(null);
            }}
            className="cw-input w-full rounded-lg px-3 py-2.5 text-sm"
          >
            {DEMO_STOPS.map((stop) => (
              <option key={stop.stop_id} value={stop.stop_id}>
                {stop.stop_name} ({stop.stop_code}) — {stop.stop_desc}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="cw-date"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--cw-text-secondary)] mb-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-[var(--cw-text-muted)]" aria-hidden="true" />
              <span>Date</span>
            </label>
            <input
              id="cw-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="cw-time"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--cw-text-secondary)] mb-1.5"
            >
              <Clock className="h-3.5 w-3.5 text-[var(--cw-text-muted)]" aria-hidden="true" />
              <span>Time</span>
            </label>
            <input
              id="cw-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--cw-text-muted)] mr-1">
            Comparison Priority:
          </span>
          {(
            [
              { id: 'fastest', label: 'Fastest' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'least_crowded', label: 'Least Crowded' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPreference(opt.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                preference === opt.id
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-[var(--cw-text-secondary)] hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="cw-btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-lg"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search Bus Journeys</span>
        </button>
      </div>

      {formError && (
        <p role="alert" className="mt-3 text-xs font-medium text-rose-300">
          {formError}
        </p>
      )}
    </form>
  );
}
