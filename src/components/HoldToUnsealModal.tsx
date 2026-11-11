/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HoldToUnsealModal: Interactive placeholder puzzle for exclusive evidence claiming.
 * Player must press and hold for 3 seconds to crack the seal and claim the exhibit.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EvidenceItem } from '../evidence';
import { AncientFrame, AncientButton } from './AncientFrame';
import { X, Lock, Sparkles, Award, ShieldAlert, Timer } from 'lucide-react';

interface HoldToUnsealModalProps {
  evidence: EvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartHold: () => void;
  onCancelHold: () => void;
  onCompleteClaim: () => Promise<{ success: boolean; claimedByOther?: string }>;
}

export const HoldToUnsealModal: React.FC<HoldToUnsealModalProps> = ({
  evidence,
  isOpen,
  onClose,
  onStartHold,
  onCancelHold,
  onCompleteClaim
}) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const holdIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHolding(false);
      setProgress(0);
      setClaimError(null);
      setIsSubmitting(false);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !evidence) return null;

  const startHolding = () => {
    if (isSubmitting || claimError) return;
    setHolding(true);
    setClaimError(null);
    onStartHold();

    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = window.setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setHolding(false);
        setIsSubmitting(true);

        const res = await onCompleteClaim();
        setIsSubmitting(false);

        if (!res.success) {
          setClaimError(
            res.claimedByOther
              ? `${res.claimedByOther} claimed this first!`
              : 'Another advocate claimed this exhibit first.'
          );
        }
      }
    }, 40);
  };

  const stopHolding = () => {
    if (progress >= 100) return;
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setHolding(false);
    setProgress(0);
    onCancelHold();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unseal-puzzle-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <AncientFrame glow className="relative p-6 sm:p-8 text-center">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close unseal trial"
            className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6 pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1B2A41]/60 border border-[#C9993A]/40 text-xs font-cinzel text-[#FFD988] mb-2">
              <Award className="w-3.5 h-3.5 text-[#E8883A]" />
              <span>{evidence.tier === 'strong' ? 'Strong Exhibit · 3 pts' : 'Standard Exhibit · 1 pt'}</span>
            </div>
            <h2 id="unseal-puzzle-title" className="text-xl sm:text-2xl font-cinzel font-bold text-[#FFF4DC]">
              {evidence.number}: {evidence.title}
            </h2>
            <p className="text-xs font-lora text-[#D9B98A]/80 mt-1 italic">
              Solve the trial to claim this exhibit into your personal defense hand.
            </p>
          </div>

          {claimError ? (
            /* Error if claimed by another advocate */
            <div className="p-4 bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs font-cinzel space-y-3 mb-6">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="font-bold text-sm">{claimError}</div>
              <p className="font-lora text-rose-300">
                This exhibit has been awarded to your opposing counsel. You may still inspect its contents from the evidence board.
              </p>
              <AncientButton onClick={onClose} variant="secondary" className="px-6 py-2 text-xs">
                Back to Board
              </AncientButton>
            </div>
          ) : (
            /* Hold to Unseal Interactive Button */
            <div className="space-y-6 my-4">
              <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                {/* Outer SVG Circular Progress */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#1E140D"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#C9993A"
                    strokeWidth="6"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                </svg>

                {/* The Core Hold Button */}
                <button
                  onMouseDown={startHolding}
                  onMouseUp={stopHolding}
                  onMouseLeave={stopHolding}
                  onTouchStart={startHolding}
                  onTouchEnd={stopHolding}
                  disabled={isSubmitting}
                  className={`absolute inset-4 rounded-full border-2 transition-all flex flex-col items-center justify-center cursor-pointer select-none ${
                    holding
                      ? 'bg-gradient-to-b from-[#DFB75A] to-[#B98830] border-[#FFF4DC] scale-95 shadow-[0_0_35px_rgba(232,136,58,0.8)]'
                      : 'bg-[#1E140D] border-[#C9993A] hover:border-[#FFD988] shadow-[0_0_20px_rgba(201,153,58,0.3)]'
                  }`}
                >
                  <Lock className={`w-6 h-6 mb-1 ${holding ? 'text-[#1E140D] animate-spin' : 'text-[#FFD988]'}`} />
                  <span className={`text-xs font-cinzel font-bold uppercase tracking-wider ${holding ? 'text-[#1E140D]' : 'text-[#EBD9B4]'}`}>
                    {holding ? `${progress}%` : 'Hold to Unseal'}
                  </span>
                  <span className={`text-[9px] font-lora ${holding ? 'text-[#1E140D]/80' : 'text-[#D9B98A]/60'}`}>
                    3 Seconds
                  </span>
                </button>
              </div>

              <div className="p-3 bg-[#1B2A41]/40 border border-[#C9993A]/20 text-xs font-lora text-[#D9B98A]">
                <span className="font-cinzel text-[#FFD988] block mb-0.5">Exclusive Discovery Rule:</span>
                Press and hold continuously. Once claimed, this exhibit's {evidence.points} point{evidence.points > 1 ? 's' : ''} will be permanently credited to your scoreboard!
              </div>
            </div>
          )}
        </AncientFrame>
      </div>
    </div>
  );
};
