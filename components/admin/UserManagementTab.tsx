'use client';

import React, { useState } from 'react';
import { 
  Users, UserPlus, KeyRound, Trash2, Search, Filter, ShieldCheck, 
  CheckCircle2, AlertCircle, Mail, Phone, Lock, X 
} from 'lucide-react';
import { UserAccount, UserRole } from '@/lib/types';
import { db, saveUserAccount, deleteUserAccount, updateUserPassword } from '@/lib/db';

interface UserManagementTabProps {
  userAccounts: UserAccount[];
  onUserUpdated: () => void;
  showToast: (msg: string) => void;
}

export default function UserManagementTab({ userAccounts, onUserUpdated, showToast }: UserManagementTabProps) {
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [resetPassModalOpen, setResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STUDENT' as UserRole,
    associatedId: '',
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert('Name, email, and password are required.');
      return;
    }

    saveUserAccount({
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      phone: newUser.phone.trim(),
      password: newUser.password.trim(),
      role: newUser.role,
      associatedId: newUser.associatedId.trim() || undefined,
    });

    setAddUserModalOpen(false);
    setNewUser({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'STUDENT',
      associatedId: '',
    });
    onUserUpdated();
    showToast(`Created account for ${newUser.name} with ${newUser.role} privileges!`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPasswordValue.trim()) return;

    updateUserPassword(selectedUserForReset.id, newPasswordValue.trim());
    setResetPassModalOpen(false);
    setNewPasswordValue('');
    setSelectedUserForReset(null);
    onUserUpdated();
    showToast(`Updated password for ${selectedUserForReset.email}`);
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (user.role === 'ADMIN' && userAccounts.filter(u => u.role === 'ADMIN').length <= 1) {
      alert('Cannot delete the last remaining Administrator account.');
      return;
    }

    if (confirm(`Are you sure you want to delete user account "${user.name}" (${user.email})?`)) {
      deleteUserAccount(user.id);
      onUserUpdated();
      showToast(`Deleted account ${user.email}`);
    }
  };

  const filteredUsers = userAccounts.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone || '').includes(query);
    return matchesRole && matchesSearch;
  });

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-slate-900 text-white border-slate-700';
      case 'TEACHER':
        return 'bg-prime-orange/10 text-prime-orange border-prime-orange/30';
      case 'STUDENT':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PARENT':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Identity & Access Management</h1>
          <p className="text-xs text-slate-500">Manage portal user accounts, credentials, and role-based permissions</p>
        </div>

        <button
          onClick={() => setAddUserModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4 text-prime-orange" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Role Counts Bar & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const).map(r => {
            const count = r === 'ALL' ? userAccounts.length : userAccounts.filter(u => u.role === r).length;
            const isSelected = roleFilter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-prime-orange"
          />
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="p-3.5">Full Name & ID</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Mobile Phone</th>
                <th className="p-3.5">Associated Profile</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">No user accounts found matching query.</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {u.email}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {u.phone || '—'}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {u.associatedId ? (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{u.associatedId}</span>
                      ) : (
                        'Global'
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedUserForReset(u);
                          setNewPasswordValue('');
                          setResetPassModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-400 text-slate-700 font-semibold text-[11px] transition inline-flex items-center space-x-1"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3 h-3 text-prime-orange" />
                        <span>Reset Pass</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-[11px] transition inline-flex items-center"
                        title="Delete User Account"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New User */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Provision User Account</h2>
              <button onClick={() => setAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@primelearning.edu.in"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="9810989437"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-prime-orange outline-none"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="PARENT">PARENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Initial Password / PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Associated Profile ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. std-1 or teacher-praveen"
                  value={newUser.associatedId}
                  onChange={(e) => setNewUser({ ...newUser, associatedId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-md"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPassModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Reset User Password</h2>
              <button onClick={() => setResetPassModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set a new secure access credential for <strong>{selectedUserForReset.email}</strong>:
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">New Password / PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-prime-orange outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalOpen(false)}
                  className="py-2 px-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-prime-orange hover:bg-prime-orange-hover text-white font-bold transition shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
