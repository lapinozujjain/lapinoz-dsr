import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION, INVENTORY_DAILY_COLLECTION } from '../firebase';

// Every document written to either inventory collection also stores its
// own `id` field (kept for readability/debugging), which is NOT always
// the same as the real Firestore document ID. Spreading `...doc.data()`
// AFTER `id: doc.id` guarantees the real Firestore ID always wins,
// however the document was shaped.
const toRecord = (docSnap) => ({ ...docSnap.data(), id: docSnap.id });

const normalizeOutlet = (value) => (value || '').trim().toUpperCase();

// The item master (Base, Dips & Sauces, Cheese, etc. — prices and unit of
// measure) is ONE shared catalogue used by both outlets, not a per-outlet
// list. Editing an item's price here updates it everywhere, which is why
// this hook takes no `outlet` argument and applies no outlet filter at
// all — every active account, at either outlet, sees and edits the exact
// same set of documents.
export function useInventoryMaster(user, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(!!user && !enabled);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(collection(db, INVENTORY_MASTER_COLLECTION), (snapshot) => {
      setItems(snapshot.docs.map(toRecord));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching inventory master:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, enabled]);

  return { items, loading };
}

// Daily closing records ARE per-outlet (each outlet counts and closes its
// own physical stock every day), so this one still filters by outlet —
// unlike the master list above.
export function useInventoryDailyRecords(user, outlet, enabled = true) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setRecords([]);
      setLoading(!!user && !enabled);
      return;
    }

    setLoading(true);

    // Fetches broadly and matches outlet client-side (trimmed,
    // uppercased) rather than relying on an exact-match Firestore
    // where('outlet','==',outlet) filter, which silently returns zero
    // results — no error — for any document whose outlet field has
    // different casing or stray whitespace than the outlet string in
    // state.
    const unsubscribe = onSnapshot(collection(db, INVENTORY_DAILY_COLLECTION), (snapshot) => {
      const all = snapshot.docs.map(toRecord);
      setRecords(all.filter(r => normalizeOutlet(r.outlet) === normalizeOutlet(outlet)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching daily inventory records:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet, enabled]);

  return { records, loading };
}
