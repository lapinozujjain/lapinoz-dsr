import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { Users, UserPlus, KeyRound, AlertCircle, ShieldCheck, Trash2, Copy, Check } from 'lucide-react';
import { auth, db, USERS_COLLECTION, getSecondaryAuth, disposeSecondaryAuth } from '../firebase';
import { ROLES, ROLE_LABELS } from '../constants';
import { ConfirmDialog } from '../components/common';

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

  const [copiedUid, setCopiedUid] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedUid(id);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsCreating(true);
    setCreateError('');
    let secondaryAuth = null;
    try {
      secondaryAuth = await getSecondaryAuth();
      const tempPass = randomThrowawayPassword();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), tempPass);
      const newUid = cred.user.uid;

      try {
        await sendPasswordResetEmail(auth, newEmail.trim());
      } catch (resetErr) {
        console.warn('Password reset email warning:', resetErr);
      }

      await setDoc(doc(db, USERS_COLLECTION, newUid), {
        email: newEmail.trim(),
        role: newRole,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNewEmail('');
      setNewRole('staff');
      alert(`Account created successfully! A password setup email has been sent to ${newEmail.trim()}.`);
    } catch (err) {
      console.error('Error creating account:', err);
      if (err.code === 'auth/email-already-in-use') {
        setCreateError('An account with this email already exists in Authentication. Use "Grant Role to Existing Account" below.');
      } else {
        setCreateError(err.message || 'Failed to create account.');
      }
    } finally {
      if (secondaryAuth) {
        try {
          await signOut(secondaryAuth);
        } catch (_) {}
      }
      await disposeSecondaryAuth();
      setIsCreating(false);
    }
  };

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
      }, { merge: true });

      setExistingUid('');
      setExistingEmail('');
      alert('Role assigned successfully. The user can now access their account.');
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

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await deleteDoc(doc(db, USERS_COLLECTION, confirmDeleteUser.id));
      setConfirmDeleteUser(null);
    } catch (err) {
      console.error('Error deleting user document:', err);
      alert('Failed to remove user document.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Users className="text-green-600" /> Team Accounts
        </h2>
        <p className="text-sm text-gray-500 mb-6">Manage Owner, Store Manager, and Staff access across both outlets.</p>

        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden mb-8 bg-white">
          {allUsers.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No team accounts found.</p>
          ) : (
            allUsers.map(u => {
              const isSelf = u.id === user.uid;
              return (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-gray-50/60 transition-colors">
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      {u.email}
                      {isSelf && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">(you)</span>}
                      {u.active === false && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Deactivated</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 font-mono">{u.id}</p>
                      <button
                        onClick={() => handleCopy(u.id, u.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy User ID"
                      >
                        {copiedUid === u.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={u.role || 'staff'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={isSelf}
                      className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>

                    <button
                      onClick={() => handleToggleActive(u.id, u.active === false)}
                      disabled={isSelf}
                      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 ${
                        u.active === false
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {u.active === false ? 'Reactivate' : 'Deactivate'}
                    </button>

                    {!isSelf && (
                      <button
                        onClick={() => setConfirmDeleteUser(u)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Remove User Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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
            <p className="text-xs text-gray-500">For a new team member. They will receive an email to set their own password.</p>
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs flex items-start gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {createError}
              </div>
            )}
            <input
              type="email" required placeholder="email@example.com" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            />
            <select
              value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              {ROLES.filter(r => r !== 'owner').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button
              type="submit" disabled={isCreating}
              className="w-full bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {isCreating ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <form onSubmit={handleGrantExisting} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <KeyRound size={16} className="text-indigo-600" /> Grant Role to Existing Account
            </h3>
            <p className="text-xs text-gray-500">For someone who already has a login. Ask them to copy their User ID from their login screen.</p>
            {grantError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs flex items-start gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {grantError}
              </div>
            )}
            <input
              type="text" required placeholder="User UID" value={existingUid}
              onChange={(e) => setExistingUid(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="email" required placeholder="User Email" value={existingEmail}
              onChange={(e) => setExistingEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              value={existingRole} onChange={(e) => setExistingRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button
              type="submit" disabled={isGranting}
              className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isGranting ? 'Assigning Role...' : 'Assign Role'}
            </button>
          </form>
        </div>

        <div className="flex items-start gap-2 mt-6 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs">
          <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Roles control access levels across both outlets. Store Managers and Staff can switch between outlets freely.
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteUser}
        title="Remove User Access?"
        message={`Are you sure you want to remove access for ${confirmDeleteUser?.email}? They will no longer be able to access the app.`}
        confirmLabel="Remove Access"
        danger={true}
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </div>
  );
}