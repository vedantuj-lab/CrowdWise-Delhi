import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Database,
  FileCheck2,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { DemoEstimateDisclaimer } from '../../components/common/StateBlocks';

export function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Index Static Delhi GTFS Schedules (Bus-Only)',
      desc: 'Routes (route_type=3), directional stop sequences, bay-disambiguated stop_id keys, and scheduled frequencies are normalized into candidate direct and 1-transfer bus itineraries.',
      Icon: Layers,
    },
    {
      num: '02',
      title: 'Match E-Ticketing Demand & Reconstruct Load',
      desc: 'Historical ticketing records (sum of passenger_count across route, direction, segment, time band, and day type) establish observed demand; verified trip linkages support cumulative load reconstruction.',
      Icon: Database,
    },
    {
      num: '03',
      title: 'Evaluate Confidence & Rank Trade-offs',
      desc: 'Each segment is assigned a Low, Moderate, High, Very High, or Insufficient Data level alongside High/Medium/Low confidence. Sparse corridors are excluded from Least Crowded ranking.',
      Icon: ShieldCheck,
    },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold text-white">
            How CrowdWise Delhi Estimates Bus Crowding
          </h1>
          <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
            A software-only transit intelligence architecture that turns static GTFS schedules and
            historical ticketing records into transparent route-comparison guidance.
          </p>
        </div>

        <DemoEstimateDisclaimer />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((st) => {
            const Icon = st.Icon;
            return (
              <section key={st.num} className="cw-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-300">STEP {st.num}</span>
                  <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                </div>
                <h2 className="font-display text-lg font-bold text-white">{st.title}</h2>
                <p className="text-sm text-slate-300 leading-relaxed">{st.desc}</p>
              </section>
            );
          })}
        </div>

        <section className="cw-card rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-white">
            Three Clear Trade-off Rankings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="cw-card-alt rounded-xl p-4">
              <div className="font-semibold text-white">Fastest Route</div>
              <p className="mt-1 text-slate-300 text-xs leading-relaxed">
                Minimizes total scheduled travel and transfer time, regardless of peak crowding.
              </p>
            </div>
            <div className="cw-card-alt rounded-xl p-4">
              <div className="font-semibold text-white">Balanced Option</div>
              <p className="mt-1 text-slate-300 text-xs leading-relaxed">
                Combines travel time with segment crowding penalty so commuters avoid extreme spikes
                without excessive detours.
              </p>
            </div>
            <div className="cw-card-alt rounded-xl p-4">
              <div className="font-semibold text-white">Least Crowded</div>
              <p className="mt-1 text-slate-300 text-xs leading-relaxed">
                Selects the lowest peak-segment load among itineraries meeting High or Medium
                confidence coverage criteria.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              to="/planner"
              className="inline-flex items-center rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
            >
              Try Journey Comparison →
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export function CrowdednessGuidePage() {
  const levels = [
    {
      level: 'low' as const,
      meaning: 'Bottom quartile historical segment demand in the reference cycle.',
      guidance: 'Favourable boarding conditions; higher likelihood of available seating.',
    },
    {
      level: 'moderate' as const,
      meaning: 'Mid-range passenger volume typical of midday or balanced feeder corridors.',
      guidance: 'Comfortable standing room expected; moderate stop turnover.',
    },
    {
      level: 'high' as const,
      meaning: 'Upper-tier peak demand near major metro/ISBT interchanges.',
      guidance: 'Consider Balanced or Least Crowded alternate corridors if flexible.',
    },
    {
      level: 'very_high' as const,
      meaning: 'Top decile corridor pressure during Morning or Evening Peak windows.',
      guidance: 'Heavy boarding queues likely; check alternate departures or 1-transfer options.',
    },
    {
      level: 'insufficient_data' as const,
      meaning: 'Fewer than minimum sample observations or ambiguous route direction matching.',
      guidance: 'Excluded from Least Crowded recommendations to avoid misleading commuters.',
    },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-white">
            Crowdedness &amp; Confidence Indicator Guide
          </h1>
          <p className="text-base text-slate-300">
            How to interpret segment demand badges, confidence ratings, and estimate types across
            CrowdWise Delhi.
          </p>
        </div>

        <DemoEstimateDisclaimer />

        <div className="space-y-4">
          {levels.map((item) => (
            <div
              key={item.level}
              className="cw-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <CrowdingBadge level={item.level} />
                <p className="text-sm font-medium text-white pt-1">{item.meaning}</p>
                <p className="text-xs text-slate-300">{item.guidance}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="cw-card rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Confidence Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 p-4 space-y-1">
              <div className="font-semibold text-teal-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                High Confidence
              </div>
              <p className="text-slate-300 leading-relaxed">
                Consistent GTFS route/stop match, verified trip direction, and dense multi-week
                observation coverage.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 space-y-1">
              <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                <Info className="h-4 w-4" aria-hidden="true" />
                Medium Confidence
              </div>
              <p className="text-slate-300 leading-relaxed">
                Adequate historical ticketing volume, with partial direction or vehicle linkage
                coverage.
              </p>
            </div>
            <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4 space-y-1">
              <div className="font-semibold text-orange-200 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Low / Insufficient Data
              </div>
              <p className="text-slate-300 leading-relaxed">
                Sparse observations or ambiguous loop direction. Never promoted as Least Crowded.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export function MethodologyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-white">
            Data Methodology &amp; Scientific Boundaries
          </h1>
          <p className="text-base text-slate-300">
            Clear methodological distinctions between observed ticketing demand, reconstructed trip
            load, and chronological model validation.
          </p>
        </div>

        <DemoEstimateDisclaimer />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="cw-card rounded-2xl p-6 space-y-3">
            <FileCheck2 className="h-5 w-5 text-teal-300" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              1. Three Distinct Estimate Types
            </h2>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>
                <strong className="text-white">Observed Ticketing Demand:</strong> Aggregated using{' '}
                <code className="font-mono text-teal-300">SUM(passenger_count)</code> (never bare
                row count) per route, direction, segment, and time band.
              </li>
              <li>
                <strong className="text-white">Reconstructed Passenger Load:</strong> Cumulative
                boardings minus verified alightings when vehicle number and direction sequence are
                valid.
              </li>
              <li>
                <strong className="text-white">Model-Predicted Demand:</strong> Outputs from
                chronologically evaluated Random Forest or XGBoost candidate models.
              </li>
            </ul>
          </section>

          <section className="cw-card rounded-2xl p-6 space-y-3">
            <ShieldAlert className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              2. Strict Leakage &amp; Source Rules
            </h2>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>
                Chronological time-ordered splits (Days 1–20 train / 21–25 val / 26–31 holdout)
                prevent future-to-past data leakage.
              </li>
              <li>
                Separate ETM sources and e-ticketing CSVs remain isolated unless explicitly joined.
              </li>
              <li>
                Multi-gigabyte historical GPS archives run externally in Python/PostGIS—never in
                browser memory.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export function AboutPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-white">
            About CrowdWise Delhi
          </h1>
          <p className="text-base text-slate-300">
            Smart public bus demand intelligence and crowding-aware journey planning for the National
            Capital Territory of Delhi.
          </p>
        </div>

        <section id="limitations" className="cw-card rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            Explicit Data Limitations (Demonstration Mode)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            This web application runs in Demonstration Mode using a 10-route, 29-stop GTFS subset
            and sample ticketing aggregates. Observed ticket records do not capture unvalidated or
            free-pass boardings outside the dataset, and GTFS-Realtime live vehicle positions remain
            explicitly unavailable until backend feeds are connected.
          </p>
        </section>

        <section id="privacy" className="cw-card rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">Privacy Notice</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Commuter searches, saved journeys, and geolocation coordinates stay within your browser
            session and preview API store. Browser location permission is requested solely to sort
            nearby Delhi bus stops when you click &ldquo;My Location&rdquo;.
          </p>
        </section>

        <section id="terms" className="cw-card rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            Terms of Use &amp; Maps Attribution
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Interactive maps are powered by Google Maps Platform when configured. Transit crowding
            badges are informational historical estimates and do not guarantee boarding availability
            on any specific bus trip.
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
