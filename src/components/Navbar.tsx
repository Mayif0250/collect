'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Laptop, RefreshCw, Shield, User } from 'lucide-react';

interface NavbarProps {
  user: {
    name: string;
    username: string;
    role: string;
    permittedDepartment: string;
  } | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeSession?: {
    isActive: boolean;
    sessionName: string;
  } | null;
}

export default function Navbar({ user, onRefresh, isRefreshing, activeSession }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-900 text-white p-2 rounded-lg shadow-xs flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">LaptopCollect</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-200">
                  v1.0 Pro
                </span>
                {activeSession && (
                  <span
                    className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      activeSession.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        activeSession.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {activeSession.isActive ? 'Session Active' : 'Session Paused'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sequential Room Allocation System (E Block: CSE • F Block: ECE)
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-medium"
                title="Refresh latest records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}

            {user && (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900">{user.name}</span>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{user.username}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {user.role === 'ADMIN' ? 'Admin' : `${user.permittedDepartment} Collector`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
