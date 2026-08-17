import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  PlusCircle, AlertCircle, Calculator, MessageSquare, Lock, Save, Trash2
} from 'lucide-react';
import { db, ENTRIES_COLLECTION } from '../firebase';
import { OPENING_CASH_BALANCE, CASH_DENOMINATIONS } from '../constants';
import { formatCurrency } from '../utils/date';

export default function NewEntryForm({ user, onSuccess, existingEntries }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalSaleInput, setTotalSaleInput] = useState('');
  const [comment, setComment] = useState('');

  const [sales, setSales] = useState({
    pos: '', swiggy: '', uengageOnline: '', uengageCash: '', zomatoOnline: '', zomatoCash: ''
  });

  const [expenses, setExpenses] = useState([{ id: 1, description: '', amount: '' }]);
  const [denominations, setDenominations] = useState(
    Object.fromEntries(CASH_DENOMINATIONS.map(d => [d, '']))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

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

  const handleExpenseChange = (id, field, value) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };
  const addExpenseRow = () => setExpenses([...expenses, { id: Date.now(), description: '', amount: '' }]);
  const removeExpenseRow = (id) => setExpenses(expenses.filter(e => e.id !== id));

  const validate = () => {
    if (totalSale <= 0) return "Total Daily Sale must be greater than 0.";
    if (pos < 0 || swiggy < 0 || uengageOnline < 0 || uengageCash < 0 || zomatoOnline < 0 || zomatoCash < 0) {
      return "Revenue sources cannot be negative.";
    }
    if (expenses.some(e => (parseFloat(e.amount) || 0) < 0)) return "Expenses cannot be negative.";
    return null;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setValidationError('');

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
      sales: { pos, swiggy, uengageOnline, uengageCash, zomatoOnline, zomatoCash, cash: calculatedCashSale },
      expenses: expenses.filter(e => e.description && e.amount).map(e => ({
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

        <div className="flex flex-col md:flex-row gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="w-full md:w-2/3">
            <label className="block text-sm font-bold text-gray-800 mb-1">Total Daily Sale (From Billing Software)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
              <input
                type="number" value={totalSaleInput} onChange={(e) => setTotalSaleInput(e.target.value)}
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
                  <input type="number" placeholder="0" value={sales.pos} onChange={(e) => setSales({ ...sales, pos: e.target.value })} className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <label className="text-sm text-gray-600 font-medium">Swiggy</label>
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input type="number" placeholder="0" value={sales.swiggy} onChange={(e) => setSales({ ...sales, swiggy: e.target.value })} className="w-full pl-7 p-2 border border-gray-200 rounded-md text-right focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Zomato</label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Online</span>
                    <input type="number" placeholder="0" value={sales.zomatoOnline} onChange={(e) => setSales({ ...sales, zomatoOnline: e.target.value })} className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Cash</span>
                    <input type="number" placeholder="0" value={sales.zomatoCash} onChange={(e) => setSales({ ...sales, zomatoCash: e.target.value })} className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="pb-2 border-b border-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600 font-medium">Uengage</label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Online</span>
                    <input type="number" placeholder="0" value={sales.uengageOnline} onChange={(e) => setSales({ ...sales, uengageOnline: e.target.value })} className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-2 text-xs text-gray-400">Cash</span>
                    <input type="number" placeholder="0" value={sales.uengageCash} onChange={(e) => setSales({ ...sales, uengageCash: e.target.value })} className="w-full pl-2 pr-2 pt-5 pb-1 border border-gray-200 rounded-md text-right text-sm focus:border-green-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 mt-2 bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="font-bold text-gray-700">Calculated Counter Cash</span>
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
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex gap-2">
                    <input
                      type="text" placeholder="Description (e.g. Milk)" value={exp.description}
                      onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                      className="flex-1 p-2 border rounded-md text-sm"
                    />
                    <input
                      type="number" placeholder="Amt" value={exp.amount}
                      onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                      className="w-24 p-2 border rounded-md text-sm text-right"
                    />
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
                {CASH_DENOMINATIONS.map(denom => (
                  <div key={denom} className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">x {denom}</label>
                    <input
                      type="number" placeholder="Qty" value={denominations[denom]}
                      onChange={(e) => setDenominations({ ...denominations, [denom]: e.target.value })}
                      className="p-1 border rounded text-center text-sm"
                    />
                  </div>
                ))}
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

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit} disabled={isSubmitting}
            className="flex items-center space-x-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 shadow-md transition-all disabled:opacity-50"
          >
            <Save size={20} />
            <span>{isSubmitting ? 'Saving...' : 'Save DSR Entry'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
