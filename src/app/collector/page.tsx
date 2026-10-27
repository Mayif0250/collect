'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RapidCollectionForm from '@/components/RapidCollectionForm';
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  LogOut,
  DoorOpen,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function CollectorDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [activeClaim, setActiveClaim] = useState<any | null>(null);
  const [nextClaimableRoom, setNextClaimableRoom] = useState<any | null>(null);
  const [roomOccupancy, setRoomOccupancy] = useState<{ occupied: number; capacity: number } | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch current user and session
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return null;
      }
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } catch {
      router.push('/login');
      return null;
    }
  }, [router]);

  // Fetch active room claim and room occupancy
  const fetchDashboardData = useCallback(async (currentUser?: any) => {
    setIsRefreshing(true);
    setActionError(null);

    try {
      const [roomsRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/collection/history?limit=10'),
        fetch('/api/dashboard/stats'),
      ]);

      if (roomsRes.ok) {
        const rooms = await roomsRes.json();
        const u = currentUser || user;

        if (u) {
          // Find this collector's active claim
          const myClaimedRoom = rooms.find(
            (r: any) => r.activeClaim && r.activeClaim.collectorId === u.id
          );

          if (myClaimedRoom) {
            setActiveClaim(myClaimedRoom);
            setRoomOccupancy({
              occupied: myClaimedRoom.occupiedSeats,
              capacity: myClaimedRoom.capacity,
            });
            setNextClaimableRoom(null);
          } else {
            setActiveClaim(null);
            setRoomOccupancy(null);

            // Find next room they can claim in their permitted block
            const targetBlock = u.permittedDepartment === 'CSE' ? 'E' : 'F';
            const blockRooms = rooms
              .filter((r: any) => r.block === targetBlock)
              .sort((a: any, b: any) => a.roomOrder - b.roomOrder);

            const next = blockRooms.find((r: any) => !r.isFull && !r.activeClaim);
            setNextClaimableRoom(next || null);
          }
        }
      }

      if (historyRes.ok) {
        const history = await historyRes.json();
        setRecentSubmissions(history);
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setActiveSession(stats.activeSession);
      }
    } catch (err: any) {
      console.error('Error fetching collector dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData().then((u) => {
      if (u) {
        fetchDashboardData(u);
      }
    });

    // Auto-refresh polling every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchUserData, fetchDashboardData]);

  // Explicit authenticated action to claim the next room
  const handleClaimRoom = async () => {
    if (!nextClaimableRoom) return;

    setIsClaiming(true);
    setActionError(null);

    try {
      const res = await fetch('/api/rooms/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: nextClaimableRoom.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim room');
      }

      await fetchDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Error claiming room');
    } finally {
      setIsClaiming(false);
    }
  };

  // Explicit authenticated action to complete the room
  const handleCompleteRoom = async () => {
    if (!activeClaim) return;

    setIsCompleting(true);
    setActionError(null);

    try {
      const res = await fetch('/api/rooms/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeClaim.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete room');
      }

      await fetchDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Error completing room');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-900 mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading collector station...</p>
        </div>
      </div>
    );
  }

  const isFull = roomOccupancy ? roomOccupancy.occupied >= roomOccupancy.capacity : false;
  const nextSeatNumber = roomOccupancy ? roomOccupancy.occupied + 1 : 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        activeSession={activeSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{actionError}</div>
          </div>
        )}

        {/* Room Claim & Assignment Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {user?.permittedDepartment} Department Station
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  {user?.permittedDepartment === 'CSE' ? 'Primary: E Block' : 'Primary: F Block'}
                </span>
              </div>

              {activeClaim ? (
                <div className="mt-1 flex items-baseline gap-3">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Room {activeClaim.name}
                  </h2>
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    Seat #{roomOccupancy?.occupied || 0} of {roomOccupancy?.capacity} filled
                  </span>
                </div>
              ) : (
                <div className="mt-1">
                  <h2 className="text-xl font-bold text-slate-900">No Room Currently Claimed</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Opening the dashboard does not reserve a room. You must explicitly claim the next available room in sequence.
                  </p>
                </div>
              )}
            </div>

            {/* Actions: Claim or Complete */}
            <div>
              {activeClaim ? (
                <button
                  type="button"
                  onClick={handleCompleteRoom}
                  disabled={isCompleting}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                    isFull
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isCompleting ? 'Completing...' : isFull ? 'Room Full — Mark Complete' : 'Finish & Complete Room'}</span>
                </button>
              ) : nextClaimableRoom ? (
                <button
                  type="button"
                  onClick={handleClaimRoom}
                  disabled={isClaiming || (activeSession && !activeSession.isActive)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>
                    {isClaiming
                      ? 'Claiming...'
                      : `Claim Next Room: ${nextClaimableRoom.name} (${nextClaimableRoom.capacity} Seats)`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  All rooms in your primary block are currently full or claimed.
                </div>
              )}
            </div>
          </div>

          {/* Progress bar if room is active */}
          {activeClaim && roomOccupancy && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  Sequential Allocation Progress: <strong className="font-mono">{roomOccupancy.occupied}</strong> /{' '}
                  {roomOccupancy.capacity} Seats
                </span>
                <span className="font-mono text-slate-600 font-bold">
                  {Math.round((roomOccupancy.occupied / roomOccupancy.capacity) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((roomOccupancy.occupied / roomOccupancy.capacity) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rapid Collection Form Component */}
        <RapidCollectionForm
          collectorDepartment={user?.permittedDepartment || 'CSE'}
          activeRoomName={activeClaim?.name || null}
          nextSeatNumber={isFull ? null : nextSeatNumber}
          isPrimaryBlockFull={!activeClaim && !nextClaimableRoom}
          onSuccessfulSubmission={() => {
            fetchDashboardData();
          }}
        />

        {/* Collector Recent Submissions */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Your Recent Collection Submissions</h3>
              <p className="text-xs text-slate-500">Live transaction history for this station</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Showing {recentSubmissions.length} recent
            </span>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No laptops recorded yet during this shift.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Collection ID</th>
                    <th className="py-2.5 px-4">Student ID</th>
                    <th className="py-2.5 px-4">Batch</th>
                    <th className="py-2.5 px-4">Allocation</th>
                    <th className="py-2.5 px-4">Seat #</th>
                    <th className="py-2.5 px-4">Submitter</th>
                    <th className="py-2.5 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSubmissions.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{record.collectionId}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{record.studentId}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{record.batch}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.allocationStatus === 'PRIMARY'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : record.allocationStatus === 'CROSS_BLOCK'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {record.room?.name ? `${record.room.name} (${record.room.block})` : 'Backup'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {record.seatNumber ? `Seat #${record.seatNumber}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {record.isSubmitterPresent ? 'Self' : `Proxy (${record.submitterStudentId})`}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
