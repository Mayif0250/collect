'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  { id: 'admin', label: 'System Administrator', description: 'Full System & Transfers', defaultUsername: 'admin' },
  { id: 'cse_collector', label: 'CSE Collector', description: 'E Block Allocation', defaultUsername: 'cse_collector' },
  { id: 'ece_collector', label: 'ECE Collector', description: 'F Block Allocation', defaultUsername: 'ece_collector' },
  { id: 'custom', label: 'Manual Entry', description: 'Custom Username', defaultUsername: '' },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setErrorMessage(null);
    const target = ROLES.find((r) => r.id === roleId);
    if (target && target.defaultUsername) {
      setUsername(target.defaultUsername);
      setPassword('');
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    } else {
      setUsername('');
      setPassword('');
      setTimeout(() => usernameInputRef.current?.focus(), 50);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Route based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/collector');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 animate-page-entrance">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-2 flex items-center justify-center overflow-hidden">
            <img src="/Rgukt_Logo.png" alt="RGUKT Logo" className="w-12 h-12 object-contain" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold text-[#1A1A1A] tracking-tight">
          Laptop Collection Portal
        </h2>
        <p className="mt-1 text-center text-xs text-[#6B7280]">
          Sequential Room Allocation Operations • E Block (CSE) & F Block (ECE)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Ornate Card Frame */}
        <div className="bg-[#F4F2F0] rounded-[24px] p-[10px] pb-[16px]">
          <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-6 sm:p-8 shadow-2xs">
            {errorMessage && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Role Selection (Auto-fills username/email, password entered manually - Ornate pattern) */}
              <div>
                <label
                  htmlFor="role-select"
                  className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
                >
                  Select Role
                </label>
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] font-medium focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all cursor-pointer shadow-2xs"
                >
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label} ({role.description})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
                >
                  Username
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    ref={usernameInputRef}
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (selectedRole !== 'custom') {
                        const matching = ROLES.find((r) => r.defaultUsername === e.target.value);
                        if (!matching) setSelectedRole('custom');
                      }
                    }}
                    placeholder={selectedRole === 'custom' ? 'Enter username' : 'Auto-filled based on role'}
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <span className="text-[10px] text-[#9CA3AF]">Entered manually</span>
                </div>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    ref={passwordInputRef}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-xs pl-9 pr-10 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-interaction w-full py-2.5 bg-[#030213] hover:bg-[#030213]/90 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In to Operations'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
