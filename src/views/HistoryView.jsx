import React, { useMemo, useRef, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Download, Printer, Upload, Eye, X, Trash2, Info } from 'lucide-react';
import { db, ENTRIES_COLLECTION } from '../firebase';
import { OPENING_CASH_BALANCE } from '../constants';
import { formatCurrency } from '../utils/date';
import { CSV_HEADERS, entryToCsvRow, parseDsrCsv } from '../utils/csv';
import { useDateRangeFilter } from '../hooks/useDateRangeFilter';
import { DateRangePicker, ConfirmDialog } from '../components/common';

export default function HistoryView({ entries, user }) {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedExpenseEntry, setSelectedExpenseEntry] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { startDate, endDate, draftStart, draftEnd, setDraftStart, setDraftEnd, filteredEntries, fetchReports, minDate, maxDate } = useDateRangeFilter(entries);

  // Oldest-first for the table/export, independent of the dashboard's
  // newest-first order.
  const sortedEntries = useMemo(
    () => [...filteredEntries].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [filteredEntries]
  );

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!user?.uid || !id) return;
    try {
      await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
    } catch (e) {
      console.error("Error deleting", e);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // Uses a quote-aware parser matching the app's own exportToCSV
        // format (row-for-row, same column order) instead of guessing at
        // a different layout, so an exported file always re-imports
        // cleanly.
        const parsed = parseDsrCsv(e.target.result, OPENING_CASH_BALANCE);
        const batch = writeBatch(db);

        parsed.forEach((entryData) => {
          // Keying the doc ID by date makes re-importing the same file
          // idempotent (updates that day's entry) instead of piling up a
          // fresh duplicate document every time you import.
          const docRef = doc(db, ENTRIES_COLLECTION, `csv_${entryData.date}`);
          batch.set(docRef, { ...entryData, createdAt: serverTimestamp() });
        });

        if (parsed.length > 0) {
          await batch.commit();
          alert(`Successfully imported ${parsed.length} record(s).`);
        } else {
          alert("Could not find any valid records in that file.");
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
    const csvRows = [CSV_HEADERS.join(',')];
    sortedEntries.forEach(entry => csvRows.push(entryToCsvRow(entry, OPENING_CASH_BALANCE)));

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsr_report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">History & Reports</h2>
          <p className="text-gray-500 text-sm">Showing {sortedEntries.length} entries ({startDate} to {endDate})</p>
        </div>

        <DateRangePicker
          startDate={draftStart} endDate={draftEnd}
          onStartChange={setDraftStart} onEndChange={setDraftEnd}
          onFetch={fetchReports} minDate={minDate} maxDate={maxDate}
        />

        <div className="flex space-x-3">
          <button onClick={handlePrint} className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm shadow-sm no-print">
            <Printer size={16} /> <span>Print</span>
          </button>
          <button onClick={exportToCSV} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm">
            <Download size={16} /> <span>Export CSV</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={isImporting}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
          >
            {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Upload size={16} />}
            <span>Import</span>
          </button>
        </div>
      </div>

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
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      {exp.category && (
                        <span className="block text-xs text-gray-400">{exp.category}</span>
                      )}
                      <span className="font-medium text-gray-700">{exp.description || exp.category || 'Expense'}</span>
                    </div>
                    <span className="text-red-500 font-bold">{formatCurrency(exp.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No expenses recorded.</p>
              )}
              <div className="flex justify-between pt-4 border-t mt-4 font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(selectedExpenseEntry.totalExpense)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cash Sale</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    Total Cash Sale
                    <span
                      title="Total Cash Sale including counter and COD from Zomato and Uengage"
                      className="text-gray-400 cursor-help normal-case font-normal"
                    >
                      <Info size={12} />
                    </span>
                  </span>
                </th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Envelope Cash</th>
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
                  const envelopeCash = (entry.physicalCash || 0) - OPENING_CASH_BALANCE;
                  // Total Cash Sale = Counter/Cash Sale + Zomato Cash (COD) + Uengage Cash (COD).
                  const totalCashSale = (entry.sales?.cash || 0) + (entry.sales?.zomatoCash || 0) + (entry.sales?.uengageCash || 0);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white">{entry.date}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(entry.totalSale)}</td>
                      <td className="p-3 text-right text-gray-700">{formatCurrency(entry.sales?.pos)}</td>
                      <td className="p-3 text-right text-gray-700">{formatCurrency(entry.sales?.swiggy)}</td>
                      <td className="p-3 text-right text-gray-700">{formatCurrency((entry.sales?.zomatoOnline || 0) + (entry.sales?.zomatoCash || 0))}</td>
                      <td className="p-3 text-right text-gray-700">{formatCurrency((entry.sales?.uengageOnline || 0) + (entry.sales?.uengageCash || 0))}</td>
                      <td className="p-3 text-right font-medium text-green-700 bg-green-50">{formatCurrency(entry.sales?.cash)}</td>

                      <td className="p-3 text-right text-red-600">
                        <div className="flex items-center justify-end space-x-2">
                          <span>- {formatCurrency(entry.totalExpense)}</span>
                          {(entry.expenses?.length > 0) && (
                            <button onClick={() => setSelectedExpenseEntry(entry)} className="no-print text-gray-400 hover:text-blue-600">
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(totalCashSale)}</td>
                      <td className="p-3 text-right font-bold text-green-700 bg-green-50">{formatCurrency(envelopeCash)}</td>

                      <td className={`p-3 text-right font-bold ${entry.difference < 0 ? 'text-red-600' : entry.difference > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {entry.difference || '-'}
                      </td>

                      <td className="p-3 text-xs text-gray-500 italic max-w-xs truncate" title={entry.comment}>
                        {entry.comment || '-'}
                      </td>

                      <td className="p-3 text-center no-print">
                        <button onClick={() => setConfirmDeleteId(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete entry?"
        message="Are you sure you want to delete this entry? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
