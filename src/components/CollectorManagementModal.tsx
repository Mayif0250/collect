'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Shield, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CollectorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CollectorManagementModal({ isOpen, onClose, onUpdate }: CollectorManagementModalProps) {
  const [collectors, setCollectors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CSE_COLLECTOR' | 'ECE_COLLECTOR' | 'ADMIN'>('CSE_COLLECTOR');
  const [permittedDepartment, setPermittedDepartment] = useState<'CSE' | 'ECE' | 'ALL'>('CSE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCollectors = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setCollectors(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch collectors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCollectors();
    }
  }, [isOpen]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccessMessage(`User status updated to ${!currentActive ? 'Active' : 'Deactivated'}`);
      fetchCollectors();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          role,
          permittedDepartment: role === 'ADMIN' ? 'ALL' : role === 'CSE_COLLECTOR' ? 'CSE' : 'ECE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create collector');
      }

      setSuccessMessage(`Collector account "${username}" created successfully.`);
      setName('');
      setUsername('');
      setPassword('');
      setShowAddForm(false);
      fetchCollectors();
      onUpdate();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Collector Account Management</h3>
            <p className="text-xs text-slate-500">Configure role-based access and permitted departments</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Active Staff & Collectors</h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Form' : 'New Collector'}</span>
            </button>
          </div>

          {/* Add Collector Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h5 className="font-bold text-xs text-slate-800">Create Collector Account</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cse_collector_2"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role / Department</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded"
                  >
                    <option value="CSE_COLLECTOR">CSE Collector (E Block)</option>
                    <option value="ECE_COLLECTOR">ECE Collector (F Block)</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-900 rounded disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Save Collector'}
                </button>
              </div>
            </form>
          )}

          {/* Collectors List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {collectors.map((c) => (
              <div key={c.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="font-bold text-slate-900">{c.name}</strong>
                    <span className="font-mono text-slate-500 text-[11px]">@{c.username}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                        c.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : c.permittedDepartment === 'CSE'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {c.role === 'ADMIN' ? 'Admin' : `${c.permittedDepartment} Permitted`}
                    </span>
                    {!c.isActive && (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex gap-3">
                    <span>Laptops collected: {c._count?.laptopRecords || 0}</span>
                    {c.roomClaims && c.roomClaims.length > 0 && (
                      <span className="text-blue-600 font-semibold">Active in: {c.roomClaims[0].room.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(c.id, c.isActive)}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                      c.isActive
                        ? 'bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                        : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
