import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Check,
  Cpu,
  Database,
  Edit3,
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Route as RouteIcon,
  Save,
  Search,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import {
  ConfirmDialog,
  DemoDataTag,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAppState } from '../../context/AppStateContext';
import { API_CONFIG, transitApi } from '../../services/api/client';
import {
  AdminUserRecord,
  AuditLogEntry,
  ModelVersionRecord,
  Route,
  Stop,
  SystemSettingsConfig,
  UserRole,
} from '../../types/transit';

export function AdminDashboardPage() {
  const [counts, setCounts] = useState<{
    usersCount: number;
    dataSourcesCount: number;
    routesCount: number;
    stopsCount: number;
    modelVersionsCount: number;
    ingestionJobsCount: number;
    auditLogsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getAdminOverview();
      setCounts(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <WorkspaceLayout section="admin" breadcrumb="Overview">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Platform Administration Overview
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Manage GTFS route/stop integrity, 14-stage data processing pipeline, model candidates,
              RBAC users, system diagnostics, and audit logs.
            </p>
          </div>
          <DemoDataTag label="ADMIN CONSOLE" />
        </div>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} onRetry={loadOverview} />}

        {!loading && !error && counts && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Registered Users</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {counts.usersCount}
                </div>
                <Link
                  to="/admin/users"
                  className="mt-2 inline-block text-xs font-semibold text-violet-300 hover:underline"
                >
                  Manage Users →
                </Link>
              </div>
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Tracked Data Sources</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {counts.dataSourcesCount}
                </div>
                <Link
                  to="/admin/data-sources"
                  className="mt-2 inline-block text-xs font-semibold text-fuchsia-300 hover:underline"
                >
                  View Sources →
                </Link>
              </div>
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">GTFS Routes / Stops</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {counts.routesCount} / {counts.stopsCount}
                </div>
                <Link
                  to="/admin/stops"
                  className="mt-2 inline-block text-xs font-semibold text-amber-300 hover:underline"
                >
                  Inspect Aliases →
                </Link>
              </div>
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Model Candidates &amp; Logs</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {counts.modelVersionsCount} / {counts.auditLogsCount}
                </div>
                <Link
                  to="/admin/audit-logs"
                  className="mt-2 inline-block text-xs font-semibold text-violet-300 hover:underline"
                >
                  Audit Trail →
                </Link>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: '14-Stage Pipeline',
                  desc: 'Track GTFS validation, e-ticketing alignment, GPS reconstruction, and model benchmark checks.',
                  to: '/admin/pipeline',
                  Icon: Workflow,
                },
                {
                  title: 'Data Ingestion Validator',
                  desc: 'Upload small sample CSV/TXT files to verify header schemas and inspect validation logs.',
                  to: '/admin/ingestion',
                  Icon: Database,
                },
                {
                  title: 'GTFS Route & Stop Aliases',
                  desc: 'Inspect disambiguated duplicate stop names (Kashmere Gate bays) and directional mapping.',
                  to: '/admin/routes',
                  Icon: RouteIcon,
                },
                {
                  title: 'API & Maps Diagnostics',
                  desc: 'Inspect live Express health status, uptime, and Google Maps / FastAPI environment targets.',
                  to: '/admin/monitoring',
                  Icon: Activity,
                },
              ].map((card) => {
                const Icon = card.Icon;
                return (
                  <Link
                    key={card.to}
                    to={card.to}
                    className="cw-card rounded-2xl p-5 hover:border-violet-400/50 transition-colors space-y-2"
                  >
                    <Icon className="h-5 w-5 text-violet-300" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-white">{card.title}</h2>
                    <p className="text-xs text-[var(--cw-text-secondary)] leading-relaxed">
                      {card.desc}
                    </p>
                  </Link>
                );
              })}
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AdminUsersPage() {
  const { pushToast } = useAppState();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'commuter' | 'operator' | 'admin'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user modal/panel
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'commuter' | 'operator' | 'admin'>('commuter');
  const [creating, setCreating] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [pendingAction, setPendingAction] = useState<{
    user: AdminUserRecord;
    role?: UserRole;
    status?: 'active_demo' | 'suspended_demo';
    resetPassword?: boolean;
  } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: AdminUserRecord[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, any>;
        return {
          id: d.id,
          name: data.name || 'User',
          email: data.email || '',
          role: (data.role as UserRole) || 'commuter',
          status: data.status === 'suspended' ? 'suspended_demo' : 'active_demo',
          lastActive: data.updatedAt || data.createdAt || new Date().toISOString(),
        };
      });
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users from Firestore.');
      try {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } catch {
        // surfaced via error state
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, searchQuery, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      pushToast('Enter full name and email address.', 'warning');
      return;
    }
    setCreating(true);
    try {
      const res = await transitApi.createAdminUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
      });
      setUsers((prev) => [res.user, ...prev]);
      setNewName('');
      setNewEmail('');
      setShowCreate(false);
      pushToast(`Created demo ${res.user.role} user ${res.user.email}.`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to create user.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveInlineEdit = async (u: AdminUserRecord) => {
    if (!editName.trim() || !editEmail.trim()) {
      pushToast('Name and email cannot be empty.', 'warning');
      return;
    }
    try {
      const res = await transitApi.updateAdminUser(u.id, {
        name: editName.trim(),
        email: editEmail.trim(),
      });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? res.user : item)));
      setEditingId(null);
      pushToast(`Saved details for ${res.user.email}.`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to update details.', 'error');
    }
  };

  const executeUpdate = async () => {
    if (!pendingAction) return;
    try {
      const res = await transitApi.updateAdminUser(pendingAction.user.id, {
        role: pendingAction.role,
        status: pendingAction.status,
        resetPassword: pendingAction.resetPassword,
      });
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      pushToast(
        pendingAction.resetPassword
          ? `Triggered demo password reset notice for ${res.user.email}.`
          : `Updated ${res.user.email} in demo session.`,
        'success'
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <WorkspaceLayout section="admin" breadcrumb="User Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Demo Role &amp; Access Management
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Create accounts, edit profiles, adjust role assignments, trigger demo password resets,
              and suspend or reactivate users with confirmation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DemoDataTag label="DEMO RBAC TABLE" />
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="cw-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Create User Inline Form */}
        {showCreate && (
          <form onSubmit={handleCreateUser} className="cw-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Create Demonstration Account</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-xs text-[var(--cw-text-muted)] hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
                className="cw-input rounded-lg px-3 py-2 text-xs"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@crowdwise.delhi.in"
                className="cw-input rounded-lg px-3 py-2 text-xs font-mono"
              />
              <select
                aria-label="New user role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'commuter' | 'operator' | 'admin')}
                className="cw-input rounded-lg px-3 py-2 text-xs"
              >
                <option value="commuter">Commuter</option>
                <option value="operator">Transport Operator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="cw-btn-primary rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Save Demo User'}
            </button>
          </form>
        )}

        {/* Filter Bar */}
        <section className="cw-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cw-text-muted)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="cw-input w-full rounded-lg pl-8 pr-3 py-2 text-xs"
            />
          </div>
          <select
            aria-label="Filter users by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="cw-input rounded-lg px-3 py-2 text-xs"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="commuter">Commuters</option>
            <option value="operator">Operators</option>
            <option value="admin">Administrators</option>
          </select>
        </section>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} onRetry={loadUsers} />}

        {!loading && !error && (
          <section className="cw-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((u) => {
                    const isEditing = editingId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-3 font-semibold text-white">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="cw-input rounded px-2 py-1 text-xs w-44"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                              <span>{u.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--cw-text-secondary)]">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="cw-input rounded px-2 py-1 text-xs w-52 font-mono"
                            />
                          ) : (
                            <div>
                              <div>{u.email}</div>
                              {u.passwordResetRequestedAt && (
                                <div className="text-[10px] text-amber-300">
                                  Reset queued:{' '}
                                  {new Date(u.passwordResetRequestedAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-0.5 font-mono text-[11px] text-fuchsia-200">
                              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                              admin (protected)
                            </span>
                          ) : (
                            <select
                              aria-label={`Change role for ${u.email}`}
                              value={u.role}
                              onChange={(e) =>
                                setPendingAction({ user: u, role: e.target.value as UserRole })
                              }
                              className="cw-input rounded px-2 py-1 text-xs"
                            >
                              <option value="commuter">commuter</option>
                              <option value="operator">operator</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-[11px] ${
                              u.status === 'active_demo'
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                                : 'bg-rose-500/15 text-rose-200 border-rose-400/40'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineEdit(u)}
                                  className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-200"
                                >
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-[11px] text-[var(--cw-text-muted)]"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(u.id);
                                    setEditName(u.name);
                                    setEditEmail(u.email);
                                  }}
                                  title="Edit name & email"
                                  className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white inline-flex items-center gap-1"
                                >
                                  <Edit3 className="h-3 w-3" aria-hidden="true" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingAction({ user: u, resetPassword: true })
                                  }
                                  title="Trigger password reset"
                                  className="rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/25 inline-flex items-center gap-1"
                                >
                                  <KeyRound className="h-3 w-3" aria-hidden="true" />
                                  <span>Reset PW</span>
                                </button>
                                {u.role !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingAction({
                                        user: u,
                                        status:
                                          u.status === 'active_demo'
                                            ? 'suspended_demo'
                                            : 'active_demo',
                                      })
                                    }
                                    className="rounded border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/10"
                                  >
                                    {u.status === 'active_demo' ? 'Suspend' : 'Reactivate'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <ConfirmDialog
          open={Boolean(pendingAction)}
          title="Confirm Demo User Update"
          description={
            pendingAction
              ? pendingAction.resetPassword
                ? `Send a simulated password reset timestamp to ${pendingAction.user.email}?`
                : `Update ${pendingAction.user.email} (${
                    pendingAction.role
                      ? `role → ${pendingAction.role}`
                      : `status → ${pendingAction.status}`
                  }) in this demonstration session?`
              : ''
          }
          confirmLabel="Apply Demo Update"
          destructive={pendingAction?.status === 'suspended_demo'}
          onConfirm={executeUpdate}
          onCancel={() => setPendingAction(null)}
        />
      </div>
    </WorkspaceLayout>
  );
}

export function RouteManagementPage() {
  const [filter, setFilter] = useState('');
  const filtered = ([] as Route[]).filter(
    (r) =>
      r.route_short_name.toLowerCase().includes(filter.toLowerCase()) ||
      r.route_long_name.toLowerCase().includes(filter.toLowerCase()) ||
      r.route_id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <WorkspaceLayout section="admin" breadcrumb="Route Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              GTFS Route &amp; Direction Verification
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Inspect static GTFS routes (<code className="font-mono text-violet-300">route_type=3</code>{' '}
              bus only), headway metadata, and direction reconstruction certainty.
            </p>
          </div>
          <DemoDataTag label="10 GTFS ROUTES" />
        </div>

        <div className="cw-card rounded-2xl p-4">
          <label htmlFor="adm-route-q" className="sr-only">
            Filter routes
          </label>
          <input
            id="adm-route-q"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by route number, route_id, or corridor..."
            className="cw-input w-full sm:w-96 rounded-lg px-3 py-2 text-xs"
          />
        </div>

        <section className="cw-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold">GTFS Route</th>
                  <th className="px-4 py-3 font-semibold">Agency</th>
                  <th className="px-4 py-3 font-semibold">Direction 0 / 1 Labels</th>
                  <th className="px-4 py-3 font-semibold">Direction Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Headway / Stops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((r) => (
                  <tr key={r.route_id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        Bus {r.route_short_name} ·{' '}
                        <span className="font-mono text-violet-300">{r.route_id}</span>
                      </div>
                      <div className="text-[var(--cw-text-secondary)]">{r.route_long_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-white">{r.agency_id}</span>
                      <div className="text-[11px] text-[var(--cw-text-muted)]">
                        {r.is_ac ? 'AC Fleet' : 'Non-AC'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--cw-text-secondary)]">
                      <div>0: {r.direction_0_label}</div>
                      <div>1: {r.direction_1_label}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] capitalize ${
                          r.direction_status === 'verified'
                            ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                            : r.direction_status === 'partial'
                            ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                            : 'bg-rose-500/15 text-rose-200 border-rose-400/40'
                        }`}
                      >
                        {r.direction_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-right text-violet-200">
                      {r.headway_minutes} min · {r.stops_direction_0.length} stops
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
}

export function StopManagementPage() {
  const [query, setQuery] = useState('');
  const filtered = ([] as Stop[]).filter(
    (s) =>
      s.stop_name.toLowerCase().includes(query.toLowerCase()) ||
      s.stop_id.toLowerCase().includes(query.toLowerCase()) ||
      s.stop_code.toLowerCase().includes(query.toLowerCase()) ||
      s.corridor.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <WorkspaceLayout section="admin" breadcrumb="Stop Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              GTFS Stop Disambiguation &amp; Coordinate Directory
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Duplicate stop names in Delhi (e.g.,{' '}
              <code className="font-mono text-violet-300">Kashmere Gate</code> bays DL_STP_001 vs.
              DL_STP_029) remain uniquely keyed by GTFS{' '}
              <code className="font-mono text-violet-300">stop_id</code>.
            </p>
          </div>
          <DemoDataTag label="29 GTFS STOPS" />
        </div>

        <div className="cw-card rounded-2xl p-4">
          <label htmlFor="adm-stop-q" className="sr-only">
            Filter GTFS stops
          </label>
          <input
            id="adm-stop-q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by stop_id, stop_code, name (e.g. Kashmere Gate), or corridor..."
            className="cw-input w-full sm:w-96 rounded-lg px-3 py-2 text-xs"
          />
        </div>

        <section className="cw-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold">stop_id / Code</th>
                  <th className="px-4 py-3 font-semibold">Stop Name &amp; Bay Description</th>
                  <th className="px-4 py-3 font-semibold">Corridor</th>
                  <th className="px-4 py-3 font-semibold">Coordinates</th>
                  <th className="px-4 py-3 font-semibold">Routes Served</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((s) => (
                  <tr key={s.stop_id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-semibold text-white">{s.stop_id}</div>
                      <div className="text-[11px] text-[var(--cw-text-muted)]">{s.stop_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                        <span>{s.stop_name}</span>
                      </div>
                      <div className="text-[var(--cw-text-secondary)]">{s.stop_desc}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--cw-text-secondary)]">{s.corridor}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-[var(--cw-text-muted)]">
                      {s.stop_lat.toFixed(4)}, {s.stop_lng.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-violet-200">
                      {s.routes_served.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
}

export function ModelManagementPage() {
  const { pushToast } = useAppState();
  const [versions, setVersions] = useState<ModelVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingModelAction, setPendingModelAction] = useState<{
    version: ModelVersionRecord;
    action: 'activate' | 'rollback';
  } | null>(null);

  useEffect(() => {
    transitApi
      .getModelVersions()
      .then((res) => setVersions(res.versions || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load model registry.'))
      .finally(() => setLoading(false));
  }, []);

  const executeModelAction = async () => {
    if (!pendingModelAction) return;
    try {
      const res = await transitApi.runModelAdminAction(
        pendingModelAction.version.versionId,
        pendingModelAction.action
      );
      setVersions(res.versions);
      pushToast(
        `${pendingModelAction.version.versionId} updated to ${res.updated.deploymentState} (demo registry).`,
        'success'
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Model action failed.', 'error');
    } finally {
      setPendingModelAction(null);
    }
  };

  return (
    <WorkspaceLayout section="admin" breadcrumb="Model Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Crowding Model Version Registry &amp; Evaluation Controls
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Compare chronological candidate models, promote a version into{' '}
              <span className="font-mono text-violet-300">staging_only</span> evaluation, or roll
              back. No model is promoted to production until Antigravity finishes full training.
            </p>
          </div>
          <DemoDataTag label="UNASSIGNED PROD MODEL" />
        </div>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4">
            {versions.map((v) => (
              <section
                key={v.versionId}
                className="cw-card rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Cpu className="h-4 w-4 text-violet-300" aria-hidden="true" />
                    <span className="font-mono font-bold text-sm text-white">{v.versionId}</span>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[11px] ${
                        v.deploymentState === 'staging_only'
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                          : v.deploymentState === 'demo_candidate'
                          ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                          : 'border-white/15 bg-white/5 text-[var(--cw-text-muted)]'
                      }`}
                    >
                      {v.deploymentState}
                    </span>
                  </div>
                  <div className="font-medium text-white">
                    {v.modelName} · {v.algorithm}
                  </div>
                  <p className="text-[var(--cw-text-secondary)]">{v.notes}</p>
                  <div className="font-mono text-[11px] text-[var(--cw-text-muted)]">
                    Dataset: {v.datasetPeriod} · Split: {v.chronologicalSplit}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={v.deploymentState === 'staging_only'}
                    onClick={() => setPendingModelAction({ version: v, action: 'activate' })}
                    className="cw-btn-primary rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    Promote to Staging
                  </button>
                  <button
                    type="button"
                    disabled={v.deploymentState === 'archived'}
                    onClick={() => setPendingModelAction({ version: v, action: 'rollback' })}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Rollback / Archive</span>
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(pendingModelAction)}
          title={
            pendingModelAction?.action === 'activate'
              ? 'Promote Model to Staging Evaluation?'
              : 'Rollback / Archive Model Version?'
          }
          description={
            pendingModelAction
              ? `Update ${pendingModelAction.version.versionId} in the demonstration registry. Production promotion remains locked until backend training completes.`
              : ''
          }
          confirmLabel={
            pendingModelAction?.action === 'activate' ? 'Promote to Staging' : 'Archive Version'
          }
          destructive={pendingModelAction?.action === 'rollback'}
          onConfirm={executeModelAction}
          onCancel={() => setPendingModelAction(null)}
        />
      </div>
    </WorkspaceLayout>
  );
}

export function SystemMonitoringPage() {
  const [health, setHealth] = useState<{
    status: string;
    service: string;
    mode: string;
    uptimeSeconds: number;
    mapsConfigured: boolean;
    datasetPeriod: string;
    modelVersion: string;
    timestamp: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getHealth();
      setHealth(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health endpoint check failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <WorkspaceLayout section="admin" breadcrumb="System Monitoring">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Runtime &amp; API Diagnostics
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Live probe against the Node/Express API layer (
              <code className="font-mono text-violet-300">/api/health</code>) and map runtime
              configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={checkHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh Health Probe</span>
          </button>
        </div>

        {loading && <LoadingSkeleton rows={3} />}
        {error && !loading && <ErrorState message={error} onRetry={checkHealth} />}

        {!loading && !error && health && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="cw-card rounded-2xl p-4">
              <div className="text-xs text-[var(--cw-text-muted)]">API Status</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-300 uppercase">
                {health.status}
              </div>
              <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">{health.service}</div>
            </div>
            <div className="cw-card rounded-2xl p-4">
              <div className="text-xs text-[var(--cw-text-muted)]">Server Uptime</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-bold text-white">
                {health.uptimeSeconds}s
              </div>
              <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                Mode: {health.mode}
              </div>
            </div>
            <div className="cw-card rounded-2xl p-4">
              <div className="text-xs text-[var(--cw-text-muted)]">Google Maps API Key</div>
              <div className="mt-1 font-mono text-xl font-bold text-violet-300">
                {health.mapsConfigured ? 'Configured' : 'Fallback Mode'}
              </div>
              <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                Server-injected client config
              </div>
            </div>
            <div className="cw-card rounded-2xl p-4">
              <div className="text-xs text-[var(--cw-text-muted)]">GTFS-RT Vehicle Feed</div>
              <div className="mt-1 font-mono text-xl font-bold text-amber-300">Not Connected</div>
              <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                Explicitly flagged offline
              </div>
            </div>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transitApi
      .getAuditLogs()
      .then((res) => setLogs(res.logs || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceLayout section="admin" breadcrumb="Audit Logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Platform Audit Trail
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Chronological record of schema checks, demo role mutations, model actions, and
              data-quality batch evaluations.
            </p>
          </div>
          <DemoDataTag label="SESSION AUDIT LOG" />
        </div>

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && (
          <section className="cw-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Action &amp; Target</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-3 font-mono text-[var(--cw-text-muted)] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-violet-300">{log.actorEmail}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-white">{log.action}</div>
                        <div className="text-[11px] text-[var(--cw-text-muted)]">{log.target}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white">
                          <ShieldCheck className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                          {log.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--cw-text-secondary)]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AdminSettingsPage() {
  const { pushToast } = useAppState();
  const [settings, setSettings] = useState<SystemSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    transitApi
      .getSystemSettings()
      .then((res) => setSettings(res.settings))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await transitApi.updateSystemSettings(settings);
      setSettings(res.settings);
      pushToast('System settings persisted for current demonstration session.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout section="admin" breadcrumb="Settings">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            System Settings &amp; Backend Integration
          </h1>
          <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
            Configure operational thresholds, map defaults, and inspect Stage 2 FastAPI environment
            targets.
          </p>
        </div>

        {loading && <LoadingSkeleton rows={3} />}

        {!loading && settings && (
          <form onSubmit={handleSaveSettings} className="cw-card rounded-2xl p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-semibold text-white">
                Operational Thresholds &amp; Policies
              </h2>
              <DemoDataTag label="EDITABLE DEMO CONFIG" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sys-gtfs"
                  className="block font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  GTFS Refresh Schedule
                </label>
                <input
                  id="sys-gtfs"
                  type="text"
                  value={settings.gtfsRefreshSchedule}
                  onChange={(e) =>
                    setSettings({ ...settings, gtfsRefreshSchedule: e.target.value })
                  }
                  className="cw-input w-full rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="sys-retention"
                  className="block font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  Audit Retention (Days)
                </label>
                <input
                  id="sys-retention"
                  type="number"
                  min={7}
                  max={365}
                  value={settings.auditRetentionDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auditRetentionDays: Number(e.target.value) || 90,
                    })
                  }
                  className="cw-input w-full rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="sys-threshold"
                  className="block font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  Min Sample Days for Least Crowded Gate
                </label>
                <input
                  id="sys-threshold"
                  type="number"
                  min={1}
                  max={30}
                  value={settings.minSampleThresholdForLeastCrowded}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minSampleThresholdForLeastCrowded: Number(e.target.value) || 10,
                    })
                  }
                  className="cw-input w-full rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="sys-map"
                  className="block font-semibold text-[var(--cw-text-secondary)] mb-1"
                >
                  Default Map Layer
                </label>
                <select
                  id="sys-map"
                  value={settings.defaultMapLayer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMapLayer: e.target.value as 'roadmap' | 'satellite',
                    })
                  }
                  className="cw-input w-full rounded-lg px-3 py-2"
                >
                  <option value="roadmap">Roadmap</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-white/10 pt-3 text-sm text-[var(--cw-text-secondary)]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enforceStrictConfidenceGate}
                  onChange={(e) =>
                    setSettings({ ...settings, enforceStrictConfidenceGate: e.target.checked })
                  }
                  className="accent-violet-500"
                />
                <span>
                  Strictly exclude Low / Insufficient Data segments from Least Crowded ranking
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableDemandHeatmapByDefault}
                  onChange={(e) =>
                    setSettings({ ...settings, enableDemandHeatmapByDefault: e.target.checked })
                  }
                  className="accent-violet-500"
                />
                <span>Enable corridor demand heatmap overlay by default on Operator views</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyOperatorsOnQualityFailure}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifyOperatorsOnQualityFailure: e.target.checked,
                    })
                  }
                  className="accent-violet-500"
                />
                <span>Alert Operator workspace when Data Quality checks report failed status</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="font-mono text-[11px] text-[var(--cw-text-muted)]">
                Last updated: {new Date(settings.updatedAt).toLocaleString()}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="cw-btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Save System Settings'}</span>
              </button>
            </div>
          </form>
        )}

        <section className="cw-card rounded-2xl p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-white">Active Environment Targets</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-3">
            <div>
              <dt className="text-[var(--cw-text-muted)]">VITE_DATA_MODE</dt>
              <dd className="mt-1 font-mono font-semibold text-violet-300">{API_CONFIG.dataMode}</dd>
            </div>
            <div>
              <dt className="text-[var(--cw-text-muted)]">VITE_API_BASE_URL</dt>
              <dd className="mt-1 font-mono font-semibold text-violet-300">{API_CONFIG.baseUrl}</dd>
            </div>
          </dl>
          <p className="text-[var(--cw-text-secondary)] leading-relaxed pt-2 border-t border-white/10">
            To connect this interface to the Antigravity Python/FastAPI service without modifying UI
            components, set <code className="font-mono text-white">VITE_API_BASE_URL</code> to your
            FastAPI origin and <code className="font-mono text-white">VITE_DATA_MODE=api</code> in
            environment variables.
          </p>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
