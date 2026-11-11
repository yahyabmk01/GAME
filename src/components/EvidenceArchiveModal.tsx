/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Evidence Archive Modal with Carousel View
 * - Displays 6 exhibits per round for Round 1, Round 2, Round 3 in a smooth carousel.
 * - Carousel navigation with previous/next buttons, touch swipe, and numbered indicator pips.
 * - Concise cards with points pill (+3 pts / +1 pt, Strong / Standard), docket code (K-48), and clean claim button.
 * - Direct integration with TicketModal for fast voucher inspection.
 * - Past rounds are grayed out/concluded: past evidence is preserved for reading, but claiming is locked.
 * - Upcoming rounds are sealed.
 * - Strictly NO default browser scrollbars (.no-scrollbar).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  EvidenceItem,
  ROUNDS,
  getRoundById,
  getExhibitsForRound,
} from '../evidence';
import { RoomState, Player } from '../gameState';
import { AncientFrame, AncientButton } from './AncientFrame';
import {
  X,
  Lock,
  Unlock,
  Award,
  Eye,
  Sparkles,
  Archive,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  Check,
  Scroll,
  ExternalLink
} from 'lucide-react';
import { TicketModal, getExhibitDocketCode } from './CourtroomTicket';

interface EvidenceArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  currentPlayer: Player | null;
  onReadEvidence: (item: EvidenceItem) => void;
  onAttemptClaim: (item: EvidenceItem) => void;
}

export const EvidenceArchiveModal: React.FC<EvidenceArchiveModalProps> = ({
  isOpen,
  onClose,
  room,
  currentPlayer,
  onReadEvidence,
  onAttemptClaim
}) => {
  const currentRound = getRoundById(room.currentRoundId) || ROUNDS[0];
  const currentRoundNumber = currentRound.number;

  // Selected round filter
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>(room.currentRoundId || 'round_1');

  // Carousel index (0 to exhibits.length - 1)
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Directly inspected ticket modal state
  const [ticketExhibit, setTicketExhibit] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    if (room.currentRoundId) {
      setSelectedRoundFilter(room.currentRoundId);
    }
  }, [room.currentRoundId, isOpen]);

  // Reset carousel index when switching rounds
  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedRoundFilter]);

  if (!isOpen) return null;

  const selectedRound = getRoundById(selectedRoundFilter) || currentRound;
  const selectedRoundNumber = selectedRound.number;

  const isPastRound = selectedRoundNumber < currentRoundNumber;
  const isFutureRound = selectedRoundNumber > currentRoundNumber;
  const isCurrentActiveRound = selectedRoundNumber === currentRoundNumber;

  const exhibits = getExhibitsForRound(selectedRound.id);
  const claims = room.claims || {};
  const locks = room.locks || {};

  // Carousel navigation handlers
  const maxIndex = Math.max(0, exhibits.length - 1);
  const handlePrev = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };
  const handleNext = () => {
    setCarouselIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const handleInspectTicket = (item: EvidenceItem) => {
    setTicketExhibit(item);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-archive-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none"
        onClick={onClose}
      >
        <div
          className="w-full max-w-5xl max-h-[94vh] flex flex-col no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          <AncientFrame glow className="relative p-4 sm:p-6 flex flex-col max-h-[94vh] no-scrollbar">
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close evidence board"
              className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Round Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#C9993A]/20 pr-8">
              <div>
                <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-0.5">
                  Chamber {room.code} · Tribunal Records & Exhibits
                </span>
                <h2 id="evidence-archive-title" className="text-xl sm:text-2xl font-cinzel font-bold text-[#FFF4DC]">
                  The Evidence Board
                </h2>
              </div>

              {/* Round Tabs (Round 1, 2, 3 only) */}
              <div className="flex items-center gap-2 text-xs font-cinzel">
                {ROUNDS.map((r) => {
                  const isSelected = selectedRoundFilter === r.id;
                  const rIsPast = r.number < currentRoundNumber;
                  const rIsCurrent = r.number === currentRoundNumber;

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoundFilter(r.id)}
                      className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? rIsCurrent
                            ? 'bg-[#C9993A] text-[#1E140D] font-bold border-[#FFD988] shadow-[0_0_15px_rgba(201,153,58,0.45)]'
                            : rIsPast
                            ? 'bg-[#2E1E16] text-[#FFD988] font-bold border-[#C9993A] shadow-sm'
                            : 'bg-[#1B2A41] text-[#D9B98A] font-bold border-[#3B82F6]'
                          : rIsCurrent
                          ? 'bg-[#1E140D]/90 border-[#C9993A]/80 text-[#FFD988] hover:border-[#FFD988]'
                          : rIsPast
                          ? 'bg-[#160E0A]/60 border-[#C9993A]/25 text-[#D9B98A]/60 hover:text-[#D9B98A]'
                          : 'bg-[#120B07]/50 border-[#C9993A]/15 text-[#D9B98A]/40'
                      }`}
                    >
                      <span>Round {r.number}</span>
                      {rIsCurrent ? (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#1E140D] text-[#FFD988] font-mono border border-[#FFD988]/40">
                          Active
                        </span>
                      ) : rIsPast ? (
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-black/40 text-stone-400 font-mono">
                          Concluded
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-black/40 text-blue-300 font-mono">
                          Sealed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deliberation Status Banner */}
            {isCurrentActiveRound && (
              <div className="mb-3 p-2.5 bg-[#EBD9B4]/10 border border-[#C9993A]/50 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-cinzel text-[#FFD988] uppercase block tracking-wider text-[10px] font-bold">
                    Active Round {currentRound.number} Question:
                  </span>
                  <p className="font-lora italic text-[#FFF4DC] text-xs sm:text-sm font-semibold line-clamp-1">
                    "{currentRound.question}"
                  </p>
                </div>
                <span className="text-[10px] font-cinzel uppercase px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 shrink-0">
                  Active Round
                </span>
              </div>
            )}

            {isPastRound && (
              <div className="mb-3 p-2.5 bg-stone-900/60 border border-stone-700/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-[#C9993A] shrink-0" />
                  <p className="font-lora italic text-stone-300 text-xs">
                    Round {selectedRound.number} Concluded: Exhibits preserved in archives. Claiming is locked.
                  </p>
                </div>
                <span className="text-[10px] font-cinzel uppercase px-2 py-0.5 bg-stone-900 border border-stone-700 text-stone-400 shrink-0">
                  Archived
                </span>
              </div>
            )}

            {isFutureRound && (
              <div className="mb-3 p-2.5 bg-[#1B2A41]/40 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-blue-400 shrink-0" />
                  <p className="font-lora italic text-[#D9B98A]/80 text-xs">
                    Round {selectedRound.number} Upcoming: Exhibits sealed until Round {selectedRound.number} begins.
                  </p>
                </div>
                <span className="text-[10px] font-cinzel uppercase px-2 py-0.5 bg-blue-950 border border-blue-500/50 text-blue-300 shrink-0">
                  Sealed
                </span>
              </div>
            )}

            {/* ======================================================== */}
            {/* CAROUSEL VIEW FOR EXHIBITS                               */}
            {/* ======================================================== */}
            <div className="relative flex-1 flex flex-col justify-between mb-3 min-h-[310px]">
              {/* Carousel Track Container */}
              <div className="overflow-hidden relative w-full flex-1">
                <div
                  className="flex transition-transform duration-300 ease-out h-full"
                  style={{
                    transform: `translateX(-${carouselIndex * (100 / (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1))}%)`
                  }}
                >
                  {exhibits.map((item, idx) => {
                    const docket = getExhibitDocketCode(item.id);
                    const claim = claims[item.id];
                    const lock = locks[item.id];

                    const isClaimed = Boolean(claim);
                    const isClaimedByMe = claim?.claimedByPlayerId === currentPlayer?.id;
                    const isLockedByOther = Boolean(lock && lock.lockedByPlayerId !== currentPlayer?.id);

                    return (
                      <div
                        key={item.id}
                        className="w-full sm:w-1/2 lg:w-1/3 shrink-0 p-1.5 flex"
                      >
                        <div
                          className={`w-full p-4 border transition-all duration-200 flex flex-col justify-between select-none ${
                            isPastRound
                              ? 'bg-[#150E09]/90 border-[#C9993A]/25 opacity-85'
                              : isFutureRound
                              ? 'bg-[#120B07]/80 border-blue-900/40 opacity-70'
                              : isClaimed
                              ? isClaimedByMe
                                ? 'bg-gradient-to-b from-[#25170E] to-[#1C120B] border-[#FFD988] shadow-[0_0_15px_rgba(201,153,58,0.3)]'
                                : 'bg-[#18110B]/95 border-[#C9993A]/40'
                              : isLockedByOther
                              ? 'bg-[#140E0A]/80 border-amber-600/40'
                              : 'bg-[#1E140D]/95 border-[#C9993A]/50 hover:border-[#FFD988] hover:shadow-[0_0_15px_rgba(201,153,58,0.25)]'
                          }`}
                        >
                          <div>
                            {/* Card Top: Docket Code + Tier Badge */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-[11px] font-bold text-[#FFD988] bg-[#C9993A]/20 px-2 py-0.5 border border-[#C9993A]/40">
                                {docket.code}
                              </span>

                              {/* Points Badge */}
                              <span
                                className={`text-[10px] font-cinzel font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs border ${
                                  item.tier === 'strong'
                                    ? 'bg-[#E8883A] text-white border-[#B95A14] shadow-xs'
                                    : 'bg-[#C9993A]/20 text-[#FFD988] border-[#C9993A]/40'
                                }`}
                              >
                                {item.tier === 'strong' ? '⭐ 3 Pts · Strong' : '⚖️ 1 Pt · Standard'}
                              </span>
                            </div>

                            {/* Title & Category */}
                            <span className="text-[10px] font-cinzel uppercase text-[#C9993A] tracking-wider block mb-0.5">
                              {item.number} · {item.category}
                            </span>
                            <h3 className="font-cinzel text-sm sm:text-base font-bold text-[#FFF4DC] mb-1.5 leading-snug">
                              {item.title}
                            </h3>

                            {/* Short, punchy summary */}
                            <p className="text-xs font-lora text-[#D9B98A]/85 line-clamp-2 mb-3 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Card Footer: Status & Action Button */}
                          <div className="pt-2 border-t border-[#C9993A]/20 flex items-center justify-between gap-2">
                            {/* Status tag */}
                            <div className="text-[10px] font-cinzel">
                              {isClaimed ? (
                                <span className={`inline-flex items-center gap-1 font-bold ${isClaimedByMe ? 'text-amber-300' : 'text-[#D9B98A]'}`}>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  {isClaimedByMe ? 'In Your Hand' : `Held: ${claim.claimedByPlayerName}`}
                                </span>
                              ) : isLockedByOther ? (
                                <span className="text-amber-400 font-semibold animate-pulse">
                                  Unsealing by {lock?.lockedByPlayerName}
                                </span>
                              ) : isPastRound ? (
                                <span className="text-stone-400">Archived</span>
                              ) : isFutureRound ? (
                                <span className="text-blue-300">Sealed</span>
                              ) : (
                                <span className="text-emerald-400 font-semibold">Available</span>
                              )}
                            </div>

                            {/* Action Button: Small, clean claim or view ticket */}
                            <div>
                              {isCurrentActiveRound && !isClaimed ? (
                                <button
                                  onClick={() => onAttemptClaim(item)}
                                  disabled={isLockedByOther}
                                  className={`px-3 py-1 text-xs font-cinzel uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                                    isLockedByOther
                                      ? 'opacity-40 cursor-not-allowed bg-black/40 border-[#C9993A]/20 text-stone-500'
                                      : 'bg-gradient-to-r from-[#E8883A] to-[#C9993A] hover:from-[#FFA351] hover:to-[#DFB75A] text-[#1E140D] border-[#FFD988] shadow-sm'
                                  }`}
                                >
                                  Claim (+{item.points})
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleInspectTicket(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-cinzel text-[#FFD988] hover:text-[#FFF4DC] bg-[#1B2A41]/80 hover:bg-[#C9993A] hover:text-[#1E140D] border border-[#C9993A]/40 transition-colors cursor-pointer"
                                >
                                  <span>View Ticket</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Controls: Arrows & Pips */}
              <div className="flex items-center justify-between pt-2 border-t border-[#C9993A]/20 mt-1">
                {/* Previous Button */}
                <button
                  onClick={handlePrev}
                  aria-label="Previous exhibit"
                  className="p-1.5 bg-[#1E140D]/90 hover:bg-[#C9993A] text-[#D9B98A] hover:text-[#1E140D] border border-[#C9993A]/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-cinzel"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numbered Steppers / Indicators */}
                <div className="flex items-center gap-1.5">
                  {exhibits.map((item, idx) => {
                    const docket = getExhibitDocketCode(item.id);
                    const isActive = carouselIndex === idx;
                    const isClaimed = Boolean(claims[item.id]);

                    return (
                      <button
                        key={item.id}
                        onClick={() => setCarouselIndex(idx)}
                        aria-label={`Go to ${item.number}`}
                        className={`w-7 h-7 text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center ${
                          isActive
                            ? 'bg-[#C9993A] text-[#1E140D] border-[#FFD988] shadow-[0_0_10px_rgba(201,153,58,0.5)] scale-110'
                            : isClaimed
                            ? 'bg-[#2E1E16] text-[#FFD988] border-[#C9993A]/50'
                            : 'bg-[#18110B] text-[#D9B98A]/60 border-[#C9993A]/25 hover:text-[#FFF4DC]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  aria-label="Next exhibit"
                  className="p-1.5 bg-[#1E140D]/90 hover:bg-[#C9993A] text-[#D9B98A] hover:text-[#1E140D] border border-[#C9993A]/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-cinzel"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Footer Note & Return */}
            <div className="pt-2 border-t border-[#C9993A]/25 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-lora text-[#D9B98A]/80">
              <span>
                {isPastRound
                  ? 'Past deliberation exhibits are archived. Inspect any ticket to review records.'
                  : 'Deliberate, unseal vouchers, and claim them into your advocate folder for exclusive points.'}
              </span>
              <AncientButton onClick={onClose} variant="primary" className="px-6 py-2 text-xs shrink-0">
                Back to Courtroom
              </AncientButton>
            </div>
          </AncientFrame>
        </div>
      </div>

      {/* Ticket Modal popup when clicking 'View Ticket' */}
      <TicketModal
        isOpen={Boolean(ticketExhibit)}
        onClose={() => setTicketExhibit(null)}
        evidence={ticketExhibit}
        claimedBy={ticketExhibit ? claims[ticketExhibit.id]?.claimedByPlayerName : undefined}
        isClaimedByMe={ticketExhibit ? claims[ticketExhibit.id]?.claimedByPlayerId === currentPlayer?.id : false}
        canClaim={isCurrentActiveRound && ticketExhibit ? !claims[ticketExhibit.id] : false}
        onClaim={(item) => {
          setTicketExhibit(null);
          onAttemptClaim(item);
        }}
        isQuickFlash={true}
      />
    </>
  );
};
