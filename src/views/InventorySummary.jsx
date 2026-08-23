import React, { useMemo, useState } from 'react';
import {
  FileText, Download, Printer, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { INVENTORY_CATEGORIES } from '../constants';
import { formatCurrency, getToday } from '../utils/date';

export default function InventorySummary({ outlet, masterItems, dsrEntries, inventoryRecords }) {
  const [selectedMonth, setSelectedMonth] = useState(() => getToday().substring(0, 7));
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCategory = (catName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const monthRecords = useMemo(() => {
    return inventoryRecords.filter(r => r.date.startsWith(selectedMonth));
  }, [inventoryRecords, selectedMonth]);

  const monthDsrEntries = useMemo(() => {
    return dsrEntries.filter(e => e.date.startsWith(selectedMonth));
  }, [dsrEntries, selectedMonth]);

  const totalNetSales = useMemo(() => {
    return monthDsrEntries.reduce((acc, e) => acc + (parseFloat(e.totalSale) || 0), 0);
  }, [monthDsrEntries]);

  const monthlyAggregation = useMemo(() => {
    let grandTotalPurchaseValue = 0;
    let grandTotalUsedValue = 0;
    const categoryTotals = {};

    INVENTORY_CATEGORIES.forEach(cat => {
      categoryTotals[cat.name] = {
        code: cat.code,
        name: cat.name,
        totalPurchaseValue: 0,
        totalUsedValue: 0,
        items: []
      };
    });

    masterItems.forEach(item => {
      let itemPurchasesQty = 0;
      let itemUsedQty = 0;

      monthRecords.forEach(rec => {
        const itemRecord = rec.items?.[item.id];
        if (itemRecord) {
          itemPurchasesQty += parseFloat(itemRecord.purchase) || 0;
          itemUsedQty += parseFloat(itemRecord.used) || 0;
        }
      });

      const price = parseFloat(item.netPrice) || 0;
      const purchaseValue = itemPurchasesQty * price;
      const usedValue = itemUsedQty * price;
      const consumptionPct = totalNetSales > 0 ? (usedValue / totalNetSales) * 100 : 0;

      grandTotalPurchaseValue += purchaseValue;
      grandTotalUsedValue += usedValue;

      const catName = item.category || 'Base';
      if (categoryTotals[catName]) {
        categoryTotals[catName].totalPurchaseValue += purchaseValue;
        categoryTotals[catName].totalUsedValue += usedValue;
        categoryTotals[catName].items.push({
          ...item,
          totalPurchasesQty: itemPurchasesQty,
          purchaseValue,
          totalUsedQty: itemUsedQty,
          usedValue,
          consumptionPct
        });
      }
    });

    const grandFoodCostPct = totalNetSales > 0 ? (grandTotalUsedValue / totalNetSales) * 100 : 0;

    return {
      grandTotalPurchaseValue,
      grandTotalUsedValue,
      grandFoodCostPct,
      categoryTotals
    };
  }, [masterItems, monthRecords, totalNetSales]);

  const exportToCSV = () => {
    const rows = [
      [`"LA PINO'Z INVENTORY SUMMARY - ${outlet}"`],
      ["Month", selectedMonth],
      ["Net Sales", totalNetSales.toFixed(2)],
      ["Total Consumption Value", monthlyAggregation.grandTotalUsedValue.toFixed(2)],
      ["Total Food Cost %", `"${monthlyAggregation.grandFoodCostPct.toFixed(2)}%"`],
      [],
      ["Category", "Item Name", "UOM", "Net Price", "Monthly Purchase Qty", "Purchase Value", "Monthly Used Qty", "Used Value", "Consumption %"]
    ];

    INVENTORY_CATEGORIES.forEach(cat => {
      const catData = monthlyAggregation.categoryTotals[cat.name];
      if (!catData) return;

      rows.push([`"${cat.code} - ${cat.name}"`, "", "", "", "", catData.totalPurchaseValue.toFixed(2), "", catData.totalUsedValue.toFixed(2), `"${totalNetSales > 0 ? ((catData.totalUsedValue / totalNetSales) * 100).toFixed(2) : 0}%"`]);

      catData.items.forEach(item => {
        rows.push([
          `"${item.category}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.uom || '/NOS'}"`,
          item.netPrice || 0,
          item.totalPurchasesQty.toFixed(2),
          item.purchaseValue.toFixed(2),
          item.totalUsedQty.toFixed(2),
          item.usedValue.toFixed(2),
          `"${item.consumptionPct.toFixed(2)}%"`
        ]);
      });
      rows.push([]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventory_Summary_${outlet}_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-green-600" />
              Monthly Inventory Summary
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {outlet}
              </span>
            </h2>
            <p className="text-gray-500 text-sm">
              Month-wide aggregated food consumption, purchases, and category food cost breakdown.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Calendar size={15} className="text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-sm font-semibold bg-transparent outline-none text-gray-900"
              />
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-gray-600 text-white px-3.5 py-2 rounded-lg text-sm hover:bg-gray-700 transition shadow-xs"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3.5 py-2 rounded-lg text-sm hover:bg-green-700 transition shadow-xs"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 uppercase">Monthly Net Sales (DSR)</p>
            <h3 className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(totalNetSales)}
            </h3>
            <p className="text-2xs text-blue-600 mt-1">{monthDsrEntries.length} daily entries recorded</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 uppercase">Total Purchases (Inward)</p>
            <h3 className="text-2xl font-bold text-indigo-900 mt-1">
              {formatCurrency(monthlyAggregation.grandTotalPurchaseValue)}
            </h3>
            <p className="text-2xs text-indigo-600 mt-1">Total procurement cost for month</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase">Total Food Consumed Value</p>
            <h3 className="text-2xl font-bold text-amber-900 mt-1">
              {formatCurrency(monthlyAggregation.grandTotalUsedValue)}
            </h3>
            <p className="text-2xs text-amber-600 mt-1">Cost of actual items consumed</p>
          </div>

          <div className={`p-4 rounded-xl border ${
            monthlyAggregation.grandFoodCostPct > 40 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'
          }`}>
            <p className="text-xs font-semibold uppercase">Overall Food Cost %</p>
            <h3 className="text-2xl font-bold mt-1">
              {monthlyAggregation.grandFoodCostPct.toFixed(2)}%
            </h3>
            <p className="text-2xs opacity-75 mt-1">Total Food Cost / Total Net Sales</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {INVENTORY_CATEGORIES.map(category => {
          const catData = monthlyAggregation.categoryTotals[category.name];
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

                <div className="flex items-center gap-6">
                  <div className="text-right text-xs">
                    <span className="text-gray-400 mr-1">Purchase:</span>
                    <span className="font-bold text-blue-300 mr-3">{formatCurrency(catData.totalPurchaseValue)}</span>
                    <span className="text-gray-400 mr-1">Used Value:</span>
                    <span className="font-bold text-green-400">{formatCurrency(catData.totalUsedValue)}</span>
                    {totalNetSales > 0 && (
                      <span className="text-gray-300 ml-2 font-mono">
                        ({((catData.totalUsedValue / totalNetSales) * 100).toFixed(2)}%)
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
                        <th className="p-2.5 text-left w-8">#</th>
                        <th className="p-2.5 text-left">Item Name</th>
                        <th className="p-2.5 text-center w-20">UOM</th>
                        <th className="p-2.5 text-right w-24">Net Price</th>
                        <th className="p-2.5 text-right w-32 bg-blue-50/50">Monthly Purchase Qty</th>
                        <th className="p-2.5 text-right w-32 bg-blue-50/50">Purchase Value</th>
                        <th className="p-2.5 text-right w-32 bg-green-50/50">Monthly Used Qty</th>
                        <th className="p-2.5 text-right w-32 bg-green-50/50">Used Value</th>
                        <th className="p-2.5 text-right w-24">Cons %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {catData.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-2.5 text-gray-400">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-gray-900">{item.name}</td>
                          <td className="p-2.5 text-center text-gray-500 font-mono">{item.uom || '/NOS'}</td>
                          <td className="p-2.5 text-right text-gray-600">{formatCurrency(item.netPrice)}</td>
                          <td className="p-2.5 text-right font-semibold text-blue-900 bg-blue-50/30">
                            {item.totalPurchasesQty.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-blue-900 bg-blue-50/30">
                            {formatCurrency(item.purchaseValue)}
                          </td>
                          <td className="p-2.5 text-right font-semibold text-green-900 bg-green-50/30">
                            {item.totalUsedQty.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-green-900 bg-green-50/30">
                            {formatCurrency(item.usedValue)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-medium text-gray-700">
                            {item.consumptionPct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-right text-gray-700 uppercase">
                          Category Total:
                        </td>
                        <td colSpan={2} className="p-2.5 text-right text-blue-800 font-bold bg-blue-50/30">
                          {formatCurrency(catData.totalPurchaseValue)}
                        </td>
                        <td colSpan={2} className="p-2.5 text-right text-green-800 font-bold bg-green-50/30">
                          {formatCurrency(catData.totalUsedValue)}
                        </td>
                        <td className="p-2.5 text-right text-gray-900 font-mono">
                          {totalNetSales > 0 ? `${((catData.totalUsedValue / totalNetSales) * 100).toFixed(2)}%` : '0.00%'}
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
    </div>
  );
}