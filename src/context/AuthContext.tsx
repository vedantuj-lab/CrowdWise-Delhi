import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { UserProfile, UserRole } from '../types/transit';

interface AuthContextValue {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  authReady: boolean;
  signInWithGoogle: (requestedRole?: Exclude<UserRole, 'public'>) => Promise<UserProfile>;
  signInWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
    requestedRole?: Exclude<UserRole, 'public'>
  ) => Promise<UserProfile>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (updates: { name?: string; organization?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
}

const DEFAULT_USER_PREFERENCES = {
  defaultPreference: 'balanced' as const,
  showConfidenceDetails: true,
  showDemoBanners: false,
  preferredOriginStopId: '',
  compactTables: false,
  highContrastBadges: false,
  language: 'en' as const,
  notifyPeakAlerts: true,
  notifyDisruptions: true,
  reducedMotion: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function defaultOrgForRole(role: Exclude<UserRole, 'public'>): string {
  if (role === 'admin') return 'Platform Administration';
  if (role === 'operator') return 'Transit Operations';
  return 'Delhi Commuter';
}

async function loadOrProvisionUserProfile(
  fbUser: FirebaseUser,
  requestedRole?: Exclude<UserRole, 'public'>
): Promise<UserProfile> {
  const userPath = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  const isBootstrappedAdmin =
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
    fbUser.emailVerified;

  if (snap.exists()) {
    const data = snap.data();
    let resolvedRole: Exclude<UserRole, 'public'> =
      data.role === 'admin' || data.role === 'operator' || data.role === 'commuter'
        ? data.role
        : isBootstrappedAdmin
        ? 'admin'
        : 'commuter';

    let organization = String(data.organization || defaultOrgForRole(resolvedRole));

    if (requestedRole && requestedRole !== resolvedRole) {
      resolvedRole = requestedRole;
      organization = defaultOrgForRole(requestedRole);
      try {
        await updateDoc(userRef, {
          role: resolvedRole,
          organization,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }
    }

    return {
      id: fbUser.uid,
      name: String(data.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User'),
      email: String(data.email || fbUser.email || ''),
      role: resolvedRole,
      organization,
      isDemoAccount: false,
      preferences: DEFAULT_USER_PREFERENCES,
      favouriteStopIds: Array.isArray(data.favouriteStopIds) ? data.favouriteStopIds : [],
    };
  }

  const initialRole: Exclude<UserRole, 'public'> =
    requestedRole || (isBootstrappedAdmin ? 'admin' : 'commuter');
  const now = new Date().toISOString();
  const payload = {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Commuter',
    email: fbUser.email || '',
    role: initialRole,
    status: 'active',
    organization: defaultOrgForRole(initialRole),
    favouriteStopIds: [] as string[],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, userPath);
  }

  return {
    id: fbUser.uid,
    name: payload.name,
    email: payload.email,
    role: initialRole,
    organization: payload.organization,
    isDemoAccount: false,
    preferences: DEFAULT_USER_PREFERENCES,
    favouriteStopIds: [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const pendingRequestedRoleRef = useRef<Exclude<UserRole, 'public'> | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const requestedRole = pendingRequestedRoleRef.current;
        const profile = await loadOrProvisionUserProfile(fbUser, requestedRole);
        setUser(profile);
      } catch (err) {
        console.error('Failed to load authenticated user profile:', err);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(
    async (requestedRole?: Exclude<UserRole, 'public'>): Promise<UserProfile> => {
      pendingRequestedRoleRef.current = requestedRole;
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        const profile = await loadOrProvisionUserProfile(cred.user, requestedRole);
        setUser(profile);
        return profile;
      } finally {
        pendingRequestedRoleRef.current = undefined;
      }
    },
    []
  );

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    pendingRequestedRoleRef.current = undefined;
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await loadOrProvisionUserProfile(cred.user);
    setUser(profile);
    return profile;
  }, []);

  const registerWithEmail = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      requestedRole?: Exclude<UserRole, 'public'>
    ): Promise<UserProfile> => {
      pendingRequestedRoleRef.current = requestedRole;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateFirebaseProfile(cred.user, { displayName: name.trim() });
        }
        const profile = await loadOrProvisionUserProfile(cred.user, requestedRole);
        setUser(profile);
        return profile;
      } finally {
        pendingRequestedRoleRef.current = undefined;
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const updateProfile = useCallback(
    async (updates: { name?: string; organization?: string }) => {
      if (!user) return;
      const nextName = updates.name?.trim() || user.name;
      const nextOrg = updates.organization?.trim() ?? user.organization;
      const userPath = `users/${user.id}`;
      try {
        await updateDoc(doc(db, 'users', user.id), {
          name: nextName,
          organization: nextOrg,
          updatedAt: new Date().toISOString(),
        });
        setUser((prev) => (prev ? { ...prev, name: nextName, organization: nextOrg } : prev));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  const role: UserRole = user?.role || 'public';

  const hasAccess = useCallback(
    (allowedRoles: UserRole[]) => {
      if (allowedRoles.includes('public')) return true;
      if (!user) return false;
      if (role === 'admin') return true;
      if (role === 'operator' && allowedRoles.includes('commuter')) return true;
      return allowedRoles.includes(role);
    },
    [user, role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user),
        authReady,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        updateProfile,
        logout,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
