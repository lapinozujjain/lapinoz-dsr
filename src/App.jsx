import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  TrendingUp,
  Wallet,
  CreditCard,
  Trash2,
  Save,
  IndianRupee,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Calculator,
  MessageSquare,
  Lock,
  Eye,
  Download,
  Printer,
  X,
  Smartphone,
  Globe,
  Calendar
} from 'lucide-react';
//Vercel analytics imports
import { Analytics } from "@vercel/analytics/react";

// Firebase Imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  //  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
// --- Firebase Initialization ---
//const firebaseConfig = JSON.parse(__firebase_config);
//This version securely loads configuration from environment variables (like those set in Vercel)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};
const appId = "la-pinoz-dsr-v1"; // You can name this whatever you want
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
//const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// --- Constants ---
const OPENING_CASH_BALANCE = 5100;

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
// 💥 NEW AUTH STATES FOR LOGIN SCREEN
  const [isLoading, setIsLoading] = useState(true);
// Must be true initially
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState(null);
// 💥 END NEW AUTH STATES

  const [view, setView] = useState('dashboard');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // 💥 NEW AUTHENTICATION HANDLERS
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
// Reset view after logout
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
// 💥 END AUTHENTICATION HANDLERS

  // 1. Auth & Data Loading Pattern (UPDATED for Email/Password)
  useEffect(() => {
    // This listener watches the authentication state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Once the state is determined (logged in or out), stop loading
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);
  useEffect(() => {
    if (!user) return;
    // If we reach here, user is logged in, and request.auth != null is true.
    const q = query(collection(db, 'dsr_entries'), orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by date descending in memory
    
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
// Navigation Handler
  const renderView = () => {
    if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Loading your data...</div>;
    switch (view) {
      case 'dashboard':
        return <Dashboard entries={entries} />;
      case 'new':
        return <NewEntryForm user={user} onSuccess={() => setView('history')} existingEntries={entries} />;
      case 'history':
        return <HistoryView entries={entries} user={user} />;
      default:
        return <Dashboard entries={entries} />;
    }
  };
  return (
    <>
      {/* STEP 1: LOADING STATE (Initial check of authentication) */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-green-600">Loading Application...</p>
        </div>
      ) :

        /* STEP 2: UNAUTHENTICATED STATE (Show the login page) */
        !user ? (
     
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">

              <div className="flex justify-center mb-6">
                <img
                  src="https://cdn.uengage.io/brand_logo/lapinoz.png"
                  alt="Company Logo"
  
                  className="h-20 w-auto"
                />
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
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:ring-green-500 focus:border-green-500 outline-none"
  
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
        
                className="w-full p-3 border border-gray-300 rounded-md mb-6 focus:ring-green-500 focus:border-green-500 outline-none"
              />

              <button
                onClick={handleAuth}
                className="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-150 disabled:opacity-50"
               
                disabled={!email || !password}
              >
                {isSigningUp ?
                  'Sign Up' : 'Sign In'}
              </button>

              <p className="text-center mt-4 text-sm text-gray-600">
                {isSigningUp ?
                  'Already have an account?' : "Don't have an account?"}
                <button
                  onClick={() => { setIsSigningUp(!isSigningUp);
                    setAuthError(null); }}
                  className="text-green-600 font-medium ml-1 hover:text-green-800"
                >
                  {isSigningUp ?
                    'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        ) :

          /* STEP 3: AUTHENTICATED STATE (Render the main app - Original content) */
          (
   
            <div className="flex h-screen bg-gray-50 font-sans text-gray-900">

              {/* Print Style Block - Re-copied from original JSX (Source 771-772) */}
      <style>{`
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
   
            .print-wide { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
              
              body { font-size: 10px; -webkit-print-color-adjust: exact; }
              table { font-size: 9px; width: 100%; border-collapse: collapse; }
              th, td { padding: 4px 
            !important; border: 1px solid #ddd !important; }
            }
          `}</style>

      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col no-print">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <img
              src="https://cdn.uengage.io/brand_logo/logo-5-1759903116.png"
          
              alt="Company Logo"
              className="h-20 w-auto"
            />
            {/* <h1 className="text-l font-bold tracking-wider text-green-400">DSR Manager Ujjain</h1> */}
          </div>
          <p className="text-l font-bold tracking-wider text-green-400">DSR Manager Ujjain</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
   
          <NavButton
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavButton
            active={view === 'new'}
     
            onClick={() => setView('new')}
            icon={<PlusCircle size={20} />}
            label="New Daily Entry"
          />
          <NavButton
            active={view === 'history'}
            onClick={() => setView('history')}
            icon={<History size={20} />}
 
            label="Reports & History"
          />
        </nav>
        <div className="p-4 text-xs text-gray-500 border-t border-gray-800">
          User ID: {user?.uid?.substring(0, 8)}...
        </div>
        {/* LOGOUT BUTTON ADDED TO SIDEBAR */}
        <div className="p-4 no-print">
          <button 
            onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-md">
            Logout ({user?.email})
          </button>
        </div>
      </aside>

      {/* Mobile Nav Header - MODIFIED FOR BOTTOM NAV */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-10 no-print">
       
          <span className="font-bold text-green-400">LA PINO'Z DSR</span>
          <span className="text-sm text-gray-400">User: {user?.uid?.substring(0, 4)}...</span>
        </header>

        {/* Main Content - PADDING ADDED FOR BOTTOM NAV */}
        <main className="flex-1 overflow-y-auto p-4 
          md:p-8 pb-20 print-wide">
          {renderView()}
        </main>

        {/* NEW: Mobile Bottom Navigation Bar (Fixed for better UX) */}
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-xl md:hidden z-20 no-print">
            <div className="flex justify-around items-center h-16">
                <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dash" />
                <MobileNavButton active={view === 'new'} onClick={() => setView('new')} icon={<PlusCircle size={20} />} label="New" />
                <MobileNavButton active={view === 'history'} onClick={() => setView('history')} icon={<History size={20} />} label="History" />
                <MobileNavButton onClick={handleLogout} icon={<X size={20} />} label="Logout" isLogout={true} />
            </div>
        </div>
      </div>
    </div >
          )
}
    </>
  );
}

// --- Sub Components ---

const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

// --- NEW: Mobile Nav Button for bottom bar ---
const MobileNavButton = ({ active, onClick, icon, label, isLogout = false }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 text-xs transition-colors ${
      active ? 'text-green-600 font-bold' : isLogout ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);


// ---------------- DASHBOARD VIEW ----------------
const Dashboard = ({ entries }) => {
  // Helper for dates
  const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getToday = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());

  // Filter Entries based on Date Range
  const filteredEntries = entries.filter(e => {
    return e.date >= startDate && e.date <= endDate;
  });
  const totalSales = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.totalSale) || 0), 0);
  const totalExpenses = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.totalExpense) || 0), 0);
  // Net cash flow (theoretical)
  const netCash = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.cashInHand) || 0), 0);
  // Breakdown Totals
  const totalPOS = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.sales?.pos) || 0), 0);
  const totalSwiggy = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.sales?.swiggy) || 0), 0);
  const totalZomato = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.sales?.zomatoOnline) || 0) + (parseFloat(curr.sales?.zomatoCash) || 0), 0);
  const totalUengage = filteredEntries.reduce((acc, curr) => acc + (parseFloat(curr.sales?.uengageOnline) || 0) + (parseFloat(curr.sales?.uengageCash) || 0), 0);
  // Calculate aggregated Cash Sales (Counter Cash)
  const cashSales = filteredEntries.reduce((acc, curr) => {
    return acc + (parseFloat(curr.sales?.cash) || 0);
  }, 0);
  // Data for Charts
  // filteredEntries is Descending (from App).
  // Reverse to get Ascending (Time moving left to right)
  const chartData = [...filteredEntries].reverse().map(e => ({
    date: e.date.split('-')[2], // just the day
    fullDate: e.date,
    totalSale: e.totalSale,
    pos: e.sales?.pos || 0,
    swiggy: e.sales?.swiggy || 0,
    zomato: (e.sales?.zomatoOnline || 0) + (e.sales?.zomatoCash || 0),
    uengage: (e.sales?.uengageOnline || 0) + (e.sales?.uengageCash || 0),
    cash: e.sales?.cash || 0,
    expenses: e.totalExpense
  }));
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
          <p className="text-gray-500">Performance from {startDate} to {endDate}</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
       
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
         
              className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
  
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards Row 1 */}
    
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <StatCard title="Total Sales" value={`₹${totalSales.toLocaleString()}`} icon={<TrendingUp className="text-blue-500" />} color="bg-blue-50" />
        <StatCard title="Counter Cash Sale" value={`₹${cashSales.toLocaleString()}`} icon={<IndianRupee className="text-green-500" />} color="bg-green-50" />
        <StatCard title="Net Cash In Hand" value={`₹${netCash.toLocaleString()}`} icon={<Wallet className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} icon={<CreditCard className="text-red-500" />} color="bg-red-50" />
      </div>

      {/* Stats Cards Row 2 - Breakdowns */}
      <div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <StatCard title="Total POS" value={`₹${totalPOS.toLocaleString()}`} icon={<CreditCard size={18} className="text-gray-600" />} color="bg-gray-100" size="sm" />
        <StatCard title="Total Swiggy" value={`₹${totalSwiggy.toLocaleString()}`} icon={<Smartphone size={18} className="text-orange-500" />} color="bg-orange-50" size="sm" />
        <StatCard title="Total Zomato" value={`₹${totalZomato.toLocaleString()}`} icon={<Smartphone size={18} className="text-red-500" />} color="bg-red-50" size="sm" />
        <StatCard title="Total Uengage" value={`₹${totalUengage.toLocaleString()}`} icon={<Globe size={18} className="text-indigo-500" />} color="bg-indigo-50" size="sm" />
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl 
        shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Detailed Revenue & Expense Trend</h3>
        <div className="h-96 w-full">
          {chartData.length > 0 ?
            (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af' }} />
   
                  <Tooltip
                    labelFormatter={(value, payload) => payload[0]?.payload.fullDate || value}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                
                  <Legend />
                  {/* Lines for each revenue source */}
                  <Line type="monotone" dataKey="pos" name="POS" stroke="#4b5563" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="swiggy" name="Swiggy" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="zomato" name="Zomato" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 
}} />
                  <Line type="monotone" dataKey="uengage" name="Uengage" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="cash" name="Counter Cash" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
    
              </ResponsiveContainer>
            ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No data available for this time frame.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, size = 'md' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 ${size === 'sm' ? 'p-4' : 'p-6'}`}>
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <h4 className={`${size === 'sm' ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>{value}</h4>
    </div>
  </div>
);
// ---------------- NEW ENTRY FORM ----------------
const NewEntryForm = ({ user, onSuccess, existingEntries }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalSaleInput, setTotalSaleInput] = useState(''); // New Master Input
  const [comment, setComment] = useState('');
// Comment State

  // Revised Sales State
  const [sales, setSales] = useState({
    pos: '',
    swiggy: '',
    uengageOnline: '',
    uengageCash: '',
    zomatoOnline: '',
    zomatoCash: ''
  });
  const [expenses, setExpenses] = useState([{ id: 1, description: '', amount: '' }]);
  const [denominations, setDenominations] = useState({ 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // --- Calculations ---

  const totalSale = parseFloat(totalSaleInput) ||
0;

  // Sum of all NON-counter cash sources
  const pos = parseFloat(sales.pos) || 0;
  const swiggy = parseFloat(sales.swiggy) ||
0;
  const uengageOnline = parseFloat(sales.uengageOnline) || 0;
  const uengageCash = parseFloat(sales.uengageCash) || 0;
  const zomatoOnline = parseFloat(sales.zomatoOnline) || 0;
  const zomatoCash = parseFloat(sales.zomatoCash) || 0;

  // Derived Counter Cash Sale = Total Sale - (Everything Else)
  const calculatedCashSale = totalSale - (pos + swiggy + uengageOnline + uengageCash + zomatoOnline + zomatoCash);
  const totalExpense = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  // Theoretical Cash in Drawer = Counter Cash + Uengage Cash + Zomato Cash - Expenses + OPENING BALANCE
  const theoreticalCashInHand = calculatedCashSale + uengageCash + zomatoCash - totalExpense + OPENING_CASH_BALANCE;
  const physicalCash = Object.entries(denominations).reduce((acc, [denom, count]) => {
    return acc + (parseFloat(denom) * (parseFloat(count) || 0));
  }, 0);
  const difference = physicalCash - theoreticalCashInHand;

  const handleExpenseChange = (id, field, value) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { id: Date.now(), description: '', amount: '' }]);
  };
  const removeExpenseRow = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };
  const validate = () => {
    if (totalSale <= 0) return "Total Daily Sale must be greater than 0.";
    if (pos < 0 || swiggy < 0 || uengageOnline < 0 || uengageCash < 0 || zomatoOnline < 0 || zomatoCash < 0) {
      return "Revenue sources cannot be negative.";
    }
    const hasNegativeExpense = expenses.some(e => (parseFloat(e.amount) || 0) < 0);
    if (hasNegativeExpense) return "Expenses cannot be negative.";

    return null;
  };
  const handleSubmit = async () => {
    if (!user) return;
    setValidationError('');
    // Check for duplicates
    const duplicate = existingEntries.find(e => e.date === date);
    if (duplicate) {
      if (!confirm(`Warning: A report for ${date} already exists. Do you want to continue and add another entry for this date?`)) {
        return;
      }
    }

    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    const entryData = {
      date,
      totalSale,
      comment,
      sales: {
        pos,
        swiggy,
        uengageOnline,
        uengageCash,
        zomatoOnline,
        zomatoCash,
        cash: calculatedCashSale
      },
      expenses: expenses.filter(e => 
        e.description && e.amount).map(e => ({
        description: e.description,
        amount: parseFloat(e.amount) || 0
      })),
      denominations: Object.fromEntries(Object.entries(denominations).map(([k, v]) => [k, parseFloat(v) || 0])),
      totalExpense,
      openingBalance: OPENING_CASH_BALANCE,
      cashInHand: theoreticalCashInHand,
      physicalCash,
      difference,
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'dsr_entries'), entryData);
      onSuccess();
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <PlusCircle className="mr-2 text-green-600" /> New Daily Sales Report
        </h2>

        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center">
            
            <AlertCircle size={20} className="mr-2" />
            {validationError}
          </div>
        )}

        {/* Date & Master Total */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
        
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
         
          <div className="w-full md:w-2/3">
            <label className="block text-sm font-bold text-gray-800 mb-1">Total Daily Sale (From Billing Software)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
              <input
                type="number"
             
                value={totalSaleInput}
                onChange={(e) => setTotalSaleInput(e.target.value)}
                placeholder="Enter total sale of the day"
                className="w-full pl-8 p-3 border-2 border-blue-100 rounded-lg text-lg font-bold text-gray-900 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
     
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <Calculator size={12} className="mr-1" />
              System will calculate "Cash Sale" by subtracting other sources from this amount.
            </p>
          </div>
        </div>

        {/* Sales & Expenses Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sales Input (Col 1) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center">
              <TrendingUp size={16} className="mr-2" />
              Breakdown of Sales (All Online/Card/App Sales)
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {/* Derived Cash Sale */}
              <div className="flex items-center justify-between pb-2 border-b border-green-200">
                <label className="text-sm text-green-700 font-bold flex items-center">
                  <IndianRupee size={16} className="mr-1" />
                  Calculated Counter Cash Sale
                </label>
                <span className={`text-xl font-extrabold ${calculatedCashSale < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ₹{calculatedCashSale.toLocaleString()}
                </span>
              </div>

              {/* 1. POS/UPI */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <label className="text-sm text-gray-600 font-medium">POS (Credit Card/UPI)</label>
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={sales.pos}
                    onChange={(e) => setSales({ ...sales, pos: e.target.value })}
                    className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* 2. Swiggy */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <label className="text-sm text-gray-600 font-medium">Swiggy</label>
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={sales.swiggy}
                    onChange={(e) => setSales({ ...sales, swiggy: e.target.value })}
                    className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* 3. Zomato Split */}
              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Zomato</label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Online</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={sales.zomatoOnline}
                      onChange={(e) => setSales({ ...sales, zomatoOnline: e.target.value })}
                      className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Cash</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={sales.zomatoCash}
                      onChange={(e) => setSales({ ...sales, zomatoCash: e.target.value })}
                      className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Uengage Split */}
              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Uengage</label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Online</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={sales.uengageOnline}
                      onChange={(e) => setSales({ ...sales, uengageOnline: e.target.value })}
                      className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md 
                      text-right text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Cash</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={sales.uengageCash}
                      onChange={(e) => setSales({ ...sales, uengageCash: e.target.value })}
                      className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Expenses Input (Col 2) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center"><CreditCard size={16} className="mr-2 text-red-600" /> Daily Expenses</span>
              <button
                onClick={addExpenseRow}
                className="text-xs text-blue-600 font-medium flex items-center hover:text-blue-800"
              >
                <PlusCircle size={14} className="mr-1" /> Add Expense
              </button>
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {expenses.map((exp, index) => (
                  <div key={exp.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={`Expense ${index + 1} Description`}
                      value={exp.description}
                      onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                      className="flex-1 p-2 border border-gray-200 rounded-md text-sm focus:border-green-500 outline-none"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={exp.amount}
                        onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                        className="w-full pl-6 p-2 border border-gray-200 rounded-md text-sm text-right"
                      />
                    </div>
                    {expenses.length > 1 && (
                      <button onClick={() => removeExpenseRow(exp.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t font-bold text-gray-900 mt-4">
                <span>Total Expenses</span>
                <span className="text-red-600">- ₹{totalExpense.toLocaleString()}</span>
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 border-b pb-2 flex items-center">
                <MessageSquare size={16} className="mr-2" /> Daily Note / Comment
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any special notes for today?
                (e.g., Heavy rain, Printer repair...)"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-green-500 outline-none h-24 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary & Cash Tally */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cash Tally Inputs */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Cash Drawer Count</h3>
            <div className="grid grid-cols-3 gap-2">
              {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => (
                <div key={denom} className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">x {denom}</label>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={denominations[denom]}
                    onChange={(e) => setDenominations({ ...denominations, [denom]: e.target.value })}
                    className="p-1 border rounded text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Final Calculations 
            */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Closing Summary</h3>
            <div className="space-y-1 text-sm text-gray-600 pb-2 border-b border-gray-200">
              <div className="flex justify-between text-indigo-600 font-medium">
                <span className="flex items-center"><Lock size={12} className="mr-1" />Opening Deposit</span>
                <span>+ ₹{OPENING_CASH_BALANCE}</span>
              </div>
              <div className="flex justify-between">
                <span>Counter Cash Sale</span>
                <span>+ ₹{calculatedCashSale.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash from Zomato/Uengage</span>
                <span>+ ₹{(zomatoCash + uengageCash).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Total Expenses</span>
                <span>- ₹{totalExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Theoretical Cash In Hand</span>
                <span>₹{theoreticalCashInHand.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between text-green-600 font-bold">
                <span>Physical Cash Count</span>
                <span>₹{physicalCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Difference (Short/Excess)</span>
                <span className={difference < 0 ? 'text-red-600' : difference > 0 ? 'text-green-600' : 'text-gray-500'}>
                  {difference.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || totalSale <= 0}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition duration-150 disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Save size={20} />
              )}
              <span>{isSubmitting ? 'Saving...' : 'Submit Daily Sales Report'}</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- HISTORY VIEW ----------------
const HistoryView = ({ entries, user }) => {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedExpenseEntry, setSelectedExpenseEntry] = useState(null); // State for modal

  // Date Range State for History
  const getFirstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };
  const getToday = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());

  // Filter entries
  const filteredEntries = entries.filter(e => {
    // Firebase dates are strings
    return e.date >= startDate && e.date <= endDate;
  });

  // Sort Ascending (Oldest First) - as requested
  const sortedEntries = [...filteredEntries].sort((a, b) => new Date(a.date) - new Date(b.date));


  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
      try {
        if (!user?.uid) return;
        await deleteDoc(doc(db, 'dsr_entries', id));
      } catch (e) {
        console.error("Error deleting", e);
      }
    }
  };


  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n');
        const batch = writeBatch(db);

        // This assumes a simple collection for DSR entries without nested users/artifacts
        const collectionRef = collection(db, 'dsr_entries');
        let importCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i].split(',');
          // Check for minimum expected columns
          if (row.length < 10) continue;

          const dateStr = row[0].trim();
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(dateStr)) {
            // Import Mapping (Legacy CSV format - simplified for this example)
            const totalSale = parseFloat(row[1]) || 0;
            const pos = parseFloat(row[2]) || 0;
            const swiggy = parseFloat(row[3]) || 0;
            const zomatoOnline = parseFloat(row[4]) || 0;
            const zomatoCash = parseFloat(row[5]) || 0;
            const uengageOnline = parseFloat(row[6]) || 0;
            const uengageCash = parseFloat(row[7]) || 0;
            const cash = parseFloat(row[8]) || 0; // Counter Cash Sale
            const totalExpense = parseFloat(row[9]) || 0;
            const physicalCash = (parseFloat(row[10]) || 0) + OPENING_CASH_BALANCE; // CSV is net, so add opening
            const difference = parseFloat(row[11]) || 0;
            const comment = row[12] ? row[12].trim().replace(/"/g, '') : '';


            // --- Calculated values from the legacy format ---
            const theoreticalCashInHand = physicalCash - difference;

            const entryData = {
              date: dateStr,
              totalSale,
              comment,
              sales: {
                pos,
                swiggy,
                uengageOnline,
                uengageCash,
                zomatoOnline,
                zomatoCash,
                cash
              },
              expenses: [], // Legacy format often aggregates expenses, so we leave it empty or try to parse from comment
              denominations: {},
              totalExpense,
              openingBalance: OPENING_CASH_BALANCE,
              cashInHand: theoreticalCashInHand,
              physicalCash,
              difference,
              createdAt: serverTimestamp()
            };

            const docRef = doc(collectionRef);
            batch.set(docRef, entryData);
            importCount++;
          }
        }

        if (importCount > 0) {
          await batch.commit();
          alert(`Successfully imported ${importCount} records! (Note: Only core fields were mapped and expenses were not detailed.)`);
        } else {
          alert("Could not find any valid records.");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to import file.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const exportToCSV = () => {
    // Define Headers matching the table structure
    const headers = [
      "Date",
      "Total Sale",
      "POS (UPI/CC)",
      "Swiggy",
      "Zomato Online",
      "Zomato Cash",
      "Uengage Online",
      "Uengage Cash",
      "Counter Cash Sale",
      "Total Expenses",
      "Net Physical Cash (W/O Deposit)",
      "Short/Excess",
      "Comments"
    ];
    const csvRows = [headers.join(',')];

    sortedEntries.forEach(entry => {
      const physicalWithoutDeposit = (entry.physicalCash || 0) - OPENING_CASH_BALANCE;
      const row = [
        entry.date,
        entry.totalSale || 0,
        entry.sales?.pos || 0,
        entry.sales?.swiggy || 0,
        entry.sales?.zomatoOnline || 0,
        entry.sales?.zomatoCash || 0,
        entry.sales?.uengageOnline || 0,
        entry.sales?.uengageCash || 0,
        entry.sales?.cash || 0,
        entry.totalExpense || 0,
        physicalWithoutDeposit, // Net Physical Cash
        entry.difference || 0,
        `"${(entry.comment || '').replace(/"/g, '""')}"` // Escape comments
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsr_report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">History & Reports</h2>
          <p className="text-gray-500 text-sm">Showing {sortedEntries.length} entries ({startDate} to {endDate})</p>
        </div>

        {/* History Date Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
            />
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button onClick={handlePrint} className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm shadow-sm no-print">
            <Printer size={16} /> <span>Print</span>
          </button>
          <button onClick={exportToCSV} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm">
            <Download size={16} /> <span>Export CSV</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={isImporting}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
          >
            {isImporting ?
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Upload size={16} />}
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Expense Modal */}
      {selectedExpenseEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold">Expenses for {selectedExpenseEntry.date}</h3>
              <button onClick={() => setSelectedExpenseEntry(null)}><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedExpenseEntry.expenses && selectedExpenseEntry.expenses.length > 0 ? (
                selectedExpenseEntry.expenses.map((exp, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">{exp.description}</span>
                    <span className="text-red-500 font-bold">₹{exp.amount}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No expenses recorded.</p>
              )}
              <div 
                className="flex justify-between pt-4 border-t mt-4 font-bold text-lg">
                <span>Total</span>
                <span>₹{selectedExpenseEntry.totalExpense}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table - ADDED SCROLL WRAPPER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="min-w-max md:min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">Date</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sale</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">POS/UPI</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Swiggy</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Zomato</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Uengage</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Counter Cash</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cash In Hand</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Physical</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Short/Excess</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan="13" className="p-6 text-center text-gray-500">
                    No entries found for this date range.
                  </td>
                </tr>
              ) : (
                sortedEntries.map(entry => {
                  const totalOnline = (entry.sales?.pos || 0) + (entry.sales?.swiggy || 0) + (entry.sales?.zomatoOnline || 0) + (entry.sales?.uengageOnline || 0);
                  const totalCash = (entry.sales?.cash || 0) + (entry.sales?.zomatoCash || 0) + (entry.sales?.uengageCash || 0);
                  const netPhysical = (entry.physicalCash || 0) - OPENING_CASH_BALANCE;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white">{entry.date}</td>
                      <td className="p-3 text-right font-bold">₹{entry.totalSale.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">₹{(entry.sales?.pos || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">₹{(entry.sales?.swiggy || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">₹{((entry.sales?.zomatoOnline || 0) + (entry.sales?.zomatoCash || 0)).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">₹{((entry.sales?.uengageOnline || 0) + (entry.sales?.uengageCash || 0)).toLocaleString()}</td>
                      <td className="p-3 text-right font-medium text-green-700 bg-green-50">₹{(entry.sales?.cash || 0).toLocaleString()}</td>

                      <td className="p-3 text-right text-red-600">
                        <div className="flex items-center justify-end space-x-2">
                          <span>- ₹{entry.totalExpense.toLocaleString()}</span>
                          {(entry.expenses?.length > 0) && (
                            <button onClick={() => setSelectedExpenseEntry(entry)} className="no-print text-gray-400 hover:text-blue-600">
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right font-bold text-gray-900">
                        ₹{entry.cashInHand.toLocaleString()}
                      </td>

                      {/* Net Physical Cash (Without Opening Deposit) */}
                      <td className="p-3 text-right font-bold text-indigo-700 bg-indigo-50">
                        ₹{netPhysical.toLocaleString()}
                      </td>

                      <td className={`p-3 text-right font-bold ${entry.difference < 0 ? 'text-red-600' : entry.difference > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {entry.difference || '-'}
                      </td>

                      <td className="p-3 text-xs text-gray-500 italic max-w-xs truncate" title={entry.comment}>
                        {entry.comment || '-'}
                      </td>

                      <td className="p-3 text-center no-print">
                        <button onClick={() => handleDelete(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};