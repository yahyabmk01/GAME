/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable Evidence Unlock Animation & Ticket Viewer Component
 * 
 * Key behavior requested by user:
 * 1. The unsealing scroll shake & seal crack animation ONLY plays ONE TIME
 *    when unsealing an exhibit for the first time.
 * 2. If already unlocked/claimed or inspected afterwards, it skips the long animation,
 *    shows a swift 180ms golden flash, and immediately displays the Ticket UI (with K48, etc.).
 * 3. Underneath the Ticket, displays a clean action button.
 */

import React, { useState, useEffect } from 'react';
import { EvidenceItem } from '../evidence';
import { Sparkles, X } from 'lucide-react';
import { CourtroomTicket } from './CourtroomTicket';

interface EvidenceUnlockModalProps {
  evidence: EvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
  unlockedByPlayerName?: string;
  isClaimedByMe?: boolean;
  canClaim?: boolean;
  onClaim?: (item: EvidenceItem) => void;
  forceFirstTimeAnim?: boolean;
}

type AnimStage = 'initial' | 'shaking' | 'cracking' | 'ticket';

const SEEN_STORAGE_KEY = 'yusuf_unsealed_exhibits_seen';

function hasBeenUnsealedLocally(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return Array.isArray(list) && list.includes(id);
  } catch {
    return false;
  }
}

function markAsUnsealedLocally(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore storage errors
  }
}

export const EvidenceUnlockModal: React.FC<EvidenceUnlockModalProps> = ({
  evidence,
  isOpen,
  onClose,
  unlockedByPlayerName,
  isClaimedByMe = false,
  canClaim = false,
  onClaim,
  forceFirstTimeAnim = false
}) => {
  const [stage, setStage] = useState<AnimStage>('initial');
  const [isFlashActive, setIsFlashActive] = useState(false);

  useEffect(() => {
    if (!isOpen || !evidence) {
      setStage('initial');
      setIsFlashActive(false);
      return;
    }

    const alreadySeen = hasBeenUnsealedLocally(evidence.id) && !forceFirstTimeAnim;

    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (alreadySeen || prefersReduced) {
      // Fast path: quick 180ms golden flash, then straight to Ticket!
      setIsFlashActive(true);
      setStage('ticket');
      const flashTimer = setTimeout(() => setIsFlashActive(false), 200);
      return () => clearTimeout(flashTimer);
    }

    // FIRST TIME UNSEALING: Play the dramatic sacred scroll sequence once
    markAsUnsealedLocally(evidence.id);

    // Sequence timeline:
    // 0ms: initial appearance
    // 180ms: shaking scroll
    const t1 = setTimeout(() => setStage('shaking'), 180);
    // 900ms: golden light burst cracks the seal
    const t2 = setTimeout(() => setStage('cracking'), 950);
    // 1600ms: reveals the Ticket UI!
    const t3 = setTimeout(() => {
      setStage('ticket');
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 220);
    }, 1650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, evidence, forceFirstTimeAnim]);

  if (!isOpen || !evidence) return null;

  const handleSkipOrClose = () => {
    if (stage !== 'ticket') {
      setStage('ticket');
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 200);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-evidence-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={handleSkipOrClose}
    >
      {/* Background radial golden burst during cracking */}
      {stage === 'cracking' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-radial from-[#FFD988]/40 via-[#E8883A]/25 to-transparent animate-ping" />
        </div>
      )}

      {/* Quick golden flash when inspecting already unsealed ticket */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-[#FFD988]/30 pointer-events-none transition-opacity duration-200" />
      )}

      <div
        className="relative z-10 max-w-full flex flex-col items-center no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {stage !== 'ticket' ? (
          /* ======================================================== */
          /* FIRST-TIME UNSEAL: SCROLL SHAKE & SEAL CRACKING BURST   */
          /* ======================================================== */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {/* Sealed Scroll Vector Element */}
            <div
              className={`relative transition-transform duration-100 ${
                stage === 'shaking'
                  ? 'animate-[wiggle_0.15s_ease-in-out_infinite]'
                  : stage === 'cracking'
                  ? 'scale-110 filter drop-shadow-[0_0_50px_rgba(255,217,136,0.9)]'
                  : 'scale-100'
              }`}
            >
              <svg viewBox="0 0 240 180" className="w-56 h-44 sm:w-64 sm:h-52" fill="none">
                {/* Scroll Roll Cylinders */}
                <rect x="30" y="25" width="20" height="130" rx="6" fill="#A87926" stroke="#C9993A" strokeWidth="2" />
                <rect x="190" y="25" width="20" height="130" rx="6" fill="#A87926" stroke="#C9993A" strokeWidth="2" />

                {/* Rolled Parchment Body */}
                <rect x="42" y="32" width="156" height="116" fill="#EBD9B4" stroke="#C9993A" strokeWidth="1.5" />
                <line x1="55" y1="50" x2="185" y2="50" stroke="#C9993A" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                <line x1="55" y1="70" x2="185" y2="70" stroke="#C9993A" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                <line x1="55" y1="90" x2="185" y2="90" stroke="#C9993A" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                <line x1="55" y1="110" x2="185" y2="110" stroke="#C9993A" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                <line x1="55" y1="130" x2="185" y2="130" stroke="#C9993A" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

                {/* Tied Wax Ribbon */}
                <rect x="110" y="32" width="20" height="116" fill="#75221B" stroke="#481511" strokeWidth="1" />

                {/* Pharaonic / Judicial Wax Seal */}
                <circle cx="120" cy="90" r="28" fill="#9C2C23" stroke="#D9B98A" strokeWidth="2" />
                <polygon points="120,72 132,84 120,96 108,84" fill="#C9993A" />
                <circle cx="120" cy="90" r="10" fill="#75221B" />

                {/* Crack lines when cracking */}
                {stage === 'cracking' && (
                  <path
                    d="M110,75 L120,90 L115,105 L130,110 M120,90 L135,80"
                    stroke="#FFF4DC"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                )}
              </svg>

              {/* Radiant light flares during crack */}
              {stage === 'cracking' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-[#FFF4DC] animate-spin" />
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <span className="text-xs font-cinzel uppercase tracking-[0.25em] text-[#C9993A] block">
                {stage === 'cracking' ? 'Seal Shattering...' : 'Unsealing Historical Exhibit...'}
              </span>
              <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[#FFF4DC]">
                {evidence.number} · {evidence.title}
              </h3>
              <p className="text-xs font-lora text-[#D9B98A]/70 italic">
                Tap anywhere to reveal immediately
              </p>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* STAGE 4: THE COURTROOM EXHIBIT TICKET (K48 & 3D TILT)   */
          /* ======================================================== */
          <div className="flex flex-col items-center animate-fade-in w-full">
            {/* Top Close button */}
            <div className="w-full flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C9993A]/20 border border-[#C9993A]/40 text-[#FFD988] text-xs font-cinzel uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-[#E8883A]" />
                  Official Court Voucher
                </span>
                {unlockedByPlayerName && (
                  <span className="text-xs font-cinzel text-[#D9B98A]">
                    · {unlockedByPlayerName}
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                aria-label="Close ticket modal"
                className="p-1.5 bg-[#1E140D]/90 border border-[#C9993A]/40 text-[#D9B98A] hover:text-[#FFF4DC] hover:border-[#FFD988] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render 3D Ticket */}
            <div className="w-full overflow-x-auto pb-2 flex justify-center no-scrollbar">
              <CourtroomTicket
                evidence={evidence}
                claimedBy={unlockedByPlayerName}
                isClaimedByMe={isClaimedByMe}
                canClaim={canClaim}
                onClaim={onClaim ? () => onClaim(evidence) : undefined}
                width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 28, 540) : 640}
                tilt={true}
              />
            </div>

            {/* Underneath Action Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {canClaim && onClaim && (
                <button
                  onClick={() => onClaim(evidence)}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#E8883A] via-[#C9993A] to-[#A87926] hover:from-[#FFA351] hover:to-[#C9993A] text-[#1E140D] font-cinzel font-bold text-xs uppercase tracking-widest border border-[#FFD988] shadow-[0_0_20px_rgba(232,136,58,0.4)] flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#1E140D]" />
                  <span>Claim Exhibit (+{evidence.points} {evidence.points === 1 ? 'pt' : 'pts'})</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#1E140D]/90 hover:bg-[#2B1B14] text-[#D9B98A] hover:text-[#FFF4DC] font-cinzel text-xs uppercase tracking-wider border border-[#C9993A]/40 transition-colors cursor-pointer"
              >
                Return to Deliberation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
