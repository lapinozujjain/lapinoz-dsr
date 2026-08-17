import React from 'react';
import { Calendar } from 'lucide-react';

export const DateRangePicker = React.memo(({ startDate, endDate, onStartChange, onEndChange }) => (
  <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center gap-2">
      <Calendar size={16} className="text-gray-400" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
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
        className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none p-1 bg-transparent"
      />
    </div>
  </div>
));

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

export const StatCard = React.memo(({ title, value, icon, color, size = 'md' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 ${size === 'sm' ? 'p-4' : 'p-6'}`}>
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <h4 className={`${size === 'sm' ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>{value}</h4>
    </div>
  </div>
));
