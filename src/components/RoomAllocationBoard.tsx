'use client';

import React, { useState } from 'react';
import {
  LayoutGrid,
  CheckCircle2,
  Clock,
  User,
  Eye,
  Search,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { StandardCard } from '@/components/ui/StandardCard';

export interface RoomData {
  id: string;
  block: 'E' | 'F' | 'BACKUP';
  name: string;
  roomOrder: number;
  capacity: number;
  occupiedSeats: number;
  vacantSeats: number;
  occupancyPercentage: number;
  isFull: boolean;
  activeClaim: {
    id: string;
    collectorId: string;
    collectorName: string;
    collectorUsername: string;
    claimedAt: string;
  } | null;
  claimStatus: 'ACTIVE' | 'COMPLETED' | 'UNCLAIMED';
}

interface RoomAllocationBoardProps {
  rooms: RoomData[];
  onSelectRoom?: (room: RoomData) => void;
  isAdmin?: boolean;
}

export default function RoomAllocationBoard({ rooms, onSelectRoom, isAdmin = false }: RoomAllocationBoardProps) {
  const [selectedBlock, setSelectedBlock] = useState<'ALL' | 'E' | 'F' | 'BACKUP'>('ALL');
  const [inspectorRoom, setInspectorRoom] = useState<RoomData | null>(null);
  const [roomDetails, setRoomDetails] = useState<any[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [seatSearch, setSeatSearch] = useState('');

  const filteredRooms = rooms.filter((r) => {
    if (selectedBlock === 'ALL') return true;
    if (selectedBlock === 'BACKUP') return r.block === 'BACKUP' || r.name === 'Backup' || r.name === 'Backup Laptops';
    return r.block === selectedBlock;
  });

  const eRooms = rooms.filter((r) => r.block === 'E' && r.name !== 'Backup');
  const fRooms = rooms.filter((r) => r.block === 'F');
  const backupRooms = rooms.filter((r) => r.block === 'BACKUP' || r.name === 'Backup' || r.name === 'Backup Laptops');

  const eTotalCapacity = eRooms.reduce((sum, r) => sum + r.capacity, 0);
  const eTotalOccupied = eRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);

  const fTotalCapacity = fRooms.reduce((sum, r) => sum + r.capacity, 0);
  const fTotalOccupied = fRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);

  const backupTotalOccupied = backupRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);
  const backupTotalCapacity = backupRooms.reduce((sum, r) => sum + r.capacity, 0);

  const handleInspectRoom = async (room: RoomData) => {
    setInspectorRoom(room);
    setIsLoadingDetails(true);
    setRoomDetails(null);

    try {
      const res = await fetch(`/api/collection/history?roomId=${room.id}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setRoomDetails(data);
      }
    } catch (err) {
      console.error('Failed to load room seat details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Block Summaries & Filter Header inside StandardCard */}
      <StandardCard
        header={
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#7A7772] uppercase tracking-wider">
              Room Sequencing & Live Status
            </span>
            <span className="text-xs font-mono text-[#9CA3AF]">
              Order 1..13 (E Block) • Order 1..5 (F Block)
            </span>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#1A1A1A] text-base sm:text-lg tracking-tight">
                Authoritative Room Allocation Board
              </h3>
              <span className="text-xs bg-[#F4F2F0] text-[#4B5563] font-bold px-2.5 py-0.5 rounded-md border border-[#E5E7EB]">
                {rooms.length} Rooms
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              E Block (420 Seats) • F Block (141 Seats) • Backup Room ({backupTotalOccupied} Recorded)
            </p>
          </div>

          {/* Tab Filter Pills */}
          <div className="inline-flex rounded-xl border border-[#E5E7EB] p-1 bg-[#F4F2F0] text-xs font-semibold flex-wrap gap-1">
            <button
              onClick={() => setSelectedBlock('ALL')}
              className={`btn-interaction px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedBlock === 'ALL'
                  ? 'bg-white text-[#1A1A1A] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setSelectedBlock('E')}
              className={`btn-interaction px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedBlock === 'E'
                  ? 'bg-[#030213] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              E Block (CSE • {eTotalOccupied}/{eTotalCapacity})
            </button>
            <button
              onClick={() => setSelectedBlock('F')}
              className={`btn-interaction px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedBlock === 'F'
                  ? 'bg-[#030213] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1A1A1A]'
              }`}
            >
              F Block (ECE • {fTotalOccupied}/{fTotalCapacity})
            </button>
            <button
              onClick={() => setSelectedBlock('BACKUP')}
              className={`btn-interaction px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedBlock === 'BACKUP'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-amber-800'
              }`}
            >
              Backup Room ({backupTotalOccupied} Laptops)
            </button>
          </div>
        </div>
      </StandardCard>

      {/* Grid of rooms in configured sequence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const isEBlock = room.block === 'E';
          const isBackup = room.block === 'BACKUP' || room.name === 'Backup' || room.name === 'Backup Laptops';
          return (
            <div
              key={room.id}
              className={`bg-[#F4F2F0] rounded-[22px] p-[8px] pb-[14px] flex flex-col justify-between hover-card-effect animate-card-entrance ${
                isBackup
                  ? 'ring-2 ring-amber-400/60 shadow-xs'
                  : room.activeClaim
                  ? 'ring-2 ring-blue-500/40'
                  : ''
              }`}
            >
              <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-4 sm:p-5 space-y-3.5 shadow-2xs flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Header: Order & Name */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                          {isBackup ? 'Backup Queue' : `Order #${room.roomOrder}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                            isBackup
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isEBlock
                              ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                              : 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]'
                          }`}
                        >
                          {isBackup ? 'Universal Backup' : `${room.block} Block (${isEBlock ? 'CSE' : 'ECE'})`}
                        </span>
                      </div>
                      <h4 className="font-bold text-[#1A1A1A] text-lg sm:text-xl tracking-tight mt-1.5 flex items-center gap-1.5">
                        {room.name}
                        {isBackup && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Reserve
                          </span>
                        )}
                      </h4>
                    </div>

                    <span className="text-xs font-semibold text-[#6B7280] font-mono">
                      {room.capacity} Cap
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div>
                    <div className="flex justify-between items-baseline text-xs mb-1.5">
                      <span className="font-medium text-[#4B5563]">
                        Seats: <strong className="font-bold text-[#1A1A1A] font-mono">{room.occupiedSeats}</strong> / {room.capacity}
                      </span>
                      <span className="font-mono text-[#6B7280] font-bold text-xs">
                        {room.occupancyPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          room.isFull
                            ? 'bg-[#16A34A]'
                            : room.occupancyPercentage > 60
                            ? 'bg-blue-600'
                            : 'bg-[#030213]'
                        }`}
                        style={{ width: `${Math.min(room.occupancyPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#6B7280] mt-1.5">
                      <span>Vacant: <strong className="text-[#1A1A1A] font-mono">{room.vacantSeats}</strong></span>
                      <span className="font-bold text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                        {room.isFull ? 'Completed' : 'Available'}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-2 border-t border-[#E5E7EB]">
                    {room.activeClaim ? (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        <div className="truncate">
                          <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider block">Active Collector</span>
                          <strong className="truncate font-bold block">{room.activeClaim.collectorName}</strong>
                        </div>
                      </div>
                    ) : room.isFull ? (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-xs text-[#15803D]">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        <span className="font-semibold">All {room.capacity} Seats Filled</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#6B7280]">
                        <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                        <span>Ready in Sequence</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspect Action */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => handleInspectRoom(room)}
                    className="btn-interaction w-full py-2 text-xs font-semibold text-[#1A1A1A] bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Inspect Seat Map</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Numbered Seat Inspector Modal */}
      {inspectorRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F4F2F0] rounded-t-[24px]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-[#1A1A1A] text-lg">
                    Room {inspectorRoom.name} Seat Map
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#DBEAFE] text-[#1E40AF]">
                    {inspectorRoom.block} Block • #{inspectorRoom.roomOrder}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Capacity: {inspectorRoom.capacity} Seats • Occupied:{' '}
                  <strong className="text-[#1A1A1A]">{inspectorRoom.occupiedSeats}</strong> • Vacant:{' '}
                  <strong className="text-[#16A34A]">{inspectorRoom.vacantSeats}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectorRoom(null)}
                className="btn-interaction p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by Student ID (e.g. O230250) or Collection ID..."
                  value={seatSearch}
                  onChange={(e) => setSeatSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:bg-white"
                />
              </div>

              {/* Numbered Seats Matrix */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#6B7280] font-medium">
                  <span>Numbered Seats (1 to {inspectorRoom.capacity})</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                      <span className="w-2.5 h-2.5 bg-[#16A34A] rounded-full" /> Occupied
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280]">
                      <span className="w-2.5 h-2.5 bg-[#E5E7EB] rounded-full" /> Vacant
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {Array.from({ length: inspectorRoom.capacity }, (_, i) => i + 1).map((seatNum) => {
                    const laptop = roomDetails?.find((l) => l.seatNumber === seatNum);
                    const isOccupied = !!laptop;
                    const matchesSearch =
                      !seatSearch ||
                      (laptop &&
                        (laptop.studentId.toLowerCase().includes(seatSearch.toLowerCase()) ||
                          laptop.collectionId.toLowerCase().includes(seatSearch.toLowerCase())));

                    return (
                      <div
                        key={seatNum}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          !matchesSearch ? 'opacity-25' : ''
                        } ${
                          isOccupied
                            ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#14532D] shadow-2xs'
                            : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold text-[#6B7280]">
                          #{seatNum}
                        </div>
                        <div className="text-xs font-bold font-mono truncate mt-0.5">
                          {isOccupied ? laptop.studentId : 'Vacant'}
                        </div>
                        {isOccupied && (
                          <div className="text-[9px] text-[#15803D] truncate font-semibold mt-0.5">
                            {laptop.batch}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details List */}
              {roomDetails && roomDetails.length > 0 && (
                <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-[#7A7772]">
                    Allocated Students in {inspectorRoom.name} ({roomDetails.length})
                  </h5>
                  <div className="divide-y divide-[#E5E7EB] max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-xl bg-white">
                    {roomDetails.map((item) => (
                      <div key={item.id} className="p-3 text-xs flex justify-between items-center row-hover-effect">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1A1A1A] font-mono text-sm">{item.studentId}</span>
                            <span className="text-xs font-mono font-bold bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-md">
                              Seat #{item.seatNumber}
                            </span>
                            <span className="text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                              {item.batch}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">{item.collectionId}</div>
                        </div>
                        <div className="text-right text-[11px] text-[#6B7280]">
                          <div className="font-medium text-[#1A1A1A]">{item.collector?.name}</div>
                          <div className="font-mono">{new Date(item.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F4F2F0] rounded-b-[24px] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectorRoom(null)}
                className="btn-interaction px-4 py-2 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer shadow-2xs"
              >
                Close Seat Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
