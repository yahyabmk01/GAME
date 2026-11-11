/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoundIntroModal: Full-screen cinematic dark overlay introducing each round.
 * Displays "ROUND X", the round question in parchment styling, and a 3, 2, 1 countdown
 * before fading seamlessly into the courtroom.
 */

import React, { useState, useEffect } from 'react';
import { CourtroomRound } from '../evidence';
import { Scale, Sparkles } from 'lucide-react';

interface RoundIntroModalProps {
  round: CourtroomRound;
  isOpen: boolean;
  onComplete: () => void;
}

export const RoundIntroModal: React.FC<RoundIntroModalProps> = ({ round, isOpen, onComplete }) => {
  const [countdown, setCountdown] = useState<number>(3);
  const [fadeState, setFadeState] = useState<'visible' | 'fading'>('visible');

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setFadeState('visible');
      return;
    }

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      onComplete();
      return;
    }

    setCountdown(3);
    setFadeState('visible');

    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setFadeState('fading');
    }, 2800);
    const t4 = setTimeout(() => {
      onComplete();
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, round?.id]);

  if (!isOpen || !round) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0E0906] transition-opacity duration-700 select-none ${
        fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ancient ambient light halo */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[800px] rounded-full bg-radial from-[#E8883A]/15 via-[#C9993A]/5 to-transparent blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-6">
        {/* Emblem */}
        <div className="inline-flex items-center justify-center w-16 h-16 border border-[#C9993A]/60 bg-[#1E140D] shadow-[0_0_30px_rgba(201,153,58,0.35)]">
          <Scale className="w-8 h-8 text-[#FFD988]" />
        </div>

        {/* Round Title */}
        <div>
          <span className="text-xs uppercase font-cinzel tracking-[0.3em] text-[#C9993A] block mb-2">
            The High Courtroom of Memphis
          </span>
          <h1 className="text-4xl sm:text-6xl font-cinzel font-black tracking-wider text-[#FFD988] drop-shadow-[0_4px_25px_rgba(201,153,58,0.5)]">
            ROUND {round.number}
          </h1>
          <h2 className="text-sm sm:text-base font-cinzel tracking-widest text-[#D9B98A] mt-1 uppercase">
            {round.title}
          </h2>
        </div>

        {/* Question in Parchment Style */}
        <div className="relative mx-auto max-w-lg p-6 sm:p-8 bg-[#EBD9B4] text-[#1E140D] shadow-[0_10px_35px_rgba(0,0,0,0.8)] border-2 border-[#C9993A]">
          {/* Corner brackets */}
          <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#1E140D]" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#1E140D]" />
          <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#1E140D]" />
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#1E140D]" />

          <span className="text-[10px] font-cinzel uppercase tracking-[0.2em] text-[#7A581F] block mb-2 font-bold">
            Deliberation Question:
          </span>
          <p className="text-lg sm:text-xl font-lora italic font-semibold leading-relaxed text-[#1E140D]">
            "{round.question}"
          </p>
        </div>

        {/* Countdown */}
        <div className="pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-[#FFD988] bg-[#1E140D]/90 text-2xl font-cinzel font-bold text-[#FFD988] shadow-[0_0_20px_rgba(255,217,136,0.6)]">
            {countdown}
          </div>
          <span className="block text-[11px] font-cinzel tracking-widest text-[#D9B98A]/70 uppercase mt-2">
            Tribunal Commencing...
          </span>
        </div>
      </div>
    </div>
  );
};
