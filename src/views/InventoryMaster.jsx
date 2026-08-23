import React, { useState } from 'react';
import {
  Package, Plus, Edit2, Check, X, RefreshCw, Trash2, Layers, Search
} from 'lucide-react';
import { doc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION } from '../firebase';
import { INVENTORY_CATEGORIES, INVENTORY_UOMS, DEFAULT_INVENTORY_ITEMS } from '../constants';
import { formatCurrency } from '../utils/date';
import { ConfirmDialog } from '../components/common';

export default function InventoryMaster({ user, outlet, masterItems, loading }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', uom: '/NOS', netPrice: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', category: INVENTORY_CATEGORIES[0].name, uom: '/NOS', netPrice: '' });
  const [isSeeding, setIsSeeding] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

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
        const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${outlet}_${item.id}`);
        // Drop the seed data's own `id` field rather than writing it into
        // the document — the Firestore document ID is already the single
        // source of truth for identity (see useInventory.js), and storing
        // a second, different-looking ID field is exactly what caused
        // edit/delete to silently target the wrong document before.
        const { id: _seedId, ...itemData } = item;
        batch.set(docRef, {
          ...itemData,
          outlet,
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
    try {
      const docRef = doc(db, INVENTORY_MASTER_COLLECTION, itemId);
      await setDoc(docRef, {
        name: editForm.name.trim(),
        category: editForm.category,
        uom: editForm.uom,
        netPrice: parseFloat(editForm.netPrice) || 0,
        outlet,
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
    try {
      const itemId = `item_${Date.now()}`;
      const docRef = doc(db, INVENTORY_MASTER_COLLECTION, `master_${outlet}_${itemId}`);
      await setDoc(docRef, {
        name: newForm.name.trim(),
        category: newForm.category,
        uom: newForm.uom,
        netPrice: parseFloat(newForm.netPrice) || 0,
        outlet,
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
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {outlet}
              </span>
            </h2>
            <p className="text-gray-500 text-sm">
              Manage items, category classifications, measurement units, and net purchase rates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {masterItems.length === 0 && (
              <button
                onClick={() => setConfirmState({
                  title: "Seed Standard La Pino'z Item List?",
                  message: `This will load the full catalogue of ${DEFAULT_INVENTORY_ITEMS.length} standard items and prices from your master sheet for ${outlet}.`,
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

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-sm"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              <span>{isAdding ? 'Cancel' : 'Add New Item'}</span>
            </button>
          </div>
        </div>

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
                              onClick={() => setEditingId(null)}
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
                                message: `Are you sure you want to remove "${item.name}" from ${outlet}'s inventory master?`,
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