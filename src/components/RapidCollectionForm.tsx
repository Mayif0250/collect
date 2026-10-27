'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Send, RefreshCw, UserCheck, UserX, ShieldAlert } from 'lucide-react';

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

  // Form states
  const [studentId, setStudentId] = useState('');
  const [batch, setBatch] = useState<'O23' | 'O21'>('O23'); // Persisted across entries
  const [studentName, setStudentName] = useState('');
  const [isSubmitterPresent, setIsSubmitterPresent] = useState(true);
  const [submitterStudentId, setSubmitterStudentId] = useState('');

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    collectionId: string;
    studentId: string;
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

  // Keep studentId input focused for rapid repeated entries
  useEffect(() => {
    studentIdInputRef.current?.focus();
  }, [lastSaved]);

  const handleSubmit = async (e?: React.FormEvent, isOverride = false) => {
    if (e) e.preventDefault();

    const normalizedStudentId = studentId.trim().toUpperCase();
    if (!normalizedStudentId) {
      setErrorMessage('Please enter a Student ID.');
      studentIdInputRef.current?.focus();
      return;
    }

    if (!isSubmitterPresent && !submitterStudentId.trim()) {
      setErrorMessage('Please enter the physical submitter student ID.');
      return;
    }

    if (isOverride && (!duplicateWarning?.overrideReason || duplicateWarning.overrideReason.trim().length < 3)) {
      setErrorMessage('Please provide a legitimate reason for overriding the duplicate student ID.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Client-side generated idempotency key for safe retries
    const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const payload: any = {
        studentId: normalizedStudentId,
        batch,
        studentName: studentName.trim() || undefined,
        isSubmitterPresent,
        submitterStudentId: isSubmitterPresent ? undefined : submitterStudentId.trim().toUpperCase(),
        idempotencyKey,
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
        // Trigger duplicate resolution workflow
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

      // Successful registration!
      setLastSaved({
        collectionId: data.record.collectionId,
        studentId: data.record.studentId,
        roomName: data.record.roomName,
        seatNumber: data.record.seatNumber,
        allocationStatus: data.record.allocationStatus,
        timestamp: new Date(),
      });

      // Clear fields while PRESERVING batch selection
      setStudentId('');
      setStudentName('');
      setSubmitterStudentId('');
      setIsSubmitterPresent(true);
      setDuplicateWarning(null);

      // Notify parent dashboard to update live stats
      onSuccessfulSubmission(data.record);

      // Re-focus immediately for next student
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
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <span>Rapid Collection Entry</span>
            <span className="text-xs bg-blue-600 text-white font-mono px-2 py-0.5 rounded">
              {collectorDepartment} Branch
            </span>
          </h2>
          <p className="text-xs text-slate-300">
            {isPrimaryBlockFull
              ? 'Primary Block Full — Direct recording to Backup Inventory'
              : activeRoomName
              ? `Allocating sequentially to ${activeRoomName} (Next: Seat #${nextSeatNumber ?? 1})`
              : 'Claim a room to start sequential seat allocations'}
          </p>
        </div>
        <div className="text-right text-xs text-slate-300 font-mono">
          Press <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700">Enter</kbd> to submit
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Prominent Last Saved Confirmation Banner */}
        {lastSaved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start justify-between animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-900 uppercase">Successfully Accepted:</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{lastSaved.studentId}</span>
                  <span className="text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
                    {lastSaved.collectionId}
                  </span>
                </div>
                <div className="text-xs text-emerald-700 mt-1 flex items-center gap-2">
                  <span>
                    Location:{' '}
                    <strong>
                      {lastSaved.allocationStatus === 'BACKUP'
                        ? 'Backup Inventory'
                        : `${lastSaved.roomName} — Seat #${lastSaved.seatNumber}`}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Status: {lastSaved.allocationStatus}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setLastSaved(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Duplicate Student Verification Warning Box */}
        {duplicateWarning?.show && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Verification Warning: Duplicate Student ID</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Student ID <strong className="font-mono">{studentId.trim().toUpperCase()}</strong> was already registered in the system under Collection ID{' '}
                  <strong className="font-mono">{duplicateWarning.existingRecord?.collectionId}</strong>.
                </p>
                {duplicateWarning.existingRecord && (
                  <div className="mt-2 text-xs bg-white/75 p-2 rounded border border-amber-200 text-slate-700">
                    Location: {duplicateWarning.existingRecord.roomName || 'Backup'} (Seat #{duplicateWarning.existingRecord.seatNumber || '—'}) • Registered on:{' '}
                    {new Date(duplicateWarning.existingRecord.createdAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                Audited Reason for Exception Override:
              </label>
              <input
                type="text"
                value={duplicateWarning.overrideReason}
                onChange={(e) =>
                  setDuplicateWarning({ ...duplicateWarning, overrideReason: e.target.value })
                }
                placeholder="e.g., Replacement laptop verified with HOD approval"
                className="w-full text-xs p-2 bg-white border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel / Re-check
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(undefined, true)}
                disabled={isSubmitting || !duplicateWarning.overrideReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Overriding...' : 'Confirm Audited Exception'}
              </button>
            </div>
          </div>
        )}

        {/* Main Entry Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Student ID (Primary Focus) */}
            <div className="md:col-span-5">
              <label htmlFor="studentIdInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student ID <span className="text-red-500">*</span>
              </label>
              <input
                id="studentIdInput"
                ref={studentIdInputRef}
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder="e.g. O230250"
                autoComplete="off"
                className="w-full text-base sm:text-lg font-mono font-bold px-3.5 py-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {/* Batch Selector (Sticky) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Batch <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBatch('O23')}
                  className={`py-2 text-xs font-bold rounded transition-all ${
                    batch === 'O23'
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  O23
                </button>
                <button
                  type="button"
                  onClick={() => setBatch('O21')}
                  className={`py-2 text-xs font-bold rounded transition-all ${
                    batch === 'O21'
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  O21
                </button>
              </div>
            </div>

            {/* Student Name (Optional) */}
            <div className="md:col-span-4">
              <label htmlFor="studentNameInput" className="block text-xs font-medium text-slate-600 mb-1">
                Student Name <span className="text-slate-400 text-[10px]">(Optional)</span>
              </label>
              <input
                id="studentNameInput"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Name from ID card (optional)"
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Submitter & Exception Row */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Physical Submitter:</span>
              <button
                type="button"
                onClick={() => setIsSubmitterPresent(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-medium transition-colors ${
                  isSubmitterPresent
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Registered Student Self</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitterPresent(false)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-medium transition-colors ${
                  !isSubmitterPresent
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Friend / Proxy Submitter</span>
              </button>
            </div>

            {!isSubmitterPresent && (
              <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in">
                <span className="text-slate-600 whitespace-nowrap font-medium">Submitter ID:</span>
                <input
                  type="text"
                  required
                  value={submitterStudentId}
                  onChange={(e) => setSubmitterStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. O230112"
                  className="font-mono text-xs uppercase px-2.5 py-1.5 bg-white border border-amber-400 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!activeRoomName && !isPrimaryBlockFull)}
            className="w-full py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating & Allocating Seat...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Record Laptop & Assign Seat</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
