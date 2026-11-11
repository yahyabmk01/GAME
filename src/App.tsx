/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * The Case of Yusuf — Courtroom Mystery Front End
 * Upgraded Courtroom Hub with animated video background, 16:9 scaling,
 * interactive hotspots (The Judge, Evidence Board, My Podium),
 * and unroll unlock animations.
 */

import React, { useState, useEffect, useId } from 'react';
import {
  createRoom,
  joinRoom,
  getRoomState,
  assignRoles,
  enterCourtroomHub,
  unlockEvidence,
  unlockRandomEvidence,
  addMockPlayer,
  removePlayer,
  returnToLobby,
  subscribeToRoom,
  isRealtimeActive,
  startRound,
  startUnsealingExhibit,
  releaseUnsealingExhibit,
  claimExhibit,
  nextRound,
  restoreActiveSession,
  clearUserSession,
  RoomState,
  Player,
  LAWYER_ROLES,
  LawyerRole
} from './gameState';
import {
  EVIDENCE_CATALOGUE,
  EvidenceItem,
  ROUNDS,
  getRoundById,
  CourtroomRound
} from './evidence';
import { DesertBackdrop } from './components/DesertBackdrop';
import { AncientFrame, AncientButton } from './components/AncientFrame';
import { RoleCard } from './components/RoleCard';
import { HowToPlayModal } from './components/HowToPlayModal';
import { AboutModal } from './components/AboutModal';
import { SupabaseModal } from './components/SupabaseModal';
import { CourtroomHub } from './components/CourtroomHub';
import { EvidenceUnlockModal } from './components/EvidenceUnlockModal';
import { EvidenceArchiveModal } from './components/EvidenceArchiveModal';
import { JudgeModal, PodiumModal } from './components/CourtroomModals';
import { RoundIntroModal } from './components/RoundIntroModal';
import { HoldToUnsealModal } from './components/HoldToUnsealModal';
import { RoundResultsModal } from './components/RoundResultsModal';
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
  Loader2,
  Bell
} from 'lucide-react';

type Screen = 'menu' | 'create' | 'join' | 'lobby' | 'roles' | 'courtroom';

// Atmospheric synthesized web audio chimes (gentle modal feedback)
function playAncientChime(type: 'click' | 'join' | 'assign' | 'copy' | 'unlock') {
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
    } else if (type === 'unlock') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
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

  // General Modals
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<LawyerRole | null>(null);

  // Courtroom Hub Hotspot Modals
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isEvidenceArchiveOpen, setIsEvidenceArchiveOpen] = useState(false);
  const [isPodiumModalOpen, setIsPodiumModalOpen] = useState(false);

  // Round Intro Modal State
  const [isRoundIntroOpen, setIsRoundIntroOpen] = useState(false);

  // Exclusive Hold-to-Unseal Puzzle Modal State
  const [isHoldPuzzleOpen, setIsHoldPuzzleOpen] = useState(false);
  const [puzzleEvidenceItem, setPuzzleEvidenceItem] = useState<EvidenceItem | null>(null);

  // Time's Up Results Modal State
  const [isTimesUpModalOpen, setIsTimesUpModalOpen] = useState(false);

  // Evidence Unlock Animation
  const [unlockedEvidenceItem, setUnlockedEvidenceItem] = useState<EvidenceItem | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockedByText, setUnlockedByText] = useState<string>('');
  const [forceFirstTimeAnim, setForceFirstTimeAnim] = useState(false);

  // Peer Sync Toast Notification
  const [peerUnlockToast, setPeerUnlockToast] = useState<{
    text: string;
    item: EvidenceItem;
  } | null>(null);

  // Realtime Status
  const [realtimeConnected, setRealtimeConnected] = useState(isRealtimeActive());

  // UI helpers
  const [copiedCode, setCopiedCode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const triggerSound = (type: 'click' | 'join' | 'assign' | 'copy' | 'unlock') => {
    if (soundEnabled) playAncientChime(type);
  };

  const handleConfigChanged = () => {
    setRealtimeConnected(isRealtimeActive());
  };

  // Track last seen evidence unlock & claim to trigger peer toasts
  const [lastKnownEvidenceId, setLastKnownEvidenceId] = useState<string | null>(null);
  const [lastKnownClaimedId, setLastKnownClaimedId] = useState<string | null>(null);

  // Auto-restore active session if player refreshes or returns to the browser
  useEffect(() => {
    let isCancelled = false;
    const attemptRestore = async () => {
      try {
        const restored = await restoreActiveSession();
        if (restored && !isCancelled) {
          setRoom(restored.room);
          setCurrentPlayer(restored.player);
          if (restored.room.status === 'courtroom_hub') {
            setScreen('courtroom');
          } else if (restored.room.status === 'roles_assigned') {
            setScreen('roles');
          } else {
            setScreen('lobby');
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      }
    };

    attemptRestore();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Subscribe to room updates whenever in an active room
  useEffect(() => {
    if (!room?.code) return;

    const unsubscribe = subscribeToRoom(room.code, (updatedRoom) => {
      if (!updatedRoom) {
        setRoom(null);
        setCurrentPlayer(null);
        clearUserSession();
        setScreen('menu');
        setErrorMessage('The tribunal chamber was dissolved by the presiding host.');
      } else {
        // Detect peer exclusive exhibit claim
        if (
          updatedRoom.lastClaimedExhibitId &&
          updatedRoom.lastClaimedExhibitId !== lastKnownClaimedId &&
          updatedRoom.lastClaimedByPlayerName !== currentPlayer?.name
        ) {
          const found = EVIDENCE_CATALOGUE.find(e => e.id === updatedRoom.lastClaimedExhibitId);
          if (found) {
            setPeerUnlockToast({
              text: `${updatedRoom.lastClaimedByPlayerName || 'Another advocate'} claimed ${found.number}: ${found.title} (${found.tier === 'strong' ? 'Strong · 3 pts' : 'Standard · 1 pt'})`,
              item: found
            });
            triggerSound('unlock');
            setTimeout(() => setPeerUnlockToast(null), 5000);
          }
        }
        if (updatedRoom.lastClaimedExhibitId) {
          setLastKnownClaimedId(updatedRoom.lastClaimedExhibitId);
        }

        // Detect peer evidence unlock via sync (backward compatibility)
        if (
          updatedRoom.lastUnlockedEvidenceId &&
          updatedRoom.lastUnlockedEvidenceId !== lastKnownEvidenceId &&
          updatedRoom.lastUnlockedByPlayerName !== currentPlayer?.name
        ) {
          const found = EVIDENCE_CATALOGUE.find(e => e.id === updatedRoom.lastUnlockedEvidenceId);
          if (found) {
            setPeerUnlockToast({
              text: `${updatedRoom.lastUnlockedByPlayerName || 'Another advocate'} discovered ${found.number}: ${found.title}`,
              item: found
            });
            triggerSound('unlock');
            setTimeout(() => setPeerUnlockToast(null), 5000);
          }
        }
        if (updatedRoom.lastUnlockedEvidenceId) {
          setLastKnownEvidenceId(updatedRoom.lastUnlockedEvidenceId);
        }

        // Sync round changes (e.g. host started next round)
        if (room && updatedRoom.currentRoundId !== room.currentRoundId) {
          setIsTimesUpModalOpen(false);
          setIsHoldPuzzleOpen(false);
          setIsRoundIntroOpen(true);
        }

        setRoom(updatedRoom);

        // Sync current player with updated room data
        if (currentPlayer) {
          const matched = updatedRoom.players.find(p => p.id === currentPlayer.id);
          if (matched) {
            setCurrentPlayer(matched);
          }
        }

        // Automatic room transitions across peers
        if (updatedRoom.status === 'roles_assigned' && screen === 'lobby') {
          setScreen('roles');
          triggerSound('assign');
        } else if (updatedRoom.status === 'courtroom_hub' && (screen === 'roles' || screen === 'lobby')) {
          setScreen('courtroom');
          setIsRoundIntroOpen(true);
        } else if (updatedRoom.status === 'lobby' && (screen === 'roles' || screen === 'courtroom')) {
          setScreen('lobby');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [room?.code, screen, currentPlayer?.id, currentPlayer?.name, lastKnownEvidenceId, lastKnownClaimedId]);

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
      if (joinedRoom.status === 'courtroom_hub') {
        setScreen('courtroom');
      } else if (joinedRoom.status === 'roles_assigned') {
        setScreen('roles');
      } else {
        setScreen('lobby');
      }
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

  // Handler: Enter Courtroom Hub
  const handleEnterCourtroom = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await enterCourtroomHub(room.code);
      setRoom(updated);
      setScreen('courtroom');
      setIsRoundIntroOpen(true);
      triggerSound('click');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Attempt to claim an exhibit (opens HoldToUnsealModal and sets lock)
  const handleAttemptClaim = async (item: EvidenceItem) => {
    if (!room || !currentPlayer) return;
    setPuzzleEvidenceItem(item);
    setIsHoldPuzzleOpen(true);
    setIsEvidenceArchiveOpen(false);
    // Lock the exhibit for this player
    await startUnsealingExhibit(room.code, item.id, currentPlayer.id, currentPlayer.name);
  };

  // Handler: Cancel holding/unsealing
  const handleCancelClaimHold = async () => {
    if (!room || !puzzleEvidenceItem) return;
    await releaseUnsealingExhibit(room.code, puzzleEvidenceItem.id);
  };

  // Handler: Atomic submission of claim
  const handleCompleteClaim = async (): Promise<{ success: boolean; claimedByOther?: string }> => {
    if (!room || !currentPlayer || !puzzleEvidenceItem) {
      return { success: false };
    }
    const res = await claimExhibit(
      room.code,
      puzzleEvidenceItem.id,
      currentPlayer.id,
      currentPlayer.name,
      puzzleEvidenceItem.points,
      puzzleEvidenceItem.tier
    );

    if (res.success) {
      setRoom(res.room);
      triggerSound('unlock');
      setUnlockedEvidenceItem(puzzleEvidenceItem);
      setUnlockedByText(`Claimed by ${currentPlayer.name} (+${puzzleEvidenceItem.points} pts)`);
      setIsHoldPuzzleOpen(false);
      setForceFirstTimeAnim(true);
      setIsUnlockModalOpen(true);
      return { success: true };
    } else {
      return {
        success: false,
        claimedByOther: res.claimedByOther
      };
    }
  };

  // Handler: Time's Up trigger
  const handleTimesUp = () => {
    setIsTimesUpModalOpen(true);
    setIsHoldPuzzleOpen(false);
  };

  // Handler: Advance to next round
  const handleNextRound = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const updated = await nextRound(room.code);
      setRoom(updated);
      setIsTimesUpModalOpen(false);
      setIsRoundIntroOpen(true);
      triggerSound('assign');
    } catch (err: unknown) {
      console.error('Failed to advance round:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Unlock Random Evidence
  const handleUnlockRandomEvidence = async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const actorName = currentPlayer?.name || 'Tribunal Quorum';
      const { room: updatedRoom, unlockedItem } = await unlockRandomEvidence(room.code, actorName);
      setRoom(updatedRoom);
      if (unlockedItem) {
        setUnlockedEvidenceItem(unlockedItem);
        setUnlockedByText(`Unsealed by ${actorName}`);
        setForceFirstTimeAnim(true);
        setIsUnlockModalOpen(true);
        triggerSound('unlock');
      }
    } catch (err: unknown) {
      console.error('Failed to unlock random exhibit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Add Simulated Player
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
    clearUserSession();
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
      {/* Background: Low-poly desert on lobby/menu; Video hub in Courtroom view */}
      {screen !== 'courtroom' && <DesertBackdrop />}

      {/* Top Bar for non-courtroom screens */}
      {screen !== 'courtroom' && (
        <header className="relative z-20 flex items-center justify-between gap-6 px-4 sm:px-6 py-4 border-b border-[#C9993A]/20 bg-[#1E140D]/75 backdrop-blur-md">
          {/* Zone 1: Wordmark */}
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

          {/* Zone 3: Mobile Supabase + Audio toggle */}
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
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* ======================================================== */}
        {/* 1. MAIN MENU SCREEN */}
        {/* ======================================================== */}
        {screen === 'menu' && (
          <div className="w-full max-w-xl text-center animate-fade-in my-auto p-4 sm:p-6">
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

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-black tracking-wider text-[#FFF4DC] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] mb-3 leading-tight">
              THE CASE OF YUSUF
            </h1>
            <p className="text-base sm:text-lg font-lora text-[#D9B98A] max-w-md mx-auto mb-8 italic">
              A courtroom mystery for three players
            </p>

            <AncientFrame glow className="space-y-4 max-w-md mx-auto">
              <AncientButton fullWidth variant="primary" onClick={handleInitiateCreate} className="py-4 text-base">
                Create Room
              </AncientButton>

              <AncientButton fullWidth variant="secondary" onClick={handleInitiateJoin} className="py-4 text-base">
                Join Room
              </AncientButton>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <AncientButton variant="ghost" onClick={() => setIsHowToPlayOpen(true)} className="py-3 text-xs">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 inline" />
                  How to Play
                </AncientButton>
                <AncientButton variant="ghost" onClick={() => setIsAboutOpen(true)} className="py-3 text-xs">
                  <Info className="w-3.5 h-3.5 mr-1.5 inline" />
                  About Project
                </AncientButton>
              </div>

              <div className="pt-2 border-t border-[#C9993A]/15 text-center">
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-cinzel text-[#C9993A] hover:text-[#FFF4DC] transition-colors"
                >
                  <Database className="w-3 h-3" />
                  <span>{realtimeConnected ? 'Supabase Realtime Ready' : 'Connect Supabase for Multi-Device Play'}</span>
                </button>
              </div>
            </AncientFrame>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. CREATE ROOM SCREEN */}
        {/* ======================================================== */}
        {screen === 'create' && (
          <div className="w-full max-w-md animate-fade-in my-auto p-4 sm:p-6">
            <AncientFrame glow>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#C9993A]/20">
                <button
                  onClick={() => setScreen('menu')}
                  className="inline-flex items-center gap-1.5 text-xs font-cinzel text-[#D9B98A] hover:text-[#FFF4DC] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
                </button>
                <span className="text-xs font-cinzel text-[#C9993A] uppercase tracking-wider">Chamber Setup</span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-cinzel font-bold text-[#EBD9B4] mb-1">Found a High Chamber</h2>
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

                {errorMessage && (
                  <div className="p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 text-left">
                    {errorMessage}
                  </div>
                )}

                <AncientButton fullWidth variant="primary" type="submit" disabled={isLoading} className="py-4">
                  {isLoading ? 'Creating Chamber...' : 'Generate Code & Enter Lobby'}
                </AncientButton>
              </form>
            </AncientFrame>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. JOIN ROOM SCREEN */}
        {/* ======================================================== */}
        {screen === 'join' && (
          <div className="w-full max-w-md animate-fade-in my-auto p-4 sm:p-6">
            <AncientFrame glow>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#C9993A]/20">
                <button
                  onClick={() => setScreen('menu')}
                  className="inline-flex items-center gap-1.5 text-xs font-cinzel text-[#D9B98A] hover:text-[#FFF4DC] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
                </button>
                <span className="text-xs font-cinzel text-[#C9993A] uppercase tracking-wider">Chamber Entry</span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-cinzel font-bold text-[#EBD9B4] mb-1">Enter Existing Chamber</h2>
                <p className="text-xs font-lora text-[#D9B98A]">Provide your name and the 4-letter room code given by the presiding host.</p>
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

                <AncientButton fullWidth variant="primary" type="submit" disabled={isLoading} className="py-4">
                  {isLoading ? 'Entering Chamber...' : 'Join Chamber Quorum'}
                </AncientButton>
              </form>
            </AncientFrame>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. LOBBY SCREEN */}
        {/* ======================================================== */}
        {screen === 'lobby' && room && (
          <div className="w-full max-w-3xl animate-fade-in my-auto p-4 sm:p-6 space-y-6">
            <AncientFrame glow className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-cinzel uppercase tracking-widest text-[#C9993A]">Courtroom Chamber</span>
                    {realtimeConnected ? (
                      <span className="text-[11px] font-cinzel uppercase tracking-wider px-2 py-0.5 bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 inline-flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Supabase Realtime
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsSupabaseModalOpen(true)}
                        className="text-[11px] font-cinzel uppercase tracking-wider px-2 py-0.5 bg-[#E8883A]/20 border border-[#E8883A]/50 text-[#FFC145] hover:bg-[#E8883A]/30 transition-colors"
                      >
                        Local demo mode
                      </button>
                    )}
                  </div>
                  <h2 className="text-2xl font-cinzel font-bold text-[#FFF4DC]">Tribunal Quorum Assembly</h2>
                </div>

                <div className="flex items-center gap-3 bg-[#1B2A41]/60 border border-[#C9993A]/50 px-4 py-2.5">
                  <div className="text-left">
                    <span className="text-[10px] font-cinzel uppercase text-[#D9B98A]/70 block">Chamber Code</span>
                    <span className="font-cinzel text-2xl font-black tracking-[0.25em] text-[#FFD988]">{room.code}</span>
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

              <div className="mt-4 pt-3 border-t border-[#C9993A]/15 text-xs text-[#D9B98A]/80 font-lora flex items-start gap-2 text-left">
                <Info className="w-4 h-4 text-[#C9993A] shrink-0 mt-0.5" />
                <span>
                  Share this 4-letter code with two other players, or use the simulation button below to fill the quorum for local testing.
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

                        <div className="flex justify-center my-2">
                          <div className="w-14 h-14 rounded-full border border-[#C9993A]/40 bg-[#1B2A41]/50 flex items-center justify-center text-[#EBD9B4]">
                            <svg viewBox="0 0 40 40" className="w-8 h-8 fill-current opacity-80">
                              <polygon points="20,6 26,12 26,20 20,24 14,20 14,12" />
                              <polygon points="20,26 32,34 32,38 8,38 8,34" />
                            </svg>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="font-cinzel font-bold text-[#FFF4DC] truncate text-base">{player.name}</div>
                          <div className="text-xs text-[#D9B98A]/80 font-lora">
                            {isCurrent ? '(You)' : player.isSimulated ? 'Simulated Advocate' : 'Remote Peer'}
                          </div>
                        </div>

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
                        <p className="text-xs font-lora text-[#D9B98A]/60 italic">Waiting for advocate...</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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

              {room.players.length < 3 && (
                <AncientButton
                  variant="secondary"
                  onClick={handleAddMockPlayer}
                  disabled={isLoading}
                  className="py-2.5 px-4 text-xs whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5 inline" /> Simulate Advocate
                </AncientButton>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <AncientButton variant="ghost" onClick={handleExitRoom} className="py-3 px-6 text-xs w-full sm:w-auto">
                Leave Chamber
              </AncientButton>

              {currentPlayer?.isHost ? (
                <AncientButton
                  variant="primary"
                  onClick={handleStartCase}
                  disabled={room.players.length < 3 || isLoading}
                  className="py-4 px-8 text-sm w-full sm:w-auto shadow-lg"
                >
                  <Play className="w-4 h-4 mr-2 inline" />
                  {room.players.length === 3 ? 'Start Case (Assign Roles)' : 'Waiting for Quorum (3/3)'}
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
          <div className="w-full max-w-5xl animate-fade-in my-auto p-4 sm:p-6 space-y-6">
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

            {/* Role Detail Modal */}
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
                      <span className="text-xs font-cinzel uppercase tracking-widest text-[#C9993A] block mb-1">Mandate Dossier</span>
                      <h3 id="role-mandate-title" className="text-2xl font-cinzel font-bold text-[#FFF4DC]">{selectedRoleDetail.title}</h3>
                      <p className="text-xs font-cinzel text-[#C9993A]">{selectedRoleDetail.alignment}</p>
                    </div>

                    <div className="space-y-4 text-sm font-lora text-[#D9B98A] my-6">
                      <div className="p-3 bg-[#1B2A41]/40 border border-[#C9993A]/30">
                        <span className="font-cinzel text-xs text-[#FFF4DC] block mb-1">Judicial Strategy & Case Theory:</span>
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
                      <AncientButton variant="primary" onClick={() => setSelectedRoleDetail(null)} className="px-6 py-2.5">
                        Return to Tribunal
                      </AncientButton>
                    </div>
                  </AncientFrame>
                </div>
              </div>
            )}

            {/* Enter Courtroom Hub Primary Action */}
            <div className="p-6 bg-[#231710]/90 border border-[#C9993A]/40 text-center space-y-4 shadow-xl">
              <div>
                <span className="text-xs font-cinzel uppercase tracking-wider text-[#FFD988] block mb-1">
                  Tribunal Floor Ready
                </span>
                <p className="text-xs sm:text-sm font-lora text-[#D9B98A] max-w-xl mx-auto">
                  Roles are registered. Proceed to the High Courtroom Hub to inspect the physical evidence board, take your defense podium, and address the High Judge.
                </p>
              </div>

              <div className="flex justify-center">
                <AncientButton
                  variant="primary"
                  onClick={handleEnterCourtroom}
                  disabled={isLoading}
                  className="py-4 px-10 text-sm shadow-2xl"
                >
                  <Scale className="w-4 h-4 mr-2 inline text-[#1E140D]" />
                  Enter Courtroom Chamber
                </AncientButton>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <AncientButton variant="ghost" onClick={handleReturnToLobby} disabled={isLoading} className="py-3 px-6 text-xs w-full sm:w-auto">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5 inline" /> Return to Lobby
              </AncientButton>

              {currentPlayer?.isHost && (
                <AncientButton variant="secondary" onClick={handleStartCase} disabled={isLoading} className="py-3 px-6 text-xs w-full sm:w-auto">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 inline" /> Re-shuffle Roles
                </AncientButton>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. COURTROOM HUB SCREEN (16:9 Animated Video Backdrop)   */}
        {/* ======================================================== */}
        {screen === 'courtroom' && room && (
          <div className="w-full h-screen flex flex-col">
            <CourtroomHub
              room={room}
              currentPlayer={currentPlayer}
              onOpenJudge={() => setIsJudgeModalOpen(true)}
              onOpenEvidenceBoard={() => setIsEvidenceArchiveOpen(true)}
              onOpenPodium={() => setIsPodiumModalOpen(true)}
              onUnlockRandom={handleUnlockRandomEvidence}
              onReturnToRoles={() => setScreen('roles')}
              onTimesUp={handleTimesUp}
              realtimeActive={realtimeConnected}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
            />
          </div>
        )}
      </main>

      {/* Floating Peer Unlock / Claim Toast */}
      {peerUnlockToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce max-w-sm">
          <div className="p-3.5 bg-[#1B2A41]/95 border-2 border-[#FFD988] shadow-2xl backdrop-blur-md text-xs font-cinzel text-[#FFF4DC] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFC145] shrink-0" />
              <span>{peerUnlockToast.text}</span>
            </div>
            <button
              onClick={() => {
                setUnlockedEvidenceItem(peerUnlockToast.item);
                setIsUnlockModalOpen(true);
                setPeerUnlockToast(null);
              }}
              className="px-2 py-1 bg-[#C9993A] text-[#1E140D] font-bold text-[10px] uppercase shrink-0"
            >
              Examine
            </button>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChange={handleConfigChanged}
      />

      {/* 1. Round Intro Countdown Overlay */}
      {room && (
        <RoundIntroModal
          isOpen={isRoundIntroOpen}
          round={getRoundById(room.currentRoundId) || ROUNDS[0]}
          onComplete={() => setIsRoundIntroOpen(false)}
        />
      )}

      {/* 2. Courtroom Hotspot: Judge Bench */}
      <JudgeModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        roomCode={room?.code || ''}
      />

      {/* 3. Courtroom Hotspot: Evidence Board with Claiming */}
      {room && (
        <EvidenceArchiveModal
          isOpen={isEvidenceArchiveOpen}
          onClose={() => setIsEvidenceArchiveOpen(false)}
          room={room}
          currentPlayer={currentPlayer}
          onReadEvidence={(item) => {
            setUnlockedEvidenceItem(item);
            setForceFirstTimeAnim(false);
            setIsUnlockModalOpen(true);
          }}
          onAttemptClaim={handleAttemptClaim}
        />
      )}

      {/* 4. Courtroom Hotspot: My Advocate's Podium with 'In Your Hand' */}
      <PodiumModal
        isOpen={isPodiumModalOpen}
        onClose={() => setIsPodiumModalOpen(false)}
        player={currentPlayer}
        room={room}
        onSelectEvidence={(item) => {
          setUnlockedEvidenceItem(item);
          setForceFirstTimeAnim(false);
          setIsUnlockModalOpen(true);
        }}
      />

      {/* 5. Exclusive Claim Placeholder Puzzle (Hold for 3s) */}
      <HoldToUnsealModal
        isOpen={isHoldPuzzleOpen}
        evidence={puzzleEvidenceItem}
        onClose={() => {
          handleCancelClaimHold();
          setIsHoldPuzzleOpen(false);
        }}
        onStartHold={() => {}}
        onCancelHold={handleCancelClaimHold}
        onCompleteClaim={handleCompleteClaim}
      />

      {/* 6. Time's Up Results Scoreboard Overlay */}
      {room && (
        <RoundResultsModal
          isOpen={isTimesUpModalOpen}
          room={room}
          currentRound={getRoundById(room.currentRoundId) || ROUNDS[0]}
          currentPlayer={currentPlayer}
          onNextRound={handleNextRound}
          onClose={() => setIsTimesUpModalOpen(false)}
        />
      )}

      {/* 7. Reusable Scroll Unroll & Ticket Modal */}
      <EvidenceUnlockModal
        isOpen={isUnlockModalOpen}
        evidence={unlockedEvidenceItem}
        onClose={() => {
          setIsUnlockModalOpen(false);
          setForceFirstTimeAnim(false);
        }}
        unlockedByPlayerName={unlockedByText}
        isClaimedByMe={Boolean(
          unlockedEvidenceItem &&
          currentPlayer &&
          room?.claims?.[unlockedEvidenceItem.id]?.claimedByPlayerId === currentPlayer.id
        )}
        canClaim={Boolean(
          unlockedEvidenceItem &&
          room &&
          room.currentRoundId &&
          unlockedEvidenceItem.roundId === room.currentRoundId &&
          !room.claims?.[unlockedEvidenceItem.id]
        )}
        onClaim={(item) => {
          setIsUnlockModalOpen(false);
          handleAttemptClaim(item);
        }}
        forceFirstTimeAnim={forceFirstTimeAnim}
      />
    </div>
  );
}
