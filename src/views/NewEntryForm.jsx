import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  PlusCircle, AlertCircle, Calculator, MessageSquare, Lock, Save, Trash2, RotateCcw, X, CheckCircle2
} from 'lucide-react';
import { db, ENTRIES_COLLECTION } from '../firebase';
import { OPENING_CASH_BALANCE, CASH_DENOMINATIONS, EXPENSE_CATEGORIES } from '../constants';
import { formatCurrency, getFirstDayOfMonth, getToday } from '../utils/date';
import { handleGridArrowNav } from '../utils/gridNav';
import { ConfirmDialog } from '../components/common';

const EMPTY_SALES = { pos: '', swiggy: '', uengageOnline: '', uengageCash: '', zomatoOnline: '', zomatoCash: '' };
const EMPTY_DENOMINATIONS = Object.fromEntries(CASH_DENOMINATIONS.map(d => [d, '']));
const EMPTY_EXPENSE_ROW = () => ({ id: Date.now(), category: '', description: '', amount: '' });

export default function NewEntryForm({ user, outlet, existingEntries }) {
  // Entries can only be created for the current month — min/max on the
  // date input plus a check inside validate() so a manipulated/cached
  // input can't slip a backdated or future entry through.
  const monthStart = getFirstDayOfMonth();
  const today = getToday();

  const [date, setDate] = useState(today);
  const [totalSaleInput, setTotalSaleInput] = useState('');
  const [comment, setComment] = useState('');

  const [sales, setSales] = useState(EMPTY_SALES);
  const [expenses, setExpenses] = useState([EMPTY_EXPENSE_ROW()]);
  const [denominations, setDenominations] = useState(EMPTY_DENOMINATIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  // Drives the ConfirmDialog for Reset — replaces window.confirm(),
  // which blocks the main thread for as long as the dialog is open
  // (that's what was triggering the "event handler blocked UI updates"
  // INP warning on the Reset button).
  const [confirmState, setConfirmState] = useState(null);
  const closeConfirm = () => setConfirmState(null);
  // Review-and-confirm popup shown before the entry is actually saved.
  const [showSummary, setShowSummary] = useState(false);
  const [savedBanner, setSavedBanner] = useState(null);

  const totalSale = parseFloat(totalSaleInput) || 0;
  const pos = parseFloat(sales.pos) || 0;
  const swiggy = parseFloat(sales.swiggy) || 0;
  const uengageOnline = parseFloat(sales.uengageOnline) || 0;
  const uengageCash = parseFloat(sales.uengageCash) || 0;
  const zomatoOnline = parseFloat(sales.zomatoOnline) || 0;
  const zomatoCash = parseFloat(sales.zomatoCash) || 0;

  // Derived Counter Cash Sale = Total Sale - (Everything Else)
  const calculatedCashSale = totalSale - (pos + swiggy + uengageOnline + uengageCash + zomatoOnline + zomatoCash);
  const totalExpense = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  // Theoretical Cash in Drawer = Counter Cash + Uengage Cash + Zomato Cash - Expenses + OPENING BALANCE
  const theoreticalCashInHand = calculatedCashSale + uengageCash + zomatoCash - totalExpense + OPENING_CASH_BALANCE;

  const physicalCash = Object.entries(denominations).reduce(
    (acc, [denom, count]) => acc + (parseFloat(denom) * (parseFloat(count) || 0)), 0
  );
  const difference = physicalCash - theoreticalCashInHand;
  // Envelope Cash = physical count minus the opening deposit — the actual
  // cash that goes in the deposit envelope at close. Same calculation as
  // the "Envelope Cash" column in Reports.
  const envelopeCash = physicalCash - OPENING_CASH_BALANCE;

  const handleExpenseChange = (id, field, value) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };
  const addExpenseRow = () => setExpenses([...expenses, EMPTY_EXPENSE_ROW()]);
  const removeExpenseRow = (id) => setExpenses(expenses.filter(e => e.id !== id));

  const performReset = () => {
    setDate(today);
    setTotalSaleInput('');
    setComment('');
    setSales(EMPTY_SALES);
    setExpenses([EMPTY_EXPENSE_ROW()]);
    setDenominations(EMPTY_DENOMINATIONS);
    setValidationError('');
  };

  const requestReset = () => setConfirmState({
    title: "Reset form?",
    message: "All entries you've made will be cleared.",
    confirmLabel: "Reset",
    danger: true,
    onConfirm: () => { performReset(); closeConfirm(); }
  });

  const validate = () => {
    if (totalSale <= 0) return "Total Daily Sale must be greater than 0.";

    if (pos < 0 || swiggy < 0 || uengageOnline < 0 || uengageCash < 0 || zomatoOnline < 0 || zomatoCash < 0) {
      return "Revenue sources cannot be negative.";
    }

    // Counter Cash Sale is derived (Total Sale minus every other source) —
    // if it goes negative, the other fields add up to more than the
    // total sale, which isn't possible since there's no such thing as a
    // negative cash sale.
    if (calculatedCashSale < 0) {
      return "Calculated Counter Cash Sale cannot be negative. The other revenue sources add up to more than the Total Daily Sale — please check your entries.";
    }

    if (expenses.some(e => (parseFloat(e.amount) || 0) < 0)) {
      return "Expenses cannot be negative.";
    }
    if (expenses.some(e => (parseFloat(e.amount) || 0) > 0 && !e.category)) {
      return "Please select a category for every expense that has an amount.";
    }
    if (expenses.some(e => (parseFloat(e.amount) || 0) > 0 && !e.description.trim())) {
      return "Please add a note for every expense that has an amount.";
    }

    if (Object.values(denominations).some(v => (parseFloat(v) || 0) < 0)) {
      return "Cash drawer counts cannot be negative.";
    }

    if (date < monthStart || date > today) {
      return "New entries can only be created for the current month (and not for a future date).";
    }

    return null;
  };

  const proceedSubmit = async () => {
    setIsSubmitting(true);

    const entryData = {
      date,
      outlet,
      totalSale,
      comment,
      sales: { pos, swiggy, uengageOnline, uengageCash, zomatoOnline, zomatoCash, cash: calculatedCashSale },
      expenses: expenses.filter(e => e.amount).map(e => ({
        category: e.category,
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
      await addDoc(collection(db, ENTRIES_COLLECTION), entryData);
      setShowSummary(false);
      setSavedBanner(`DSR entry for ${date} saved successfully.`);
      performReset();
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClick = () => {
    if (!user) return;
    setValidationError('');
    setSavedBanner(null);

    // A record for this date already exists — no override option here.
    // The only way past this is for the Owner to delete the existing
    // record in DSR Reports first, then a fresh one can be entered.
    const duplicate = existingEntries.find(e => e.date === date);
    if (duplicate) {
      setValidationError(`A DSR record for ${date} already exists. Ask the Owner to delete it in DSR Reports before entering a new one for this date.`);
      return;
    }

    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    setShowSummary(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
          <span className="flex items-center">
            <PlusCircle className="mr-2 text-green-600" /> New Daily Sales Report
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            {outlet}
          </span>
        </h2>

        {savedBanner && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="flex items-center">
              <Save size={18} className="mr-2 flex-shrink-0" />
              {savedBanner}
            </span>
            <button onClick={() => setSavedBanner(null)} className="text-green-600 hover:text-green-800 flex-shrink-0 ml-3">
              <X size={16} />
            </button>
          </div>
        )}

        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle size={20} className="mr-2" />
            {validationError}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date" value={date} min={monthStart} max={today} onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Entries can only be made for the current month.</p>
          </div>
          <div className="w-full md:w-2/3">
            <label className="block text-sm font-bold text-gray-800 mb-1">Total Daily Sale (From Billing Software)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
              <input
                type="number" min="0" value={totalSaleInput} onChange={(e) => setTotalSaleInput(e.target.value)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Revenue Breakup</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <label className="text-sm text-gray-600 font-medium">POS (UPI/CC)</label>
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input type="number" min="0" placeholder="0" value={sales.pos} onChange={(e) => setSales({ ...sales, pos: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={0} data-nav-col={0} className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <label className="text-sm text-gray-600 font-medium">Swiggy</label>
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input type="number" min="0" placeholder="0" value={sales.swiggy} onChange={(e) => setSales({ ...sales, swiggy: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={1} data-nav-col={0} className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Zomato</label>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Online</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                      <input type="number" min="0" placeholder="0" value={sales.zomatoOnline} onChange={(e) => setSales({ ...sales, zomatoOnline: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={2} data-nav-col={0} className="w-full pl-6 pr-2 p-2 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Cash</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                      <input type="number" min="0" placeholder="0" value={sales.zomatoCash} onChange={(e) => setSales({ ...sales, zomatoCash: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={2} data-nav-col={1} className="w-full pl-6 pr-2 p-2 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Uengage</label>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Online</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                      <input type="number" min="0" placeholder="0" value={sales.uengageOnline} onChange={(e) => setSales({ ...sales, uengageOnline: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={3} data-nav-col={0} className="w-full pl-6 pr-2 p-2 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Cash</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                      <input type="number" min="0" placeholder="0" value={sales.uengageCash} onChange={(e) => setSales({ ...sales, uengageCash: e.target.value })} onKeyDown={handleGridArrowNav} data-nav-group="revenue" data-nav-row={3} data-nav-col={1} className="w-full pl-6 pr-2 p-2 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 mt-2 bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="font-bold text-gray-700">Calculated Cash Sale</span>
                <span className={`font-bold text-lg ${calculatedCashSale < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(calculatedCashSale)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="flex-1 mb-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-800">Daily Expenses</h3>
                <button onClick={addExpenseRow} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center">
                  <PlusCircle size={14} className="mr-1" /> Add Item
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {expenses.map((exp, expIdx) => (
                  <div key={exp.id} className="flex flex-col gap-1 p-2 bg-gray-50 rounded-md border border-gray-100">
                    <div className="flex gap-2">
                      <select
                        value={exp.category}
                        onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                        className="flex-1 p-2 border rounded-md text-sm bg-white"
                      >
                        <option value="">Select category...</option>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-2 text-gray-400 text-sm">₹</span>
                        <input
                          type="number" min="0" placeholder="Amt" value={exp.amount}
                          onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                          onKeyDown={handleGridArrowNav}
                          data-nav-group="expense-amount" data-nav-row={expIdx} data-nav-col={0}
                          className="w-full pl-6 pr-2 p-2 border rounded-md text-sm text-right bg-white"
                        />
                      </div>
                      {expenses.length > 1 && (
                        <button onClick={() => removeExpenseRow(exp.id)} className="text-red-400 hover:text-red-600 px-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text" placeholder="Note (required)" value={exp.description}
                      onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                      onKeyDown={handleGridArrowNav}
                      data-nav-group="expense-desc" data-nav-row={expIdx} data-nav-col={0}
                      className="p-2 border rounded-md text-sm bg-white"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t font-bold text-gray-900 mt-4">
                <span>Total Expenses</span>
                <span className="text-red-600">- {formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2 border-b pb-2 flex items-center">
                <MessageSquare size={16} className="mr-2" /> Daily Note / Comment
              </h3>
              <textarea
                value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Any special notes for today? (e.g., Heavy rain, Printer repair...)"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-green-500 outline-none h-24 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Cash Drawer Count</h3>
              <div className="grid grid-cols-3 gap-2">
                {CASH_DENOMINATIONS.map((denom, denomIdx) => (
                  <div key={denom} className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">x {denom}</label>
                    <input
                      type="number" min="0" placeholder="Qty" value={denominations[denom]}
                      onChange={(e) => setDenominations({ ...denominations, [denom]: e.target.value })}
                      onKeyDown={handleGridArrowNav}
                      data-nav-group="cash-denom" data-nav-row={Math.floor(denomIdx / 3)} data-nav-col={denomIdx % 3}
                      className="p-1 border rounded text-center text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="font-bold text-gray-700">Envelope Cash</span>
                <span className="font-bold text-lg text-green-700">{formatCurrency(envelopeCash)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Closing Summary</h3>
              <div className="space-y-1 text-sm text-gray-600 pb-2 border-b border-gray-200">
                <div className="flex justify-between text-indigo-600 font-medium">
                  <span className="flex items-center"><Lock size={12} className="mr-1" />Opening Deposit</span>
                  <span>+ {formatCurrency(OPENING_CASH_BALANCE)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Counter Cash Sale</span>
                  <span>+ {formatCurrency(calculatedCashSale)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Uengage Cash</span>
                  <span>+ {formatCurrency(uengageCash)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Zomato Cash</span>
                  <span>+ {formatCurrency(zomatoCash)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total Expenses</span>
                  <span>- {formatCurrency(totalExpense)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Expected Cash</span>
                <span>{formatCurrency(theoreticalCashInHand)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Physical Count</span>
                <span>{formatCurrency(physicalCash)}</span>
              </div>

              {difference !== 0 && (
                <div className={`flex items-center gap-2 p-3 rounded-md text-sm font-bold mt-2 ${difference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <AlertCircle size={18} />
                  <span>{difference > 0 ? `Excess: +${formatCurrency(difference)}` : `Shortage: -${formatCurrency(Math.abs(difference))}`}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={requestReset} disabled={isSubmitting}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 shadow-sm transition-all disabled:opacity-50"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleReviewClick} disabled={isSubmitting}
            className="flex items-center space-x-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 shadow-md transition-all disabled:opacity-50"
          >
            <Save size={20} />
            <span>Review & Save DSR Entry</span>
          </button>
        </div>
      </div>

      {showSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={22} />
                Confirm DSR Entry
              </h3>
              <button onClick={() => setShowSummary(false)} className="text-gray-400 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">{date}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-500">Outlet</span>
                <span className="font-semibold text-gray-900">{outlet}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Revenue Breakup</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Total Daily Sale</span><span className="font-bold">{formatCurrency(totalSale)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>POS (UPI/CC)</span><span>{formatCurrency(pos)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Swiggy</span><span>{formatCurrency(swiggy)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Zomato (Online + Cash)</span><span>{formatCurrency(zomatoOnline + zomatoCash)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Uengage (Online + Cash)</span><span>{formatCurrency(uengageOnline + uengageCash)}</span></div>
                  <div className="flex justify-between font-semibold text-green-700 pt-1 border-t mt-1">
                    <span>Calculated Cash Sale</span><span>{formatCurrency(calculatedCashSale)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Expenses</h4>
                <div className="flex justify-between text-sm text-red-600 font-medium">
                  <span>Total Expenses ({expenses.filter(e => e.amount).length} item{expenses.filter(e => e.amount).length !== 1 ? 's' : ''})</span>
                  <span>- {formatCurrency(totalExpense)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Cash Drawer</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Expected Cash</span><span className="font-semibold">{formatCurrency(theoreticalCashInHand)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Physical Count</span><span>{formatCurrency(physicalCash)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Envelope Cash</span><span>{formatCurrency(envelopeCash)}</span></div>
                  {difference !== 0 && (
                    <div className={`flex justify-between font-bold pt-1 border-t mt-1 ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{difference > 0 ? 'Excess' : 'Shortage'}</span>
                      <span>{difference > 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}</span>
                    </div>
                  )}
                </div>
              </div>

              {comment && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Note</h4>
                  <p className="text-sm text-gray-600 italic">{comment}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowSummary(false)}
                disabled={isSubmitting}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                Edit
              </button>
              <button
                onClick={proceedSubmit}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                <span>{isSubmitting ? 'Saving...' : 'Confirm & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={confirmState?.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
