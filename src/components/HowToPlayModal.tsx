/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HowToPlayModal: Clean, elegant 5-step modal guide for The Case of Yusuf.
 */

import React from 'react';
import { AncientFrame, AncientButton } from './AncientFrame';
import { X, Users, Search, KeyRound, BookOpen, Scale } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 'I',
      title: 'Assemble the Quorum',
      desc: 'Three players connect into a private chamber. Each player is assigned a distinct legal perspective: defending the Brothers, representing the Household, or upholding the Crown Authorities.',
      icon: Users
    },
    {
      num: 'II',
      title: 'Collect Physical Evidence',
      desc: 'Examine ancient courtroom exhibits: the torn tunic, the grain sack seals, the bundle of return money, and the silver divining goblet discovered at the border.',
      icon: Search
    },
    {
      num: 'III',
      title: 'Solve Chambers & Puzzles',
      desc: 'Decipher timeline contradictions, verify caravan travel distances between Hebron and Memphis, and unlock sealed testimonies from palace attendants.',
      icon: KeyRound
    },
    {
      num: 'IV',
      title: 'Read Classical Sources',
      desc: 'Compare how each pivotal moment is recorded across Genesis, rabbinic Midrash, and Surah Yusuf, unearthing differing witness motivations and forensic details.',
      icon: BookOpen
    },
    {
      num: 'V',
      title: 'Argue Your Case',
      desc: 'Deliver your opening arguments, cross-examine conflicting historical testimonies in three timed rounds, and cast your vote before the Pharaonic High Court.',
      icon: Scale
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <AncientFrame glow className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close instructions"
            className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 pr-6">
            <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-1">
              Trial Guidelines & Protocol
            </span>
            <h2 id="how-to-play-title" className="text-2xl sm:text-3xl font-cinzel font-bold text-[#EBD9B4]">
              How to Play
            </h2>
            <div className="w-16 h-0.5 bg-[#C9993A] mx-auto mt-2 opacity-60" />
          </div>

          {/* 5 Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex items-start gap-4 p-3.5 bg-[#1B2A41]/30 border border-[#C9993A]/20 transition-all hover:border-[#C9993A]/45 hover:bg-[#1B2A41]/50"
                >
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center border border-[#C9993A]/60 bg-[#1E140D] text-[#C9993A] font-cinzel font-bold text-sm">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-[#E8883A] shrink-0" />
                      <h3 className="font-cinzel text-base font-semibold text-[#EBD9B4]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm font-lora text-[#D9B98A]/90 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer action */}
          <div className="flex justify-center">
            <AncientButton onClick={onClose} variant="primary" className="px-8">
              Understood, Scribe
            </AncientButton>
          </div>
        </AncientFrame>
      </div>
    </div>
  );
};
