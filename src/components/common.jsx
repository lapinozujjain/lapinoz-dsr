import React from 'react';
import { Calendar, Search } from 'lucide-react';
import { getToday } from '../utils/date';

export const DateRangePicker = React.memo(({ startDate, endDate, onStartChange, onEndChange, onFetch, minDate, maxDate }) => {
  // Neither end of the range can go past today — a report can't cover a
  // day that hasn't happened yet. Callers can still override maxDate if a
  // future need calls for it; otherwise it defaults to today.
  const cappedMax = maxDate || getToday();
  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-gray-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          min={minDate}
          max={endDate}
          className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
        />
      </div>
      <span className="text-gray-400">-</span>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          min={startDate}
          max={cappedMax}
          className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
        />
      </div>
      {onFetch && (
        <button
          onClick={onFetch}
          className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors"
        >
          <Search size={14} />
          <span>Fetch</span>
        </button>
      )}
    </div>
  );
});

export const MobileNavButton = React.memo(({ active, onClick, icon, label, isLogout = false }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 text-xs transition-colors ${
      active ? 'text-green-600 font-bold' : isLogout ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
));

export const NavButton = React.memo(({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
));

export const StatCard = React.memo(({ title, value, icon, color, size = 'md', action }) => (
  <div className={`relative bg-white rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 ${size === 'sm' ? 'p-4' : 'p-6'}`}>
    <div className={`p-3 rounded-full ${color} flex items-center justify-center`}>{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <h4 className={`${size === 'sm' ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>{value}</h4>
    </div>
    {action && <div className="absolute top-2 right-2">{action}</div>}
  </div>
));

// Replaces window.confirm(). A native confirm() is a synchronous, blocking
// browser dialog — the JS thread (and any pending paint) is frozen for as
// long as it's open, which is exactly what the INP "blocked UI updates"
// warning was measuring. This renders as a normal React modal instead, so
// the browser stays responsive and there's nothing to block.
export const ConfirmDialog = React.memo(({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
        {title && <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>}
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm transition-colors">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
