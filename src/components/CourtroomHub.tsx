/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CourtroomHub: Upgraded visual courtroom with:
 * - 16:9 fixed ratio letterboxed scaling (hotspots never shift across devices)
 * - Video backdrop support with Local File Picker fallback (fixes GitHub private 404)
 * - Interactive DRAG-AND-DROP visual hotspot coordinate debugger
 * - "Copy Coordinates" button so user can copy exact percentages to clipboard
 * - Persistent saved coordinates via localStorage
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomState, Player, LAWYER_ROLES } from '../gameState';
import { EVIDENCE_CATALOGUE, EvidenceItem, getRoundById, ROUNDS } from '../evidence';
import { AncientFrame, AncientButton } from './AncientFrame';
import {
  Scale,
  Sparkles,
  BookOpen,
  User,
  Sliders,
  Eye,
  EyeOff,
  Copy,
  Check,
  Radio,
  Lock,
  Volume2,
  VolumeX,
  Search,
  Gavel,
  ShieldAlert,
  ArrowLeft,
  Move,
  Upload,
  RefreshCw,
  Video,
  Timer,
  Clock,
  Trophy
} from 'lucide-react';

export interface HotspotPosition {
  left: number; // percentage (0 - 100)
  top: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface HotspotsConfig {
  judge: HotspotPosition;
  evidence: HotspotPosition;
  podium: HotspotPosition;
}

const DEFAULT_HOTSPOTS: HotspotsConfig = {
  judge: {
    left: 42.2,
    top: 63.8,
    width: 16,
    height: 18
  },
  evidence: {
    left: 14.1,
    top: 76,
    width: 18,
    height: 24
  },
  podium: {
    left: 68.6,
    top: 75,
    width: 20,
    height: 25
  }
};

const STORAGE_COORDS_KEY = 'case_of_yusuf_hotspot_coords_v2';
const STORAGE_VIDEO_URL_KEY = 'case_of_yusuf_custom_video_url';

interface CourtroomHubProps {
  room: RoomState;
  currentPlayer: Player | null;
  onOpenJudge: () => void;
  onOpenEvidenceBoard: () => void;
  onOpenPodium: () => void;
  onUnlockRandom: () => void;
  onReturnToRoles: () => void;
  onTimesUp?: () => void;
  realtimeActive: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const CourtroomHub: React.FC<CourtroomHubProps> = ({
  room,
  currentPlayer,
  onOpenJudge,
  onOpenEvidenceBoard,
  onOpenPodium,
  onUnlockRandom,
  onReturnToRoles,
  onTimesUp,
  realtimeActive,
  soundEnabled,
  onToggleSound
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Active round data
  const activeRound = getRoundById(room.currentRoundId) || ROUNDS[0];

  // Synchronized shared countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!room.roundEndsAt) return 300;
    return Math.max(0, Math.floor((room.roundEndsAt - Date.now()) / 1000));
  });

  const timesUpFiredRef = useRef<boolean>(false);

  useEffect(() => {
    timesUpFiredRef.current = false;
  }, [room.roundEndsAt, room.currentRoundId]);

  useEffect(() => {
    const updateTime = () => {
      if (!room.roundEndsAt) {
        setRemainingSeconds(300);
        return;
      }
      const diff = Math.max(0, Math.floor((room.roundEndsAt - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff === 0 && !timesUpFiredRef.current) {
        timesUpFiredRef.current = true;
        if (onTimesUp) {
          onTimesUp();
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 500);
    return () => clearInterval(interval);
  }, [room.roundEndsAt, onTimesUp]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgentTimer = remainingSeconds <= 30 && remainingSeconds > 0;
  const isTimeZero = remainingSeconds === 0;

  // Video State
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_VIDEO_URL_KEY) ||
      'https://raw.githubusercontent.com/yahyabmk01/GAME/main/Courtroom.mp4'
    );
  });
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hotspots Coordinates
  const [hotspotPositions, setHotspotPositions] = useState<HotspotsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COORDS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_HOTSPOTS;
  });

  const [activeHotspotAdjust, setActiveHotspotAdjust] = useState<keyof HotspotsConfig>('judge');

  // Dragging state for mouse / touch
  const [draggingTarget, setDraggingTarget] = useState<keyof HotspotsConfig | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
  }>({ startX: 0, startY: 0, initialLeft: 0, initialTop: 0 });

  // Count-up animation for evidence unlocked X / Y
  const unlockedCount = room.unlockedEvidenceIds?.length || 1;
  const totalEvidenceCount = EVIDENCE_CATALOGUE.length;
  const [displayCount, setDisplayCount] = useState(unlockedCount);

  useEffect(() => {
    if (displayCount < unlockedCount) {
      const step = () => {
        setDisplayCount(prev => (prev < unlockedCount ? prev + 1 : prev));
      };
      const timer = setTimeout(step, 80);
      return () => clearTimeout(timer);
    } else if (displayCount > unlockedCount) {
      setDisplayCount(unlockedCount);
    }
  }, [unlockedCount, displayCount]);

  // Persist hotspot coordinates
  const savePositions = (coords: HotspotsConfig) => {
    setHotspotPositions(coords);
    try {
      localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(coords));
    } catch {
      // Fallback
    }
  };

  const handleResetPositions = () => {
    savePositions(DEFAULT_HOTSPOTS);
  };

  const handleCopyCoords = async () => {
    const json = JSON.stringify(hotspotPositions, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2200);
    } catch {
      // Fallback
    }
  };

  // Drag handlers for direct visual repositioning
  const handlePointerDown = (e: React.PointerEvent, target: keyof HotspotsConfig) => {
    if (!isDebugMode) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingTarget(target);
    setActiveHotspotAdjust(target);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: hotspotPositions[target].left,
      initialTop: hotspotPositions[target].top
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTarget || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const deltaPercentX = (deltaX / rect.width) * 100;
    const deltaPercentY = (deltaY / rect.height) * 100;

    const currentWidth = hotspotPositions[draggingTarget].width;
    const currentHeight = hotspotPositions[draggingTarget].height;

    const newLeft = Math.max(0, Math.min(100 - currentWidth, dragStartRef.current.initialLeft + deltaPercentX));
    const newTop = Math.max(0, Math.min(100 - currentHeight, dragStartRef.current.initialTop + deltaPercentY));

    const updated = {
      ...hotspotPositions,
      [draggingTarget]: {
        ...hotspotPositions[draggingTarget],
        left: Math.round(newLeft * 10) / 10,
        top: Math.round(newTop * 10) / 10
      }
    };
    savePositions(updated);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingTarget) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setDraggingTarget(null);
    }
  };

  // Local File Selector (when user chooses Courtroom.mp4 directly from their laptop/phone)
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setVideoSrc(localUrl);
      setVideoError(false);
      setVideoLoaded(false);
      if (videoRef.current) {
        videoRef.current.src = localUrl;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleCustomUrlApply = () => {
    if (customUrlInput.trim()) {
      const url = customUrlInput.trim();
      setVideoSrc(url);
      setVideoError(false);
      setVideoLoaded(false);
      localStorage.setItem(STORAGE_VIDEO_URL_KEY, url);
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Nudge functions for pixel-perfect adjustments
  const nudge = (key: 'left' | 'top', delta: number) => {
    const current = hotspotPositions[activeHotspotAdjust][key];
    const updated = {
      ...hotspotPositions,
      [activeHotspotAdjust]: {
        ...hotspotPositions[activeHotspotAdjust],
        [key]: Math.max(0, Math.min(95, Math.round((current + delta) * 10) / 10))
      }
    };
    savePositions(updated);
  };

  const updateDimension = (key: 'width' | 'height', val: number) => {
    const updated = {
      ...hotspotPositions,
      [activeHotspotAdjust]: {
        ...hotspotPositions[activeHotspotAdjust],
        [key]: Math.max(6, Math.min(50, val))
      }
    };
    savePositions(updated);
  };

  // Lawyer name tags
  const brothersPlayer = room.players.find(p => p.roleId === 'brothers');
  const householdPlayer = room.players.find(p => p.roleId === 'household');
  const authoritiesPlayer = room.players.find(p => p.roleId === 'authorities');

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1E140D] text-[#EBD9B4] select-none font-lora overflow-hidden">
      {/* Hidden file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/*"
        onChange={handleLocalFileSelect}
        className="hidden"
      />

      {/* ======================================================== */}
      {/* 1. TOP BAR                                               */}
      {/* ======================================================== */}
      <header className="relative z-30 shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#1E140D]/95 border-b border-[#C9993A]/30 backdrop-blur-md">
        {/* Left: Chamber Code & Back navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToRoles}
            className="p-1.5 border border-[#C9993A]/30 text-[#D9B98A] hover:text-[#FFF4DC] hover:border-[#C9993A] transition-colors"
            title="Return to Role Mandates"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-[#1B2A41]/70 border border-[#C9993A]/40 px-2.5 py-1">
            <span className="text-[10px] font-cinzel text-[#D9B98A]/70 uppercase">Chamber</span>
            <span className="font-cinzel text-sm sm:text-base font-bold text-[#FFD988] tracking-widest">{room.code}</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(room.code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              title="Copy Chamber Code"
              className="text-[#D9B98A] hover:text-[#FFF4DC] ml-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center: Large Shared Timer & Round Badge */}
        <div className="flex items-center gap-3 order-last md:order-none mx-auto md:mx-0">
          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-1 border transition-all duration-300 ${
              isTimeZero
                ? 'bg-red-950/90 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                : isUrgentTimer
                ? 'bg-red-950/80 border-red-500/80 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                : 'bg-[#1B2A41]/80 border-[#C9993A]/60 text-[#FFD988] shadow-[0_0_15px_rgba(201,153,58,0.2)]'
            }`}
          >
            <Clock className={`w-4 h-4 ${isUrgentTimer || isTimeZero ? 'text-red-400 animate-spin' : 'text-[#E8883A]'}`} />
            <div className="text-left">
              <span className="text-[9px] font-cinzel uppercase tracking-wider block opacity-70 leading-none">
                Round {activeRound.number} Timer
              </span>
              <span className="font-mono text-lg sm:text-xl font-black tracking-widest tabular-nums leading-tight">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          </div>

          {/* Compact Live Scoreboard (3 items) */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-cinzel">
            {/* Brothers */}
            <div
              className={`px-2.5 py-1 border flex items-center gap-1.5 ${
                currentPlayer?.roleId === 'brothers'
                  ? 'bg-[#C9993A]/25 border-[#FFD988] text-[#FFF4DC] shadow-[0_0_12px_rgba(201,153,58,0.3)]'
                  : 'bg-[#1E140D]/70 border-[#C9993A]/30 text-[#D9B98A]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8883A]" />
              <span className="truncate max-w-[80px] font-medium">{brothersPlayer ? brothersPlayer.name : 'Brothers'}</span>
              <span className="font-mono font-bold text-[#FFD988] ml-1 tabular-nums">
                {brothersPlayer ? (room.scores?.[brothersPlayer.id] || 0) : 0}p
              </span>
            </div>

            {/* Household */}
            <div
              className={`px-2.5 py-1 border flex items-center gap-1.5 ${
                currentPlayer?.roleId === 'household'
                  ? 'bg-[#C9993A]/25 border-[#FFD988] text-[#FFF4DC] shadow-[0_0_12px_rgba(201,153,58,0.3)]'
                  : 'bg-[#1E140D]/70 border-[#C9993A]/30 text-[#D9B98A]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9993A]" />
              <span className="truncate max-w-[80px] font-medium">{householdPlayer ? householdPlayer.name : 'Household'}</span>
              <span className="font-mono font-bold text-[#FFD988] ml-1 tabular-nums">
                {householdPlayer ? (room.scores?.[householdPlayer.id] || 0) : 0}p
              </span>
            </div>

            {/* Authorities */}
            <div
              className={`px-2.5 py-1 border flex items-center gap-1.5 ${
                currentPlayer?.roleId === 'authorities'
                  ? 'bg-[#C9993A]/25 border-[#FFD988] text-[#FFF4DC] shadow-[0_0_12px_rgba(201,153,58,0.3)]'
                  : 'bg-[#1E140D]/70 border-[#C9993A]/30 text-[#D9B98A]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span className="truncate max-w-[80px] font-medium">{authoritiesPlayer ? authoritiesPlayer.name : 'Authorities'}</span>
              <span className="font-mono font-bold text-[#FFD988] ml-1 tabular-nums">
                {authoritiesPlayer ? (room.scores?.[authoritiesPlayer.id] || 0) : 0}p
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2">
          {/* Evidence Board shortcut with live claimed / unlocked count */}
          <div
            onClick={onOpenEvidenceBoard}
            className="flex items-center gap-2 px-3 py-1 bg-[#1B2A41]/75 border border-[#C9993A]/50 text-xs font-cinzel cursor-pointer hover:border-[#FFD988] transition-colors"
            title="Open Evidence Board"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E8883A]" />
            <span className="text-[#D9B98A]/80 hidden sm:inline">Exhibits:</span>
            <span className="font-mono font-bold text-sm text-[#FFD988] tabular-nums">
              {displayCount} / {totalEvidenceCount}
            </span>
          </div>

          {/* Dev/cheat button only visible when isDebugMode is active */}
          {isDebugMode && (
            <button
              onClick={onUnlockRandom}
              disabled={unlockedCount >= totalEvidenceCount}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C9993A] text-[#1E140D] font-cinzel font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#FFD988]/60 cursor-pointer"
              title="Unlock random exhibit (Dev Mode)"
            >
              <Sparkles className="w-3 h-3 text-[#1E140D]" />
              <span className="hidden sm:inline">Unlock Random</span>
            </button>
          )}

          {/* Interactive Debug Toggle Button */}
          <button
            onClick={() => setIsDebugMode(!isDebugMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-cinzel uppercase border transition-colors cursor-pointer ${
              isDebugMode
                ? 'bg-[#C9993A] text-[#1E140D] font-bold border-[#FFD988] shadow-[0_0_12px_rgba(201,153,58,0.5)]'
                : 'bg-[#1E140D]/70 border-[#C9993A]/30 text-[#D9B98A] hover:text-[#FFF4DC]'
            }`}
            title="Toggle Visual Hotspot Drag & Debugger"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDebugMode ? 'Exit Debug' : 'Hotspots'}</span>
          </button>

          <button
            onClick={onToggleSound}
            className="p-1.5 border border-[#C9993A]/30 text-[#D9B98A] hover:text-[#FFF4DC] bg-[#1E140D]/60"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#C9993A]" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. 16:9 CONTAINER & VIDEO & DRAGGABLE HOTSPOTS           */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-[#1E140D]">
        {/* Fixed 16:9 aspect container */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full max-w-[1440px] aspect-[16/9] max-h-full overflow-hidden border border-[#C9993A]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-[#120B07]"
        >
          {/* Video Background */}
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={() => {
              setVideoLoaded(true);
              setVideoError(false);
            }}
            onError={() => {
              setVideoError(true);
              setVideoLoaded(false);
            }}
          />

          {/* Procedural Animated Courtroom Canvas (Always active behind video, seamless fallback) */}
          <div
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${
              videoLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <svg className="w-full h-full object-cover" viewBox="0 0 1440 810" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="hallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0B121C" />
                  <stop offset="45%" stopColor="#1B2A41" />
                  <stop offset="100%" stopColor="#2E1C13" />
                </linearGradient>
                <radialGradient id="centerGlow" cx="50%" cy="32%" r="55%">
                  <stop offset="0%" stopColor="#E8883A" stopOpacity="0.5" />
                  <stop offset="45%" stopColor="#C9993A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1E140D" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="1440" height="810" fill="url(#hallGrad)" />
              <rect width="1440" height="810" fill="url(#centerGlow)" />

              {/* Columns */}
              <polygon points="120,0 200,0 180,810 80,810" fill="#241812" />
              <polygon points="200,0 240,0 220,810 180,810" fill="#38251B" />
              <polygon points="1240,0 1320,0 1360,810 1260,810" fill="#241812" />
              <polygon points="1200,0 1240,0 1260,810 1220,810" fill="#38251B" />

              {/* Raised Bench Dais */}
              <polygon points="460,320 980,320 1060,560 380,560" fill="#3A2418" />
              <polygon points="500,240 940,240 980,320 460,320" fill="#4B3121" />
              <polygon points="620,170 820,170 840,260 600,260" fill="#1B2A41" />
              <polygon points="650,120 790,120 810,170 630,170" fill="#C9993A" opacity="0.85" />

              {/* Evidence Archive Dais Left */}
              <polygon points="60,420 320,440 360,660 40,640" fill="#342015" />
              <polygon points="100,410 280,410 320,440 60,440" fill="#C9993A" opacity="0.35" />

              {/* Podium Right */}
              <polygon points="1040,520 1360,500 1420,780 1080,780" fill="#362217" />
              <polygon points="1080,490 1320,470 1360,500 1040,520" fill="#C9993A" opacity="0.4" />
            </svg>
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Video loading or error note banner */}
          {videoError && !videoLoaded && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-amber-950/80 border border-amber-600/60 text-amber-200 text-xs font-cinzel flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-[#FFC145]" />
              <span>GitHub video returned 404 (repo may be private).</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="underline text-[#FFD988] font-bold hover:text-white"
              >
                Choose local Courtroom.mp4
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* HOTSPOT 1: "The Judge"                                   */}
          {/* ======================================================== */}
          <div
            style={{
              left: `${hotspotPositions.judge.left}%`,
              top: `${hotspotPositions.judge.top}%`,
              width: `${hotspotPositions.judge.width}%`,
              height: `${hotspotPositions.judge.height}%`
            }}
            onPointerDown={e => handlePointerDown(e, 'judge')}
            onClick={() => {
              if (!isDebugMode) onOpenJudge();
            }}
            className={`absolute z-20 flex flex-col items-center justify-center transition-transform select-none ${
              isDebugMode
                ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'cursor-pointer group'
            }`}
          >
            <div className="relative mb-1 flex items-center justify-center pointer-events-none">
              <span className="absolute w-6 h-6 rounded-full bg-[#E8883A]/30 animate-ping" />
              <div className="w-5 h-5 rounded-full border border-[#FFD988] bg-[#C9993A] flex items-center justify-center text-[#1E140D] shadow-[0_0_15px_rgba(232,136,58,0.8)]">
                <Gavel className="w-3 h-3" />
              </div>
            </div>

            <div className="relative px-3 sm:px-4 py-1.5 sm:py-2 border border-[#C9993A] bg-[#1E140D]/90 backdrop-blur-md shadow-[0_0_20px_rgba(201,153,58,0.45)] group-hover:scale-105 group-active:scale-95 transition-transform min-w-[110px] text-center pointer-events-none">
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#FFD988]" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#FFD988]" />
              <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#FFD988]" />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#FFD988]" />

              <span className="text-[9px] sm:text-[10px] font-cinzel tracking-widest text-[#C9993A] block uppercase">
                High Bench
              </span>
              <h3 className="text-xs sm:text-sm font-cinzel font-bold text-[#FFF4DC] whitespace-nowrap">
                The Judge
              </h3>
            </div>

            {isDebugMode && (
              <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/90 text-amber-300 pointer-events-none">
                L: {hotspotPositions.judge.left}% | T: {hotspotPositions.judge.top}%
              </span>
            )}
          </div>

          {/* ======================================================== */}
          {/* HOTSPOT 2: "Evidence Board"                              */}
          {/* ======================================================== */}
          <div
            style={{
              left: `${hotspotPositions.evidence.left}%`,
              top: `${hotspotPositions.evidence.top}%`,
              width: `${hotspotPositions.evidence.width}%`,
              height: `${hotspotPositions.evidence.height}%`
            }}
            onPointerDown={e => handlePointerDown(e, 'evidence')}
            onClick={() => {
              if (!isDebugMode) onOpenEvidenceBoard();
            }}
            className={`absolute z-20 flex flex-col items-center justify-center transition-transform select-none ${
              isDebugMode
                ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'cursor-pointer group'
            }`}
          >
            <div className="relative mb-1 flex items-center justify-center pointer-events-none">
              <span className="absolute w-6 h-6 rounded-full bg-[#3B82F6]/30 animate-ping" />
              <div className="w-5 h-5 rounded-full border border-[#93C5FD] bg-[#1B2A41] flex items-center justify-center text-[#FFD988] shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                <BookOpen className="w-3 h-3" />
              </div>
            </div>

            <div className="relative px-3 sm:px-4 py-1.5 sm:py-2 border border-[#C9993A] bg-[#1E140D]/90 backdrop-blur-md shadow-[0_0_20px_rgba(201,153,58,0.45)] group-hover:scale-105 group-active:scale-95 transition-transform min-w-[120px] text-center pointer-events-none">
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#FFD988]" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#FFD988]" />
              <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#FFD988]" />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#FFD988]" />

              <span className="text-[9px] sm:text-[10px] font-cinzel tracking-widest text-[#C9993A] block uppercase">
                Court Archives
              </span>
              <h3 className="text-xs sm:text-sm font-cinzel font-bold text-[#FFF4DC] whitespace-nowrap">
                Evidence Board
              </h3>
            </div>

            {isDebugMode && (
              <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/90 text-emerald-300 pointer-events-none">
                L: {hotspotPositions.evidence.left}% | T: {hotspotPositions.evidence.top}%
              </span>
            )}
          </div>

          {/* ======================================================== */}
          {/* HOTSPOT 3: "My Podium"                                   */}
          {/* ======================================================== */}
          <div
            style={{
              left: `${hotspotPositions.podium.left}%`,
              top: `${hotspotPositions.podium.top}%`,
              width: `${hotspotPositions.podium.width}%`,
              height: `${hotspotPositions.podium.height}%`
            }}
            onPointerDown={e => handlePointerDown(e, 'podium')}
            onClick={() => {
              if (!isDebugMode) onOpenPodium();
            }}
            className={`absolute z-20 flex flex-col items-center justify-center transition-transform select-none ${
              isDebugMode
                ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-rose-400 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'cursor-pointer group'
            }`}
          >
            <div className="relative mb-1 flex items-center justify-center pointer-events-none">
              <span className="absolute w-6 h-6 rounded-full bg-[#E8883A]/30 animate-ping" />
              <div className="w-5 h-5 rounded-full border border-[#FFD988] bg-[#A87926] flex items-center justify-center text-[#FFF4DC] shadow-[0_0_15px_rgba(232,136,58,0.8)]">
                <User className="w-3 h-3" />
              </div>
            </div>

            <div className="relative px-3 sm:px-4 py-1.5 sm:py-2 border border-[#C9993A] bg-[#1E140D]/90 backdrop-blur-md shadow-[0_0_20px_rgba(201,153,58,0.45)] group-hover:scale-105 group-active:scale-95 transition-transform min-w-[110px] text-center pointer-events-none">
              <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#FFD988]" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#FFD988]" />
              <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#FFD988]" />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#FFD988]" />

              <span className="text-[9px] sm:text-[10px] font-cinzel tracking-widest text-[#C9993A] block uppercase">
                Defense Stand
              </span>
              <h3 className="text-xs sm:text-sm font-cinzel font-bold text-[#FFF4DC] whitespace-nowrap">
                My Podium
              </h3>
            </div>

            {isDebugMode && (
              <span className="mt-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/90 text-rose-300 pointer-events-none">
                L: {hotspotPositions.podium.left}% | T: {hotspotPositions.podium.top}%
              </span>
            )}
          </div>

          {/* Quick Helper Indicator */}
          {!isDebugMode && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1 bg-black/60 border border-[#C9993A]/20 backdrop-blur-sm text-[11px] font-cinzel text-[#D9B98A]/80 whitespace-nowrap">
              Tap any golden hotspot to deliberate or review evidence
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VISUAL COORDINATE DEBUGGER PANEL                      */}
      {/* ======================================================== */}
      {isDebugMode && (
        <div className="relative z-40 p-3 bg-[#1B2A41]/95 border-t border-[#C9993A]/40 text-xs font-mono text-[#D9B98A] flex flex-wrap items-center justify-between gap-3">
          {/* Target selection & Direct Nudge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#FFD988] font-cinzel uppercase text-xs">Selected:</span>
            {(['judge', 'evidence', 'podium'] as const).map(key => (
              <button
                key={key}
                onClick={() => setActiveHotspotAdjust(key)}
                className={`px-2.5 py-1 text-[11px] uppercase border transition-colors ${
                  activeHotspotAdjust === key
                    ? 'bg-[#C9993A] text-[#1E140D] font-bold border-[#FFD988]'
                    : 'bg-[#1E140D]/70 border-[#C9993A]/30 text-[#D9B98A]'
                }`}
              >
                {key}
              </button>
            ))}

            {/* Fine Nudge Arrows */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-[#D9B98A]/60">Nudge:</span>
              <button onClick={() => nudge('left', -0.5)} className="px-1.5 py-0.5 bg-[#1E140D] border border-[#C9993A]/30 hover:border-[#FFD988]">←</button>
              <button onClick={() => nudge('left', 0.5)} className="px-1.5 py-0.5 bg-[#1E140D] border border-[#C9993A]/30 hover:border-[#FFD988]">→</button>
              <button onClick={() => nudge('top', -0.5)} className="px-1.5 py-0.5 bg-[#1E140D] border border-[#C9993A]/30 hover:border-[#FFD988]">↑</button>
              <button onClick={() => nudge('top', 0.5)} className="px-1.5 py-0.5 bg-[#1E140D] border border-[#C9993A]/30 hover:border-[#FFD988]">↓</button>
            </div>
          </div>

          {/* Video Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1E140D] border border-[#C9993A]/40 text-[#D9B98A] hover:text-[#FFF4DC] text-xs font-cinzel"
              title="Pick Courtroom.mp4 directly from your computer"
            >
              <Upload className="w-3 h-3 text-[#FFC145]" />
              <span>Load Video File</span>
            </button>
          </div>

          {/* Save / Copy Coordinates Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCoords}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#C9993A] to-[#A87926] text-[#1E140D] font-cinzel font-bold text-xs uppercase tracking-wider shadow"
            >
              {copiedCoords ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCoords ? 'Copied JSON!' : 'Copy Coordinates'}</span>
            </button>

            <button
              onClick={handleResetPositions}
              className="px-2 py-1 text-xs text-[#D9B98A]/60 hover:text-rose-300 font-cinzel"
            >
              Reset
            </button>

            <button
              onClick={() => setIsDebugMode(false)}
              className="px-2.5 py-1 bg-[#1E140D] border border-[#C9993A]/40 text-[#D9B98A] hover:text-[#FFF4DC] text-xs font-cinzel"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
