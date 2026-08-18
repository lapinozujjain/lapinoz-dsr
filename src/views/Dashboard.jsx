import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Wallet, CreditCard, IndianRupee, Smartphone, Globe } from 'lucide-react';
import { StatCard, DateRangePicker } from '../components/common';
import { useDateRangeFilter } from '../hooks/useDateRangeFilter';
import { formatCurrency } from '../utils/date';

export default function Dashboard({ entries }) {
  const { startDate, endDate, draftStart, draftEnd, setDraftStart, setDraftEnd, filteredEntries, fetchReports, minDate } = useDateRangeFilter(entries);

  // All of these were previously plain `.reduce()` calls re-run on every
  // render (including renders triggered by unrelated state, e.g. opening
  // the expense modal in HistoryView doesn't touch this component, but
  // typing in an input elsewhere in the tree could). useMemo means they
  // only recompute when filteredEntries actually changes.
  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      acc.totalSales += parseFloat(e.totalSale) || 0;
      acc.totalExpenses += parseFloat(e.totalExpense) || 0;
      acc.netCash += parseFloat(e.cashInHand) || 0;
      acc.cashSales += parseFloat(e.sales?.cash) || 0;
      acc.totalPOS += parseFloat(e.sales?.pos) || 0;
      acc.totalSwiggy += parseFloat(e.sales?.swiggy) || 0;
      acc.totalZomato += (parseFloat(e.sales?.zomatoOnline) || 0) + (parseFloat(e.sales?.zomatoCash) || 0);
      acc.totalUengage += (parseFloat(e.sales?.uengageOnline) || 0) + (parseFloat(e.sales?.uengageCash) || 0);
      return acc;
    }, { totalSales: 0, totalExpenses: 0, netCash: 0, cashSales: 0, totalPOS: 0, totalSwiggy: 0, totalZomato: 0, totalUengage: 0 });
  }, [filteredEntries]);

  const chartData = useMemo(() => (
    // filteredEntries is descending (from the Firestore query); reverse
    // so the chart reads left-to-right chronologically.
    [...filteredEntries].reverse().map(e => ({
      date: e.date.split('-')[2],
      fullDate: e.date,
      totalSale: e.totalSale,
      pos: e.sales?.pos || 0,
      swiggy: e.sales?.swiggy || 0,
      zomato: (e.sales?.zomatoOnline || 0) + (e.sales?.zomatoCash || 0),
      uengage: (e.sales?.uengageOnline || 0) + (e.sales?.uengageCash || 0),
      cash: e.sales?.cash || 0,
      expenses: e.totalExpense
    }))
  ), [filteredEntries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
          <p className="text-gray-500">Performance from {startDate} to {endDate}</p>
        </div>
        <DateRangePicker
          startDate={draftStart} endDate={draftEnd}
          onStartChange={setDraftStart} onEndChange={setDraftEnd}
          onFetch={fetchReports} minDate={minDate}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <StatCard title="Total Sales" value={formatCurrency(totals.totalSales)} icon={<TrendingUp className="text-blue-500" />} color="bg-blue-50" />
        <StatCard title="Counter Cash Sale" value={formatCurrency(totals.cashSales)} icon={<IndianRupee className="text-green-500" />} color="bg-green-50" />
        <StatCard title="Net Cash In Hand" value={formatCurrency(totals.netCash)} icon={<Wallet className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Total Expenses" value={formatCurrency(totals.totalExpenses)} icon={<CreditCard className="text-red-500" />} color="bg-red-50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <StatCard title="Total POS" value={formatCurrency(totals.totalPOS)} icon={<CreditCard size={18} className="text-gray-600" />} color="bg-gray-100" size="sm" />
        <StatCard title="Total Swiggy" value={formatCurrency(totals.totalSwiggy)} icon={<Smartphone size={18} className="text-orange-500" />} color="bg-orange-50" size="sm" />
        <StatCard title="Total Zomato" value={formatCurrency(totals.totalZomato)} icon={<Smartphone size={18} className="text-red-500" />} color="bg-red-50" size="sm" />
        <StatCard title="Total Uengage" value={formatCurrency(totals.totalUengage)} icon={<Globe size={18} className="text-indigo-500" />} color="bg-indigo-50" size="sm" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Detailed Revenue & Expense Trend</h3>
        <div className="h-96 w-full">
          {chartData.length > 0 ? (
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
                <Line type="monotone" dataKey="pos" name="POS" stroke="#4b5563" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="swiggy" name="Swiggy" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="zomato" name="Zomato" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
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
}
