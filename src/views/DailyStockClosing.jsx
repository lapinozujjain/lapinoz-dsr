import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Save, RotateCcw, AlertCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, INVENTORY_DAILY_COLLECTION } from '../firebase';
import { INVENTORY_CATEGORIES } from '../constants';
import { formatCurrency, getEntryMinDate, getToday } from '../utils/date';
import { handleGridArrowNav } from '../utils/gridNav';
import { ConfirmDialog, ExpandCollapseAllButton } from '../components/common';

export default function DailyStockClosing({
  user, outlet, role, masterItems, dsrEntries, inventoryRecords, onSuccess
}) {
  // Stock closing is usually done the NEXT morning for the previous
  // day — so the lower bound is "start of this month, or yesterday if
  // that's still last month" (see getEntryMinDate), not a flat
  // monthStart, otherwise the 1st of every month would lock out the
  // last day's closing entirely. The Owner is exempt from this lower
  // bound altogether (e.g. correcting an older record) — minDate is
  // left undefined for them, so there's no floor on the date input
  // and no lower-bound check below. Staff/Manager keep the 1-day
  // grace and nothing further.
  const minDate = role === 'owner' ? undefined : getEntryMinDate();
  const today = getToday();

  const [date, setDate] = useState(today);
  const [stockData, setStockData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // dsrEntries and inventoryRecords are already scoped to the current
  // outlet by the time they reach this component (App.jsx filters DSR
  // entries client-side, and useInventoryDailyRecords does the same for
  // inventory) — no need to re-check outlet again here.
  const matchedDsr = useMemo(() => {
    return dsrEntries.find(e => e.date === date);
  }, [dsrEntries, date]);

  const netSales = parseFloat(matchedDsr?.totalSale) || 0;

  // Previous day's inventory record — its closing stock becomes today's
  // opening stock.
  const previousRecord = useMemo(() => {
    const sorted = [...inventoryRecords]
      .filter(r => r.date < date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0] || null;
  }, [inventoryRecords, date]);

  // Existing record for this exact date, if one was already submitted.
  const currentRecord = useMemo(() => {
    return inventoryRecords.find(r => r.date === date) || null;
  }, [inventoryRecords, date]);

  // Re-saving a day that already has a closing record is an "update" in
  // Firestore terms, and the security rules restrict updates on
  // inventory_daily_records to Owner/Manager (first-time submission is
  // open to everyone, correcting an already-submitted day isn't). The
  // form used to let Staff reopen and edit a submitted day's numbers and
  // only find out it was blocked when Save hit a permission error —
  // this catches it up front instead.
  const isLockedForRole = Boolean(currentRecord) && role === 'staff';

  useEffect(() => {
    if (!masterItems || masterItems.length === 0) return;

    const initial = {};
    masterItems.forEach(item => {
      if (currentRecord?.items?.[item.id]) {
        const saved = currentRecord.items[item.id];
        initial[item.id] = {
          opening: saved.opening !== undefined ? saved.opening : '',
          purchase: saved.purchase !== undefined ? saved.purchase : '',
          closing: saved.closing !== undefined ? saved.closing : ''
        };
      } else if (previousRecord?.items?.[item.id]) {
        const prevClosing = previousRecord.items[item.id].closing;
        initial[item.id] = {
          opening: prevClosing !== undefined ? prevClosing : '',
          purchase: '',
          closing: ''
        };
      } else {
        initial[item.id] = { opening: '', purchase: '', closing: '' };
      }
    });

    setStockData(initial);
  }, [date, masterItems, currentRecord, previousRecord]);

  const handleStockChange = (itemId, field, val) => {
    setStockData(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { opening: '', purchase: '', closing: '' }),
        [field]: val
      }
    }));
  };

  // WHY OPENING CAN GO STALE: the load effect above only pulls opening
  // from previousRecord's closing the FIRST time this date is saved —
  // once currentRecord exists, its own saved opening is used instead
  // (the "if (currentRecord...)" branch above wins). So if someone
  // later corrects the PREVIOUS day's closing stock, this day's
  // opening — already saved — does NOT get recalculated on its own.
  // That's not a bug in the save itself, it's that opening is a
  // snapshot taken once, not a live formula — otherwise a deliberate
  // manual override of opening (e.g. a physical recount) would get
  // silently clobbered every time the previous day changes. This flags
  // the drift instead of hiding it, and the button below lets it be
  // pulled back into sync on demand.
  const openingMismatches = useMemo(() => {
    if (!currentRecord || !previousRecord) return [];
    return masterItems.filter(item => {
      const savedOpening = currentRecord.items?.[item.id]?.opening;
      const prevClosing = previousRecord.items?.[item.id]?.closing;
      return savedOpening !== undefined && prevClosing !== undefined
        && Number(savedOpening) !== Number(prevClosing);
    });
  }, [currentRecord, previousRecord, masterItems]);

  // Resets whenever the selected date changes, so switching dates
  // always re-evaluates the real saved state instead of carrying over
  // a stale "just synced" flag from whatever date was open before.
  const [openingJustSynced, setOpeningJustSynced] = useState(false);
  useEffect(() => {
    setOpeningJustSynced(false);
  }, [date]);

  // Only updates the in-progress form state — same as typing into the
  // fields by hand — so it still has to be reviewed and Saved like any
  // other edit, rather than silently overwriting the stored record.
  // The mismatch banner itself checks against the last SAVED opening
  // (currentRecord), so without this flag it would keep showing even
  // right after clicking Sync — correct in the sense that the database
  // record really is still stale until Save is clicked, but confusing
  // since the fields on screen already show the corrected number.
  const handleSyncOpeningFromPrevious = () => {
    setStockData(prev => {
      const updated = { ...prev };
      openingMismatches.forEach(item => {
        const prevClosing = previousRecord.items?.[item.id]?.closing;
        updated[item.id] = {
          ...(updated[item.id] || { opening: '', purchase: '', closing: '' }),
          opening: prevClosing !== undefined ? String(prevClosing) : ''
        };
      });
      return updated;
    });
    setOpeningJustSynced(true);
  };

  const toggleCategory = (catName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };


  const computedSummary = useMemo(() => {
    let totalUsedValue = 0;
    let totalPurchaseValue = 0;
    const categoryBreakdown = {};

    INVENTORY_CATEGORIES.forEach(cat => {
      categoryBreakdown[cat.name] = { usedValue: 0, purchaseValue: 0, items: [] };
    });

    masterItems.forEach(item => {
      const entry = stockData[item.id] || { opening: '', purchase: '', closing: '' };
      const opening = parseFloat(entry.opening) || 0;
      const purchase = parseFloat(entry.purchase) || 0;
      const closing = parseFloat(entry.closing) || 0;
      const price = parseFloat(item.netPrice) || 0;

      const usedQty = (entry.opening !== '' || entry.purchase !== '' || entry.closing !== '')
        ? (opening + purchase - closing)
        : 0;

      const usedValue = usedQty * price;
      const purchaseValue = purchase * price;
      const consumptionPct = netSales > 0 ? (usedValue / netSales) * 100 : 0;

      totalUsedValue += usedValue;
      totalPurchaseValue += purchaseValue;

      const catName = item.category || 'Base';
      if (categoryBreakdown[catName]) {
        categoryBreakdown[catName].usedValue += usedValue;
        categoryBreakdown[catName].purchaseValue += purchaseValue;
        categoryBreakdown[catName].items.push({
          ...item,
          opening,
          purchase,
          closing,
          usedQty,
          usedValue,
          consumptionPct,
          rawEntry: entry
        });
      }
    });

    const totalConsumptionPct = netSales > 0 ? (totalUsedValue / netSales) * 100 : 0;

    // Items where closing > opening + purchase (used qty comes out
    // negative) usually mean a mistyped quantity somewhere. It's not
    // blocked outright — legitimate stock corrections can look like this
    // — but it's surfaced so it doesn't go unnoticed.
    const negativeUsageItems = Object.values(categoryBreakdown)
      .flatMap(cat => cat.items)
      .filter(item => item.usedQty < 0);

    return {
      totalUsedValue,
      totalPurchaseValue,
      totalConsumptionPct,
      categoryBreakdown,
      negativeUsageItems
    };
  }, [masterItems, stockData, netSales]);

  // Drives the Expand All / Collapse All button — only counts
  // categories that actually have items to show (an empty category
  // never renders a card at all, so it shouldn't count toward "are
  // they all collapsed").
  const visibleCategoryNames = useMemo(() => (
    INVENTORY_CATEGORIES
      .filter(cat => computedSummary.categoryBreakdown[cat.name]?.items.length > 0)
      .map(cat => cat.name)
  ), [computedSummary.categoryBreakdown]);

  const allCategoriesCollapsed = visibleCategoryNames.length > 0
    && visibleCategoryNames.every(name => collapsedCategories[name]);

  const handleToggleAllCategories = () => {
    const collapseAll = !allCategoriesCollapsed;
    setCollapsedCategories(prev => {
      const next = { ...prev };
      visibleCategoryNames.forEach(name => { next[name] = collapseAll; });
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setValidationError('');

    if (isLockedForRole) {
      setValidationError("This day's closing record has already been submitted. Ask a Store Manager or the Owner to make corrections.");
      return;
    }

    if (date > today) {
      setValidationError("Closing records cannot be submitted for a future date.");
      return;
    }
    if (minDate && date < minDate) {
      setValidationError("Closing records can only be submitted for the current month (or yesterday, if it falls in the previous month).");
      return;
    }

    // The number inputs have min="0", but that's a soft UI hint a browser
    // can still be made to bypass (typing "-" then a digit works in some
    // browsers, and nothing stops a pasted negative value). Matching the
    // DSR entry form's precedent: block the save with a real check rather
    // than relying on the input attribute alone.
    const hasNegativeInput = masterItems.some(item => {
      const entry = stockData[item.id];
      if (!entry) return false;
      return (parseFloat(entry.opening) || 0) < 0
        || (parseFloat(entry.purchase) || 0) < 0
        || (parseFloat(entry.closing) || 0) < 0;
    });
    if (hasNegativeInput) {
      setValidationError("Opening, Purchase, and Closing quantities cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = {};
      masterItems.forEach(item => {
        const entry = stockData[item.id] || { opening: '', purchase: '', closing: '' };
        const opening = parseFloat(entry.opening) || 0;
        const purchase = parseFloat(entry.purchase) || 0;
        const closing = parseFloat(entry.closing) || 0;
        const price = parseFloat(item.netPrice) || 0;
        const used = opening + purchase - closing;
        const usedValue = used * price;
        const consumptionPct = netSales > 0 ? (usedValue / netSales) * 100 : 0;

        itemsPayload[item.id] = {
          name: item.name,
          category: item.category,
          uom: item.uom || '/NOS',
          netPrice: price,
          opening,
          purchase,
          closing,
          used,
          usedValue,
          consumptionPct
        };
      });

      const recordId = `inv_${outlet}_${date}`;
      const recordRef = doc(db, INVENTORY_DAILY_COLLECTION, recordId);

      // No separate `id` field here — the document ID (recordId) is
      // already the single source of truth (see useInventory.js).
      await setDoc(recordRef, {
        date,
        outlet,
        netSales,
        items: itemsPayload,
        totalUsedValue: computedSummary.totalUsedValue,
        totalPurchaseValue: computedSummary.totalPurchaseValue,
        totalConsumptionPct: computedSummary.totalConsumptionPct,
        submittedBy: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (onSuccess) onSuccess();
      alert(`Inventory record for ${date} saved successfully!`);
    } catch (err) {
      console.error('Error saving inventory record:', err);
      alert('Failed to save record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assigns each item row a running index across ALL categories
  // combined (not reset per category), so the keyboard grid nav in
  // gridNav.js can move seamlessly from the last row of one category
  // straight into the first row of the next. Recomputed on every
  // render, which is fine — it's only read during this same render
  // pass to stamp data-nav-row on each input.
  let navRowCounter = -1;
  const nextNavRow = () => ++navRowCounter;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-green-600" />
              Daily Inventory Closing
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {outlet}
              </span>
            </h2>
            <p className="text-gray-500 text-sm">
              Record daily inward purchases and closing stock to track consumption and food cost %.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <label className="text-xs font-semibold text-gray-500">Date:</label>
              <input
                type="date" value={date} min={minDate} max={today}
                onChange={e => setDate(e.target.value)}
                className="text-sm font-semibold bg-transparent outline-none text-gray-900"
              />
            </div>
            {visibleCategoryNames.length > 0 && (
              <ExpandCollapseAllButton allExpanded={!allCategoriesCollapsed} onClick={handleToggleAllCategories} />
            )}
          </div>
        </div>

        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle size={20} className="mr-2" />
            {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase">Net Sales (DSR)</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-1">
              {formatCurrency(netSales)}
              {matchedDsr ? (
                <span title="DSR completed" className="text-green-500 text-xs">✓ Linked</span>
              ) : (
                <span title="No DSR recorded for this date" className="text-amber-500 text-xs">⚠️ No DSR</span>
              )}
            </h3>
            <p className="text-2xs text-gray-400 mt-1">Pulled directly from Daily Sales Record</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase">Daily Inward Purchase</p>
            <h3 className="text-xl font-bold text-blue-600 mt-1">
              {formatCurrency(computedSummary.totalPurchaseValue)}
            </h3>
            <p className="text-2xs text-gray-400 mt-1">Total value of new inward stock</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Consumption Cost</p>
            <h3 className="text-xl font-bold text-red-600 mt-1">
              {formatCurrency(computedSummary.totalUsedValue)}
            </h3>
            <p className="text-2xs text-gray-400 mt-1">Opening + Purchases - Closing</p>
          </div>

          <div className={`p-4 rounded-lg border shadow-xs ${computedSummary.totalConsumptionPct > 40 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'
            }`}>
            <p className="text-xs font-semibold uppercase">Total Food Cost %</p>
            <h3 className="text-xl font-bold mt-1">
              {computedSummary.totalConsumptionPct.toFixed(2)}%
            </h3>
            <p className="text-2xs opacity-75 mt-1">Total Consumption / Net Sales</p>
          </div>
        </div>

        {isLockedForRole && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs mb-6">
            <AlertCircle size={16} />
            <span>
              This day's closing record was already submitted. You can view it, but only a Store Manager or the Owner can correct an already-submitted day.
            </span>
          </div>
        )}

        {openingMismatches.length > 0 && !openingJustSynced ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs mb-6">
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              Opening stock for {openingMismatches.length} item{openingMismatches.length > 1 ? 's' : ''} no longer matches <strong>{previousRecord.date}</strong>'s closing stock — likely because that day's closing was corrected after this record was saved.
            </span>
            {!isLockedForRole && (
              <button
                onClick={handleSyncOpeningFromPrevious}
                className="flex-shrink-0 bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition font-semibold whitespace-nowrap"
              >
                Sync Opening from {previousRecord.date}
              </button>
            )}
          </div>
        ) : previousRecord && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs mb-6">
            <Info size={16} />
            <span>
              Opening stock has been automatically populated from the closing stock of <strong>{previousRecord.date}</strong>.
            </span>
          </div>
        )}

        {computedSummary.negativeUsageItems.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs mb-6">
            <AlertCircle size={16} />
            <span>
              {computedSummary.negativeUsageItems.length} item{computedSummary.negativeUsageItems.length > 1 ? 's' : ''} show negative usage
              (closing stock is higher than opening + purchase) — double-check the quantities for{' '}
              <strong>{computedSummary.negativeUsageItems.map(i => i.name).join(', ')}</strong>.
            </span>
          </div>
        )}

        {masterItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No items in master list. Please visit the <strong>Item Master</strong> tab to set up items first.
          </div>
        ) : (
          <div className="space-y-6">
            {INVENTORY_CATEGORIES.map(category => {
              const catData = computedSummary.categoryBreakdown[category.name];
              if (!catData || catData.items.length === 0) return null;
              const isCollapsed = collapsedCategories[category.name];

              return (
                <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <div
                    onClick={() => toggleCategory(category.name)}
                    className="flex justify-between items-center p-3.5 bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {category.code}
                      </span>
                      <h3 className="font-bold text-sm tracking-wide">{category.name}</h3>
                      <span className="text-xs text-gray-400">({catData.items.length} items)</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs">
                        <span className="text-gray-400 mr-1">Cost:</span>
                        <span className="font-bold text-green-400">{formatCurrency(catData.usedValue)}</span>
                        {netSales > 0 && (
                          <span className="text-gray-300 ml-2 font-mono">
                            ({((catData.usedValue / netSales) * 100).toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                          <tr>
                            <th className="p-2.5 text-left min-w-[130px] sticky left-0 z-20 bg-gray-50 border-r border-gray-100">Item Name</th>
                            <th className="p-2.5 text-center w-16 min-w-[60px] sticky left-[130px] z-20 bg-gray-50 border-r-2 border-gray-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">UOM</th>
                            <th className="p-2.5 text-right w-24">Net Price</th>
                            <th className="p-2.5 text-center w-28 bg-amber-50/50">Opening Qty</th>
                            <th className="p-2.5 text-center w-28 bg-blue-50/50">Purchase Qty</th>
                            <th className="p-2.5 text-center w-28 bg-green-50/50">Closing Qty</th>
                            <th className="p-2.5 text-right w-24">Used Qty</th>
                            <th className="p-2.5 text-right w-28">Used Value</th>
                            <th className="p-2.5 text-right w-24">Cons %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {catData.items.map((item, idx) => {
                            const entry = stockData[item.id] || { opening: '', purchase: '', closing: '' };
                            const navRow = nextNavRow();
                            return (
                              <tr key={item.id} className="hover:bg-gray-50/80 transition">
                                <td className="p-2.5 font-medium text-gray-900 min-w-[130px] sticky left-0 z-10 bg-white border-r border-gray-100">{item.name}</td>
                                <td className="p-2.5 text-center text-gray-500 font-mono w-16 min-w-[60px] sticky left-[130px] z-10 bg-white border-r-2 border-gray-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">{item.uom || '/NOS'}</td>
                                <td className="p-2.5 text-right text-gray-600">{formatCurrency(item.netPrice)}</td>

                                {/* Opening */}
                                <td className="p-2 bg-amber-50/30">
                                  <input
                                    type="number" step="any" placeholder="0" min="0"
                                    value={entry.opening}
                                    onChange={e => handleStockChange(item.id, 'opening', e.target.value)}
                                    onKeyDown={handleGridArrowNav}
                                    data-nav-group="stock-closing" data-nav-row={navRow} data-nav-col={0}
                                    className="w-full p-1.5 border border-amber-200 rounded text-center text-xs font-semibold bg-white focus:border-amber-500 outline-none"
                                  />
                                </td>

                                {/* Purchase */}
                                <td className="p-2 bg-blue-50/30">
                                  <input
                                    type="number" step="any" placeholder="0" min="0"
                                    value={entry.purchase}
                                    onChange={e => handleStockChange(item.id, 'purchase', e.target.value)}
                                    onKeyDown={handleGridArrowNav}
                                    data-nav-group="stock-closing" data-nav-row={navRow} data-nav-col={1}
                                    className="w-full p-1.5 border border-blue-200 rounded text-center text-xs font-semibold bg-white focus:border-blue-500 outline-none"
                                  />
                                </td>

                                {/* Closing */}
                                <td className="p-2 bg-green-50/30">
                                  <input
                                    type="number" step="any" placeholder="0" min="0"
                                    value={entry.closing}
                                    onChange={e => handleStockChange(item.id, 'closing', e.target.value)}
                                    onKeyDown={handleGridArrowNav}
                                    data-nav-group="stock-closing" data-nav-row={navRow} data-nav-col={2}
                                    className="w-full p-1.5 border border-green-200 rounded text-center text-xs font-semibold bg-white focus:border-green-500 outline-none"
                                  />
                                </td>

                                {/* Used Qty */}
                                <td className={`p-2.5 text-right font-bold ${item.usedQty < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                  {item.usedQty.toFixed(2)}
                                </td>

                                {/* Used Value */}
                                <td className="p-2.5 text-right font-bold text-gray-900">
                                  {formatCurrency(item.usedValue)}
                                </td>

                                {/* Consumption % */}
                                <td className="p-2.5 text-right font-mono text-gray-600">
                                  {item.consumptionPct.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                          <tr>
                            <td colSpan={6} className="p-2.5 text-right text-gray-700 uppercase">
                              Category Total:
                            </td>
                            <td colSpan={2} className="p-2.5 text-right text-green-700 font-bold">
                              {formatCurrency(catData.usedValue)}
                            </td>
                            <td className="p-2.5 text-right text-gray-900 font-mono">
                              {netSales > 0 ? `${((catData.usedValue / netSales) * 100).toFixed(2)}%` : '0.00%'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={() => setConfirmState({
              title: "Reset Form Values?",
              message: "This will clear current unsaved inputs.",
              confirmLabel: "Reset",
              danger: true,
              onConfirm: () => {
                setStockData({});
                setConfirmState(null);
              }
            })}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSubmitting || masterItems.length === 0 || isLockedForRole}
            title={isLockedForRole ? "Already submitted — ask a Manager or Owner to edit" : undefined}
            className="flex items-center gap-1.5 bg-green-600 text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 shadow-md transition disabled:opacity-50"
          >
            <Save size={18} />
            <span>{isSubmitting ? 'Saving Closing Record...' : 'Save Closing Record'}</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}