'use client';

import React, { useState } from 'react';
import { LayoutGrid, CheckCircle2, Clock, User, Eye, Search, X } from 'lucide-react';

export interface RoomData {
  id: string;
  block: 'E' | 'F';
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
  const [selectedBlock, setSelectedBlock] = useState<'ALL' | 'E' | 'F'>('ALL');
  const [inspectorRoom, setInspectorRoom] = useState<RoomData | null>(null);
  const [roomDetails, setRoomDetails] = useState<any[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [seatSearch, setSeatSearch] = useState('');

  // Keep strictly sorted by block and configured roomOrder
  const filteredRooms = rooms.filter((r) => {
    if (selectedBlock === 'ALL') return true;
    return r.block === selectedBlock;
  });

  const eRooms = rooms.filter((r) => r.block === 'E');
  const fRooms = rooms.filter((r) => r.block === 'F');

  const eTotalCapacity = eRooms.reduce((sum, r) => sum + r.capacity, 0);
  const eTotalOccupied = eRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);

  const fTotalCapacity = fRooms.reduce((sum, r) => sum + r.capacity, 0);
  const fTotalOccupied = fRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);

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
      {/* Block Summaries & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-900" />
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">Authoritative Room Allocation Board (18 Rooms)</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setSelectedBlock('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedBlock === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Rooms (18)
            </button>
            <button
              onClick={() => setSelectedBlock('E')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedBlock === 'E' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              E Block (CSE • {eTotalOccupied}/{eTotalCapacity})
            </button>
            <button
              onClick={() => setSelectedBlock('F')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedBlock === 'F' ? 'bg-indigo-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              F Block (ECE • {fTotalOccupied}/{fTotalCapacity})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of rooms in configured sequence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const isEBlock = room.block === 'E';
          return (
            <div
              key={room.id}
              className={`bg-white rounded-xl border transition-all duration-150 overflow-hidden shadow-2xs ${
                room.activeClaim
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : room.isFull
                  ? 'border-slate-300 bg-slate-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Header with order badge and name */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      #{room.roomOrder}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">{room.name}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isEBlock
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {room.block} Block ({isEBlock ? 'CSE' : 'ECE'})
                  </span>
                </div>

                {/* Progress bar and numbers */}
                <div>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-semibold text-slate-700">
                      Occupancy: <strong className="font-bold text-slate-900">{room.occupiedSeats}</strong> / {room.capacity}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px] font-medium">{room.occupancyPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        room.isFull
                          ? 'bg-emerald-600'
                          : room.occupancyPercentage > 60
                          ? 'bg-blue-600'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(room.occupancyPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Vacant: <strong className="text-slate-800">{room.vacantSeats}</strong> seats</span>
                    <span>{room.isFull ? 'FULL' : 'AVAILABLE'}</span>
                  </div>
                </div>

                {/* Claim Status Badge */}
                <div className="pt-2 border-t border-slate-100">
                  {room.activeClaim ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                      <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] font-semibold text-blue-600 uppercase block">Active Collector</span>
                        <strong className="truncate font-semibold">{room.activeClaim.collectorName}</strong>
                      </div>
                    </div>
                  ) : room.isFull ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">Capacity Reached & Completed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">Unclaimed & Ready in Queue</span>
                    </div>
                  )}
                </div>

                {/* Inspect button */}
                <button
                  type="button"
                  onClick={() => handleInspectRoom(room)}
                  className="w-full mt-1 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inspect Numbered Seats</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Numbered Seat Inspector Modal */}
      {inspectorRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">
                    Room {inspectorRoom.name} — Seat Inspection
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {inspectorRoom.block} Block (Order #{inspectorRoom.roomOrder})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capacity: {inspectorRoom.capacity} Seats • Occupied: {inspectorRoom.occupiedSeats} • Vacant: {inspectorRoom.vacantSeats}
                </p>
              </div>
              <button
                onClick={() => setInspectorRoom(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Student ID or Collection ID..."
                  value={seatSearch}
                  onChange={(e) => setSeatSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Numbered Seats Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Seats 1 to {inspectorRoom.capacity}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs" /> Occupied
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-slate-200 rounded-xs" /> Vacant
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
                        className={`p-2 rounded-lg border text-center transition-all ${
                          !matchesSearch ? 'opacity-30' : ''
                        } ${
                          isOccupied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold">Seat #{seatNum}</div>
                        <div className="text-xs font-bold font-mono truncate mt-0.5">
                          {isOccupied ? laptop.studentId : 'Vacant'}
                        </div>
                        {isOccupied && (
                          <div className="text-[9px] text-emerald-700 truncate font-mono">
                            {laptop.batch} • {laptop.allocationStatus}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed list if searched or loaded */}
              {roomDetails && roomDetails.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h5 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                    Assigned Laptop Details ({roomDetails.length})
                  </h5>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                    {roomDetails.map((item) => (
                      <div key={item.id} className="p-2.5 text-xs flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">{item.studentId}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              Seat #{item.seatNumber}
                            </span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              {item.batch}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.collectionId}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>{item.collector?.name}</div>
                          <div>{new Date(item.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl text-right">
              <button
                type="button"
                onClick={() => setInspectorRoom(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
