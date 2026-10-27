'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Laptop, RefreshCw, Shield, User, CheckCircle2 } from 'lucide-react';

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

  const isCSE = user?.permittedDepartment === 'CSE';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="bg-[#F4F2F0] border-b border-[#E5E7EB] shrink-0 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[74px]">
          {/* Left Brand & Title */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[12px] bg-[#030213] text-white flex items-center justify-center shadow-xs shrink-0">
              <Laptop className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1A1A1A] text-base sm:text-lg tracking-tight">
                  LaptopCollect
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-white border border-[#E5E7EB] text-[#4B5563] shadow-2xs">
                  Pro Operations
                </span>
                {activeSession && (
                  <div
                    className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      activeSession.isActive
                        ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                        : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeSession.isActive ? 'bg-[#16A34A] animate-pulse' : 'bg-[#D97706]'
                      }`}
                    />
                    <span>{activeSession.isActive ? 'Session Active' : 'Session Paused'}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#6B7280] hidden md:block truncate mt-0.5">
                Sequential Allocation: E Block (CSE • 420 Seats) • F Block (ECE • 141 Seats)
              </p>
            </div>
          </div>

          {/* Right Controls & User Profile */}
          <div className="flex items-center space-x-3 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="btn-interaction inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1A1A1A] bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
                title="Sync latest live allocations"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#030213]' : 'text-[#6B7280]'}`}
                />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>
            )}

            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-[#E5E7EB]">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#1A1A1A]">{user.name}</span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-[#9CA3AF]">@{user.username}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-md border ${
                        isAdmin
                          ? 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]'
                          : isCSE
                          ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                          : 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]'
                      }`}
                    >
                      {isAdmin ? 'System Admin' : `${user.permittedDepartment} Station`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-interaction p-2 text-[#6B7280] hover:text-[#DC2626] bg-white hover:bg-red-50 border border-[#E5E7EB] hover:border-red-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  title="Sign out of station"
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
