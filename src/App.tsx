/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * The Case of Yusuf — Courtroom Mystery Front End
 * Step 1: Main Menu, Room Creation, Room Join, Quorum Lobby, and Role Assignment.
 * Powered by Supabase Realtime (with automatic local demo mode fallback).
 */

import React, { useState, useEffect, useId } from 'react';
import {
  createRoom,
  joinRoom,
  getRoomState,
  assignRoles,
  addMockPlayer,
  removePlayer,
  returnToLobby,
  subscribeToRoom,
  isRealtimeActive,
  RoomState,
  Player,
  LAWYER_ROLES,
  LawyerRole
} from './gameState';
import { DesertBackdrop } from './components/DesertBackdrop';
import { AncientFrame, AncientButton } from './components/AncientFrame';
import { RoleCard } from './components/RoleCard';
import { HowToPlayModal } from './components/HowToPlayModal';
import { AboutModal } from './components/AboutModal';
import { SupabaseModal } from './components/SupabaseModal';
import {
  Copy,
  Check,
  Users,
  Shield,
  ArrowLeft,
  Crown,
  UserPlus,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Scroll,
  Info,
  BookOpen,
  Scale,
  Database,
  Radio,
  Loader2
} from 'lucide-react';

type Screen = 'menu' | 'create' | 'join' | 'lobby' | 'roles';

// Atmospheric synthesized web audio chimes (gentle modal feedback)
function playAncientChime(type: 'click' | 'join' | 'assign' | 'copy') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'copy') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'join') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(440, now + 0.1); // A4
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'assign') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(293.66, now); // D4
      osc.frequency.setValueAtTime(440, now + 0.15); // A4
      osc.frequency.setValueAtTime(587.33, now + 0.3); // D5
      osc.frequency.setValueAtTime(880, now + 0.45); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch {
    // AudioContext blocked or not allowed until interaction
  }
}

export default function App() {
  const createPlayerNameId = useId();
  const joinPlayerNameId = useId();
  const joinRoomCodeId = useId();

  // Navigation state
  const [screen, setScreen] = useState<Screen>('menu');

  // Room & Current Player State
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Form input states
  const [createName, setCreateName] = useState('Advocate Yahya');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<LawyerRole | null>(null);

  // Realtime Status
  const [realtimeConnected, setRealtimeConnected] = useState(isRealtimeActive());

  // UI helpers
  const [copiedCode, setCopiedCode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const triggerSound = (type: 'click' | 'join' | 'assign' | 'copy') => {
    if (soundEnabled) playAncientChime(type);
  };

  // Re-check realtime active status
  const handleConfigChanged = () => {
    setRealtimeConnected(isRealtimeActive());
  };

  // Subscribe to room updates whenever in an active room
  useEffect(() => {
    if (!room?.code) return;

    const unsubscribe = subscribeToRoom(room.code, (updatedRoom) => {
      if (!updatedRoom) {
        // Room was closed
        setRoom(null);
        setCurrentPlayer(null);
        setScreen('menu');
      } else {
        setRoom(updatedRoom);
        // Sync current player with updated room data (e.g. role assignment)
        if (currentPlayer) {
          const matched = updatedRoom.players.find(p => p.id === currentPlayer.id);
          if (matched) {
            setCurrentPlayer(matched);
          }
        }
        // If room moved to roles assigned, navigate to roles
        if (updatedRoom.status === 'roles_assigned' && screen === 'lobby') {
          setScreen('roles');
          triggerSound('assign');
        } else if (updatedRoom.status === 'lobby' && screen === 'roles') {
          setScreen('lobby');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [room?.code, screen, currentPlayer?.id]);

  // Handler: Initiate Room Creation
  const handleInitiateCreate = () => {
    triggerSound('click');
    setErrorMessage(null);
    setScreen('create');
  };

  // Handler: Confirm Create Room
  const handleConfirmCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { room: newRoom, player: newHost } = await createRoom(createName);
      setRoom(newRoom);
      setCurrentPlayer(newHost);
      triggerSound('join');
      setScreen('lobby');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create chamber.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Initiate Join Room
  const handleInitiateJoin = () => {
    triggerSound('click');
    setErrorMessage(null);
    setScreen('join');
  };

  // Handler: Confirm Join Room
  const handleConfirmJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!joinCode.trim()) {
      setErrorMessage('Please enter the 4-letter chamber code.');
      return;
    }
    setIsLoading(true);
    try {
      const { room: joinedRoom, player: newPlayer } = await joinRoom(joinCode, joinName);
      setRoom(joinedRoom);
      setCurrentPlayer(newPlayer);
      triggerSound('join');
      setScreen(joinedRoom.status === 'roles_assigned' ? 'roles' : 'lobby');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to enter chamber.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Copy room code
  const handleCopyCode = async (codeToCopy: string) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      triggerSound('copy');
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // Fallback
    }
  };

  // Handler: Convene Tribunal / Assign Roles
  const handleStartCase = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await assignRoles(room.code);
      setRoom(updated);
      setScreen('roles');
      triggerSound('assign');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Cannot convene tribunal yet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Add Simulated Player (Demo mode convenience)
  const handleAddMockPlayer = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await addMockPlayer(room.code);
      setRoom(updated);
      triggerSound('join');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Cannot add advocate.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Remove Player
  const handleRemovePlayer = async (playerId: string) => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await removePlayer(room.code, playerId);
      if (updated) {
        setRoom(updated);
      } else {
        setRoom(null);
        setCurrentPlayer(null);
        setScreen('menu');
      }
      triggerSound('click');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error modifying quorum.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Return to Lobby from Roles
  const handleReturnToLobby = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await returnToLobby(room.code);
      if (updated) setRoom(updated);
      setScreen('lobby');
      triggerSound('click');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Exit to Menu
  const handleExitRoom = async () => {
    if (room && currentPlayer) {
      await removePlayer(room.code, currentPlayer.id);
    }
    setRoom(null);
    setCurrentPlayer(null);
    setScreen('menu');
    setErrorMessage(null);
    triggerSound('click');
  };

  return (
    <div className="relative min-h-screen text-[#EBD9B4] flex flex-col font-lora selection:bg-[#C9993A]/30">
      {/* Low-Poly Desert Courtroom Backdrop */}
      <DesertBackdrop />

      {/* Top Bar Contract: Brand title - Nav links / Step indicators - Sound & Database toggles */}
      <header className="relative z-20 flex items-center justify-between gap-6 px-4 sm:px-6 py-4 border-b border-[#C9993A]/20 bg-[#1E140D]/75 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            if (screen !== 'menu' && !room) setScreen('menu');
          }}
          className="text-lg font-cinzel font-bold tracking-wider text-[#EBD9B4] hover:text-[#FFF4DC] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 text-left cursor-pointer"
        >
          <Scale className="w-5 h-5 text-[#C9993A]" />
          <span>THE CASE OF YUSUF</span>
        </button>

        {/* Zone 2: Navigation Links & Supabase status badge */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-cinzel tracking-widest text-[#D9B98A]">
          <button
            onClick={() => setIsHowToPlayOpen(true)}
            className="hover:text-[#FFF4DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How to Play
          </button>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="hover:text-[#FFF4DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            About Project
          </button>
          <span className="text-[#C9993A]/40">|</span>
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase transition-colors border cursor-pointer ${
              realtimeConnected
                ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-[#C9993A]/15 border-[#C9993A]/40 text-[#FFD988] hover:bg-[#C9993A]/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${realtimeConnected ? 'text-emerald-400 animate-pulse' : 'text-[#C9993A]'}`} />
            <span>{realtimeConnected ? 'Supabase Realtime' : 'Configure Supabase'}</span>
          </button>
        </nav>

        {/* Zone 3: Mobile Supabase button + Audio toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="md:hidden p-2 border border-[#C9993A]/30 text-[#D9B98A] hover:text-[#FFF4DC] bg-[#1E140D]/60"
            title="Configure Supabase"
          >
            <Database className={`w-4 h-4 ${realtimeConnected ? 'text-emerald-400' : 'text-[#C9993A]'}`} />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute ambient chimes' : 'Enable ambient chimes'}
            className="p-2 border border-[#C9993A]/30 text-[#D9B98A] hover:text-[#FFF4DC] hover:border-[#C9993A] transition-colors bg-[#1E140D]/60"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#C9993A]" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        {/* ======================================================== */}
        {/* 1. MAIN MENU SCREEN */}
        {/* ======================================================== */}
        {screen === 'menu' && (
          <div className="w-full max-w-xl text-center animate-fade-in my-auto">
            {/* Geometric Seal / Scales Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 border border-[#C9993A]/50 bg-[#1E140D]/90 shadow-[0_0_25px_rgba(201,153,58,0.25)]">
              <svg viewBox="0 0 60 60" className="w-12 h-12" fill="none">
                <polygon points="30,4 54,18 54,42 30,56 6,42 6,18" stroke="#C9993A" strokeWidth="1.5" />
                <polygon points="30,12 46,22 46,38 30,48 14,38 14,22" fill="#1B2A41" opacity="0.6" />
                <line x1="30" y1="16" x2="30" y2="44" stroke="#EBD9B4" strokeWidth="1.5" />
                <line x1="18" y1="24" x2="42" y2="24" stroke="#EBD9B4" strokeWidth="1.5" />
                <polygon points="16,32 24,32 20,38" fill="#C9993A" />
                <polygon points="36,32 44,32 40,38" fill="#C9993A" />
              </svg>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-black tracking-wider text-[#FFF4DC] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] mb-3 leading-tight">
              THE CASE OF YUSUF
            </h1>
            <p className="text-base sm:text-lg font-lora text-[#D9B98A] max-w-md mx-auto mb-8 italic">
              A courtroom mystery for three players
            </p>

            {/* Menu Card with Actions */}
            <AncientFrame glow className="space-y-4 max-w-md mx-auto">
              <AncientButton
                fullWidth
                variant="primary"
                onClick={handleInitiateCreate}
                className="py-4 text-base"
              >
                Create Room
              </AncientButton>

              <AncientButton
                fullWidth
                variant="secondary"
                onClick={handleInitiateJoin}
                className="py-4 text-base"
              >
                Join Room
              </AncientButton>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <AncientButton
                  variant="ghost"
                  onClick={() => setIsHowToPlayOpen(true)}
                  className="py-3 text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 inline" />
                  How to Play
                </AncientButton>

                <AncientButton
                  variant="ghost"
                  onClick={() => setIsAboutOpen(true)}
                  className="py-3 text-xs"
                >
                  <Info className="w-3.5 h-3.5 mr-1.5 inline" />
                  About Project
                </AncientButton>
              </div>

              {/* Supabase status link on main menu */}
              <div className="pt-2 border-t border-[#C9993A]/15 text-center">
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-cinzel text-[#C9993A] hover:text-[#FFF4DC] transition-colors"
                >
                  <Database className="w-3 h-3" />
                  <span>
                    {realtimeConnected ? 'Supabase Realtime Ready' : 'Connect Supabase for Multi-Device Play'}
                  </span>
                </button>
              </div>
            </AncientFrame>

            <div className="mt-8 text-xs font-cinzel tracking-widest text-[#D9B98A]/60 uppercase">
              Comparative Abrahamic Inquiry · Step 1: Chamber Lobby
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. CREATE ROOM SCREEN */}
        {/* ======================================================== */}
        {screen === 'create' && (
          <div className="w-full max-w-md animate-fade-in my-auto">
            <AncientFrame glow>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#C9993A]/20">
                <button
                  onClick={() => setScreen('menu')}
                  className="inline-flex items-center gap-1.5 text-xs font-cinzel text-[#D9B98A] hover:text-[#FFF4DC] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Menu
                </button>
                <span className="text-xs font-cinzel text-[#C9993A] uppercase tracking-wider">
                  Chamber Setup
                </span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-cinzel font-bold text-[#EBD9B4] mb-1">
                  Found a High Chamber
                </h2>
                <p className="text-xs font-lora text-[#D9B98A]">
                  As the founding host, enter your title and prepare to convene the three-advocate tribunal.
                </p>
              </div>

              <form onSubmit={handleConfirmCreate} className="space-y-5">
                <div>
                  <label htmlFor={createPlayerNameId} className="block text-xs font-cinzel uppercase tracking-wider text-[#C9993A] mb-2 text-left">
                    Your Advocate Name / Title
                  </label>
                  <input
                    id={createPlayerNameId}
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Scribe Tariq, Advocate Leah"
                    className="w-full px-4 py-3 bg-[#1B2A41]/40 border border-[#C9993A]/40 text-[#FFF4DC] placeholder-[#D9B98A]/40 focus:border-[#C9993A] focus:outline-none focus:ring-1 focus:ring-[#C9993A] font-lora"
                  />
                </div>

                <div className="p-3 bg-[#1B2A41]/25 border border-[#C9993A]/20 text-xs text-[#D9B98A] text-left">
                  <span className="font-cinzel text-[#C9993A] block mb-1">Tribunal Structure:</span>
                  Upon entry, a unique 4-letter chamber code will be generated. Three player slots will be reserved for the advocates.
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 text-left">
                    {errorMessage}
                  </div>
                )}

                <AncientButton
                  fullWidth
                  variant="primary"
                  type="submit"
                  disabled={isLoading}
                  className="py-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Creating Chamber...
                    </>
                  ) : (
                    'Generate Code & Enter Lobby'
                  )}
                </AncientButton>
              </form>
            </AncientFrame>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. JOIN ROOM SCREEN */}
        {/* ======================================================== */}
        {screen === 'join' && (
          <div className="w-full max-w-md animate-fade-in my-auto">
            <AncientFrame glow>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#C9993A]/20">
                <button
                  onClick={() => setScreen('menu')}
                  className="inline-flex items-center gap-1.5 text-xs font-cinzel text-[#D9B98A] hover:text-[#FFF4DC] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Menu
                </button>
                <span className="text-xs font-cinzel text-[#C9993A] uppercase tracking-wider">
                  Chamber Entry
                </span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-cinzel font-bold text-[#EBD9B4] mb-1">
                  Enter Existing Chamber
                </h2>
                <p className="text-xs font-lora text-[#D9B98A]">
                  Provide your name and the 4-letter room code given by the presiding host.
                </p>
              </div>

              <form onSubmit={handleConfirmJoin} className="space-y-5">
                <div>
                  <label htmlFor={joinPlayerNameId} className="block text-xs font-cinzel uppercase tracking-wider text-[#C9993A] mb-2 text-left">
                    Your Advocate Name / Title
                  </label>
                  <input
                    id={joinPlayerNameId}
                    type="text"
                    required
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="e.g. Advocate Miriam, Scribe Amun"
                    className="w-full px-4 py-3 bg-[#1B2A41]/40 border border-[#C9993A]/40 text-[#FFF4DC] placeholder-[#D9B98A]/40 focus:border-[#C9993A] focus:outline-none focus:ring-1 focus:ring-[#C9993A] font-lora"
                  />
                </div>

                <div>
                  <label htmlFor={joinRoomCodeId} className="block text-xs font-cinzel uppercase tracking-wider text-[#C9993A] mb-2 text-left">
                    4-Letter Chamber Code
                  </label>
                  <input
                    id={joinRoomCodeId}
                    type="text"
                    required
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. YSUF"
                    className="w-full px-4 py-3 bg-[#1B2A41]/40 border border-[#C9993A]/40 text-[#FFF4DC] text-center tracking-[0.4em] font-cinzel text-xl uppercase placeholder-[#D9B98A]/30 focus:border-[#C9993A] focus:outline-none focus:ring-1 focus:ring-[#C9993A]"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 text-left">
                    {errorMessage}
                  </div>
                )}

                <AncientButton
                  fullWidth
                  variant="primary"
                  type="submit"
                  disabled={isLoading}
                  className="py-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Entering Chamber...
                    </>
                  ) : (
                    'Join Chamber Quorum'
                  )}
                </AncientButton>
              </form>
            </AncientFrame>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. LOBBY SCREEN */}
        {/* ======================================================== */}
        {screen === 'lobby' && room && (
          <div className="w-full max-w-3xl animate-fade-in my-auto space-y-6">
            {/* Top Chamber Header & Code Card */}
            <AncientFrame glow className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-cinzel uppercase tracking-widest text-[#C9993A]">
                      Courtroom Chamber
                    </span>
                    {/* Mode Indicator: Realtime or Local Demo */}
                    {realtimeConnected ? (
                      <span className="text-[11px] font-cinzel uppercase tracking-wider px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 inline-flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                        Supabase Realtime
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsSupabaseModalOpen(true)}
                        className="text-[11px] font-cinzel uppercase tracking-wider px-2 py-0.5 bg-[#E8883A]/20 border border-[#E8883A]/50 text-[#FFC145] hover:bg-[#E8883A]/30 transition-colors cursor-pointer"
                        title="Click to configure Supabase Realtime"
                      >
                        Local demo mode
                      </button>
                    )}
                  </div>
                  <h2 className="text-2xl font-cinzel font-bold text-[#FFF4DC]">
                    Tribunal Quorum Assembly
                  </h2>
                </div>

                {/* Big 4-Letter Code Display & Copy Button */}
                <div className="flex items-center gap-3 bg-[#1B2A41]/60 border border-[#C9993A]/50 px-4 py-2.5">
                  <div className="text-left">
                    <span className="text-[10px] font-cinzel uppercase text-[#D9B98A]/70 block">
                      Chamber Code
                    </span>
                    <span className="font-cinzel text-2xl font-black tracking-[0.25em] text-[#FFD988]">
                      {room.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(room.code)}
                    className="p-2 border border-[#C9993A]/40 text-[#D9B98A] hover:text-[#FFF4DC] hover:border-[#C9993A] transition-colors ml-2"
                    title="Copy code to clipboard"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Explanatory demo notice */}
              <div className="mt-4 pt-3 border-t border-[#C9993A]/15 text-xs text-[#D9B98A]/80 font-lora flex items-start gap-2 text-left">
                <Info className="w-4 h-4 text-[#C9993A] shrink-0 mt-0.5" />
                <span>
                  {realtimeConnected
                    ? 'Cross-device Realtime is live. Share this code with peers on any phone, tablet, or laptop to join this exact chamber in real time!'
                    : 'Running in local demo mode. Open another tab with this code or click "Simulate Advocate" below. Click "Local demo mode" above to connect Supabase.'}
                </span>
              </div>
            </AncientFrame>

            {/* Three Player Slots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((slotNum) => {
                const player = room.players.find((p) => p.slot === slotNum);
                const isCurrent = player?.id === currentPlayer?.id;

                return (
                  <div
                    key={slotNum}
                    className={`relative border p-5 transition-all duration-300 ${
                      player
                        ? isCurrent
                          ? 'bg-[#1E140D]/90 border-[#C9993A] shadow-[0_0_20px_rgba(201,153,58,0.25)]'
                          : 'bg-[#1E140D]/75 border-[#C9993A]/30'
                        : 'border-dashed border-[#C9993A]/20 bg-[#1E140D]/30 min-h-[160px] flex flex-col items-center justify-center'
                    }`}
                  >
                    {/* Corner Ornaments */}
                    <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-[#C9993A]" />
                    <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-[#C9993A]" />
                    <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-[#C9993A]" />
                    <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-[#C9993A]" />

                    {player ? (
                      <div className="flex flex-col justify-between h-full space-y-3">
                        <div className="flex items-center justify-between text-xs font-cinzel">
                          <span className="text-[#C9993A]">Advocate Slot 0{slotNum}</span>
                          {player.isHost && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[#E8883A] bg-[#E8883A]/15 px-1.5 py-0.5 border border-[#E8883A]/40">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                        </div>

                        {/* Silhouette avatar (Strict rule: No human faces anywhere) */}
                        <div className="flex justify-center my-2">
                          <div className="w-14 h-14 rounded-full border border-[#C9993A]/40 bg-[#1B2A41]/50 flex items-center justify-center text-[#EBD9B4]">
                            <svg viewBox="0 0 40 40" className="w-8 h-8 fill-current opacity-80">
                              <polygon points="20,6 26,12 26,20 20,24 14,20 14,12" />
                              <polygon points="20,26 32,34 32,38 8,38 8,34" />
                            </svg>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="font-cinzel font-bold text-[#FFF4DC] truncate text-base">
                            {player.name}
                          </div>
                          <div className="text-xs text-[#D9B98A]/80 font-lora">
                            {isCurrent ? '(You)' : player.isSimulated ? 'Simulated Advocate' : 'Remote Peer'}
                          </div>
                        </div>

                        {/* Remove simulated player button (if host) */}
                        {currentPlayer?.isHost && player.isSimulated && (
                          <div className="pt-2 text-center">
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              disabled={isLoading}
                              className="text-[11px] font-cinzel text-rose-300 hover:text-rose-100 underline decoration-rose-600 cursor-pointer"
                            >
                              Remove Advocate
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Users className="w-8 h-8 mx-auto text-[#C9993A]/40 mb-2 animate-pulse" />
                        <span className="block font-cinzel text-xs text-[#C9993A]/70 uppercase tracking-wider mb-1">
                          Slot 0{slotNum} Open
                        </span>
                        <p className="text-xs font-lora text-[#D9B98A]/60 italic">
                          Waiting for advocate...
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quorum Progress Bar / Status */}
            <div className="p-4 bg-[#1B2A41]/40 border border-[#C9993A]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-xs font-cinzel uppercase tracking-wider text-[#C9993A] block">
                  Tribunal Status ({room.players.length} / 3 Present)
                </span>
                <p className="text-sm font-lora text-[#FFF4DC]">
                  {room.players.length === 3
                    ? 'Quorum complete! The presiding host may now convene the court and distribute mandates.'
                    : `Awaiting ${3 - room.players.length} more advocate${3 - room.players.length > 1 ? 's' : ''} to commence proceedings.`}
                </p>
              </div>

              {/* Simulation Helper Button */}
              {room.players.length < 3 && (
                <AncientButton
                  variant="secondary"
                  onClick={handleAddMockPlayer}
                  disabled={isLoading}
                  className="py-2.5 px-4 text-xs whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5 inline" />
                  Simulate Advocate
                </AncientButton>
              )}
            </div>

            {/* Lobby Actions: Start Case button (Host only when 3 are present) or Exit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <AncientButton
                variant="ghost"
                onClick={handleExitRoom}
                className="py-3 px-6 text-xs w-full sm:w-auto"
              >
                Leave Chamber
              </AncientButton>

              {currentPlayer?.isHost ? (
                <AncientButton
                  variant="primary"
                  onClick={handleStartCase}
                  disabled={room.players.length < 3 || isLoading}
                  className="py-4 px-8 text-sm w-full sm:w-auto shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Convening...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 inline" />
                      {room.players.length === 3 ? 'Start Case (Assign Roles)' : 'Waiting for Quorum (3/3)'}
                    </>
                  )}
                </AncientButton>
              ) : (
                <div className="text-xs font-cinzel text-[#C9993A] italic bg-[#1E140D]/80 px-4 py-3 border border-[#C9993A]/30">
                  Waiting for presiding host to convene the court...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. ROLE ASSIGNMENT SCREEN */}
        {/* ======================================================== */}
        {screen === 'roles' && room && (
          <div className="w-full max-w-5xl animate-fade-in my-auto space-y-6">
            {/* Header */}
            <div className="text-center">
              <span className="text-xs font-cinzel uppercase tracking-[0.2em] text-[#C9993A] block mb-1">
                The Tribunal is Convened · Chamber {room.code}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-black text-[#FFF4DC] mb-2">
                JUDICIAL ROLE ASSIGNMENT
              </h2>
              <p className="text-sm sm:text-base font-lora text-[#D9B98A] max-w-2xl mx-auto italic">
                Each advocate has been assigned an independent perspective to examine the case evidence.
              </p>
            </div>

            {/* Three Lawyer Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['brothers', 'household', 'authorities'] as const).map((roleId) => {
                const role = LAWYER_ROLES[roleId];
                const assignedPlayer = room.players.find((p) => p.roleId === roleId);
                const isCurrent = assignedPlayer?.id === currentPlayer?.id;

                return (
                  <RoleCard
                    key={roleId}
                    role={role}
                    assignedPlayer={assignedPlayer}
                    isCurrentPlayer={isCurrent}
                    onSelectDetails={() => setSelectedRoleDetail(role)}
                  />
                );
              })}
            </div>

            {/* Detail Drawer Modal (When a role card is clicked to read full mandate) */}
            {selectedRoleDetail && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="role-mandate-title"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={() => setSelectedRoleDetail(null)}
              >
                <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <AncientFrame glow>
                    <div className="text-center mb-4">
                      <span className="text-xs font-cinzel uppercase tracking-widest text-[#C9993A] block mb-1">
                        Mandate Dossier
                      </span>
                      <h3 id="role-mandate-title" className="text-2xl font-cinzel font-bold text-[#FFF4DC]">
                        {selectedRoleDetail.title}
                      </h3>
                      <p className="text-xs font-cinzel text-[#C9993A]">
                        {selectedRoleDetail.alignment}
                      </p>
                    </div>

                    <div className="space-y-4 text-sm font-lora text-[#D9B98A] my-6">
                      <div className="p-3 bg-[#1B2A41]/40 border border-[#C9993A]/30">
                        <span className="font-cinzel text-xs text-[#FFF4DC] block mb-1">
                          Judicial Strategy & Case Theory:
                        </span>
                        <p>{selectedRoleDetail.fullDescription}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs font-cinzel">
                        <div className="p-2.5 bg-[#1E140D]/80 border border-[#C9993A]/20">
                          <span className="text-[#C9993A] block text-[10px] uppercase">Primary Physical Exhibit</span>
                          <span className="text-[#FFF4DC]">{selectedRoleDetail.primaryExhibit}</span>
                        </div>
                        <div className="p-2.5 bg-[#1E140D]/80 border border-[#C9993A]/20">
                          <span className="text-[#C9993A] block text-[10px] uppercase">Core Moral Dilemma</span>
                          <span className="text-[#FFF4DC]">{selectedRoleDetail.keyMotive}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <AncientButton
                        variant="primary"
                        onClick={() => setSelectedRoleDetail(null)}
                        className="px-6 py-2.5"
                      >
                        Return to Tribunal
                      </AncientButton>
                    </div>
                  </AncientFrame>
                </div>
              </div>
            )}

            {/* Next Steps Banner (Step 1 Boundary Note) */}
            <div className="p-4 bg-[#231710]/80 border border-[#C9993A]/30 text-center">
              <span className="text-xs font-cinzel uppercase tracking-wider text-[#FFD988] block mb-1">
                Trial Preparation Complete
              </span>
              <p className="text-xs sm:text-sm font-lora text-[#D9B98A] max-w-xl mx-auto">
                All three advocate roles are successfully allocated. Courtroom cross-examination, evidence unsealing, and puzzle chambers will begin in the next phase!
              </p>
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <AncientButton
                variant="ghost"
                onClick={handleReturnToLobby}
                disabled={isLoading}
                className="py-3 px-6 text-xs w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5 inline" />
                Return to Lobby
              </AncientButton>

              {currentPlayer?.isHost && (
                <AncientButton
                  variant="secondary"
                  onClick={handleStartCase}
                  disabled={isLoading}
                  className="py-3 px-6 text-xs w-full sm:w-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 inline" />
                  Re-shuffle Roles
                </AncientButton>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer / Status bar (Quiet & uncluttered as required by constitution) */}
      <footer className="relative z-20 py-3 px-6 border-t border-[#C9993A]/15 bg-[#1E140D]/80 text-center text-xs font-cinzel text-[#D9B98A]/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>The Case of Yusuf · Comparative Narrative Tribunal</span>
        <div className="flex items-center gap-4 text-[11px]">
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="hover:text-[#FFF4DC] transition-colors cursor-pointer text-[#C9993A]"
          >
            {realtimeConnected ? 'Supabase: Active' : 'Supabase: Local Demo'}
          </button>
          <span>·</span>
          <button
            onClick={() => setIsHowToPlayOpen(true)}
            className="hover:text-[#FFF4DC] transition-colors cursor-pointer"
          >
            How to Play
          </button>
          <span>·</span>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="hover:text-[#FFF4DC] transition-colors cursor-pointer"
          >
            About Project
          </button>
        </div>
      </footer>

      {/* Modals */}
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChange={handleConfigChanged}
      />
    </div>
  );
}
