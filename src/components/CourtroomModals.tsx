/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Judge & Podium Modals for the Courtroom Hotspots
 */

import React from 'react';
import { AncientFrame, AncientButton } from './AncientFrame';
import { Player, LawyerRole, LAWYER_ROLES } from '../gameState';
import { X, Scale, Scroll, Shield, Award, Gavel, BookMarked, User, Folder, FileText, Sparkles, ExternalLink } from 'lucide-react';
import { TicketModal, getExhibitDocketCode } from './CourtroomTicket';

interface JudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const JudgeModal: React.FC<JudgeModalProps> = ({ isOpen, onClose, roomCode }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-bench-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <AncientFrame glow className="relative p-6 sm:p-8">
          <button
            onClick={onClose}
            aria-label="Close judge bench docket"
            className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6 pr-6">
            <div className="w-12 h-12 mx-auto mb-2 border border-[#C9993A]/50 bg-[#1B2A41]/50 flex items-center justify-center text-[#FFD988]">
              <Scale className="w-6 h-6" />
            </div>
            <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-1">
              Pharaonic High Magistracy · Chamber {roomCode}
            </span>
            <h2 id="judge-bench-title" className="text-2xl font-cinzel font-bold text-[#FFF4DC]">
              The High Judge's Bench
            </h2>
            <div className="w-16 h-0.5 bg-[#C9993A] mx-auto mt-2 opacity-60" />
          </div>

          <div className="space-y-4 text-xs font-lora leading-relaxed text-[#D9B98A] mb-6">
            <div className="p-3.5 bg-[#1B2A41]/40 border border-[#C9993A]/30">
              <span className="font-cinzel text-xs font-bold text-[#FFD988] block mb-1">
                Solemn Decree of the High Court:
              </span>
              <p>
                "Let all three legal counsels present their arguments without deceit. We weigh the charges of domestic betrayal against Yusuf, the alleged espionage of the eleven brothers, and the discovery of the royal divining goblet."
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-cinzel font-semibold text-[#EBD9B4]">Current Judicial Docket:</h4>
              <ul className="space-y-2">
                <li className="p-2.5 bg-[#1E140D]/70 border border-[#C9993A]/20 flex items-center justify-between">
                  <span>Charge I: Allegation of Domestic Treason (Potiphar Manor)</span>
                  <span className="text-[#C9993A] font-cinzel uppercase">Under Review</span>
                </li>
                <li className="p-2.5 bg-[#1E140D]/70 border border-[#C9993A]/20 flex items-center justify-between">
                  <span>Charge II: Espionage Across the Canaanite Border</span>
                  <span className="text-[#C9993A] font-cinzel uppercase">Awaiting Rebuttal</span>
                </li>
                <li className="p-2.5 bg-[#1E140D]/70 border border-[#C9993A]/20 flex items-center justify-between">
                  <span>Charge III: Theft of the Imperial Divining Goblet</span>
                  <span className="text-[#C9993A] font-cinzel uppercase">Evidence Sealed</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-center pt-2 border-t border-[#C9993A]/20">
            <AncientButton onClick={onClose} variant="primary" className="px-8 py-2.5 text-xs">
              Return to Courtroom
            </AncientButton>
          </div>
        </AncientFrame>
      </div>
    </div>
  );
};

import { RoomState } from '../gameState';
import { EVIDENCE_CATALOGUE, EvidenceItem } from '../evidence';

interface PodiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  room?: RoomState | null;
  onSelectEvidence?: (item: EvidenceItem) => void;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  isOpen,
  onClose,
  player,
  room,
  onSelectEvidence
}) => {
  const [selectedTicketItem, setSelectedTicketItem] = React.useState<EvidenceItem | null>(null);

  if (!isOpen) return null;

  const role: LawyerRole | undefined = player?.roleId ? LAWYER_ROLES[player.roleId] : undefined;

  // Filter exhibits claimed by this player
  const myClaimedExhibits = EVIDENCE_CATALOGUE.filter(
    (item) => room?.claims?.[item.id]?.claimedByPlayerId === player?.id
  );

  const playerScore = player ? (room?.scores?.[player.id] || 0) : 0;

  const handleOpenVoucher = (item: EvidenceItem) => {
    setSelectedTicketItem(item);
    if (onSelectEvidence) {
      onSelectEvidence(item);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="podium-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
        onClick={onClose}
      >
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
          <AncientFrame glow className="relative p-5 sm:p-7">
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close advocate podium"
              className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Advocate identity */}
            <div className="text-center mb-4 pr-6">
              <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-0.5">
                Chamber Quorum · Advocate's Podium
              </span>
              <h2 id="podium-title" className="text-2xl font-cinzel font-bold text-[#FFF4DC]">
                My Advocate's Portfolio
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs font-cinzel text-[#C9993A] mt-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-[#FFF4DC] font-semibold">{player?.name || 'Advocate'}</span>
                <span>·</span>
                <span className="text-[#FFD988] font-bold">{role ? role.title : 'Defense Quorum'}</span>
              </div>
            </div>

            {/* Simplified Points in Hand Bar */}
            <div className="mb-5 p-3.5 bg-gradient-to-r from-[#23170E] via-[#2F1C10] to-[#1E140D] border-2 border-[#C9993A]/60 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9993A]/20 border border-[#C9993A] flex items-center justify-center text-[#FFD988] shadow-[0_0_15px_rgba(201,153,58,0.3)]">
                  <Award className="w-5 h-5 text-[#FFD988]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-cinzel tracking-widest text-[#C9993A] block">
                    Points in Hand
                  </span>
                  <span className="font-cinzel text-xl sm:text-2xl font-black text-[#FFF4DC]">
                    {playerScore} <span className="text-sm font-normal text-[#D9B98A]">{playerScore === 1 ? 'Point' : 'Points'}</span>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-cinzel tracking-wider text-[#D9B98A]/70 block">
                  Exhibits Claimed
                </span>
                <span className="font-mono text-sm font-bold text-[#FFD988]">
                  {myClaimedExhibits.length} Voucher{myClaimedExhibits.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* THE FOLDER UI: EVIDENCE DOSSIER / COLLECTED TICKETS      */}
            {/* ======================================================== */}
            <div className="relative mb-5 pt-3">
              {/* Physical Folder Top Tab */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2C1C12] border-t border-l border-r border-[#C9993A]/60 rounded-t-md text-xs font-cinzel font-bold text-[#FFD988] tracking-wider shadow-xs">
                <Folder className="w-3.5 h-3.5 text-[#E8883A]" />
                <span>EVIDENCE DOSSIER FOLDER</span>
              </div>

              {/* Folder Main Body Sleeve */}
              <div className="p-3.5 sm:p-4 bg-[#18100B] border border-[#C9993A]/50 shadow-inner">
                {myClaimedExhibits.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[#C9993A]/30 bg-[#1E140D]/40">
                    <Folder className="w-10 h-10 text-[#C9993A]/40 mx-auto mb-2" />
                    <h4 className="font-cinzel text-sm text-[#FFD988] mb-1">Your Folder is Empty</h4>
                    <p className="text-xs font-lora text-[#D9B98A]/70 max-w-sm mx-auto">
                      Visit the Evidence Board during deliberation rounds to claim exhibits. Each voucher you claim will be filed here and gives you exclusive points!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                    <span className="text-[10px] font-cinzel uppercase text-[#D9B98A]/70 tracking-widest block mb-1">
                      Click any voucher sleeve to inspect the 3D ticket:
                    </span>
                    {myClaimedExhibits.map((item) => {
                      const docket = getExhibitDocketCode(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenVoucher(item)}
                          className="group p-3 bg-gradient-to-r from-[#22160E] to-[#1A110A] hover:from-[#2B1B12] hover:to-[#22160E] border border-[#C9993A]/40 hover:border-[#FFD988] flex items-center justify-between gap-3 text-xs cursor-pointer transition-all duration-200 hover:shadow-[0_0_15px_rgba(201,153,58,0.25)] hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* File / Ticket Stub Icon */}
                            <div className="w-9 h-9 shrink-0 bg-[#C9993A]/15 border border-[#C9993A]/40 flex flex-col items-center justify-center text-[9px] font-mono font-bold text-[#FFD988] group-hover:border-[#FFD988]">
                              <span className="text-[8px] text-[#C9993A]">CODE</span>
                              <span>{docket.code}</span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-cinzel text-[#C9993A] text-[10px] uppercase font-bold">
                                  {item.number} · {item.category}
                                </span>
                                <span
                                  className={`text-[9px] font-cinzel px-1.5 py-0.2 border ${
                                    item.tier === 'strong'
                                      ? 'bg-amber-950/70 border-amber-500/70 text-amber-300'
                                      : 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                                  }`}
                                >
                                  {item.tier === 'strong' ? '+3 pts · Strong' : '+1 pt · Standard'}
                                </span>
                              </div>
                              <h4 className="font-cinzel font-bold text-[#FFF4DC] group-hover:text-[#FFD988] truncate">
                                {item.title}
                              </h4>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="px-2.5 py-1 bg-[#1B2A41]/80 group-hover:bg-[#C9993A] group-hover:text-[#1E140D] border border-[#C9993A]/40 text-[#FFD988] font-cinzel text-[11px] uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Ticket</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Step Down Button */}
            <div className="flex justify-center pt-2 border-t border-[#C9993A]/20">
              <AncientButton onClick={onClose} variant="primary" className="px-8 py-2.5 text-xs">
                Step Down from Podium
              </AncientButton>
            </div>
          </AncientFrame>
        </div>
      </div>

      {/* Ticket Modal popup when clicking any voucher inside the Folder */}
      <TicketModal
        isOpen={Boolean(selectedTicketItem)}
        onClose={() => setSelectedTicketItem(null)}
        evidence={selectedTicketItem}
        claimedBy={player?.name}
        isClaimedByMe={true}
        canClaim={false}
        isQuickFlash={true}
      />
    </>
  );
};
