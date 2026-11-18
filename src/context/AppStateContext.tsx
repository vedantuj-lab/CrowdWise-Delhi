import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { transitApi } from '../services/api/client';
import {
  Journey,
  SavedJourney,
  SearchHistoryEntry,
  UserPreferences,
} from '../types/transit';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

interface AppStateContextValue {
  savedJourneys: SavedJourney[];
  favouriteStopIds: string[];
  searchHistory: SearchHistoryEntry[];
  preferences: UserPreferences;
  mapsConfigured: boolean;
  mapsApiKey: string | null;
  mapsQuotaExceeded: boolean;
  toasts: ToastMessage[];
  pushToast: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  saveJourney: (journey: Journey, label?: string) => Promise<void>;
  removeSavedJourney: (id: string) => Promise<void>;
  isJourneySaved: (journeyId: string) => boolean;
  toggleFavouriteStop: (stopId: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultPreference: 'balanced',
  showConfidenceDetails: true,
  showDemoBanners: false,
  preferredOriginStopId: '',
  compactTables: false,
  highContrastBadges: false,
  language: 'en',
  notifyPeakAlerts: true,
  notifyDisruptions: true,
  reducedMotion: false,
};

const FAV_LS_KEY = 'crowdwise_fav_stops_v1';
const PREF_LS_KEY = 'crowdwise_prefs_v1';

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  const [favouriteStopIds, setFavouriteStopIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAV_LS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREF_LS_KEY);
      return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [mapsApiKey, setMapsApiKey] = useState<string | null>(() => {
    const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return k && String(k).trim() ? String(k).trim() : null;
  });
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    let active = true;
    transitApi
      .getMapsConfig()
      .then((cfg) => {
        if (active && cfg.configured && cfg.apiKey) {
          setMapsApiKey(cfg.apiKey);
        }
      })
      .catch(() => {
        // Maps config optional
      });
    return () => {
      active = false;
    };
  }, []);

  // Load user-specific saved journeys & search history from Firestore when authenticated
  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !user?.id) {
      setSavedJourneys([]);
      setSearchHistory([]);
      return;
    }

    const savedPath = `users/${user.id}/savedJourneys`;
    const historyPath = `users/${user.id}/searchHistory`;

    (async () => {
      try {
        const savedSnap = await getDocs(query(collection(db, savedPath), orderBy('savedAt', 'desc')));
        if (active) {
          const items = savedSnap.docs.map((d) => ({
            ...(d.data() as SavedJourney),
            id: d.id,
          }));
          setSavedJourneys(items);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.LIST, savedPath);
        } catch {
          // Non-fatal UI fallback
        }
      }

      try {
        const histSnap = await getDocs(query(collection(db, historyPath), orderBy('searchedAt', 'desc')));
        if (active) {
          const items = histSnap.docs.map((d) => ({
            ...(d.data() as SearchHistoryEntry),
            id: d.id,
          }));
          setSearchHistory(items);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.LIST, historyPath);
        } catch {
          // Non-fatal UI fallback
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_LS_KEY, JSON.stringify(favouriteStopIds));
    } catch {
      // ignore
    }
  }, [favouriteStopIds]);

  useEffect(() => {
    try {
      localStorage.setItem(PREF_LS_KEY, JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  const saveJourney = useCallback(
    async (journey: Journey, label?: string) => {
      if (!user?.id) {
        pushToast('Sign in to save journeys to your account.', 'warning');
        return;
      }
      if (savedJourneys.some((s) => s.journey.journeyId === journey.journeyId)) {
        pushToast('Journey is already in Saved Journeys.', 'info');
        return;
      }
      const id = `sav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const entry: SavedJourney = {
        id,
        label: label || `${journey.originStop.stop_name} → ${journey.destinationStop.stop_name}`,
        savedAt: new Date().toISOString(),
        journey,
        isDemo: false,
      };
      const docPath = `users/${user.id}/savedJourneys/${id}`;
      try {
        await setDoc(doc(db, 'users', user.id, 'savedJourneys', id), {
          ...entry,
          userId: user.id,
        });
        setSavedJourneys((prev) => [entry, ...prev]);
        pushToast('Journey saved to your account.', 'success');
      } catch (err) {
        pushToast('Could not save journey to Firestore.', 'error');
        handleFirestoreError(err, OperationType.CREATE, docPath);
      }
    },
    [user?.id, savedJourneys, pushToast]
  );

  const removeSavedJourney = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const target = savedJourneys.find((s) => s.id === id || s.journey.journeyId === id);
      const docId = target ? target.id : id;
      const docPath = `users/${user.id}/savedJourneys/${docId}`;
      try {
        await deleteDoc(doc(db, 'users', user.id, 'savedJourneys', docId));
        setSavedJourneys((prev) => prev.filter((s) => s.id !== docId && s.journey.journeyId !== id));
        pushToast('Saved journey removed.', 'info');
      } catch (err) {
        pushToast('Could not remove saved journey.', 'error');
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    },
    [user?.id, savedJourneys, pushToast]
  );

  const isJourneySaved = useCallback(
    (journeyId: string) => savedJourneys.some((s) => s.journey.journeyId === journeyId),
    [savedJourneys]
  );

  const toggleFavouriteStop = useCallback(
    async (stopId: string) => {
      const exists = favouriteStopIds.includes(stopId);
      const next = exists
        ? favouriteStopIds.filter((id) => id !== stopId)
        : [stopId, ...favouriteStopIds];
      setFavouriteStopIds(next);
      pushToast(exists ? 'Removed from favourite stops.' : 'Added to favourite stops.', 'info');
    },
    [favouriteStopIds, pushToast]
  );

  const refreshHistory = useCallback(async () => {
    if (!user?.id) return;
    const historyPath = `users/${user.id}/searchHistory`;
    try {
      const histSnap = await getDocs(query(collection(db, historyPath), orderBy('searchedAt', 'desc')));
      setSearchHistory(
        histSnap.docs.map((d) => ({
          ...(d.data() as SearchHistoryEntry),
          id: d.id,
        }))
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, historyPath);
      } catch {
        // ignore
      }
    }
  }, [user?.id]);

  const clearHistory = useCallback(async () => {
    if (!user?.id) return;
    const historyPath = `users/${user.id}/searchHistory`;
    try {
      const snap = await getDocs(collection(db, historyPath));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setSearchHistory([]);
      pushToast('Search history cleared.', 'info');
    } catch (err) {
      pushToast('Could not clear search history.', 'error');
      handleFirestoreError(err, OperationType.DELETE, historyPath);
    }
  }, [user?.id, pushToast]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...updates }));
      pushToast('Preferences updated.', 'success');
    },
    [pushToast]
  );

  return (
    <AppStateContext.Provider
      value={{
        savedJourneys,
        favouriteStopIds,
        searchHistory,
        preferences,
        mapsConfigured: Boolean(mapsApiKey),
        mapsApiKey,
        mapsQuotaExceeded,
        toasts,
        pushToast,
        dismissToast,
        saveJourney,
        removeSavedJourney,
        isJourneySaved,
        toggleFavouriteStop,
        refreshHistory,
        clearHistory,
        updatePreferences,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
