'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RoomAllocationBoard, { RoomData } from '@/components/RoomAllocationBoard';
import CrossBlockModal from '@/components/CrossBlockModal';
import CollectorManagementModal from '@/components/CollectorManagementModal';
import { StandardCard } from '@/components/ui/StandardCard';
import { MetricCard } from '@/components/ui/MetricCard';
import {
  Laptop,
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
  FileSpreadsheet,
  Search,
  Radio,
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [backupInventory, setBackupInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BACKUP' | 'AUDIT'>('OVERVIEW');

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
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#030213] mx-auto" />
          <p className="text-xs font-semibold text-[#6B7280]">Loading administrator portal...</p>
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
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <Navbar
        user={user}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        activeSession={metrics?.activeSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar inside Ornate Frame */}
        <StandardCard
          header={
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7A7772] uppercase tracking-wider">
                System Command Center
              </span>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                18 Authoritative Rooms • 561 Total Capacity
              </span>
            </div>
          }
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
                Collection Operations & Room Allocation
              </h1>
              <p className="text-xs text-[#6B7280] mt-1">
                Live monitoring, sequential room management, cross-block transfers & multi-sheet registers
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Session Toggle */}
              <button
                type="button"
                onClick={handleToggleSession}
                className={`btn-interaction px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 cursor-pointer shadow-2xs ${
                  metrics?.activeSession?.isActive
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
                    : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] hover:bg-[#BBF7D0]'
                }`}
              >
                {metrics?.activeSession?.isActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Pause Collection</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>Activate Collection</span>
                  </>
                )}
              </button>

              {/* Cross-Block Overflow */}
              <button
                type="button"
                onClick={() => setIsCrossBlockOpen(true)}
                className="btn-interaction px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F9FAFB] flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Cross-Block Overflow</span>
              </button>

              {/* Manage Collectors */}
              <button
                type="button"
                onClick={() => setIsCollectorModalOpen(true)}
                className="btn-interaction px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F9FAFB] flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Manage Collectors</span>
              </button>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="btn-interaction px-4 py-2 text-xs font-semibold rounded-xl bg-[#030213] hover:bg-[#030213]/90 text-white flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export to Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </StandardCard>

        {/* Key Metrics Grid using Ornate MetricCard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Laptops Collected"
            value={metrics?.totalCollected || 0}
            icon={Laptop}
            iconBgColor="#F3F4F6"
            iconColor="#030213"
            delay={0}
            badge={
              <span className="text-[11px] font-semibold text-[#6B7280] font-mono">
                / 561 Total
              </span>
            }
            subtitle={
              <>
                <span>CSE: <strong className="text-[#1A1A1A] font-mono">{metrics?.cseCollected || 0}</strong></span>
                <span>ECE: <strong className="text-[#1A1A1A] font-mono">{metrics?.eceCollected || 0}</strong></span>
              </>
            }
          />

          <MetricCard
            title="E Block (CSE Primary)"
            value={metrics?.eBlockAllocated || 0}
            icon={Layers}
            iconBgColor="#EFF6FF"
            iconColor="#2563EB"
            delay={50}
            badge={
              <span className="text-[11px] font-semibold text-[#2563EB] font-mono">
                / {metrics?.eBlockCapacity || 420} Seats
              </span>
            }
            subtitle={
              <>
                <span>Vacant: <strong className="text-emerald-700 font-mono">{metrics?.eBlockVacant || 0}</strong></span>
                <span className="font-mono">
                  {Math.round(((metrics?.eBlockAllocated || 0) / (metrics?.eBlockCapacity || 420)) * 100)}% Full
                </span>
              </>
            }
          />

          <MetricCard
            title="F Block (ECE Primary)"
            value={metrics?.fBlockAllocated || 0}
            icon={Layers}
            iconBgColor="#EEF2FF"
            iconColor="#4F46E5"
            delay={100}
            badge={
              <span className="text-[11px] font-semibold text-[#4F46E5] font-mono">
                / {metrics?.fBlockCapacity || 141} Seats
              </span>
            }
            subtitle={
              <>
                <span>Vacant: <strong className="text-emerald-700 font-mono">{metrics?.fBlockVacant || 0}</strong></span>
                <span className="font-mono">
                  {Math.round(((metrics?.fBlockAllocated || 0) / (metrics?.fBlockCapacity || 141)) * 100)}% Full
                </span>
              </>
            }
          />

          <MetricCard
            title="Backup & Overflow"
            value={metrics?.backupCount || 0}
            icon={ArrowRightLeft}
            iconBgColor="#FEF3C7"
            iconColor="#D97706"
            delay={150}
            badge={
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                {metrics?.crossBlockCount || 0} Cross-Block
              </span>
            }
            subtitle={
              <>
                <span>CSE: {metrics?.cseBackupCount || 0}</span>
                <span>ECE: {metrics?.eceBackupCount || 0}</span>
                <span>Dupes: {metrics?.duplicateWarningsCount || 0}</span>
              </>
            }
          />
        </div>

        {/* Active Room Claims & Collector Stations */}
        <StandardCard
          header={
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">Active Room Claims & Collector Stations</h3>
                <p className="text-xs text-[#6B7280]">
                  Rooms currently claimed by collectors. Reserved until completed or administratively released.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#DBEAFE] text-[#1E40AF] px-2.5 py-0.5 rounded-md">
                {metrics?.activeRoomClaims?.length || 0} Active Stations
              </span>
            </div>
          }
        >
          {!metrics?.activeRoomClaims || metrics.activeRoomClaims.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6B7280]">
              No rooms are currently claimed by collectors. All available stations are standing by in sequence.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {metrics.activeRoomClaims.map((claim: any) => (
                <div
                  key={claim.claimId}
                  className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 row-hover-effect rounded-lg px-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-[#1A1A1A]">Room {claim.roomName}</strong>
                      <span className="text-xs font-semibold px-2 py-0.2 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                        {claim.block} Block
                      </span>
                      <span className="text-xs font-mono text-[#6B7280]">
                        ({claim.occupiedSeats} / {claim.capacity} seats allocated)
                      </span>
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1 flex items-center gap-3">
                      <span>Collector: <strong className="text-[#1A1A1A]">{claim.collectorName}</strong> (@{claim.collectorUsername})</span>
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
                      className="btn-interaction px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Release Room Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StandardCard>

        {/* Tab Navigation Segmented Control */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`btn-interaction px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-[#030213] text-white shadow-sm'
                : 'bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            Room Allocation Board (18 Rooms)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BACKUP')}
            className={`btn-interaction px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'bg-[#030213] text-white shadow-sm'
                : 'bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            Backup Inventory ({backupInventory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`btn-interaction px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-[#030213] text-white shadow-sm'
                : 'bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
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
          <StandardCard
            header={
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#7A7772] uppercase tracking-wider">
                  Backup Storage Register
                </span>
                <span className="text-xs text-[#6B7280]">
                  Laptops received when primary block was at 100% capacity
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search backup by Student ID, Collection ID, or Name..."
                    value={backupSearch}
                    onChange={(e) => setBackupSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCrossBlockOpen(true)}
                  className="btn-interaction px-4 py-2 text-xs font-semibold text-white bg-[#030213] hover:bg-[#030213]/90 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Eligible Backups</span>
                </button>
              </div>

              {filteredBackup.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#6B7280]">
                  No backup records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-[10px] tracking-wider border-b border-[#E5E7EB]">
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
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {filteredBackup.map((item) => (
                        <tr key={item.id} className="row-hover-effect">
                          <td className="py-2.5 px-4 font-mono font-bold text-[#1A1A1A]">{item.collectionId}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{item.studentId}</td>
                          <td className="py-2.5 px-4 font-semibold">{item.branch}</td>
                          <td className="py-2.5 px-4">{item.batch}</td>
                          <td className="py-2.5 px-4 text-[#6B7280]">{item.studentName || '—'}</td>
                          <td className="py-2.5 px-4 text-[#6B7280]">{item.collector?.name}</td>
                          <td className="py-2.5 px-4 text-[#9CA3AF] font-mono text-[11px]">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </StandardCard>
        )}

        {/* Tab: Audit Log */}
        {activeTab === 'AUDIT' && (
          <StandardCard
            header={
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#7A7772] uppercase tracking-wider">
                  Authoritative Audit Trail
                </span>
                <span className="text-xs text-[#6B7280]">
                  Every claim, allocation, duplicate warning, and transfer is logged
                </span>
              </div>
            }
          >
            <div className="divide-y divide-[#E5E7EB]">
              {!metrics?.recentActivity || metrics.recentActivity.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#6B7280]">
                  No system activity logged yet.
                </div>
              ) : (
                metrics.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-3 px-2 flex justify-between items-start text-xs row-hover-effect rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#1A1A1A] text-[10px]">
                          {act.action}
                        </span>
                        <span className="font-semibold text-[#1A1A1A]">{act.userName}</span>
                        <span className="text-[#9CA3AF]">•</span>
                        <span className="text-[#6B7280] font-mono text-[11px]">{act.entityType}</span>
                      </div>
                      {act.reason && (
                        <p className="text-[#6B7280] text-xs mt-1 italic">&ldquo;{act.reason}&rdquo;</p>
                      )}
                    </div>
                    <span className="text-[11px] text-[#9CA3AF] font-mono shrink-0">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </StandardCard>
        )}

        {/* Modal: Administrative Room Release */}
        {releaseActionState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-[24px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E5E7EB]">
              <h3 className="font-bold text-[#1A1A1A] text-base">Release Room {releaseActionState.roomName}</h3>
              <p className="text-xs text-[#6B7280]">
                You are releasing the claim held by <strong>{releaseActionState.collectorName}</strong>. This room will become available for the next collector in sequence.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1">
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
                  className="w-full text-xs p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReleaseActionState(null)}
                  className="btn-interaction px-3.5 py-1.5 text-xs font-semibold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRelease}
                  disabled={isReleasing || !releaseActionState.reason.trim()}
                  className="btn-interaction px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 cursor-pointer shadow-sm"
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
