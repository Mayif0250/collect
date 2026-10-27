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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E7EB]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F4F2F0] rounded-t-[24px]">
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-base">Collector Account Management</h3>
            <p className="text-xs text-[#6B7280]">Configure role-based access and department station operators</p>
          </div>
          <button
            onClick={onClose}
            className="btn-interaction p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-xs text-[#7A7772] uppercase tracking-wider">
              Staff & Collector Accounts
            </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-interaction px-3.5 py-1.5 text-xs font-semibold text-white bg-[#030213] hover:bg-[#030213]/90 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Form' : 'New Collector'}</span>
            </button>
          </div>

          {/* Add Collector Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="bg-[#F4F2F0] p-4 rounded-[18px] border border-[#E5E7EB] space-y-3">
              <h5 className="font-bold text-xs text-[#1A1A1A]">Create Collector Account</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cse_collector_2"
                    className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-xl font-mono focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Role / Department</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
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
                  className="btn-interaction px-3.5 py-1.5 text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-interaction px-4 py-1.5 text-xs font-semibold text-white bg-[#030213] hover:bg-[#030213]/90 rounded-xl disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Save Collector'}
                </button>
              </div>
            </form>
          )}

          {/* Collectors List */}
          <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-[16px] overflow-hidden bg-white">
            {collectors.map((c) => (
              <div key={c.id} className="p-3.5 flex justify-between items-center text-xs row-hover-effect">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="font-bold text-[#1A1A1A]">{c.name}</strong>
                    <span className="font-mono text-[#6B7280] text-[11px]">@{c.username}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-md border ${
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
                  <div className="text-[11px] text-[#6B7280] mt-1 flex gap-3">
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
                    className={`btn-interaction px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shadow-2xs ${
                      c.isActive
                        ? 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:bg-red-50 hover:text-red-700 hover:border-red-300'
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
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F4F2F0] rounded-b-[24px] text-right">
          <button
            type="button"
            onClick={onClose}
            className="btn-interaction px-4 py-2 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
