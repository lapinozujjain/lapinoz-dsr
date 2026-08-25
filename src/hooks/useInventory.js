import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION, INVENTORY_DAILY_COLLECTION } from '../firebase';

// Every document written to either inventory collection also stores its
// own `id` field (kept for readability/debugging), which is NOT always
// the same as the real Firestore document ID — e.g. a master item's doc
// ID is `master_${outlet}_${item.id}`, so the two diverge by design.
// Spreading `...doc.data()` AFTER `id: doc.id` would let that stored
// field silently overwrite the real document ID, which is what every
// edit/delete call in the UI depends on. Putting `id: doc.id` last
// guarantees the real Firestore ID always wins, however the document
// was shaped.
const toRecord = (docSnap) => ({ ...docSnap.data(), id: docSnap.id });

export function useInventoryMaster(user, outlet, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(!!user && !enabled);
      return;
    }

    const q = query(
      collection(db, INVENTORY_MASTER_COLLECTION),
      where('outlet', '==', outlet)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(toRecord));
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

    // Single equality filter only (outlet). Firestore needs a composite
    // index the moment a query combines an equality filter on one field
    // with a range filter on another (outlet == x AND date >= y here) —
    // that index doesn't exist for this project and creating one means a
    // trip to the Firebase console. Inventory data is small (at most a
    // few hundred records a year per outlet), so there's no real cost to
    // fetching everything for the outlet and letting screens that care
    // about a date window filter client-side instead — same approach
    // already used for DSR entries vs. outlet.
    const q = query(
      collection(db, INVENTORY_DAILY_COLLECTION),
      where('outlet', '==', outlet)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(toRecord));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching daily inventory records:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet, enabled]);

  return { records, loading };
}
