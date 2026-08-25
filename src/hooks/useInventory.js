import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION, INVENTORY_DAILY_COLLECTION } from '../firebase';

// Every document written to either inventory collection also stores its
// own `id` field (kept for readability/debugging), which is NOT always
// the same as the real Firestore document ID — e.g. a master item's doc
// ID is `master_${outlet}_${item.id}`, so the two diverge by design.
// Spreading `...doc.data()` AFTER `id: doc.id` guarantees the real
// Firestore ID always wins, however the document was shaped.
const toRecord = (docSnap) => ({ ...docSnap.data(), id: docSnap.id });

const normalizeOutlet = (value) => (value || '').trim().toUpperCase();

export function useInventoryMaster(user, outlet, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(!!user && !enabled);
      return;
    }

    setLoading(true);

    // No server-side outlet filter here (fetch everything, then match
    // client-side below) — trims and uppercases both sides before
    // comparing. A Firestore where('outlet','==',outlet) equality filter
    // is exact-match only: if any document's outlet field has different
    // casing or stray whitespace ("Freeganj", "FREEGANJ ") than the
    // outlet string in state, that filter silently returns zero results
    // for it — no error, just missing data. This also lets switching
    // outlets be instant with no refetch, matching how DSR entries work.
    const unsubscribe = onSnapshot(collection(db, INVENTORY_MASTER_COLLECTION), (snapshot) => {
      const all = snapshot.docs.map(toRecord);
      setItems(all.filter(item => normalizeOutlet(item.outlet) === normalizeOutlet(outlet)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching inventory master:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet, enabled]);

  return { items, loading };
}

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

    // Same reasoning as useInventoryMaster above: fetch broadly, match
    // outlet client-side with normalization rather than relying on an
    // exact-match server-side filter.
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
