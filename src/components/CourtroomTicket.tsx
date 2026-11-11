/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Courtroom Exhibit Ticket Component
 * Inspired by the Admit-One notched ticket with perforation, right-hand stub,
 * K48 watermark, 3D tilt interaction, and ancient desert court styling.
 */

import React, { useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { EvidenceItem } from '../evidence';
import { Shield, Sparkles, Check, X, Award, Scroll, Scale } from 'lucide-react';

export const REF_WIDTH = 741;
export const TICKET_GEOMETRY = {
  aspect: 741 / 425,
  cornerRadius: 24 / REF_WIDTH,
  notchRadius: 20 / REF_WIDTH,
  perforation: 560 / REF_WIDTH
};

export function getExhibitDocketCode(id: string): { code: string; watermark: string; serial: string } {
  const codes: Record<string, { code: string; watermark: string; serial: string }> = {
    exhibit_torn_tunic: { code: 'K-48', watermark: 'K48', serial: 'NO. 0048-QAMIS' },
    exhibit_chamberlain_deposition: { code: 'K-12', watermark: 'K12', serial: 'NO. 0012-AZIZ' },
    exhibit_women_banquet: { code: 'K-33', watermark: 'K33', serial: 'NO. 0033-BANQ' },
    exhibit_household_keys: { code: 'K-77', watermark: 'K77', serial: 'NO. 0077-KEYS' },
    exhibit_witness_testimony: { code: 'K-55', watermark: 'K55', serial: 'NO. 0055-TEST' },
    exhibit_prison_transfer: { code: 'K-90', watermark: 'K90', serial: 'NO. 0090-FORT' },
    exhibit_returned_silver: { code: 'S-22', watermark: 'S22', serial: 'NO. 0022-SLVR' },
    exhibit_granary_manifest: { code: 'S-44', watermark: 'S44', serial: 'NO. 0044-GRAN' },
    exhibit_camel_lead: { code: 'S-68', watermark: 'S68', serial: 'NO. 0068-LEAD' },
    exhibit_donkey_panniers: { code: 'S-71', watermark: 'S71', serial: 'NO. 0071-SACK' },
    exhibit_border_stamp: { code: 'S-83', watermark: 'S83', serial: 'NO. 0083-GOSH' },
    exhibit_guard_log: { code: 'S-99', watermark: 'S99', serial: 'NO. 0099-GRD' },
    exhibit_golden_goblet: { code: 'C-07', watermark: 'C07', serial: 'NO. 0007-GBLT' },
    exhibit_steward_inspection: { code: 'C-19', watermark: 'C19', serial: 'NO. 0019-INSP' },
    exhibit_benjamin_sack: { code: 'C-42', watermark: 'C42', serial: 'NO. 0042-BENJ' },
    exhibit_judah_plea: { code: 'C-88', watermark: 'C88', serial: 'NO. 0088-PLEA' },
    exhibit_egyptian_interpreter: { code: 'C-91', watermark: 'C91', serial: 'NO. 0091-INTP' },
    exhibit_royal_reconciliation: { code: 'C-99', watermark: 'C99', serial: 'NO. 0099-RECN' },
  };
  return codes[id] || { code: 'K-48', watermark: 'K48', serial: 'NO. 0048-DOC' };
}

export function ticketClipPath(width: number, height: number, geometry = TICKET_GEOMETRY) {
  const r = geometry.cornerRadius * width;
  const n = geometry.notchRadius * width;
  const p = geometry.perforation * width;
  return [
    `M ${r} 0`,
    `L ${p - n} 0`,
    `A ${n} ${n} 0 0 0 ${p + n} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 0 ${width - r} ${height}`,
    `L ${p + n} ${height}`,
    `A ${n} ${n} 0 0 0 ${p - n} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 0 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    'Z'
  ].join(' ');
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(MOTION_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(MOTION_QUERY).matches : false),
    () => false
  );
}

interface TiltCardProps {
  children: React.ReactNode;
  clipPath?: string;
  maxTilt?: number;
  scale?: number;
  glare?: number;
  className?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  clipPath,
  maxTilt = 8,
  scale = 1.015,
  glare = 0.18,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const reduced = usePrefersReducedMotion();

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (reduced) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(1000px) rotateX(${-(dy * 2) * maxTilt}deg) rotateY(${dx * 2 * maxTilt}deg) scale(${scale})`;
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(45% 60% at ${(dx + 0.5) * 100}% ${(dy + 0.5) * 100}%, rgba(255,235,190,${glare}) 0%, rgba(255,235,190,0) 70%)`;
      }
    },
    [maxTilt, scale, glare, reduced]
  );

  const onLeave = useCallback(() => {
    setHovering(false);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
    if (glareRef.current) glareRef.current.style.background = 'transparent';
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setHovering(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative w-fit will-change-transform ${className}`}
      style={{
        transition: hovering ? 'none' : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        transformStyle: 'preserve-3d'
      }}
    >
      {children}
      {glare > 0 && !reduced && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            clipPath,
            transition: hovering ? 'none' : 'background 380ms ease-out'
          }}
        />
      )}
    </div>
  );
};

export interface CourtroomTicketProps {
  evidence: EvidenceItem;
  claimedBy?: string;
  isClaimedByMe?: boolean;
  canClaim?: boolean;
  onClaim?: () => void;
  width?: number;
  tilt?: boolean;
  className?: string;
}

export const CourtroomTicket: React.FC<CourtroomTicketProps> = ({
  evidence,
  claimedBy,
  isClaimedByMe = false,
  canClaim = false,
  onClaim,
  width = 620,
  tilt = true,
  className = ''
}) => {
  const docket = getExhibitDocketCode(evidence.id);
  const aspect = TICKET_GEOMETRY.aspect;
  const height = width / aspect;
  const perfX = TICKET_GEOMETRY.perforation * width;
  const clip = `path('${ticketClipPath(width, height)}')`;

  const primaryScripture = evidence.scriptureReferences?.[0];

  const content = (
    <div
      className={`relative select-none text-[#1E140D] shadow-2xl transition-all ${className}`}
      style={{
        width,
        height,
        clipPath: clip
      }}
    >
      {/* Ticket Base Background with Parchment/Terracotta Gradient & Ancient Texture */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #F8EFE1 0%, #EBD9B4 45%, #D9B98A 100%)'
        }}
      />

      {/* Subtle Ancient Desert Noise Overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, #C9993A 10%, transparent 60%), linear-gradient(0deg, rgba(30,20,13,0.15) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 8px 8px'
        }}
      />

      {/* Gold Foil Outer Border Inset */}
      <div
        className="absolute inset-1 pointer-events-none border border-[#C9993A]/60"
        style={{ clipPath: clip }}
      />

      {/* Perforation Line (Dashed divider with cut effect) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-10"
        style={{
          left: perfX,
          width: 2,
          borderLeft: '2px dashed #936B2B',
          opacity: 0.75
        }}
      />

      {/* ======================================================== */}
      {/* RIGHT STUB: K48 Watermark, Admit One, and Serial Codes   */}
      {/* ======================================================== */}
      <div
        className="absolute top-0 bottom-0 right-0 z-10 flex flex-col items-center justify-between py-5 pointer-events-none"
        style={{
          left: perfX,
          width: width - perfX
        }}
      >
        {/* Top Stub Docket Code */}
        <span className="font-cinzel text-[10px] font-bold text-[#7A4B1A] tracking-wider uppercase">
          {docket.code}
        </span>

        {/* Big Rotated Watermark (e.g. K48) */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="font-cinzel font-black tracking-tighter select-none"
            style={{
              writingMode: 'vertical-rl',
              fontSize: Math.round(width * 0.13),
              lineHeight: 1,
              color: '#B58535',
              opacity: 0.45,
              textShadow: '1px 1px 0px rgba(255,255,255,0.8)'
            }}
          >
            {docket.watermark}
          </span>
        </div>

        {/* Rotated Stub Text */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="font-cinzel text-[9px] font-bold uppercase tracking-widest text-[#7A4B1A]"
            style={{ writingMode: 'vertical-rl' }}
          >
            ADMIT EVIDENCE
          </span>
          <span className="font-mono text-[8px] text-[#936B2B] tracking-tighter">
            {docket.serial}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN BODY: Header, Exhibit Title, Points, Scripture, etc */}
      {/* ======================================================== */}
      <div
        className="absolute top-0 bottom-0 left-0 p-5 sm:p-7 flex flex-col justify-between"
        style={{ width: perfX }}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between border-b border-[#936B2B]/35 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#A87926]" />
              <span className="font-cinzel text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#7A4B1A]">
                High Tribunal of Memphis · Case of Yusuf
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-[#A87926]">
              {docket.code}
            </span>
          </div>

          {/* Tier Points Pill & Category */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-cinzel font-bold uppercase tracking-wider rounded-sm shadow-xs ${
                evidence.tier === 'strong'
                  ? 'bg-[#E8883A] text-white border border-[#B95A14]'
                  : 'bg-[#936B2B]/20 text-[#6B4314] border border-[#936B2B]/40'
              }`}
            >
              <Award className="w-3 h-3" />
              {evidence.tier === 'strong' ? 'Strong Evidence · 3 Pts' : 'Standard Evidence · 1 Pt'}
            </span>

            <span className="font-cinzel text-[10px] uppercase text-[#7A4B1A] font-semibold">
              {evidence.category} · {evidence.number}
            </span>
          </div>

          {/* Large Title */}
          <h3
            className="font-cinzel font-bold text-[#1E140D] leading-tight mb-2 drop-shadow-xs"
            style={{ fontSize: Math.max(16, Math.min(22, width * 0.034)) }}
          >
            {evidence.title}
          </h3>

          {/* Scripture Quote Box */}
          {primaryScripture && (
            <div className="p-2 sm:p-2.5 bg-[#FFF9EC]/80 border-l-2 border-[#C9993A] text-xs font-lora italic text-[#3E291B] mb-2 leading-relaxed">
              <span className="font-cinzel not-italic text-[10px] font-bold text-[#A87926] block mb-0.5">
                {primaryScripture.tradition} — {primaryScripture.citation}:
              </span>
              <p className="line-clamp-2">"{primaryScripture.text}"</p>
            </div>
          )}

          {/* Forensic Finding */}
          <div className="text-[11px] font-lora text-[#4A321E] leading-snug line-clamp-2">
            <strong className="font-cinzel text-[10px] uppercase tracking-wider text-[#7A4B1A]">
              Forensic Record:{' '}
            </strong>
            {evidence.forensicFinding || evidence.description}
          </div>
        </div>

        {/* Bottom Status / Footer Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#936B2B]/25">
          <div className="flex items-center gap-2 text-[10px] font-cinzel">
            {claimedBy ? (
              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 border border-amber-300">
                <Check className="w-3 h-3 text-emerald-700" />
                {isClaimedByMe ? 'Exclusively In Your Hand' : `Claimed by ${claimedBy}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-[#6B4314]">
                <Scroll className="w-3 h-3 text-[#A87926]" />
                Archival Record · Pending Claim
              </span>
            )}
          </div>

          {/* Authentic Court Wax Stamp Seal */}
          <div className="flex items-center gap-1.5 opacity-80">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#A87926] flex items-center justify-center text-[8px] font-cinzel font-bold text-[#7A4B1A] rotate-[-12deg]">
              SEAL
            </div>
            <span className="font-mono text-[9px] text-[#7A4B1A] tracking-tighter">
              TRIBUNAL-MEMPHIS
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!tilt) return content;

  return (
    <TiltCard
      clipPath={clip}
      className="mx-auto drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)]"
    >
      {content}
    </TiltCard>
  );
};

export interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceItem | null;
  claimedBy?: string;
  isClaimedByMe?: boolean;
  canClaim?: boolean;
  onClaim?: (item: EvidenceItem) => void;
  isQuickFlash?: boolean;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  evidence,
  claimedBy,
  isClaimedByMe = false,
  canClaim = false,
  onClaim,
  isQuickFlash = false
}) => {
  const [flashActive, setFlashActive] = useState(isQuickFlash);

  React.useEffect(() => {
    if (isOpen && isQuickFlash) {
      setFlashActive(true);
      const timer = setTimeout(() => setFlashActive(false), 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isQuickFlash]);

  if (!isOpen || !evidence) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Quick golden flash effect if inspecting an already unlocked item */}
      {flashActive && (
        <div className="absolute inset-0 bg-[#FFD988]/30 pointer-events-none animate-pulse transition-opacity duration-200" />
      )}

      <div
        className="relative max-w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top right */}
        <button
          onClick={onClose}
          aria-label="Close ticket view"
          className="self-end mb-2.5 p-2 bg-[#1E140D]/90 border border-[#C9993A]/50 text-[#D9B98A] hover:text-[#FFF4DC] hover:border-[#FFD988] rounded-full transition-colors cursor-pointer shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* The 3D Courtroom Ticket */}
        <div className="w-full overflow-x-auto pb-2 flex justify-center no-scrollbar">
          <CourtroomTicket
            evidence={evidence}
            claimedBy={claimedBy}
            isClaimedByMe={isClaimedByMe}
            canClaim={canClaim}
            onClaim={onClaim ? () => onClaim(evidence) : undefined}
            width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 28, 540) : 640}
            tilt={true}
          />
        </div>

        {/* Small Underneath Action Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {canClaim && !claimedBy && onClaim && (
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
            Close Voucher
          </button>
        </div>
      </div>
    </div>
  );
};
