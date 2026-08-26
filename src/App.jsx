import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, PlusCircle, History, Package, Calendar, FileText, X, Users, Copy, Check, ShieldAlert
} from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, USERS_COLLECTION, APP_CONFIG_COLLECTION } from './firebase';
import { OUTLETS, DEFAULT_LEGACY_OUTLET, OUTLET_STORAGE_KEY, VIEW_ACCESS } from './constants';
import { useEntries } from './hooks/useEntries';
import { useInventoryMaster, useInventoryDailyRecords } from './hooks/useInventory';
import { useCurrentUserRole, useAllUsers } from './hooks/useAppUsers';
import { NavButton, MobileNavButton, OutletSelector, ConfirmDialog } from './components/common';
import Dashboard from './views/Dashboard';
import NewEntryForm from './views/NewEntryForm';
import HistoryView from './views/HistoryView';
import InventoryMaster from './views/InventoryMaster';
import DailyStockClosing from './views/DailyStockClosing';
import InventorySummary from './views/InventorySummary';
import UserManagement from './views/UserManagement';

const getStoredOutlet = () => {
  try {
    const stored = localStorage.getItem(OUTLET_STORAGE_KEY);
    return OUTLETS.includes(stored) ? stored : OUTLETS[0];
  } catch {
    return OUTLETS[0];
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [view, setView] = useState('dashboard');
  const [outlet, setOutlet] = useState(getStoredOutlet);
  const [isClaiming, setIsClaiming] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [confirmClaimOwner, setConfirmClaimOwner] = useState(false);

  const { role, active, exists: hasRoleDoc, loading: roleLoading } = useCurrentUserRole(user);

  const shouldFetchAllUsers = Boolean(user && (role === 'owner' || !hasRoleDoc));
  const { users: allUsers, loading: allUsersLoading } = useAllUsers(user, shouldFetchAllUsers);

  const dataAccessEnabled = Boolean(user && !roleLoading && hasRoleDoc && active);

  const { entries, loading: dsrLoading } = useEntries(user, dataAccessEnabled);
  const { items: masterItems, loading: masterLoading } = useInventoryMaster(user, dataAccessEnabled);
  const { records: inventoryRecords } = useInventoryDailyRecords(user, outlet, dataAccessEnabled);

  const outletEntries = useMemo(
    () => entries.filter(e => ((e.outlet || DEFAULT_LEGACY_OUTLET).trim().toUpperCase() === outlet.trim().toUpperCase())),
    [entries, outlet]
  );

  const allowedViews = useMemo(() => {
    return VIEW_ACCESS[role] || ['new', 'daily_stock'];
  }, [role]);

  useEffect(() => {
    if (!role) return;
    if (!allowedViews.includes(view)) {
      setView(allowedViews[0] || 'new');
    }
  }, [role, allowedViews, view]);

  const handleOutletChange = (value) => {
    setOutlet(value);
    try {
      localStorage.setItem(OUTLET_STORAGE_KEY, value);
    } catch {
      // Ignore write errors
    }
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setResetSent(false);
    if (!email.trim() || !password) {
      setAuthError("Email and password cannot be empty.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error("Sign-in error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setAuthError("Invalid email or password. Please check your credentials.");
      } else {
        setAuthError(error.message || "Failed to sign in.");
      }
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setResetSent(false);
    if (!email.trim()) {
      setAuthError("Enter your email address above first, then click 'Forgot password?'.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (error) {
      setAuthError(error.message || "Failed to send password reset email.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
      setEmail('');
      setPassword('');
      setAuthError(null);
      setResetSent(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClaimOwner = async () => {
    if (!user) return;
    setIsClaiming(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, USERS_COLLECTION, user.uid), {
        email: user.email,
        role: 'owner',
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      }, { merge: true });

      batch.set(doc(db, APP_CONFIG_COLLECTION, 'meta'), {
        ownerBootstrapped: true,
        bootstrappedAt: serverTimestamp(),
        bootstrappedBy: user.uid
      }, { merge: true });

      await batch.commit();
      setConfirmClaimOwner(false);
      alert('Owner account initialized successfully!');
    } catch (error) {
      console.error('Error claiming owner:', error);
      alert(`Failed to set up Owner account: ${error.message}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCopyUid = () => {
    if (!user) return;
    navigator.clipboard?.writeText(user.uid);
    setUidCopied(true);
    setTimeout(() => setUidCopied(false), 2000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderView = () => {
    if (dsrLoading && view === 'dashboard') {
      return (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading daily sales data...</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard entries={outletEntries} outlet={outlet} />;
      case 'new':
        return (
          <NewEntryForm
            user={user}
            outlet={outlet}
            existingEntries={outletEntries}
          />
        );
      case 'history':
        return <HistoryView entries={outletEntries} user={user} outlet={outlet} role={role} />;
      case 'daily_stock':
        return (
          <DailyStockClosing
            user={user}
            outlet={outlet}
            masterItems={masterItems}
            dsrEntries={outletEntries}
            inventoryRecords={inventoryRecords}
            onSuccess={() => setView(allowedViews.includes('inventory_summary') ? 'inventory_summary' : 'daily_stock')}
          />
        );
      case 'inventory_summary':
        return (
          <InventorySummary
            outlet={outlet}
            masterItems={masterItems}
            dsrEntries={outletEntries}
            inventoryRecords={inventoryRecords}
          />
        );
      case 'inventory_master':
        return (
          <InventoryMaster
            user={user}
            masterItems={masterItems}
            loading={masterLoading}
            role={role}
          />
        );
      case 'user_management':
        return <UserManagement user={user} allUsers={allUsers} />;
      default:
        return <Dashboard entries={outletEntries} outlet={outlet} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700">Loading Application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-8 bg-white shadow-xl rounded-xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <img src="https://cdn.uengage.io/brand_logo/lapinoz.png" alt="Company Logo" className="h-16 w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            LA PINO'Z DSR & Inventory
          </h2>
          <p className="text-xs text-center text-gray-500 mb-6">Sign in to your account</p>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-xs font-medium" role="alert">
              {authError}
            </div>
          )}

          {resetSent && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-xs font-medium" role="status">
              Password reset email sent — please check your inbox.
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email" required placeholder="name@lapinoz.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition shadow-sm"
            >
              Sign In
            </button>
          </form>

          <p className="text-center mt-4 text-sm">
            <button onClick={handleForgotPassword} className="text-green-600 font-medium hover:text-green-800 text-xs">
              Forgot password?
            </button>
          </p>
          <p className="text-center mt-4 text-2xs text-gray-400 border-t pt-3">
            Accounts are managed by the store Owner. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Verifying account access...</p>
        </div>
      </div>
    );
  }

  if (!hasRoleDoc) {
    // Whether "Initialize as Owner" can succeed depends entirely on
    // Firestore's app_config/meta lock (see firestore.rules) — it only
    // works while zero team accounts exist anywhere. Showing that button
    // unconditionally to every roleless account (e.g. a Manager/Staff
    // account the Owner hasn't finished setting up yet, or a stray typo
    // in a pasted UID) meant it would just fail with a confusing
    // permission error for anyone who isn't genuinely the first user.
    if (allUsersLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Checking team accounts...</p>
          </div>
        </div>
      );
    }

    const canBootstrap = allUsers.length === 0;

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-8 bg-white shadow-xl rounded-xl w-full max-w-md text-center border border-gray-100">
          <ShieldAlert size={48} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Setup Required</h2>
          <p className="text-sm text-gray-600 mb-4">
            Signed in as <strong>{user.email}</strong>. This account does not have a role profile assigned yet.
            {!canBootstrap && ' Share your User ID below with your Owner so they can add you.'}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left mb-6">
            <p className="text-2xs font-semibold text-gray-500 uppercase mb-1">Your User ID</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-gray-700 font-mono break-all">{user.uid}</code>
              <button
                onClick={handleCopyUid}
                className="text-gray-500 hover:text-gray-800 p-1 rounded"
                title="Copy UID"
              >
                {uidCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {canBootstrap && (
              <button
                onClick={() => setConfirmClaimOwner(true)}
                disabled={isClaiming}
                className="w-full bg-green-600 text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                {isClaiming ? 'Initializing Owner...' : 'Initialize as Owner Account'}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 text-gray-700 p-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Log Out
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmClaimOwner}
          title="Claim Owner Role?"
          message={`Are you the administrator / owner of this system? This will register ${user.email} as the verified Owner in Firestore.`}
          confirmLabel="Confirm & Setup Owner"
          danger={false}
          onConfirm={handleClaimOwner}
          onCancel={() => setConfirmClaimOwner(false)}
        />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-8 bg-white shadow-xl rounded-xl w-full max-w-md text-center border border-gray-100">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Deactivated</h2>
          <p className="text-sm text-gray-500 mb-6">
            Access for <strong>{user.email}</strong> has been deactivated by the store administrator.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 p-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-wide { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
            body { font-size: 10px; -webkit-print-color-adjust: exact; }
            table { font-size: 9px; width: 100%; border-collapse: collapse; }
            th, td { padding: 4px !important; border: 1px solid #ddd !important; }
          }
        `}</style>

        <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col no-print">
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <img src="https://cdn.uengage.io/brand_logo/logo-5-1759903116.png" alt="Company Logo" className="h-16 w-auto" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-bold tracking-wider text-green-400">DSR & Inventory</p>
              <span className="text-3xs uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-gray-300 border border-slate-700">
                {role}
              </span>
            </div>
            <div className="mt-3">
              <OutletSelector outlet={outlet} onChange={handleOutletChange} options={OUTLETS} dark />
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {(allowedViews.includes('dashboard') || allowedViews.includes('new') || allowedViews.includes('history')) && (
              <div className="px-3 pb-1 text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                Sales Records (DSR)
              </div>
            )}
            {allowedViews.includes('dashboard') && (
              <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            )}
            {allowedViews.includes('new') && (
              <NavButton active={view === 'new'} onClick={() => setView('new')} icon={<PlusCircle size={18} />} label="New Daily DSR" />
            )}
            {allowedViews.includes('history') && (
              <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<History size={18} />} label="DSR Reports" />
            )}

            {(allowedViews.includes('daily_stock') || allowedViews.includes('inventory_summary') || allowedViews.includes('inventory_master')) && (
              <div className="pt-4 px-3 pb-1 text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                Inventory & Food Cost
              </div>
            )}
            {allowedViews.includes('daily_stock') && (
              <NavButton active={view === 'daily_stock'} onClick={() => setView('daily_stock')} icon={<Calendar size={18} />} label="Daily Stock Closing" />
            )}
            {allowedViews.includes('inventory_summary') && (
              <NavButton active={view === 'inventory_summary'} onClick={() => setView('inventory_summary')} icon={<FileText size={18} />} label="Monthly Summary" />
            )}
            {allowedViews.includes('inventory_master') && (
              <NavButton active={view === 'inventory_master'} onClick={() => setView('inventory_master')} icon={<Package size={18} />} label="Item Master" />
            )}

            {allowedViews.includes('user_management') && (
              <>
                <div className="pt-4 px-3 pb-1 text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </div>
                <NavButton active={view === 'user_management'} onClick={() => setView('user_management')} icon={<Users size={18} />} label="Team Accounts" />
              </>
            )}
          </nav>

          <div className="p-4 text-xs text-gray-400 border-t border-gray-800 truncate" title={user?.email}>
            {user?.email}
          </div>
          <div className="p-4 pt-0 no-print">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden bg-slate-900 text-white p-4 flex flex-col gap-3 z-10 no-print">
            <div className="flex justify-between items-center">
              <span className="font-bold text-green-400 text-sm">LA PINO'Z DSR & INV</span>
              <span className="text-xs text-gray-400 font-mono">{role}</span>
            </div>
            <OutletSelector outlet={outlet} onChange={handleOutletChange} options={OUTLETS} dark />
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 print-wide">
            {renderView()}
          </main>

          <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-xl md:hidden z-20 no-print">
            <div className="flex items-center h-16 overflow-x-auto no-scrollbar px-1 justify-around">
              {allowedViews.includes('dashboard') && (
                <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />} label="Dash" />
              )}
              {allowedViews.includes('new') && (
                <MobileNavButton active={view === 'new'} onClick={() => setView('new')} icon={<PlusCircle size={18} />} label="DSR" />
              )}
              {allowedViews.includes('history') && (
                <MobileNavButton active={view === 'history'} onClick={() => setView('history')} icon={<History size={18} />} label="Reports" />
              )}
              {allowedViews.includes('daily_stock') && (
                <MobileNavButton active={view === 'daily_stock'} onClick={() => setView('daily_stock')} icon={<Calendar size={18} />} label="Stock" />
              )}
              {allowedViews.includes('inventory_summary') && (
                <MobileNavButton active={view === 'inventory_summary'} onClick={() => setView('inventory_summary')} icon={<FileText size={18} />} label="Summary" />
              )}
              {allowedViews.includes('inventory_master') && (
                <MobileNavButton active={view === 'inventory_master'} onClick={() => setView('inventory_master')} icon={<Package size={18} />} label="Master" />
              )}
              {allowedViews.includes('user_management') && (
                <MobileNavButton active={view === 'user_management'} onClick={() => setView('user_management')} icon={<Users size={18} />} label="Team" />
              )}
              <MobileNavButton onClick={handleLogout} icon={<X size={18} />} label="Logout" isLogout={true} />
            </div>
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}