/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoundResultsModal: Displays when the round timer reaches 0:00.
 * Lists each player's claimed exhibits, points, and scoreboard.
 * Allows the host to convene the next round.
 */

import React from 'react';
import { RoomState, Player } from '../gameState';
import { CourtroomRound, EVIDENCE_CATALOGUE } from '../evidence';
import { AncientFrame, AncientButton } from './AncientFrame';
import { Trophy, Clock, Play, Award, CheckCircle2, Crown } from 'lucide-react';

interface RoundResultsModalProps {
  room: RoomState;
  currentRound: CourtroomRound;
  currentPlayer: Player | null;
  isOpen: boolean;
  onNextRound: () => void;
  onClose: () => void;
}

export const RoundResultsModal: React.FC<RoundResultsModalProps> = ({
  room,
  currentRound,
  currentPlayer,
  isOpen,
  onNextRound,
  onClose
}) => {
  if (!isOpen) return null;

  // Group claimed exhibits per player
  const playerClaims: Record<string, string[]> = {};
  for (const player of room.players) {
    playerClaims[player.id] = [];
  }

  for (const [exhibitId, claim] of Object.entries(room.claims || {})) {
    if (playerClaims[claim.claimedByPlayerId]) {
      playerClaims[claim.claimedByPlayerId].push(exhibitId);
    }
  }

  // Sort players by total score
  const sortedPlayers = [...room.players].sort((a, b) => {
    const scoreA = room.scores?.[a.id] || 0;
    const scoreB = room.scores?.[b.id] || 0;
    return scoreB - scoreA;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="times-up-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <AncientFrame glow className="relative p-6 sm:p-8 text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="w-14 h-14 mx-auto mb-3 border-2 border-red-500/70 bg-red-950/60 rounded-full flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-xs font-cinzel uppercase tracking-[0.25em] text-red-400 block mb-1">
              Tribunal Period Concluded
            </span>
            <h2 id="times-up-title" className="text-3xl sm:text-4xl font-cinzel font-black text-[#FFF4DC]">
              TIME'S UP!
            </h2>
            <p className="text-xs font-lora text-[#D9B98A] mt-1 italic">
              Round {currentRound.number}: "{currentRound.question}"
            </p>
          </div>

          {/* Results Scoreboard Cards */}
          <div className="space-y-3 mb-6">
            <span className="text-xs font-cinzel uppercase tracking-wider text-[#C9993A] block text-left">
              Advocate Deliberation Results:
            </span>

            {sortedPlayers.map((player, rank) => {
              const score = room.scores?.[player.id] || 0;
              const claimedIds = playerClaims[player.id] || [];
              const isCurrent = player.id === currentPlayer?.id;

              return (
                <div
                  key={player.id}
                  className={`p-4 border text-left transition-all ${
                    isCurrent
                      ? 'bg-[#1E140D]/95 border-[#FFD988] shadow-[0_0_20px_rgba(201,153,58,0.3)]'
                      : 'bg-[#1B2A41]/40 border-[#C9993A]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-[#C9993A]/50 bg-[#1E140D] flex items-center justify-center font-cinzel text-xs font-bold text-[#FFD988]">
                        {rank + 1}
                      </div>
                      <div>
                        <span className="font-cinzel text-sm font-bold text-[#FFF4DC]">
                          {player.name} {isCurrent && '(You)'}
                        </span>
                        {player.isHost && (
                          <span className="ml-2 text-[10px] font-cinzel uppercase text-[#E8883A] inline-flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> Host
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-[#FFC145]" />
                      <span className="font-mono text-base font-bold text-[#FFD988] tabular-nums">
                        {score} {score === 1 ? 'pt' : 'pts'}
                      </span>
                    </div>
                  </div>

                  {/* Claimed exhibits mini list */}
                  <div className="pt-2 border-t border-[#C9993A]/15 text-xs text-[#D9B98A]/80 font-lora">
                    {claimedIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11px] font-cinzel text-[#C9993A] mr-1">Claimed:</span>
                        {claimedIds.map((id) => {
                          const item = EVIDENCE_CATALOGUE.find((e) => e.id === id);
                          return (
                            <span
                              key={id}
                              className="px-2 py-0.5 bg-[#1E140D] border border-[#C9993A]/30 text-[11px] font-cinzel text-[#EBD9B4] inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              {item ? item.shortLabel : id}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="italic text-[#D9B98A]/50 text-[11px]">No exhibits claimed this round</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Host Controls */}
          <div className="pt-4 border-t border-[#C9993A]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="text-xs font-cinzel text-[#D9B98A] hover:text-[#FFF4DC] underline cursor-pointer"
            >
              Review Courtroom
            </button>

            {currentPlayer?.isHost ? (
              <AncientButton onClick={onNextRound} variant="primary" className="py-3 px-8 text-xs shadow-lg">
                <Play className="w-3.5 h-3.5 mr-1.5 inline" />
                Next Round
              </AncientButton>
            ) : (
              <span className="text-xs font-cinzel text-[#C9993A] italic">
                Awaiting presiding host to commence next round...
              </span>
            )}
          </div>
        </AncientFrame>
      </div>
    </div>
  );
};
