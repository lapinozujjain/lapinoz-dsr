import React, { useState } from 'react';
import {
  LayoutDashboard, PlusCircle, History, X
} from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import {
  createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signOut
} from "firebase/auth";
import { auth } from './firebase';
import { useEntries } from './hooks/useEntries';
import { NavButton, MobileNavButton } from './components/common';
import Dashboard from './views/Dashboard';
import NewEntryForm from './views/NewEntryForm';
import HistoryView from './views/HistoryView';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [view, setView] = useState('dashboard');

  const { entries, loading } = useEntries(user);

  const handleAuth = async () => {
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Email and password cannot be empty.");
      return;
    }
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
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

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderView = () => {
    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Loading your data...</div>;

    switch (view) {
      case 'dashboard': return <Dashboard entries={entries} />;
      case 'new': return <NewEntryForm user={user} onSuccess={() => setView('history')} existingEntries={entries} />;
      case 'history': return <HistoryView entries={entries} user={user} />;
      default: return <Dashboard entries={entries} />;
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
            {isSigningUp ? 'Register' : 'Login'} to LA PINO'Z DSR
          </h2>
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm" role="alert">
              {authError}
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
            {isSigningUp ? 'Sign Up' : 'Sign In'}
          </button>
          <p className="text-center mt-4 text-sm text-gray-600">
            {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => { setIsSigningUp(!isSigningUp); setAuthError(null); }} className="text-green-600 font-medium ml-1 hover:text-green-800">
              {isSigningUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
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
            <p className="text-l font-bold tracking-wider text-green-400">DSR Manager Ujjain</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavButton active={view === 'new'} onClick={() => setView('new')} icon={<PlusCircle size={20} />} label="New Daily Entry" />
            <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<History size={20} />} label="Reports & History" />
          </nav>
          <div className="p-4 text-xs text-gray-500 border-t border-gray-800">
            User ID: {user?.uid?.substring(0, 8)}...
          </div>
          <div className="p-4 no-print">
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-md">
              Logout ({user?.email})
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-10 no-print">
            <span className="font-bold text-green-400">LA PINO'Z DSR</span>
            <span className="text-sm text-gray-400">User: {user?.uid?.substring(0, 4)}...</span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 print-wide">
            {renderView()}
          </main>

          <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-xl md:hidden z-20 no-print">
            <div className="flex justify-around items-center h-16">
              <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dash" />
              <MobileNavButton active={view === 'new'} onClick={() => setView('new')} icon={<PlusCircle size={20} />} label="New" />
              <MobileNavButton active={view === 'history'} onClick={() => setView('history')} icon={<History size={20} />} label="History" />
              <MobileNavButton onClick={handleLogout} icon={<X size={20} />} label="Logout" isLogout={true} />
            </div>
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}
