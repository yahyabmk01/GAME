/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AboutModal: Project context explaining comparative theology / university origins,
 * and clarifying that the courtroom, witnesses, and clues are fictional game devices.
 */

import React from 'react';
import { AncientFrame, AncientButton } from './AncientFrame';
import { X, GraduationCap, Compass, BookMarked, ShieldAlert } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-project-title"
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
            aria-label="Close project info"
            className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 pr-6">
            <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-1">
              Scholarly Origin & Intent
            </span>
            <h2 id="about-project-title" className="text-2xl sm:text-3xl font-cinzel font-bold text-[#EBD9B4]">
              About the Project
            </h2>
            <div className="w-16 h-0.5 bg-[#C9993A] mx-auto mt-2 opacity-60" />
          </div>

          <div className="space-y-5 text-sm font-lora leading-relaxed text-[#D9B98A] mb-8">
            <div className="p-4 bg-[#1B2A41]/35 border border-[#C9993A]/25 flex items-start gap-3.5">
              <GraduationCap className="w-6 h-6 text-[#E8883A] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-cinzel text-base font-semibold text-[#EBD9B4] mb-1">
                  University Research & Comparative Study
                </h3>
                <p>
                  <strong className="text-[#FFF4DC]">The Case of Yusuf</strong> was conceived as a university academic project exploring the rich intersections, textual variations, and shared moral questions surrounding the story of Joseph / Yusuf across three major Abrahamic traditions: <span className="text-[#FFF4DC]">Judaism</span> (Genesis & Midrashic traditions), <span className="text-[#FFF4DC]">Christianity</span> (Old Testament & patristic reception), and <span className="text-[#FFF4DC]">Islam</span> (Surah Yusuf, 12th chapter of the Qur'an).
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#1E140D]/60 border border-[#C9993A]/20 flex items-start gap-3.5">
              <BookMarked className="w-5 h-5 text-[#C9993A] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-cinzel font-semibold text-[#EBD9B4] mb-1">
                  Three Lenses of Truth
                </h4>
                <p className="text-xs sm:text-sm">
                  By assigning three players different institutional and legal stakes (the repentant brothers from Canaan, the protective Egyptian noble household, and the imperial grain authorities), the game fosters deep comparative engagement rather than passive memorization.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#2A180F]/70 border border-[#E8883A]/40 flex items-start gap-3.5">
              <ShieldAlert className="w-5 h-5 text-[#E8883A] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-cinzel font-semibold text-[#FFC145] mb-1">
                  Fictional Game Devices Disclaimer
                </h4>
                <p className="text-xs sm:text-sm text-[#EBD9B4]/90">
                  While the underlying historical geography and scriptural texts are referenced with reverence and scholarly fidelity, the formal Pharaonic courtroom trial, opposing legal counsels, simulated witness depositions, and forensic puzzles are <span className="text-[#FFC145] font-semibold">fictional game devices</span> designed to facilitate collaborative debate and critical thinking.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#D9B98A]/75 pt-2 border-t border-[#C9993A]/15 font-cinzel">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C9993A]" /> Department of Comparative Religion & Humanities
              </span>
              <span>Step 1: Chamber & Lobby</span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-center">
            <AncientButton onClick={onClose} variant="primary" className="px-8">
              Return to Chamber
            </AncientButton>
          </div>
        </AncientFrame>
      </div>
    </div>
  );
};
