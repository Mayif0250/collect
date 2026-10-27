'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RoomAllocationBoard, { RoomData } from '@/components/RoomAllocationBoard';
import CrossBlockModal from '@/components/CrossBlockModal';
import CollectorManagementModal from '@/components/CollectorManagementModal';
import {
  Laptop,
  Download,
  Users,
  Shield,
  Layers,
  ArrowRightLeft,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle2,
  Share2,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [backupInventory, setBackupInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROOMS' | 'BACKUP' | 'AUDIT'>('OVERVIEW');

  // Modals state
  const [isCrossBlockOpen, setIsCrossBlockOpen] = useState(false);
  const [isCollectorModalOpen, setIsCollectorModalOpen] = useState(false);

  // Administrative Claim Action state
  const [releaseActionState, setReleaseActionState] = useState<{
    claimId: string;
    roomName: string;
    collectorName: string;
    reason: string;
  } | null>(null);

  const [isReleasing, setIsReleasing] = useState(false);
  const [backupSearch, setBackupSearch] = useState('');

  // 1. Authenticate admin user
  const fetchAdminUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return null;
      }
      const data = await res.json();
      if (data.user.role !== 'ADMIN') {
        router.push('/collector');
        return null;
      }
      setUser(data.user);
      return data.user;
    } catch {
      router.push('/login');
      return null;
    }
  }, [router]);

  // 2. Fetch live metrics, rooms, and backup data
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, roomsRes, backupRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/rooms'),
        fetch('/api/collection/backup'),
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setMetrics(stats);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }

      if (backupRes.ok) {
        const backupData = await backupRes.json();
        setBackupInventory(backupData);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminUser().then((u) => {
      if (u) {
        fetchDashboardData();
      }
    });

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 4000); // 4-second real-time polling

    return () => clearInterval(interval);
  }, [fetchAdminUser, fetchDashboardData]);

  // Session activate/pause toggle
  const handleToggleSession = async () => {
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to toggle session:', err);
    }
  };

  // Administrative release of a collector's room claim
  const handleConfirmRelease = async () => {
    if (!releaseActionState || !releaseActionState.reason.trim()) return;

    setIsReleasing(true);
    try {
      const res = await fetch('/api/rooms/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: releaseActionState.claimId,
          reason: releaseActionState.reason.trim(),
        }),
      });

      if (res.ok) {
        setReleaseActionState(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error releasing room claim:', err);
    } finally {
      setIsReleasing(false);
    }
  };

  // Excel Master Register Export
  const handleExportExcel = () => {
    window.location.href = '/api/export/excel';
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-900 mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading administrator portal...</p>
        </div>
      </div>
    );
  }

  const filteredBackup = backupInventory.filter((item) => {
    if (!backupSearch) return true;
    const q = backupSearch.toLowerCase();
    return (
      item.studentId.toLowerCase().includes(q) ||
      item.collectionId.toLowerCase().includes(q) ||
      (item.studentName && item.studentName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        activeSession={metrics?.activeSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Collection Control & Operations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live monitoring, sequential room management, cross-block transfers & registers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Toggle */}
            <button
              type="button"
              onClick={handleToggleSession}
              className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                metrics?.activeSession?.isActive
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {metrics?.activeSession?.isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Collection Session</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Activate Collection Session</span>
                </>
              )}
            </button>

            {/* Cross-Block Overflow */}
            <button
              type="button"
              onClick={() => setIsCrossBlockOpen(true)}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Cross-Block Overflow</span>
            </button>

            {/* Manage Collectors */}
            <button
              type="button"
              onClick={() => setIsCollectorModalOpen(true)}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Manage Collectors</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export All to Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Laptops */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Laptops Collected
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {metrics?.totalCollected || 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">of 561 Total</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
              <span>CSE: <strong className="text-blue-900 font-mono">{metrics?.cseCollected || 0}</strong></span>
              <span>ECE: <strong className="text-indigo-900 font-mono">{metrics?.eceCollected || 0}</strong></span>
            </div>
          </div>

          {/* E Block Primary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              E Block (CSE Primary)
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-900 font-mono">
                {metrics?.eBlockAllocated || 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {metrics?.eBlockCapacity || 420} Seats
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
              <span>Vacant: <strong className="text-emerald-700 font-mono">{metrics?.eBlockVacant || 0}</strong></span>
              <span className="font-mono">
                {Math.round(((metrics?.eBlockAllocated || 0) / (metrics?.eBlockCapacity || 420)) * 100)}% Full
              </span>
            </div>
          </div>

          {/* F Block Primary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              F Block (ECE Primary)
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-900 font-mono">
                {metrics?.fBlockAllocated || 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {metrics?.fBlockCapacity || 141} Seats
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
              <span>Vacant: <strong className="text-emerald-700 font-mono">{metrics?.fBlockVacant || 0}</strong></span>
              <span className="font-mono">
                {Math.round(((metrics?.fBlockAllocated || 0) / (metrics?.fBlockCapacity || 141)) * 100)}% Full
              </span>
            </div>
          </div>

          {/* Backup & Cross-Block */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Backup & Overflow
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
                {metrics?.backupCount || 0}
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                {metrics?.crossBlockCount || 0} Cross-Block
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
              <span>CSE: {metrics?.cseBackupCount || 0}</span>
              <span>ECE: {metrics?.eceBackupCount || 0}</span>
              <span>Duplicates: {metrics?.duplicateWarningsCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Active Collectors & Room Claims Panel */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Room Claims & Collector Stations</h3>
              <p className="text-xs text-slate-500">
                Rooms currently claimed by collectors. Reserved until completed or administratively released.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">
              {metrics?.activeRoomClaims?.length || 0} Active Stations
            </span>
          </div>

          {!metrics?.activeRoomClaims || metrics.activeRoomClaims.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No rooms are currently claimed by collectors.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.activeRoomClaims.map((claim: any) => (
                <div
                  key={claim.claimId}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900">Room {claim.roomName}</strong>
                      <span className="text-xs font-semibold px-2 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {claim.block} Block
                      </span>
                      <span className="text-xs font-mono text-slate-600">
                        ({claim.occupiedSeats} / {claim.capacity} seats allocated)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>Collector: <strong>{claim.collectorName}</strong> (@{claim.collectorUsername})</span>
                      <span>•</span>
                      <span>Claimed: {new Date(claim.claimedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReleaseActionState({
                          claimId: claim.claimId,
                          roomName: claim.roomName,
                          collectorName: claim.collectorName,
                          reason: '',
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Release Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Room Allocation Board (18 Rooms)
          </button>
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup Inventory ({backupInventory.length})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Audit Log & System Activity
          </button>
        </div>

        {/* Tab: Room Allocation Board */}
        {activeTab === 'OVERVIEW' && (
          <RoomAllocationBoard rooms={rooms} isAdmin={true} />
        )}

        {/* Tab: Backup Inventory */}
        {activeTab === 'BACKUP' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search backup by Student ID, Collection ID, or Name..."
                  value={backupSearch}
                  onChange={(e) => setBackupSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCrossBlockOpen(true)}
                className="px-3 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer Eligible Backups</span>
              </button>
            </div>

            {filteredBackup.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No backup records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Collection ID</th>
                      <th className="py-2.5 px-4">Student ID</th>
                      <th className="py-2.5 px-4">Branch</th>
                      <th className="py-2.5 px-4">Batch</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Collector</th>
                      <th className="py-2.5 px-4">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBackup.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{item.collectionId}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{item.studentId}</td>
                        <td className="py-2.5 px-4 font-semibold">{item.branch}</td>
                        <td className="py-2.5 px-4">{item.batch}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.studentName || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.collector?.name}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Audit Log */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">System Audit Trail</h3>
              <p className="text-xs text-slate-500">Every claim, registration, transfer, and administrative override is logged</p>
            </div>
            <div className="divide-y divide-slate-100">
              {metrics?.recentActivity?.map((act: any) => (
                <div key={act.id} className="p-3.5 flex justify-between items-start text-xs hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                        {act.action}
                      </span>
                      <span className="font-semibold text-slate-900">{act.userName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">{act.entityType}</span>
                    </div>
                    {act.reason && (
                      <p className="text-slate-600 text-xs mt-1 italic">&ldquo;{act.reason}&rdquo;</p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Administrative Room Release */}
        {releaseActionState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Release Room {releaseActionState.roomName}</h3>
              <p className="text-xs text-slate-600">
                You are releasing the claim held by <strong>{releaseActionState.collectorName}</strong>. This room will become available for the next collector in sequence.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for Release <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={releaseActionState.reason}
                  onChange={(e) =>
                    setReleaseActionState({ ...releaseActionState, reason: e.target.value })
                  }
                  placeholder="e.g. Collector shift ended or station network issue"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReleaseActionState(null)}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRelease}
                  disabled={isReleasing || !releaseActionState.reason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  {isReleasing ? 'Releasing...' : 'Confirm Audited Release'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cross-Block Overflow Authorization */}
        <CrossBlockModal
          isOpen={isCrossBlockOpen}
          onClose={() => setIsCrossBlockOpen(false)}
          onTransferCompleted={fetchDashboardData}
        />

        {/* Modal: Collector Account Management */}
        <CollectorManagementModal
          isOpen={isCollectorModalOpen}
          onClose={() => setIsCollectorModalOpen(false)}
          onUpdate={fetchDashboardData}
        />
      </main>
    </div>
  );
}
