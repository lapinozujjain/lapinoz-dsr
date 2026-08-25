import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, USERS_COLLECTION } from '../firebase';

// Subscribes to the signed-in user's own role document. `exists: false`
// distinguishes "we checked and there's genuinely no role assigned yet"
// from "still loading" — App.jsx needs that distinction to show the
// right screen (bootstrap prompt vs. deactivated vs. normal app).
export function useCurrentUserRole(user) {
  const [role, setRole] = useState(null);
  const [active, setActive] = useState(true);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setActive(true);
      setExists(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, USERS_COLLECTION, user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || null);
        setActive(data.active !== false);
        setExists(true);
      } else {
        setRole(null);
        setActive(true);
        setExists(false);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching current user role:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { role, active, exists, loading };
}

// The full team list — used by the Owner's User Management screen, and
// to detect whether ANY owner exists yet (drives the one-time bootstrap
// flow in App.jsx). Team size is tiny (a handful of accounts), so
// fetching the whole collection has no real cost.
export function useAllUsers(user) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users list:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { users, loading };
}
