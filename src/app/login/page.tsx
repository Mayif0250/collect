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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-blue-900 rounded-2xl shadow-md flex items-center justify-center text-white">
            <Laptop className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Laptop Collection System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          Sequential Room Allocation Operations • E Block (CSE) & F Block (ECE)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Operations Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Select Buttons for Operations Testing */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="block text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Operations Login
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'AdminPassword123!')}
                className="p-2 text-center text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-700 transition-colors"
              >
                <div className="font-bold text-slate-900">Admin</div>
                <div className="text-[10px] text-slate-500">System</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('cse_collector', 'Collector123!')}
                className="p-2 text-center text-xs bg-blue-50/50 hover:bg-blue-100/50 border border-blue-200 rounded-lg font-medium text-blue-900 transition-colors"
              >
                <div className="font-bold text-blue-900">CSE</div>
                <div className="text-[10px] text-blue-600">E Block</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('ece_collector', 'Collector123!')}
                className="p-2 text-center text-xs bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-200 rounded-lg font-medium text-indigo-900 transition-colors"
              >
                <div className="font-bold text-indigo-900">ECE</div>
                <div className="text-[10px] text-indigo-600">F Block</div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Restricted operational system. Public registration is prohibited.</span>
        </p>
      </div>
    </div>
  );
}
