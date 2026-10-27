'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  UserCheck,
  UserX,
  ShieldAlert,
  Phone,
  User,
  Hash,
} from 'lucide-react';
import { StandardCard } from '@/components/ui/StandardCard';

interface RapidCollectionFormProps {
  collectorDepartment: 'CSE' | 'ECE';
  activeRoomName: string | null;
  nextSeatNumber: number | null;
  isPrimaryBlockFull: boolean;
  onSuccessfulSubmission: (record: any) => void;
}

export default function RapidCollectionForm({
  collectorDepartment,
  activeRoomName,
  nextSeatNumber,
  isPrimaryBlockFull,
  onSuccessfulSubmission,
}: RapidCollectionFormProps) {
  const studentIdInputRef = useRef<HTMLInputElement>(null);

  // Form states - Student ID, Student Name, and Phone Number are MUST
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [batch, setBatch] = useState<'O23' | 'O21'>('O23'); // Persisted across entries
  const [isSubmitterPresent, setIsSubmitterPresent] = useState(true);
  const [submitterStudentId, setSubmitterStudentId] = useState('');
  const [directToBackup, setDirectToBackup] = useState(false);
  const [backupReason, setBackupReason] = useState('');

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    collectionId: string;
    studentId: string;
    studentName: string | null;
    phoneNumber: string | null;
    roomName: string | null;
    seatNumber: number | null;
    allocationStatus: string;
    timestamp: Date;
  } | null>(null);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    existingRecord?: any;
    overrideReason: string;
  } | null>(null);

  // Focus studentId input on mount and after successful save
  useEffect(() => {
    studentIdInputRef.current?.focus();
  }, [lastSaved]);

  const handleSubmit = async (e?: React.FormEvent, isOverride = false) => {
    if (e) e.preventDefault();

    const normalizedStudentId = studentId.trim().toUpperCase();
    if (!normalizedStudentId) {
      setErrorMessage('Student ID is required (e.g. O230250).');
      studentIdInputRef.current?.focus();
      return;
    }

    const normalizedStudentName = studentName.trim();
    if (!normalizedStudentName) {
      setErrorMessage('Student Name is required.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 10) {
      setErrorMessage('A valid 10-digit Phone Number is required.');
      return;
    }

    if (!isSubmitterPresent && !submitterStudentId.trim()) {
      setErrorMessage('Physical Submitter Student ID is required when registered student is not present.');
      return;
    }

    if (isOverride && (!duplicateWarning?.overrideReason || duplicateWarning.overrideReason.trim().length < 3)) {
      setErrorMessage('Please provide an administrative reason for overriding the duplicate warning.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const payload: any = {
        studentId: normalizedStudentId,
        studentName: normalizedStudentName,
        phoneNumber: cleanedPhone,
        batch,
        isSubmitterPresent,
        submitterStudentId: isSubmitterPresent ? undefined : submitterStudentId.trim().toUpperCase(),
        idempotencyKey,
        directToBackup: directToBackup || isPrimaryBlockFull,
        backupReason: backupReason.trim() || undefined,
      };

      if (isOverride && duplicateWarning) {
        payload.allowDuplicateOverride = true;
        payload.duplicateReason = duplicateWarning.overrideReason.trim();
      }

      const res = await fetch('/api/collection/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateWarning) {
        setDuplicateWarning({
          show: true,
          existingRecord: data.existingRecord,
          overrideReason: '',
        });
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register laptop');
      }

      // Successful save
      setLastSaved({
        collectionId: data.record.collectionId,
        studentId: data.record.studentId,
        studentName: data.record.studentName,
        phoneNumber: data.record.phoneNumber,
        roomName: data.record.roomName,
        seatNumber: data.record.seatNumber,
        allocationStatus: data.record.allocationStatus,
        timestamp: new Date(),
      });

      // Reset entry fields while keeping batch choice
      setStudentId('');
      setStudentName('');
      setPhoneNumber('');
      setSubmitterStudentId('');
      setIsSubmitterPresent(true);
      setDuplicateWarning(null);

      onSuccessfulSubmission(data.record);

      setTimeout(() => {
        studentIdInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardCard
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                collectorDepartment === 'CSE'
                  ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                  : 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]'
              }`}
            >
              {collectorDepartment} Station
            </span>
            <span className="text-xs font-bold text-[#7A7772] uppercase tracking-wider">
              Rapid Collection Form
            </span>
          </div>

          {directToBackup || isPrimaryBlockFull ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
              <span>Target: Backup Room</span>
            </div>
          ) : activeRoomName && nextSeatNumber ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              <span>Target: Room {activeRoomName} • Seat #{nextSeatNumber}</span>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status text */}
        <p className="text-xs text-[#6B7280]">
          {isPrimaryBlockFull ? (
            <span className="text-amber-800 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              All rooms in primary queue are full → Automatically allocating into <strong>Backup Room</strong>
            </span>
          ) : directToBackup ? (
            <span className="text-amber-800 font-semibold flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-600"></span>
              Manual Backup Mode Enabled → Allocating directly into <strong>Backup Room</strong>
            </span>
          ) : activeRoomName ? (
            <span>
              Laptops are sequentially allocated in room{' '}
              <strong className="text-[#1A1A1A] font-semibold">{activeRoomName}</strong> at seat{' '}
              <strong className="text-[#16A34A] font-semibold">#{nextSeatNumber ?? 1}</strong>.
            </span>
          ) : (
            <span className="text-[#9CA3AF]">
              Claim a room from the queue above to activate sequential seat allocation, or select &ldquo;Manual Add to Backup Room&rdquo; below.
            </span>
          )}
        </p>

        {/* Freshly Accepted Receipt Banner */}
        {lastSaved && (
          <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-3.5 flex items-start justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#14532D]">
                    Laptop Registered
                  </span>
                  <span className="text-xs font-mono font-bold text-[#15803D] bg-white px-2 py-0.5 rounded-md border border-[#BBF7D0]">
                    {lastSaved.collectionId}
                  </span>
                </div>
                <div className="text-xs text-[#166534]">
                  <strong>{lastSaved.studentName}</strong> (<span className="font-mono">{lastSaved.studentId}</span> • Ph: {lastSaved.phoneNumber}) →{' '}
                  <strong className="text-[#14532D]">
                    {lastSaved.allocationStatus === 'BACKUP'
                      ? `Backup Room (Seat #${lastSaved.seatNumber || '—'})`
                      : `${lastSaved.roomName} (Seat #${lastSaved.seatNumber})`}
                  </strong>
                </div>
              </div>
            </div>
            <button
              onClick={() => setLastSaved(null)}
              className="text-xs text-[#166534] hover:text-[#14532D] p-1 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Duplicate Warning Box */}
        {duplicateWarning?.show && (
          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#92400E]">Student ID Already Registered</h4>
                <p className="text-xs text-[#B45309] mt-0.5">
                  Student <strong className="font-mono font-bold">{studentId.trim().toUpperCase()}</strong> was previously registered under Collection ID{' '}
                  <strong className="font-mono">{duplicateWarning.existingRecord?.collectionId}</strong>.
                </p>
                {duplicateWarning.existingRecord && (
                  <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-[#FDE68A] text-[#1A1A1A] flex flex-wrap gap-x-4 gap-y-1">
                    <span>Room: <strong>{duplicateWarning.existingRecord.roomName || 'Backup'}</strong></span>
                    <span>Seat: <strong>#{duplicateWarning.existingRecord.seatNumber || '—'}</strong></span>
                    <span>Time: <strong>{new Date(duplicateWarning.existingRecord.createdAt).toLocaleTimeString()}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#FDE68A]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#92400E] mb-1">
                Audited Exception Reason:
              </label>
              <input
                type="text"
                value={duplicateWarning.overrideReason}
                onChange={(e) =>
                  setDuplicateWarning({ ...duplicateWarning, overrideReason: e.target.value })
                }
                placeholder="e.g. Authorized duplicate replacement with HOD approval"
                className="w-full text-xs p-2.5 bg-white border border-[#FDE68A] rounded-xl focus:ring-2 focus:ring-[#D97706]/20 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="btn-interaction px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer"
              >
                Cancel / Verify ID
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(undefined, true)}
                disabled={isSubmitting || !duplicateWarning.overrideReason.trim()}
                className="btn-interaction px-4 py-1.5 text-xs font-bold text-white bg-[#D97706] hover:bg-[#B45309] rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {isSubmitting ? 'Overriding...' : 'Confirm Audited Exception'}
              </button>
            </div>
          </div>
        )}

        {/* Rapid Collection Form Fields */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Row 1: Student ID & Batch */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Student ID (MUST) */}
            <div className="md:col-span-8">
              <label
                htmlFor="studentId"
                className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
              >
                Student ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="studentId"
                  ref={studentIdInputRef}
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. O230250"
                  autoComplete="off"
                  className="w-full text-base sm:text-lg font-mono font-bold px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-[#9CA3AF] transition-all"
                />
              </div>
            </div>

            {/* Preserved Batch Selector */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Batch <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F2F0] rounded-xl border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setBatch('O23')}
                  className={`btn-interaction py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    batch === 'O23'
                      ? 'bg-[#030213] text-white shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  O23
                </button>
                <button
                  type="button"
                  onClick={() => setBatch('O21')}
                  className={`btn-interaction py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    batch === 'O21'
                      ? 'bg-[#030213] text-white shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  O21
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Student Name (MUST) & Phone Number (MUST) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Student Name */}
            <div className="md:col-span-6">
              <label
                htmlFor="studentName"
                className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
              >
                Student Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="studentName"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="md:col-span-6">
              <label
                htmlFor="phoneNumber"
                className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210 (10 digits)"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] focus:bg-white focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submitter Verification Row */}
          <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#4B5563]">Physical Submitter:</span>
              <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setIsSubmitterPresent(true)}
                  className={`btn-interaction flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    isSubmitterPresent
                      ? 'bg-[#030213] text-white shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Student Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubmitterPresent(false)}
                  className={`btn-interaction flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    !isSubmitterPresent
                      ? 'bg-[#B45309] text-white shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Friend / Proxy</span>
                </button>
              </div>
            </div>

            {!isSubmitterPresent && (
              <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in">
                <span className="text-[#B45309] font-semibold whitespace-nowrap">Proxy ID:</span>
                <input
                  type="text"
                  required
                  value={submitterStudentId}
                  onChange={(e) => setSubmitterStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. O230112"
                  className="font-mono text-xs uppercase px-2.5 py-1 bg-white border border-[#FDE68A] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#D97706]/20"
                />
              </div>
            )}
          </div>

          {/* Manual Backup Room Option */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              directToBackup || isPrimaryBlockFull
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                <input
                  type="checkbox"
                  checked={directToBackup || isPrimaryBlockFull}
                  disabled={isPrimaryBlockFull}
                  onChange={(e) => setDirectToBackup(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1A1A1A]">
                      {isPrimaryBlockFull ? 'Automatic Backup Mode Active' : 'Manually Add to Backup Room'}
                    </span>
                    {(directToBackup || isPrimaryBlockFull) && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300 font-mono">
                        Backup Room
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    {isPrimaryBlockFull
                      ? 'All rooms in primary queue are full. Submissions automatically allocate sequential seats in Backup room.'
                      : 'Route this laptop directly to Backup room instead of active sequential room.'}
                  </p>
                </div>
              </label>
            </div>

            {directToBackup && !isPrimaryBlockFull && (
              <div className="mt-2.5 pt-2.5 border-t border-amber-200 animate-in fade-in">
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Reason for routing to Backup Room (Optional):
                </label>
                <input
                  type="text"
                  value={backupReason}
                  onChange={(e) => setBackupReason(e.target.value)}
                  placeholder="e.g. Special holding, pending verification, overflow reserve"
                  className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-[#1A1A1A]"
                />
              </div>
            )}
          </div>

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!activeRoomName && !isPrimaryBlockFull && !directToBackup)}
            className="btn-interaction w-full py-3 bg-[#030213] hover:bg-[#030213]/90 text-white font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Recording in Database...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {directToBackup || isPrimaryBlockFull
                    ? 'Record in Backup Room'
                    : 'Record Laptop & Assign Seat'}
                </span>
                <kbd className="hidden sm:inline-block text-[11px] font-mono font-medium bg-white/20 text-white px-2 py-0.5 rounded ml-2">
                  ↵ Enter
                </kbd>
              </>
            )}
          </button>
        </form>
      </div>
    </StandardCard>
  );
}
