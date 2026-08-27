import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, USERS_COLLECTION } from '../firebase';

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

    setLoading(true);

    const unsubscribe = onSnapshot(doc(db, USERS_COLLECTION, user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const normalizedRole = data.role ? String(data.role).trim().toLowerCase() : null;
        setRole(normalizedRole);
        setActive(data.active !== false && data.active !== 'false');
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

export function useAllUsers(user, enabled = true) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        role: d.data().role ? String(d.data().role).trim().toLowerCase() : 'staff'
      })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users list:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, enabled]);

  return { users, loading };
}