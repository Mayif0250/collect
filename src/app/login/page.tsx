'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Laptop, Lock, User, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const fillQuickCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 animate-page-entrance">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="w-13 h-13 bg-[#030213] rounded-[16px] shadow-sm flex items-center justify-center text-white">
            <Laptop className="w-7 h-7" />
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
                    name="username"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin or collector username"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all"
                  />
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

            {/* Quick Select Buttons for Operations Testing */}
            <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
              <span className="block text-center text-[11px] font-semibold text-[#7A7772] uppercase tracking-wider mb-2.5">
                Quick Operations Login
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('admin', 'Admin@12345')}
                  className="btn-interaction p-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-center shadow-2xs cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-[#1A1A1A]">Admin</div>
                  <div className="text-[10px] text-[#6B7280]">Full System</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('cse_collector_1', 'Cse@12345')}
                  className="btn-interaction p-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-center shadow-2xs cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-blue-900">CSE Collector</div>
                  <div className="text-[10px] text-[#6B7280]">E Block</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('ece_collector_1', 'Ece@12345')}
                  className="btn-interaction p-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-center shadow-2xs cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-indigo-900">ECE Collector</div>
                  <div className="text-[10px] text-[#6B7280]">F Block</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
