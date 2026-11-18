import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  HelpCircle,
  Users,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { CrowdingLevel } from '../../types/transit';

interface CrowdingMeta {
  label: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  highContrastClass: string;
  hex: string;
  Icon: typeof CheckCircle2;
}

export const CROWDING_META: Record<CrowdingLevel, CrowdingMeta> = {
  low: {
    label: 'LOW DEMAND',
    shortLabel: 'Low',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/35',
    highContrastClass: 'bg-emerald-600 text-white border-emerald-300',
    hex: '#10B981',
    Icon: CheckCircle2,
  },
  moderate: {
    label: 'MODERATE DEMAND',
    shortLabel: 'Moderate',
    bgClass: 'bg-amber-400/15',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/40',
    highContrastClass: 'bg-amber-500 text-slate-950 border-amber-200',
    hex: '#F59E0B',
    Icon: Users,
  },
  high: {
    label: 'HIGH DEMAND',
    shortLabel: 'High',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-300',
    borderClass: 'border-orange-400/40',
    highContrastClass: 'bg-orange-600 text-white border-orange-200',
    hex: '#F97316',
    Icon: AlertTriangle,
  },
  very_high: {
    label: 'VERY HIGH DEMAND',
    shortLabel: 'Very High',
    bgClass: 'bg-rose-500/18',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-400/45',
    highContrastClass: 'bg-rose-600 text-white border-rose-200',
    hex: '#F43F5E',
    Icon: Flame,
  },
  insufficient_data: {
    label: 'INSUFFICIENT DATA',
    shortLabel: 'Insufficient Data',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-500/35',
    highContrastClass: 'bg-slate-700 text-white border-slate-300',
    hex: '#64748B',
    Icon: HelpCircle,
  },
};

export function CrowdingBadge({
  level,
  compact = false,
}: {
  level: CrowdingLevel;
  compact?: boolean;
}) {
  const { preferences } = useAppState();
  const meta = CROWDING_META[level] || CROWDING_META.insufficient_data;
  const Icon = meta.Icon;

  const colorStyle = preferences.highContrastBadges
    ? meta.highContrastClass
    : `${meta.bgClass} ${meta.textClass} ${meta.borderClass}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold whitespace-nowrap shrink-0 ${colorStyle} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
