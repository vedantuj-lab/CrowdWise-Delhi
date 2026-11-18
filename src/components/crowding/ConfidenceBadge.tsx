import { useState } from 'react';
import { Info, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Confidence, ConfidenceLevel, EstimateType } from '../../types/transit';

const CONFIDENCE_STYLES: Record<
  ConfidenceLevel,
  { label: string; colorClass: string; Icon: typeof ShieldCheck }
> = {
  high: {
    label: 'High confidence',
    colorClass: 'text-teal-300 bg-teal-500/15 border-teal-400/35',
    Icon: ShieldCheck,
  },
  medium: {
    label: 'Medium confidence',
    colorClass: 'text-amber-300 bg-amber-400/15 border-amber-400/35',
    Icon: Info,
  },
  low: {
    label: 'Low confidence',
    colorClass: 'text-orange-300 bg-orange-500/15 border-orange-400/35',
    Icon: ShieldAlert,
  },
  insufficient_data: {
    label: 'Insufficient data',
    colorClass: 'text-slate-300 bg-slate-500/15 border-slate-500/35',
    Icon: ShieldQuestion,
  },
};

export const ESTIMATE_TYPE_LABELS: Record<EstimateType, string> = {
  observed_ticketing: 'Observed historical ticketing demand',
  reconstructed_load: 'Reconstructed passenger load',
  model_predicted: 'Model-predicted demand',
  insufficient_data: 'Insufficient data',
};

export function ConfidenceBadge({
  confidence,
  showDetailsToggle = true,
}: {
  confidence: Confidence;
  showDetailsToggle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const style = CONFIDENCE_STYLES[confidence.level] || CONFIDENCE_STYLES.insufficient_data;
  const Icon = style.Icon;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => showDetailsToggle && setOpen((o) => !o)}
        aria-expanded={open}
        title={confidence.explanation}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${style.colorClass} ${
          showDetailsToggle ? 'hover:brightness-110 cursor-pointer' : 'cursor-default'
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{style.label}</span>
      </button>

      {open && showDetailsToggle && (
        <div
          role="dialog"
          aria-label="Confidence evidence details"
          className="absolute left-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-700 bg-[#0B1222] p-3.5 text-xs text-slate-200 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="font-semibold text-white">{style.label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-medium"
            >
              Close
            </button>
          </div>
          <p className="mt-2 leading-relaxed text-slate-300">{confidence.explanation}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-800 pt-2.5 text-[11px]">
            <div>
              <dt className="text-slate-400">Observations</dt>
              <dd className="font-mono tabular-nums font-medium text-white">
                {confidence.evidence.observationsCount}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Coverage</dt>
              <dd className="font-medium text-white">
                {confidence.evidence.historicalCoverageLabel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Route / Stop Match</dt>
              <dd className="font-medium capitalize text-white">
                {confidence.evidence.routeMatchingQuality} / {confidence.evidence.stopMatchingQuality}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Direction Match</dt>
              <dd className="font-medium capitalize text-white">
                {confidence.evidence.directionMatchingQuality}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Demand Variability</dt>
              <dd className="font-medium capitalize text-white">
                {confidence.evidence.demandVariability}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Freshness</dt>
              <dd className="font-medium text-white">{confidence.evidence.dataFreshness}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
