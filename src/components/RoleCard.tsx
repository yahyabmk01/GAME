/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoleCard: Visual card for the three judicial roles assigned in the courtroom.
 * Strictly adheres to no-faces rule with vector geometric SVG symbols.
 */

import React from 'react';
import { LawyerRole, Player } from '../gameState';
import { BrothersIcon, HouseholdIcon, AuthoritiesIcon } from './RoleIcons';
import { UserCheck, Shield, Sparkles } from 'lucide-react';

interface RoleCardProps {
  role: LawyerRole;
  assignedPlayer?: Player;
  isCurrentPlayer: boolean;
  onSelectDetails?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  assignedPlayer,
  isCurrentPlayer,
  onSelectDetails
}) => {
  const renderIcon = () => {
    switch (role.id) {
      case 'brothers':
        return <BrothersIcon className="w-16 h-16 sm:w-20 sm:h-20" />;
      case 'household':
        return <HouseholdIcon className="w-16 h-16 sm:w-20 sm:h-20" />;
      case 'authorities':
        return <AuthoritiesIcon className="w-16 h-16 sm:w-20 sm:h-20" />;
    }
  };

  return (
    <div
      onClick={onSelectDetails}
      className={`relative flex flex-col justify-between border transition-all duration-300 p-6 ${
        isCurrentPlayer
          ? 'bg-[#1E140D]/90 border-[#C9993A] shadow-[0_0_30px_rgba(232,136,58,0.3)] ring-1 ring-[#FFD988]/50 transform sm:-translate-y-1'
          : 'bg-[#1E140D]/75 border-[#C9993A]/30 hover:border-[#C9993A]/60 shadow-xl'
      } cursor-pointer group`}
    >
      {/* Corner Bracket Ornaments */}
      <span className={`absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 ${isCurrentPlayer ? 'border-[#FFD988]' : 'border-[#C9993A]'}`} />
      <span className={`absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 ${isCurrentPlayer ? 'border-[#FFD988]' : 'border-[#C9993A]'}`} />
      <span className={`absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 ${isCurrentPlayer ? 'border-[#FFD988]' : 'border-[#C9993A]'}`} />
      <span className={`absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 ${isCurrentPlayer ? 'border-[#FFD988]' : 'border-[#C9993A]'}`} />

      {/* Top Tag: Current Player Designation */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11px] font-cinzel uppercase tracking-widest text-[#C9993A]/90">
          Role Mandate {role.id === 'brothers' ? 'I' : role.id === 'household' ? 'II' : 'III'}
        </span>
        {isCurrentPlayer && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-cinzel font-bold text-[#1E140D] bg-gradient-to-r from-[#DFB75A] to-[#C9993A] shadow-sm">
            <Sparkles className="w-3 h-3" />
            YOUR ROLE
          </span>
        )}
      </div>

      {/* Vector SVG Icon */}
      <div className="flex justify-center my-3 group-hover:scale-105 transition-transform duration-300">
        {renderIcon()}
      </div>

      {/* Role Title */}
      <div className="text-center mb-3">
        <h3 className="font-cinzel text-lg sm:text-xl font-bold text-[#EBD9B4] group-hover:text-[#FFF4DC] transition-colors leading-tight">
          {role.title}
        </h3>
        <p className="text-xs font-cinzel tracking-wider text-[#C9993A] mt-1">
          {role.alignment}
        </p>
      </div>

      {/* Short 1-Line Description (Requested by prompt) */}
      <p className="text-sm font-lora text-[#D9B98A] text-center leading-relaxed mb-5 min-h-[44px]">
        {role.shortDescription}
      </p>

      {/* Exhibit & Assigned Player Footer */}
      <div className="pt-4 border-t border-[#C9993A]/20 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#D9B98A]/80 font-cinzel">
          <span>Primary Exhibit</span>
          <span className="text-[#FFF4DC] font-medium text-right truncate max-w-[160px]">
            {role.primaryExhibit}
          </span>
        </div>

        <div className={`p-2.5 flex items-center justify-between border ${
          isCurrentPlayer
            ? 'bg-[#C9993A]/15 border-[#C9993A]/60'
            : 'bg-[#1B2A41]/40 border-[#C9993A]/20'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <UserCheck className={`w-4 h-4 shrink-0 ${isCurrentPlayer ? 'text-[#FFD988]' : 'text-[#C9993A]'}`} />
            <span className="text-xs font-cinzel truncate text-[#EBD9B4]">
              {assignedPlayer ? assignedPlayer.name : 'Unassigned'}
            </span>
          </div>
          {assignedPlayer?.isHost && (
            <span className="text-[10px] font-cinzel uppercase tracking-wider text-[#C9993A] bg-[#1E140D] px-1.5 py-0.5 border border-[#C9993A]/40 shrink-0">
              Host
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
