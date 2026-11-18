import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Eye,
  Globe,
  History,
  KeyRound,
  LogOut,
  Settings,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import {
  ConfirmDialog,
  DemoDataTag,
  EmptyState,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { DEMO_STOPS, STOP_BY_ID } from '../../data/demo/delhiTransitData';
import { API_CONFIG } from '../../services/api/client';
import { JourneyPreference } from '../../types/transit';

export function SavedJourneysPage() {
  const { savedJourneys, removeSavedJourney, favouriteStopIds, toggleFavouriteStop } =
    useAppState();
  const navigate = useNavigate();

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Saved Journeys">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Saved Journeys &amp; Favourite Stops
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Demo persistence stores bookmarks in your browser session and local API cache.
            </p>
          </div>
          <DemoDataTag label="DEMO PERSISTENCE" />
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-yellow-300" aria-hidden="true" />
            <span>Bookmarked Bus Journeys ({savedJourneys.length})</span>
          </h2>
          {savedJourneys.length === 0 ? (
            <EmptyState
              title="No saved journeys yet"
              description="Search for a Delhi bus journey and click Save on any option to keep it here."
              actionLabel="Plan a Journey"
              onAction={() => navigate('/planner')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJourneys.map((s) => (
                <div
                  key={s.id}
                  className="cw-card rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/journeys/${encodeURIComponent(s.journey.journeyId)}`}
                        className="text-sm font-semibold text-white hover:text-emerald-300"
                      >
                        {s.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeSavedJourney(s.id)}
                        aria-label="Remove saved journey"
                        className="rounded p-1 text-[var(--cw-text-muted)] hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-1 text-xs font-mono text-[var(--cw-text-muted)]">
                      Bus {s.journey.routesSummary.join(' → ')} · {s.journey.totalDurationMinutes}{' '}
                      min · {s.journey.transferCount} transfer(s)
                    </div>
                    <div className="mt-2">
                      <CrowdingBadge level={s.journey.overallCrowding} compact />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                    <span className="text-[var(--cw-text-muted)]">
                      Saved {new Date(s.savedAt).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/journeys/${encodeURIComponent(s.journey.journeyId)}`}
                      className="font-semibold text-emerald-300 hover:underline"
                    >
                      Open Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">
            Favourite Stops ({favouriteStopIds.length})
          </h2>
          {favouriteStopIds.length === 0 ? (
            <p className="text-sm text-[var(--cw-text-muted)]">
              No favourite stops pinned. Visit Nearby Stops to pin frequent boarding points.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {favouriteStopIds.map((id) => {
                const stop = STOP_BY_ID[id];
                if (!stop) return null;
                return (
                  <div
                    key={id}
                    className="cw-card rounded-2xl p-4 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/stops/${stop.stop_id}`}
                        className="text-sm font-semibold text-white hover:text-emerald-300 truncate block"
                      >
                        {stop.stop_name}
                      </Link>
                      <div className="text-[11px] font-mono text-[var(--cw-text-muted)]">
                        {stop.stop_id} · {stop.stop_code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavouriteStop(stop.stop_id)}
                      className="text-xs font-medium text-rose-300 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}

export function JourneyHistoryPage() {
  const { searchHistory, clearHistory } = useAppState();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Journey History">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Recent Journey Searches
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Re-run any recent stop-to-stop GTFS query or clear your demo search history.
            </p>
          </div>
          {searchHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {searchHistory.length === 0 ? (
          <EmptyState
            title="Search history is empty"
            description="Your recent bus journey queries will appear here."
            actionLabel="Search Bus Journeys"
            onAction={() => navigate('/planner')}
          />
        ) : (
          <div className="cw-card rounded-2xl divide-y divide-white/10">
            {searchHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <History className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>
                      {item.originStopName} → {item.destinationStopName}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--cw-text-muted)] font-mono">
                    {item.departureDate} at {item.departureTime} · Priority:{' '}
                    {item.preference.replace('_', ' ')} · {item.resultsCount} options returned
                  </div>
                </div>
                <Link
                  to={`/results?origin=${item.originStopId}&destination=${item.destinationStopId}&date=${item.departureDate}&time=${item.departureTime}&pref=${item.preference}`}
                  className="cw-btn-primary rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 text-center"
                >
                  Reuse Search
                </Link>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title="Clear search history?"
          description="This removes all recent search entries from your CrowdWise Delhi account."
          confirmLabel="Clear History"
          destructive
          onConfirm={() => {
            clearHistory();
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </WorkspaceLayout>
  );
}

export function SettingsPage() {
  const { user, role, updateProfile, logout } = useAuth();
  const { preferences, updatePreferences, mapsConfigured, pushToast } = useAppState();
  const navigate = useNavigate();

  // Profile fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileOrg, setProfileOrg] = useState(user?.organization || '');

  // Journey defaults
  const [defaultPref, setDefaultPref] = useState<JourneyPreference>(preferences.defaultPreference);
  const [preferredOrigin, setPreferredOrigin] = useState<string>(
    preferences.preferredOriginStopId || 'DL_STP_006'
  );
  const [showConfidence, setShowConfidence] = useState(preferences.showConfidenceDetails);

  // Language & Notifications & Accessibility
  const [language, setLanguage] = useState<'en' | 'hi'>(preferences.language || 'en');
  const [notifyPeakAlerts, setNotifyPeakAlerts] = useState(
    preferences.notifyPeakAlerts ?? true
  );
  const [notifyDisruptions, setNotifyDisruptions] = useState(
    preferences.notifyDisruptions ?? true
  );
  const [highContrastBadges, setHighContrastBadges] = useState(preferences.highContrastBadges);
  const [compactTables, setCompactTables] = useState(preferences.compactTables);
  const [reducedMotion, setReducedMotion] = useState(preferences.reducedMotion ?? false);

  // Password change (simulated)
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      pushToast('Display name cannot be empty.', 'warning');
      return;
    }
    try {
      await updateProfile({
        name: profileName.trim(),
        organization: profileOrg.trim(),
      });
      pushToast('Profile updated.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    }
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      pushToast('New passphrase must be at least 8 characters.', 'warning');
      return;
    }
    if (newPass !== confirmPass) {
      pushToast('New passphrase confirmation does not match.', 'warning');
      return;
    }
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    pushToast('Use the Forgot Password flow on the Sign In page to reset your Firebase password.', 'info');
  };

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Profile & Settings">
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <span>Profile &amp; Commuter Settings</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Manage commuter identity, default GTFS journey priorities, accessibility contrast, and
              alert preferences.
            </p>
          </div>
          <DemoDataTag />
        </div>

        {/* Editable Profile Section */}
        <form onSubmit={handleSaveProfile} className="cw-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Account Profile</span>
            </h2>
            <span className="font-mono text-[11px] text-yellow-300 uppercase">
              Role: {role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cw-prof-name"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Full Name
              </label>
              <input
                id="cw-prof-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="cw-prof-email"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Email Address
              </label>
              <input
                id="cw-prof-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="cw-prof-org"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Commuter Profile Tag
              </label>
              <input
                id="cw-prof-org"
                type="text"
                value={profileOrg}
                onChange={(e) => setProfileOrg(e.target.value)}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-[var(--cw-text-secondary)] mb-1">
                Runtime Environment
              </div>
              <div className="cw-card-alt rounded-lg px-3 py-2 text-xs font-mono text-[var(--cw-text-muted)]">
                Mode: {API_CONFIG.dataMode} · Maps:{' '}
                {mapsConfigured ? 'Google Maps API' : 'Schematic fallback'}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="cw-btn-primary rounded-lg px-4 py-2 text-xs font-semibold"
          >
            Update Profile
          </button>
        </form>

        {/* Journey Defaults, Language, Alerts & Accessibility */}
        <section className="cw-card rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">
            Journey Planner, Notifications &amp; Accessibility
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pref-ranking"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Default Priority
              </label>
              <select
                id="pref-ranking"
                value={defaultPref}
                onChange={(e) => setDefaultPref(e.target.value as JourneyPreference)}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="balanced">Balanced (Time + Crowd)</option>
                <option value="least_crowded">Least Crowded</option>
                <option value="fastest">Fastest Scheduled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="pref-origin"
                className="block text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Preferred Default Origin Stop
              </label>
              <select
                id="pref-origin"
                value={preferredOrigin}
                onChange={(e) => setPreferredOrigin(e.target.value)}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
              >
                {DEMO_STOPS.map((s) => (
                  <option key={s.stop_id} value={s.stop_id}>
                    {s.stop_name} ({s.stop_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pref-lang"
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                <Globe className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                <span>Interface Language</span>
              </label>
              <select
                id="pref-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="en">English (India)</option>
                <option value="hi">हिन्दी — Bilingual Stop Labels (Preview)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-white/10 pt-4 text-sm text-[var(--cw-text-secondary)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-300">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Notifications</span>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPeakAlerts}
                onChange={(e) => setNotifyPeakAlerts(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Highlight historical peak-hour corridor advisories on pinned stops</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyDisruptions}
                onChange={(e) => setNotifyDisruptions(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Show data-coverage and missing-schedule warnings prominently</span>
            </label>
          </div>

          <div className="space-y-2.5 border-t border-white/10 pt-4 text-sm text-[var(--cw-text-secondary)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Accessibility &amp; Readability</span>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showConfidence}
                onChange={(e) => setShowConfidence(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Enable interactive confidence evidence popovers on journey cards</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrastBadges}
                onChange={(e) => setHighContrastBadges(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Use High-Contrast crowdedness badges</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={compactTables}
                onChange={(e) => setCompactTables(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Compact density on segment and schedule tables</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Reduce visual transitions and motion effects</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              updatePreferences({
                defaultPreference: defaultPref,
                preferredOriginStopId: preferredOrigin,
                showConfidenceDetails: showConfidence,
                language,
                notifyPeakAlerts,
                notifyDisruptions,
                highContrastBadges,
                compactTables,
                reducedMotion,
              })
            }
            className="cw-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Save Preferences
          </button>
        </section>

        {/* Simulated Security & Logout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handlePasswordUpdate} className="cw-card rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-yellow-300" aria-hidden="true" />
              <span>Account Security (Demo Simulation)</span>
            </h2>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Current passphrase"
              className="cw-input w-full rounded-lg px-3 py-2 text-xs"
            />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New passphrase (min 8 chars)"
              className="cw-input w-full rounded-lg px-3 py-2 text-xs"
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm new passphrase"
              className="cw-input w-full rounded-lg px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Update Passphrase
            </button>
          </form>

          <section className="cw-card rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Session Sign-Out</h2>
              <p className="mt-1 text-xs text-[var(--cw-text-secondary)] leading-relaxed">
                End your active commuter demonstration session or switch to Transport Operator or
                Administrator portals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login/commuter');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout from Commuter Workspace</span>
            </button>
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
