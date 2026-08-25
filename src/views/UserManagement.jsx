import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { Users, UserPlus, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { db, USERS_COLLECTION, getSecondaryAuth, disposeSecondaryAuth } from '../firebase';
import { ROLES, ROLE_LABELS } from '../constants';

const randomThrowawayPassword = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now()}`);

export default function UserManagement({ user, allUsers }) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [existingUid, setExistingUid] = useState('');
  const [existingEmail, setExistingEmail] = useState('');
  const [existingRole, setExistingRole] = useState('staff');
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState('');

  // Creating another person's account normally signs THIS browser in as
  // them (a client-SDK quirk) — done via a disposable secondary auth
  // instance so the Owner's own session is untouched. The Owner never
  // sees or sets the new account's password: a throwaway value is used
  // once, then a password-reset email lets the person set their own.
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), randomThrowawayPassword());
      const newUid = cred.user.uid;
      await sendPasswordResetEmail(secondaryAuth, newEmail.trim());
      await signOut(secondaryAuth);
      await disposeSecondaryAuth();

      await setDoc(doc(db, USERS_COLLECTION, newUid), {
        email: newEmail.trim(),
        role: newRole,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNewEmail('');
      setNewRole('staff');
      alert(`Account created. A password-setup email has been sent to ${newEmail.trim()}.`);
    } catch (err) {
      console.error('Error creating account:', err);
      if (err.code === 'auth/email-already-in-use') {
        setCreateError('An account with this email already exists — use "Grant Role to an Existing Account" below instead.');
      } else {
        setCreateError(err.message || 'Failed to create account.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // For accounts that already exist in Firebase Auth (e.g. someone who
  // self-signed-up before roles existed) but have no role document yet.
  // There's no client-side way to look up another account's UID by
  // email without the Admin SDK — the person needs to log in once, see
  // their User ID on the "account not set up" screen, and pass it along.
  const handleGrantExisting = async (e) => {
    e.preventDefault();
    if (!existingUid.trim() || !existingEmail.trim()) return;
    setIsGranting(true);
    setGrantError('');
    try {
      await setDoc(doc(db, USERS_COLLECTION, existingUid.trim()), {
        email: existingEmail.trim(),
        role: existingRole,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setExistingUid('');
      setExistingEmail('');
      alert('Role granted — they should see the app on their next refresh.');
    } catch (err) {
      console.error('Error granting role:', err);
      setGrantError(err.message || 'Failed to grant role.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRoleChange = async (uid, role) => {
    try {
      await setDoc(doc(db, USERS_COLLECTION, uid), { role, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role.');
    }
  };

  const handleToggleActive = async (uid, active) => {
    try {
      await setDoc(doc(db, USERS_COLLECTION, uid), { active, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Users className="text-green-600" /> Team Accounts
        </h2>
        <p className="text-sm text-gray-500 mb-6">Owner, Store Manager, and Staff accounts across both outlets.</p>

        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden mb-8">
          {allUsers.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No team accounts yet.</p>
          ) : (
            allUsers.map(u => {
              const isSelf = u.id === user.uid;
              return (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      {u.email}
                      {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                      {u.active === false && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Deactivated</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{u.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={isSelf}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button
                      onClick={() => handleToggleActive(u.id, u.active === false)}
                      disabled={isSelf}
                      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 ${
                        u.active === false
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {u.active === false ? 'Reactivate' : 'Deactivate'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleCreateAccount} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <UserPlus size={16} className="text-green-600" /> Create New Account
            </h3>
            <p className="text-xs text-gray-500">For someone who's never used the app before. They'll get an email to set their own password.</p>
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs flex items-start gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {createError}
              </div>
            )}
            <input
              type="email" required placeholder="email@example.com" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
              {ROLES.filter(r => r !== 'owner').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button
              type="submit" disabled={isCreating}
              className="w-full bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <form onSubmit={handleGrantExisting} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <KeyRound size={16} className="text-indigo-600" /> Grant Role to Existing Account
            </h3>
            <p className="text-xs text-gray-500">For someone who already has a login (e.g. signed up before roles existed). Ask them to log in once and copy their User ID from the screen they'll see.</p>
            {grantError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs flex items-start gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {grantError}
              </div>
            )}
            <input
              type="text" required placeholder="Their User ID" value={existingUid}
              onChange={(e) => setExistingUid(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono"
            />
            <input
              type="email" required placeholder="Their email (for your reference)" value={existingEmail}
              onChange={(e) => setExistingEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
            <select value={existingRole} onChange={(e) => setExistingRole(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button
              type="submit" disabled={isGranting}
              className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGranting ? 'Granting...' : 'Grant Role'}
            </button>
          </form>
        </div>

        <div className="flex items-start gap-2 mt-6 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs">
          <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Any role can view and switch between both outlets — roles here only control which screens and
            actions someone can use, not which outlet's data they see.
          </span>
        </div>
      </div>
    </div>
  );
}
