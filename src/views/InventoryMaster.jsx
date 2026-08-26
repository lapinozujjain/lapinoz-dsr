import React, { useState } from 'react';
import {
  Package, Plus, Edit2, Check, X, RefreshCw, Trash2, Layers, Search, AlertCircle, AlertTriangle
} from 'lucide-react';
import { doc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION } from '../firebase';
import { INVENTORY_CATEGORIES, INVENTORY_UOMS, DEFAULT_INVENTORY_ITEMS } from '../constants';
import { formatCurrency } from '../utils/date';
import { ConfirmDialog } from '../components/common';

// Firestore batches cap out at 500 writes. Deleting every existing item
// and re-seeding the full standard list in one pass can exceed that as
// the catalogue grows, so operations are chunked and committed as
// several batches rather than assuming everything fits in one.
const BATCH_CHUNK_SIZE = 400;

async function commitInChunks(operations) {
  for (let i = 0; i < operations.length; i += BATCH_CHUNK_SIZE) {
    const batch = writeBatch(db);
    operations.slice(i, i + BATCH_CHUNK_SIZE).forEach(op => op(batch));
    await batch.commit();
  }
}

export default function InventoryMaster({ user, masterItems, loading, role }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', uom: '/NOS', netPrice: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', category: INVENTORY_CATEGORIES[0].name, uom: '/NOS', netPrice: '' });
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [formError, setFormError] = useState('');
  const [resyncResult, setResyncResult] = useState(null);

  // Firestore doesn't guarantee snapshot order, so the "All" tab would
  // otherwise list items in a different, shifting order every reload.
  // Sort by category (in the same order as the master sheet: A, B, C…)
  // and then by each item's `order` field — which was already being
  // written on every seed/add but never actually used for anything.
  const categoryRank = Object.fromEntries(INVENTORY_CATEGORIES.map((c, i) => [c.name, i]));
  const filteredItems = masterItems
    .filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const catDiff = (categoryRank[a.category] ?? 999) - (categoryRank[b.category] ?? 999);
      if (catDiff !== 0) return catDiff;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  const handleSeedDefaults = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_INVENTORY_ITEMS.forEach((item, idx) => {
        // No outlet prefix: the item master is ONE shared catalogue used
        // by both outlets, not a separate list per outlet.
        const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${item.id}`);
        // Drop the seed data's own `id` field rather than writing it into
        // the document — the Firestore document ID is already the single
        // source of truth for identity (see useInventory.js), and storing
        // a second, different-looking ID field is exactly what caused
        // edit/delete to silently target the wrong document before.
        const { id: _seedId, ...itemData } = item;
        batch.set(docRef, {
          ...itemData,
          order: idx + 1,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      setConfirmState(null);
    } catch (error) {
      console.error('Error seeding inventory master:', error);
      alert('Failed to initialize items.');
    } finally {
      setIsSeeding(false);
    }
  };

  const normalizeName = (name) => (name || '').trim().toLowerCase();

  const handleResyncStandardPrices = async () => {
    if (!user) return;
    setIsResyncing(true);
    try {
      // Match by item NAME, not by the standard list's item_N id. Item
      // numbering shifted between the old and new master sheet (e.g.
      // "Kashmiri Gravy" was inserted mid-category), so an existing
      // item's real doc ID no longer lines up with the same-numbered
      // entry in today's DEFAULT_INVENTORY_ITEMS — updating "by id" would
      // silently overwrite the wrong item with a different item's data.
      const existingByName = new Map();
      masterItems.forEach(item => existingByName.set(normalizeName(item.name), item));

      const batch = writeBatch(db);
      let updatedCount = 0;
      let addedCount = 0;
      let addedSeq = 0;

      DEFAULT_INVENTORY_ITEMS.forEach(std => {
        const existing = existingByName.get(normalizeName(std.name));
        if (existing) {
          batch.set(doc(db, INVENTORY_MASTER_COLLECTION, existing.id), {
            category: std.category,
            categoryCode: std.categoryCode,
            uom: std.uom,
            netPrice: std.netPrice,
            updatedAt: serverTimestamp()
          }, { merge: true });
          updatedCount++;
        } else {
          // A genuinely new standard item — give it a fresh, unique doc ID
          // rather than reusing std.id (e.g. "item_14"), since that could
          // collide with a still-existing doc originally seeded under the
          // old list's numbering for a completely different item.
          addedSeq++;
          const newId = `item_resync_${Date.now()}_${addedSeq}`;
          const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${newId}`);
          batch.set(docRef, {
            name: std.name,
            category: std.category,
            categoryCode: std.categoryCode,
            uom: std.uom,
            netPrice: std.netPrice,
            order: masterItems.length + addedSeq,
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      });

      await batch.commit();

      const standardNames = new Set(DEFAULT_INVENTORY_ITEMS.map(std => normalizeName(std.name)));
      const unmatchedCount = masterItems.filter(item => !standardNames.has(normalizeName(item.name))).length;

      setResyncResult({ updatedCount, addedCount, unmatchedCount });
      setConfirmState(null);
    } catch (error) {
      console.error('Error resyncing inventory master:', error);
      alert('Failed to resync with the standard list.');
    } finally {
      setIsResyncing(false);
    }
  };

  // Dev-only utility: wipes the entire shared master list — this
  // reseeds from scratch with today's standard list. Unlike Resync (which
  // only touches matching items and leaves everything else alone), this
  // deletes ALL of it first — including custom items you've added by
  // hand — so the catalogue exactly matches DEFAULT_INVENTORY_ITEMS with
  // nothing left over. Since this is now a shared master list, this
  // affects BOTH outlets. Doesn't touch inventory_daily_records: past
  // closing entries keep their own saved snapshot of name/uom/price, so
  // historical reports for either outlet aren't affected by wiping the
  // master list.
  const handleResetToStandardList = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      const operations = [
        ...masterItems.map(item => (batch) => batch.delete(doc(db, INVENTORY_MASTER_COLLECTION, item.id))),
        ...DEFAULT_INVENTORY_ITEMS.map((item, idx) => (batch) => {
          const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${item.id}`);
          const { id: _seedId, ...itemData } = item;
          batch.set(docRef, {
            ...itemData,
            order: idx + 1,
            updatedAt: serverTimestamp()
          });
        })
      ];
      await commitInChunks(operations);
      setResyncResult(null);
      setConfirmState(null);
    } catch (error) {
      console.error('Error resetting inventory master:', error);
      alert('Failed to reset master list.');
    } finally {
      setIsResetting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      category: item.category,
      uom: item.uom || '/NOS',
      netPrice: item.netPrice || 0
    });
  };

  const saveEdit = async (itemId) => {
    if ((parseFloat(editForm.netPrice) || 0) < 0) {
      setFormError("Net Price cannot be negative.");
      return;
    }
    setFormError('');
    try {
      const docRef = doc(db, INVENTORY_MASTER_COLLECTION, itemId);
      await setDoc(docRef, {
        name: editForm.name.trim(),
        category: editForm.category,
        uom: editForm.uom,
        netPrice: parseFloat(editForm.netPrice) || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setEditingId(null);
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to save update.');
    }
  };

  const handleAddNewItem = async (e) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    if ((parseFloat(newForm.netPrice) || 0) < 0) {
      setFormError("Net Price cannot be negative.");
      return;
    }
    setFormError('');
    try {
      const itemId = `item_${Date.now()}`;
      const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${itemId}`);
      await setDoc(docRef, {
        name: newForm.name.trim(),
        category: newForm.category,
        uom: newForm.uom,
        netPrice: parseFloat(newForm.netPrice) || 0,
        order: masterItems.length + 1,
        updatedAt: serverTimestamp()
      });
      setNewForm({ name: '', category: INVENTORY_CATEGORIES[0].name, uom: '/NOS', netPrice: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item.');
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, INVENTORY_MASTER_COLLECTION, itemId));
      setConfirmState(null);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-green-600" />
              Inventory Master List
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Shared — Both Outlets
              </span>
            </h2>
            <p className="text-gray-500 text-sm">
              Manage items, category classifications, measurement units, and net purchase rates.
              A change here applies to both FREEGANJ and NANAKHEDA.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {masterItems.length === 0 && (
              <button
                onClick={() => setConfirmState({
                  title: "Seed Standard La Pino'z Item List?",
                  message: `This will load the full catalogue of ${DEFAULT_INVENTORY_ITEMS.length} standard items and prices, shared across both outlets.`,
                  confirmLabel: "Load Standard Items",
                  danger: false,
                  onConfirm: handleSeedDefaults
                })}
                disabled={isSeeding}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
              >
                <RefreshCw size={16} className={isSeeding ? "animate-spin" : ""} />
                <span>Initialize Standard Items</span>
              </button>
            )}

            {masterItems.length > 0 && role === 'owner' && (
              <button
                onClick={() => setConfirmState({
                  title: "Resync Prices from Standard List?",
                  message: `This updates category, UOM, and Net Price for every shared item whose name matches an item on the current standard list (${DEFAULT_INVENTORY_ITEMS.length} items) — affecting both outlets. Standard items you don't have yet will be added. Items you've added yourself, or items no longer on the standard list, are left untouched.`,
                  confirmLabel: "Resync Prices",
                  danger: false,
                  onConfirm: handleResyncStandardPrices
                })}
                disabled={isResyncing}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
              >
                <RefreshCw size={16} className={isResyncing ? "animate-spin" : ""} />
                <span>Resync with Standard List</span>
              </button>
            )}

            <button
              onClick={() => { setIsAdding(!isAdding); setFormError(''); }}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-sm"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              <span>{isAdding ? 'Cancel' : 'Add New Item'}</span>
            </button>
          </div>
        </div>

        {resyncResult && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-lg mb-6 text-sm flex items-start justify-between gap-3">
            <span>
              Resync complete: <strong>{resyncResult.updatedCount}</strong> item{resyncResult.updatedCount !== 1 ? 's' : ''} updated,{' '}
              <strong>{resyncResult.addedCount}</strong> new item{resyncResult.addedCount !== 1 ? 's' : ''} added.
              {resyncResult.unmatchedCount > 0 && (
                <> <strong>{resyncResult.unmatchedCount}</strong> existing item{resyncResult.unmatchedCount !== 1 ? 's' : ''} {resyncResult.unmatchedCount !== 1 ? "aren't" : "isn't"} on the standard list (left untouched — review and remove manually if no longer needed).</>
              )}
            </span>
            <button onClick={() => setResyncResult(null)} className="text-indigo-400 hover:text-indigo-700 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center text-sm">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            {formError}
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleAddNewItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Item Name</label>
              <input
                type="text" required placeholder="e.g., Mozzarella Cheese (2kg)"
                value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select
                value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })}
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md outline-none"
              >
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.code} - {cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">UOM</label>
              <select
                value={newForm.uom} onChange={e => setNewForm({ ...newForm, uom: e.target.value })}
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md outline-none"
              >
                {INVENTORY_UOMS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Net Price (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" min="0" required placeholder="0.00"
                  value={newForm.netPrice} onChange={e => setNewForm({ ...newForm, netPrice: e.target.value })}
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:border-green-500 outline-none"
                />
                <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded-md font-medium text-sm hover:bg-green-700">
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({masterItems.length})
            </button>
            {INVENTORY_CATEGORIES.map(cat => {
              const count = masterItems.filter(i => i.category === cat.name).length;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.name ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text" placeholder="Search items..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-green-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading master items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Layers size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-gray-600">No items found.</p>
            <p className="text-xs text-gray-400 mt-1">
              {masterItems.length === 0 ? "Click 'Initialize Standard Items' above to load your master list." : "No items match your search filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-500 text-xs uppercase w-12">#</th>
                  <th className="p-3 text-left font-semibold text-gray-500 text-xs uppercase">Item Name</th>
                  <th className="p-3 text-left font-semibold text-gray-500 text-xs uppercase">Category</th>
                  <th className="p-3 text-center font-semibold text-gray-500 text-xs uppercase w-24">UOM</th>
                  <th className="p-3 text-right font-semibold text-gray-500 text-xs uppercase w-32">Net Price</th>
                  <th className="p-3 text-center font-semibold text-gray-500 text-xs uppercase w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredItems.map((item, idx) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {isEditing ? (
                          <input
                            type="text" value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-1 border rounded text-sm focus:border-green-500 outline-none"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="p-3 text-gray-600">
                        {isEditing ? (
                          <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="p-1 border rounded text-xs bg-white"
                          >
                            {INVENTORY_CATEGORIES.map(cat => (
                              <option key={cat.name} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-gray-500">
                        {isEditing ? (
                          <select
                            value={editForm.uom}
                            onChange={e => setEditForm({ ...editForm, uom: e.target.value })}
                            className="p-1 border rounded text-xs bg-white"
                          >
                            {INVENTORY_UOMS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-mono text-xs text-gray-600">{item.uom || '/NOS'}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        {isEditing ? (
                          <input
                            type="number" step="0.01" min="0"
                            value={editForm.netPrice}
                            onChange={e => setEditForm({ ...editForm, netPrice: e.target.value })}
                            className="w-24 p-1 border rounded text-sm text-right focus:border-green-500 outline-none"
                          />
                        ) : (
                          formatCurrency(item.netPrice)
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setFormError(''); }}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Edit item & rate"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmState({
                                title: "Delete Item?",
                                message: `Are you sure you want to remove "${item.name}" from the shared inventory master list? This removes it for both outlets.`,
                                confirmLabel: "Delete",
                                danger: true,
                                onConfirm: () => deleteItem(item.id)
                              })}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {role === 'owner' && (
        <div className="bg-white border-2 border-dashed border-red-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-red-700 text-sm">Danger Zone — Development Only</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">
                  Permanently deletes every item in the shared master list — used by both outlets, including
                  any you've added by hand — and replaces it with a fresh copy of the {DEFAULT_INVENTORY_ITEMS.length}-item
                  standard list. This cannot be undone. Past daily closing records aren't affected, since each
                  one keeps its own saved snapshot of item names, units, and prices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmState({
                title: "Wipe and Reset Master List?",
                message: `This will permanently delete all ${masterItems.length} existing item(s) from the shared master list — used by both outlets — and replace them with a fresh copy of the ${DEFAULT_INVENTORY_ITEMS.length} standard items. Any custom items or price edits you've made will be lost. This cannot be undone.`,
                confirmLabel: "Delete Everything & Reset",
                danger: true,
                onConfirm: handleResetToStandardList
              })}
              disabled={isResetting}
              className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm flex-shrink-0 disabled:opacity-50"
            >
              <Trash2 size={16} className={isResetting ? "animate-pulse" : ""} />
              <span>{isResetting ? 'Resetting...' : 'Wipe & Reset to Standard List'}</span>
            </button>
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
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}