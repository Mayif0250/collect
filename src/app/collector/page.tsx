'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RapidCollectionForm from '@/components/RapidCollectionForm';
import { StandardCard } from '@/components/ui/StandardCard';
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  DoorOpen,
  ArrowRight,
  Check,
  LayoutGrid,
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

  // Authenticate collector
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

  // Fetch active room claim and live metrics
  const fetchDashboardData = useCallback(async (currentUser?: any) => {
    setIsRefreshing(true);
    setActionError(null);

    try {
      const [roomsRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/collection/history?limit=12'),
        fetch('/api/dashboard/stats'),
      ]);

      if (roomsRes.ok) {
        const rooms = await roomsRes.json();
        const u = currentUser || user;

        if (u) {
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

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 4000); // 4-second real-time polling

    return () => clearInterval(interval);
  }, [fetchUserData, fetchDashboardData]);

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
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#030213] mx-auto" />
          <p className="text-xs font-semibold text-[#6B7280]">
            Loading collector station...
          </p>
        </div>
      </div>
    );
  }

  const isFull = roomOccupancy ? roomOccupancy.occupied >= roomOccupancy.capacity : false;
  const nextSeatNumber = roomOccupancy ? roomOccupancy.occupied + 1 : 1;
  const isCSE = user?.permittedDepartment === 'CSE';

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      <Navbar
        user={user}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        activeSession={activeSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{actionError}</div>
          </div>
        )}

        {/* Station Overview & Claim Cockpit in Ornate StandardCard */}
        <StandardCard
          header={
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#7A7772] uppercase tracking-wider">
                Station Control & Claim Management
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isCSE
                    ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                    : 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]'
                }`}
              >
                {user?.permittedDepartment} Department Station • {isCSE ? 'E Block Queue' : 'F Block Queue'}
              </span>
            </div>
          }
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              {activeClaim ? (
                <div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
                      Room {activeClaim.name}
                    </h1>
                    <span className="text-xs font-semibold text-[#1E40AF] bg-[#DBEAFE] px-2.5 py-0.5 rounded-md">
                      {roomOccupancy?.occupied || 0} of {roomOccupancy?.capacity} Seats Occupied
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Order #{activeClaim.roomOrder} in sequential room queue. Currently reserved for this station.
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
                    No Room Currently Claimed
                  </h1>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-xl">
                    Sequential room allocation requires claiming the next available room in your department’s queue before recording laptops.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons: Claim or Complete */}
            <div>
              {activeClaim ? (
                <button
                  type="button"
                  onClick={handleCompleteRoom}
                  disabled={isCompleting}
                  className={`btn-interaction px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 cursor-pointer shadow-2xs ${
                    isFull
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
                      : 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isCompleting
                      ? 'Completing Room...'
                      : isFull
                      ? 'Room Full • Mark Complete'
                      : 'Finish & Complete Room'}
                  </span>
                </button>
              ) : nextClaimableRoom ? (
                <button
                  type="button"
                  onClick={handleClaimRoom}
                  disabled={isClaiming || (activeSession && !activeSession.isActive)}
                  className="btn-interaction px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#030213] hover:bg-[#030213]/90 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DoorOpen className="w-4 h-4 text-white" />
                  <span>
                    {isClaiming
                      ? 'Claiming Room...'
                      : `Claim Next: ${nextClaimableRoom.name} (${nextClaimableRoom.capacity} Seats)`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-xs font-semibold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-2 rounded-xl">
                  All rooms in your primary block are currently full or claimed.
                </div>
              )}
            </div>
          </div>

          {/* Visual occupancy bar if claimed */}
          {activeClaim && roomOccupancy && (
            <div className="mt-4 pt-3.5 border-t border-[#E5E7EB]">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-[#4B5563]">
                  Sequential Progress: <strong className="font-mono text-[#1A1A1A]">{roomOccupancy.occupied}</strong> /{' '}
                  {roomOccupancy.capacity} Seats
                </span>
                <span className="font-mono text-[#6B7280] font-bold text-xs">
                  {Math.round((roomOccupancy.occupied / roomOccupancy.capacity) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
                <div
                  className="h-full bg-[#030213] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((roomOccupancy.occupied / roomOccupancy.capacity) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </StandardCard>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Rapid Collection Form */}
          <div className="lg:col-span-7 space-y-6">
            <RapidCollectionForm
              collectorDepartment={user?.permittedDepartment || 'CSE'}
              activeRoomName={activeClaim?.name || null}
              nextSeatNumber={isFull ? null : nextSeatNumber}
              isPrimaryBlockFull={!activeClaim && !nextClaimableRoom}
              onSuccessfulSubmission={() => {
                fetchDashboardData();
              }}
            />
          </div>

          {/* Right Column: Live Room Seat Grid & Recent Submissions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Room Seat Grid */}
            {activeClaim && roomOccupancy && (
              <StandardCard
                header={
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-[#030213]" />
                      <h3 className="font-bold text-[#1A1A1A] text-xs sm:text-sm">
                        {activeClaim.name} Live Seat Layout
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#6B7280]">
                      {roomOccupancy.occupied}/{roomOccupancy.capacity} Filled
                    </span>
                  </div>
                }
              >
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: roomOccupancy.capacity }, (_, i) => i + 1).map((seat) => {
                    const isOccupied = seat <= roomOccupancy.occupied;
                    const isNext = seat === roomOccupancy.occupied + 1;

                    return (
                      <div
                        key={seat}
                        className={`py-2 text-center rounded-lg text-xs font-mono font-bold transition-all ${
                          isOccupied
                            ? 'bg-[#DCFCE7] text-[#14532D] border border-[#BBF7D0]'
                            : isNext
                            ? 'bg-[#DBEAFE] text-[#1E40AF] border-2 border-blue-600 animate-pulse'
                            : 'bg-[#F9FAFB] text-[#9CA3AF] border border-[#E5E7EB]'
                        }`}
                        title={
                          isOccupied
                            ? `Seat #${seat} Occupied`
                            : isNext
                            ? `Seat #${seat} Next in Line`
                            : `Seat #${seat} Vacant`
                        }
                      >
                        #{seat}
                      </div>
                    );
                  })}
                </div>
              </StandardCard>
            )}

            {/* Recent Submissions Feed */}
            <StandardCard
              header={
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#1A1A1A] text-xs sm:text-sm">
                    Recent Submissions
                  </h3>
                  <span className="text-[10px] font-bold text-[#7A7772] uppercase tracking-wider">
                    Station Activity
                  </span>
                </div>
              }
            >
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6B7280]">
                  No laptops recorded yet during this shift.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] max-h-80 overflow-y-auto">
                  {recentSubmissions.map((record) => (
                    <div
                      key={record.id}
                      className="py-3 px-1 flex justify-between items-center text-xs row-hover-effect rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono font-bold text-[#1A1A1A] text-sm">
                            {record.studentId}
                          </strong>
                          <span className="text-[10px] font-semibold text-[#1E40AF] bg-[#DBEAFE] px-1.5 py-0.2 rounded font-mono">
                            {record.batch}
                          </span>
                          <span className="text-[10px] font-bold font-mono text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.2 rounded">
                            {record.room?.name ? `${record.room.name} #${record.seatNumber}` : 'Backup'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">
                          {record.collectionId}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] font-mono">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StandardCard>
          </div>
        </div>
      </main>
    </div>
  );
}
