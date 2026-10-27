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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E7EB]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F4F2F0] rounded-t-[24px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#030213] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-sm sm:text-base">Authorize Cross-Block Overflow</h3>
              <p className="text-xs text-[#6B7280]">
                Audited transactional transfer of backup laptops to vacant opposite-block seats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-interaction p-1.5 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successResult}</span>
            </div>
          )}

          {/* Direction Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-2">
              Select Overflow Route
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSourceDept('CSE');
                  setPreview(null);
                }}
                className={`btn-interaction p-3.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                  sourceDept === 'CSE'
                    ? 'border-[#030213] bg-[#F4F2F0] ring-1 ring-[#030213]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                <div className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                  <span>CSE Backup</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>F Block Seats</span>
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Destination: ECE F Block Vacancies</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceDept('ECE');
                  setPreview(null);
                }}
                className={`btn-interaction p-3.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                  sourceDept === 'ECE'
                    ? 'border-[#030213] bg-[#F4F2F0] ring-1 ring-[#030213]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                <div className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                  <span>ECE Backup</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>E Block Seats</span>
                </div>
                <div className="text-[11px] text-[#6B7280] mt-0.5">Destination: CSE E Block Vacancies</div>
              </button>
            </div>
          </div>

          {/* Action to preview */}
          <button
            type="button"
            onClick={handleFetchPreview}
            disabled={isLoadingPreview}
            className="btn-interaction w-full py-2.5 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] text-xs font-semibold rounded-xl border border-[#E5E7EB] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
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
            <div className="space-y-3 bg-[#F4F2F0] p-4 rounded-[18px] border border-[#E5E7EB] text-xs">
              <div className="grid grid-cols-3 gap-2.5 text-center pb-3 border-b border-[#E5E7EB]">
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
                  <div className="text-[10px] text-[#6B7280] uppercase font-bold">Eligible Backup</div>
                  <div className="text-lg font-bold text-[#1A1A1A] font-mono">{preview.eligibleBackupCount}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
                  <div className="text-[10px] text-[#6B7280] uppercase font-bold">Destination Vacancies</div>
                  <div className="text-lg font-bold text-[#1A1A1A] font-mono">{preview.destinationVacancies}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
                  <div className="text-[10px] text-[#6B7280] uppercase font-bold">Transferable</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono">{preview.transferrableCount}</div>
                </div>
              </div>

              {preview.transferrableCount > 0 ? (
                <>
                  <div>
                    <h5 className="font-semibold text-[#1A1A1A] mb-1.5">
                      Proposed Sequential Assignments ({preview.proposedAssignments.length}):
                    </h5>
                    <div className="max-h-36 overflow-y-auto divide-y divide-[#E5E7EB] bg-white rounded-xl border border-[#E5E7EB]">
                      {preview.proposedAssignments.map((p: any) => (
                        <div key={p.laptopId} className="p-2.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold font-mono text-[#1A1A1A]">{p.studentId}</span>
                            <span className="text-[#6B7280] font-mono text-[10px] ml-2">({p.batch})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#030213] font-semibold">{p.proposedRoomName}</span>
                            <span className="bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-md font-mono text-[10px] ml-2 font-bold">
                              Seat #{p.proposedSeatNumber}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1">
                      Administrative Reason / Authorization Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Authorized by Principal to absorb CSE overflow into vacant F Block rooms"
                      className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#030213]/10 focus:border-[#030213] focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-3 text-[#6B7280] font-medium">
                  No eligible backup laptops or no destination vacancies available for this route.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F4F2F0] rounded-b-[24px] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-interaction px-4 py-2 text-xs font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          {preview && preview.transferrableCount > 0 && (
            <button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={isExecuting || !reason.trim()}
              className="btn-interaction px-4 py-2 text-xs font-semibold text-white bg-[#030213] hover:bg-[#030213]/90 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExecuting ? 'Committing Transaction...' : `Confirm Transfer (${preview.transferrableCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
