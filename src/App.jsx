import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, PlusCircle, History, Package, Calendar, FileText, X, Users, Copy, Check
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
import { NavButton, MobileNavButton, OutletSelector } from './components/common';
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

  const { role, active, exists: hasRoleDoc, loading: roleLoading } = useCurrentUserRole(user);
  const { users: allUsers, loading: allUsersLoading } = useAllUsers(user);

  // Don't subscribe to app data until we've confirmed the signed-in
  // account has an approved, active role. Otherwise a deactivated or
  // not-yet-approved account (who will only ever see the blocking
  // screens below, never Dashboard/Reports/etc.) would still open live
  // Firestore listeners on every load, which now immediately fail
  // against the security rules — harmless, but noisy in the console and
  // a wasted subscription for a screen they can't reach anyway.
  const dataAccessEnabled = !roleLoading && hasRoleDoc && active;

  const { entries, loading: dsrLoading } = useEntries(user, dataAccessEnabled);
  const { items: masterItems, loading: masterLoading } = useInventoryMaster(user, outlet, dataAccessEnabled);
  const { records: inventoryRecords, loading: invLoading } = useInventoryDailyRecords(user, outlet, dataAccessEnabled);

  const outletEntries = useMemo(
    () => entries.filter(e => (e.outlet || DEFAULT_LEGACY_OUTLET) === outlet),
    [entries, outlet]
  );

  const allowedViews = VIEW_ACCESS[role] || [];

  // If a role change (or first load) leaves the current view unreachable
  // for this account, land somewhere they actually have access to
  // instead of showing a page with hidden nav but a live route.
  useEffect(() => {
    if (!role) return;
    if (!allowedViews.includes(view)) {
      setView(allowedViews[0] || 'new');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleOutletChange = (value) => {
    setOutlet(value);
    try {
      localStorage.setItem(OUTLET_STORAGE_KEY, value);
    } catch {
      // Ignore — selection just won't persist across reloads.
    }
  };

  const handleAuth = async () => {
    setAuthError(null);
    setResetSent(false);
    if (!email || !password) {
      setAuthError("Email and password cannot be empty.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setResetSent(false);
    if (!email) {
      setAuthError("Enter your email above first, then click 'Forgot password?'.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // One-time bootstrap: the very first person to open the app (once
  // self-signup is removed, this can only be someone whose account
  // already exists — e.g. from before this feature shipped) can claim
  // Owner for themselves, but only while NO team accounts exist yet.
  // The matching Firestore rule locks this path shut the instant it's
  // used once, by requiring app_config/meta not to exist — see
  // firestore.rules.
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
      });
      batch.set(doc(db, APP_CONFIG_COLLECTION, 'meta'), {
        ownerBootstrapped: true,
        bootstrappedAt: serverTimestamp(),
        bootstrappedBy: user.uid
      });
      await batch.commit();
    } catch (error) {
      console.error('Error claiming owner:', error);
      alert('Failed to set up the owner account. Please try again.');
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
    if (dsrLoading) return <div className="flex h-screen items-center justify-center text-gray-500">Loading your data...</div>;

    switch (view) {
      case 'dashboard':
        return <Dashboard entries={outletEntries} outlet={outlet} />;
      case 'new':
        return <NewEntryForm user={user} outlet={outlet} onSuccess={() => setView(allowedViews.includes('history') ? 'history' : 'new')} existingEntries={outletEntries} />;
      case 'history':
        return <HistoryView entries={outletEntries} user={user} outlet={outlet} />;
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
            outlet={outlet}
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-green-600">Loading Application...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img src="https://cdn.uengage.io/brand_logo/lapinoz.png" alt="Company Logo" className="h-20 w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-center text-green-600 mb-6">
            Login to LA PINO'Z DSR & Inventory
          </h2>
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm" role="alert">
              {authError}
            </div>
          )}
          {resetSent && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm" role="status">
              Password reset email sent — check your inbox.
            </div>
          )}
          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md mb-6 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-150 disabled:opacity-50"
            disabled={!email || !password}
          >
            Sign In
          </button>
          <p className="text-center mt-4 text-sm">
            <button onClick={handleForgotPassword} className="text-green-600 font-medium hover:text-green-800">
              Forgot password?
            </button>
          </p>
          <p className="text-center mt-2 text-xs text-gray-400">
            New accounts are created by your Owner or Store Manager.
          </p>
        </div>
      </div>
    );
  }

  // Still resolving the account's role/status — avoid flashing the full
  // app (or the wrong screen) before we know which one is correct.
  if (roleLoading || allUsersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-green-600">Loading your account...</p>
      </div>
    );
  }

  if (!hasRoleDoc) {
    if (allUsers.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Set Up the First Owner Account</h2>
            <p className="text-sm text-gray-500 mb-6">
              No team accounts exist yet. Since you're the first person here, you can claim the Owner role
              for <strong>{user.email}</strong>. This option disappears once any account exists.
            </p>
            <button
              onClick={handleClaimOwner}
              disabled={isClaiming}
              className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {isClaiming ? 'Setting up...' : 'Claim Owner Role'}
            </button>
            <button onClick={handleLogout} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700">
              Log out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Not Set Up Yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            You're signed in as <strong>{user.email}</strong>, but no role has been assigned to this account.
            Share your User ID below with your Owner so they can add you.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2 mb-6">
            <code className="text-xs text-gray-600 flex-1 text-left break-all">{user.uid}</code>
            <button onClick={handleCopyUid} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
              {uidCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-700 p-3 rounded-md font-medium hover:bg-gray-200">
            Log out
          </button>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Account Deactivated</h2>
          <p className="text-sm text-gray-500 mb-6">
            This account has been deactivated. Contact your Owner if you believe this is a mistake.
          </p>
          <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-700 p-3 rounded-md font-medium hover:bg-gray-200">
            Log out
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
              <img src="https://cdn.uengage.io/brand_logo/logo-5-1759903116.png" alt="Company Logo" className="h-20 w-auto" />
            </div>
            <p className="text-l font-bold tracking-wider text-green-400">DSR & Inventory</p>
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

          <div className="p-4 text-xs text-gray-500 border-t border-gray-800">
            {user?.email}
          </div>
          <div className="p-4 no-print">
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm">
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden bg-slate-900 text-white p-4 flex flex-col gap-3 z-10 no-print">
            <div className="flex justify-between items-center">
              <span className="font-bold text-green-400">LA PINO'Z DSR & INV</span>
              <span className="text-sm text-gray-400">{user?.email}</span>
            </div>
            <OutletSelector outlet={outlet} onChange={handleOutletChange} options={OUTLETS} dark />
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 print-wide">
            {renderView()}
          </main>

          <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-xl md:hidden z-20 no-print">
            <div className="flex items-center h-16 overflow-x-auto no-scrollbar px-1">
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
