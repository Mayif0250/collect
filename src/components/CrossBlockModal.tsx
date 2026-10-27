'use client';

import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, X } from 'lucide-react';

interface CrossBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferCompleted: () => void;
}

export default function CrossBlockModal({ isOpen, onClose, onTransferCompleted }: CrossBlockModalProps) {
  const [sourceDept, setSourceDept] = useState<'CSE' | 'ECE'>('CSE');
  const destinationBlock = sourceDept === 'CSE' ? 'F' : 'E';

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    setIsLoadingPreview(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await fetch(`/api/overflow/preview?sourceDept=${sourceDept}&destinationBlock=${destinationBlock}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch overflow preview');
      }

      setPreview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!reason || reason.trim().length < 5) {
      setErrorMessage('A detailed administrative justification (minimum 5 characters) is required to authorize cross-block transfers.');
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/overflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDept,
          destinationBlock,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute cross-block transfer');
      }

      setSuccessResult(`Successfully transferred ${data.transferredCount} ${sourceDept} backup laptops to ${destinationBlock} Block!`);
      setPreview(null);
      setReason('');
      onTransferCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Transfer failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Authorize Cross-Block Overflow</h3>
              <p className="text-xs text-slate-500">
                Audited transactional allocation of backup laptops to vacant opposite-block seats
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successResult}</span>
            </div>
          )}

          {/* Direction Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Overflow Route
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSourceDept('CSE');
                  setPreview(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sourceDept === 'CSE'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span>CSE Backup</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>F Block Seats</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Primary block: E Block</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceDept('ECE');
                  setPreview(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  sourceDept === 'ECE'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span>ECE Backup</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>E Block Seats</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Primary block: F Block</div>
              </button>
            </div>
          </div>

          {/* Action to preview */}
          <button
            type="button"
            onClick={handleFetchPreview}
            disabled={isLoadingPreview}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoadingPreview ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking Vacancies & Capacity...</span>
              </>
            ) : (
              <span>Preview Transferable Allocations</span>
            )}
          </button>

          {/* Preview Details */}
          {preview && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-200">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Eligible Backup</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{preview.eligibleBackupCount}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Destination Vacancies</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{preview.destinationVacancies}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Transferable</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono">{preview.transferrableCount}</div>
                </div>
              </div>

              {preview.transferrableCount > 0 ? (
                <>
                  <div>
                    <h5 className="font-semibold text-slate-800 mb-1">
                      Proposed Sequential Assignments ({preview.proposedAssignments.length}):
                    </h5>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                      {preview.proposedAssignments.map((p: any) => (
                        <div key={p.laptopId} className="p-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold font-mono text-slate-900">{p.studentId}</span>
                            <span className="text-slate-500 font-mono text-[10px] ml-2">({p.batch})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-blue-900 font-semibold">{p.proposedRoomName}</span>
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono text-[10px] ml-1.5 font-bold">
                              Seat #{p.proposedSeatNumber}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Administrative Reason / Authorization Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Authorized by Principal to absorb CSE overflow into vacant F Block rooms"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-2 text-slate-500 font-medium">
                  No eligible backup laptops or no destination vacancies available for this route.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          {preview && preview.transferrableCount > 0 && (
            <button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={isExecuting || !reason.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExecuting ? 'Committing Transaction...' : `Confirm Transfer (${preview.transferrableCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
