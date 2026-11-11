/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game State & Room Management Layer
 * 
 * Manages:
 * - Room creation & joining
 * - Player role distribution
 * - Shared round state and synchronized timers
 * - Atomic exclusive evidence claiming & puzzle locking (with 60s timeout)
 * - Live scores per player
 * - Supabase Realtime + Local Demo Mode fallback
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import {
  EVIDENCE_CATALOGUE,
  ROUNDS,
  getRoundById,
  INITIAL_UNLOCKED_EVIDENCE_IDS,
  EvidenceItem,
  CourtroomRound
} from './evidence';

export type LawyerRoleId = 'brothers' | 'household' | 'authorities';

export interface LawyerRole {
  id: LawyerRoleId;
  title: string;
  shortDescription: string;
  fullDescription: string;
  alignment: string;
  primaryExhibit: string;
  keyMotive: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  slot: 1 | 2 | 3;
  roleId?: LawyerRoleId;
  joinedAt: number;
  isSimulated?: boolean;
}

export interface EvidenceClaim {
  claimedByPlayerId: string;
  claimedByPlayerName: string;
  claimedAt: number;
  points: number;
  tier: 'strong' | 'standard';
  exhibitId: string;
}

export interface EvidenceLock {
  lockedByPlayerId: string;
  lockedByPlayerName: string;
  lockedAt: number;
}

export interface RoomState {
  code: string;
  status: 'lobby' | 'roles_assigned' | 'courtroom_hub' | 'in_case';
  players: Player[];
  maxPlayers: 3;
  createdAt: number;
  // Round & Timer State
  currentRoundId: string;
  roundEndsAt: number; // epoch ms
  roundIntroActive?: boolean;
  // Exclusive Evidence Claiming & Scoreboard
  claims: Record<string, EvidenceClaim>; // exhibitId -> claim info
  locks: Record<string, EvidenceLock>; // exhibitId -> being unsealed info
  scores: Record<string, number>; // playerId -> total points
  lastClaimedExhibitId?: string;
  lastClaimedByPlayerName?: string;
  // Backward compatibility
  unlockedEvidenceIds: string[];
  lastUnlockedEvidenceId?: string;
  lastUnlockedByPlayerName?: string;
}

export const LAWYER_ROLES: Record<LawyerRoleId, LawyerRole> = {
  brothers: {
    id: 'brothers',
    title: 'Lawyer for the Brothers',
    shortDescription: 'Defend the sons of Jacob, arguing their intentions, famine distress, and moral repentance.',
    fullDescription: 'Advocate for the eleven brothers journeying from Canaan. You must prove they did not arrive as spies, explain the desperation of their starving families, and substantiate that Benjamin is not a thief.',
    alignment: 'Sons of Jacob / Canaanite Nomads',
    primaryExhibit: 'The Sheaf of Grain & The Return Money',
    keyMotive: 'Survival of the family line and atonement for the past'
  },
  household: {
    id: 'household',
    title: 'Lawyer for the Household',
    shortDescription: 'Represent the Egyptian noble estate, examining palace honor, domestic testimony, and the torn tunic.',
    fullDescription: 'Represent the High Chamberlain Potiphar (Al-Aziz) and his noble manor. You must protect household sanctity, weigh conflicting private depositions, and interpret the physical forensics of the torn garment.',
    alignment: 'Estate of Al-Aziz / Potiphar',
    primaryExhibit: 'The Torn Tunic (From Front or Back)',
    keyMotive: 'Defending noble household honor and uncovering the truth of the inner chamber'
  },
  authorities: {
    id: 'authorities',
    title: 'Lawyer for the Authorities',
    shortDescription: 'Stand for Pharaoh\'s justice and state granaries, scrutinizing decrees, rations, and the royal goblet.',
    fullDescription: 'Represent the Royal Ministry of Granaries and Pharaonic High Justice. You must uphold state rationing laws during the seven-year famine, enforce border declarations, and investigate the missing silver divining cup.',
    alignment: 'Pharaoh\'s Royal Directorate of Grain',
    primaryExhibit: 'The King\'s Silver Divining Goblet',
    keyMotive: 'Absolute imperial sovereignty, grain security, and preventing diplomatic treachery'
  }
};

const STORAGE_KEY = 'case_of_yusuf_rooms_v1';
const LISTENERS = new Set<(room: RoomState | null) => void>();

// In-memory cache for room enhancements across Supabase calls
const ROOM_CACHE: Record<string, Partial<RoomState>> = {};

// ============================================================================
// USER SESSION & RECONNECT RECOVERY
// ============================================================================
const USER_SESSION_KEY = 'case_of_yusuf_active_session_v1';

export interface UserSession {
  roomCode: string;
  playerId: string;
  playerName: string;
}

export function saveUserSession(session: UserSession): void {
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // LocalStorage unavailable
  }
}

export function getUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(USER_SESSION_KEY);
  } catch {
    // LocalStorage unavailable
  }
}

export async function restoreActiveSession(): Promise<{ room: RoomState; player: Player } | null> {
  const session = getUserSession();
  if (!session?.roomCode || !session?.playerId) return null;

  try {
    const room = await getRoomState(session.roomCode);
    if (!room) {
      clearUserSession();
      return null;
    }
    const matchedPlayer = room.players.find(p => p.id === session.playerId);
    if (!matchedPlayer) {
      clearUserSession();
      return null;
    }
    return { room, player: matchedPlayer };
  } catch {
    clearUserSession();
    return null;
  }
}

export function isRealtimeActive(): boolean {
  return isSupabaseConfigured();
}

function cleanExpiredLocks(locks: Record<string, EvidenceLock>): Record<string, EvidenceLock> {
  const now = Date.now();
  const clean: Record<string, EvidenceLock> = {};
  for (const [id, lock] of Object.entries(locks)) {
    // Release if older than 60 seconds (60000ms)
    if (now - lock.lockedAt < 60000) {
      clean[id] = lock;
    }
  }
  return clean;
}

// Generate distinct random 4-letter room codes rooted in desert & scriptural themes
const ROOM_CODE_POOL = [
  'YSUF', 'NILE', 'ALEM', 'DUNE', 'SACK', 'WELL', 'GOLD', 'CORN',
  'PALE', 'AZIZ', 'SEAL', 'STAR', 'CUPP', 'GIFT', 'ROBE', 'OATH'
];

function generateRandomCode(): string {
  const available = ROOM_CODE_POOL;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (Math.random() > 0.3) {
    return available[Math.floor(Math.random() * available.length)];
  }
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// ============================================================================
// LOCAL STORAGE FALLBACK LOGIC
// ============================================================================
function getAllLocalRooms(): Record<string, RoomState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRooms(rooms: Record<string, RoomState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch (err) {
    console.error('Failed to persist room state to localStorage', err);
  }
}

function notifyLocalSubscribers(room: RoomState | null) {
  LISTENERS.forEach(cb => {
    try {
      cb(room);
    } catch (err) {
      console.error('Listener callback error', err);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      notifyLocalSubscribers(null);
    }
  });
}

// ============================================================================
// SUPABASE REALTIME PERSISTENCE HELPERS
// ============================================================================
async function fetchRoomFromSupabase(code: string): Promise<RoomState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (roomError || !roomData) return null;

    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_code', code)
      .order('slot', { ascending: true });

    if (playersError) {
      console.error('Error fetching room players from Supabase:', playersError);
      return null;
    }

    const players: Player[] = (playersData || []).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.is_host,
      slot: p.slot as 1 | 2 | 3,
      roleId: p.role_id ? (p.role_id as LawyerRoleId) : undefined,
      joinedAt: new Date(p.joined_at).getTime(),
      isSimulated: p.is_simulated
    }));

    const cached = ROOM_CACHE[code] || {};

    const claims: Record<string, EvidenceClaim> = roomData.claims || cached.claims || {};
    const rawLocks: Record<string, EvidenceLock> = roomData.locks || cached.locks || {};
    const locks = cleanExpiredLocks(rawLocks);
    const scores: Record<string, number> = roomData.scores || cached.scores || {};

    const currentRoundId = roomData.current_round_id || cached.currentRoundId || 'round_1';
    const roundEndsAt = roomData.round_ends_at
      ? new Date(roomData.round_ends_at).getTime()
      : cached.roundEndsAt || Date.now() + 300000;

    const unlockedEvidence: string[] = Array.isArray(roomData.unlocked_evidence)
      ? roomData.unlocked_evidence
      : cached.unlockedEvidenceIds || Object.keys(claims).length > 0 ? Object.keys(claims) : [...INITIAL_UNLOCKED_EVIDENCE_IDS];

    const lastUnlocked = roomData.last_unlocked_evidence || cached.lastUnlockedEvidenceId;
    const lastUnlockedBy = roomData.last_unlocked_by || cached.lastUnlockedByPlayerName;
    const lastClaimed = roomData.last_claimed_exhibit || cached.lastClaimedExhibitId;
    const lastClaimedBy = roomData.last_claimed_by || cached.lastClaimedByPlayerName;

    return {
      code: roomData.code,
      status: roomData.status,
      players,
      maxPlayers: 3,
      createdAt: new Date(roomData.created_at).getTime(),
      currentRoundId,
      roundEndsAt,
      roundIntroActive: cached.roundIntroActive,
      claims,
      locks,
      scores,
      lastClaimedExhibitId: lastClaimed,
      lastClaimedByPlayerName: lastClaimedBy,
      unlockedEvidenceIds: unlockedEvidence,
      lastUnlockedEvidenceId: lastUnlocked,
      lastUnlockedByPlayerName: lastUnlockedBy
    };
  } catch (err) {
    console.error('Unexpected error fetching from Supabase:', err);
    return null;
  }
}

// ============================================================================
// PUBLIC ROOM MANAGEMENT API
// ============================================================================

/**
 * Creates a new game room with host player.
 */
export async function createRoom(hostName: string): Promise<{ room: RoomState; player: Player }> {
  const cleanName = hostName.trim() || 'Chief Advocate';
  const code = generateRandomCode();
  const supabase = getSupabaseClient();

  const hostPlayer: Player = {
    id: 'p_' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    isHost: true,
    slot: 1,
    joinedAt: Date.now()
  };

  const initialEndsAt = Date.now() + 300000;

  if (supabase) {
    let roomError: { message: string } | null = null;
    const { error: primaryError } = await supabase.from('rooms').insert({
      code,
      status: 'lobby',
      current_round_id: 'round_1',
      round_ends_at: new Date(initialEndsAt).toISOString(),
      claims: {},
      locks: {},
      scores: { [hostPlayer.id]: 0 }
    });
    roomError = primaryError;

    if (roomError && roomError.message && (roomError.message.includes('column') || roomError.message.includes('does not exist'))) {
      console.warn('Rooms table missing columns in Supabase, falling back to minimal insert:', roomError.message);
      const { error: fallbackError } = await supabase.from('rooms').insert({
        code,
        status: 'lobby'
      });
      if (fallbackError) {
        throw new Error(`Failed to create room in Supabase: ${fallbackError.message}`);
      }
    } else if (roomError) {
      throw new Error(`Failed to create room in Supabase: ${roomError.message}`);
    }

    const { error: playerError } = await supabase.from('room_players').insert({
      id: hostPlayer.id,
      room_code: code,
      name: hostPlayer.name,
      slot: 1,
      is_host: true,
      is_simulated: false
    });

    if (playerError) {
      throw new Error(`Failed to register host advocate in Supabase: ${playerError.message}`);
    }

    ROOM_CACHE[code] = {
      currentRoundId: 'round_1',
      roundEndsAt: initialEndsAt,
      claims: {},
      locks: {},
      scores: { [hostPlayer.id]: 0 },
      unlockedEvidenceIds: [...INITIAL_UNLOCKED_EVIDENCE_IDS]
    };

    saveUserSession({
      roomCode: code,
      playerId: hostPlayer.id,
      playerName: hostPlayer.name
    });

    const fetched = await fetchRoomFromSupabase(code);
    if (!fetched) {
      throw new Error('Room created but failed to load back from database.');
    }
    return { room: fetched, player: hostPlayer };
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const newRoom: RoomState = {
    code,
    status: 'lobby',
    players: [hostPlayer],
    maxPlayers: 3,
    createdAt: Date.now(),
    currentRoundId: 'round_1',
    roundEndsAt: initialEndsAt,
    claims: {},
    locks: {},
    scores: { [hostPlayer.id]: 0 },
    unlockedEvidenceIds: [...INITIAL_UNLOCKED_EVIDENCE_IDS]
  };

  rooms[code] = newRoom;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(newRoom);

  saveUserSession({
    roomCode: code,
    playerId: hostPlayer.id,
    playerName: hostPlayer.name
  });

  return { room: newRoom, player: hostPlayer };
}

/**
 * Joins an existing game room.
 */
export async function joinRoom(rawCode: string, playerName: string): Promise<{ room: RoomState; player: Player }> {
  const code = rawCode.trim().toUpperCase();
  const cleanName = playerName.trim() || 'Advocate';
  const supabase = getSupabaseClient();

  if (supabase) {
    const room = await fetchRoomFromSupabase(code);
    if (!room) {
      throw new Error(`Chamber code "${code}" was not found. Please verify the 4-letter code.`);
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error(`Chamber "${code}" is already full (3 of 3 advocates assembled).`);
    }

    const occupiedSlots = new Set(room.players.map(p => p.slot));
    let assignedSlot: 1 | 2 | 3 = 1;
    for (const s of [1, 2, 3] as const) {
      if (!occupiedSlots.has(s)) {
        assignedSlot = s;
        break;
      }
    }

    const newPlayer: Player = {
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      name: cleanName,
      isHost: room.players.length === 0,
      slot: assignedSlot,
      joinedAt: Date.now()
    };

    const { error } = await supabase.from('room_players').insert({
      id: newPlayer.id,
      room_code: code,
      name: newPlayer.name,
      slot: assignedSlot,
      is_host: newPlayer.isHost,
      is_simulated: false
    });

    if (error) {
      throw new Error(`Failed to join chamber in Supabase: ${error.message}`);
    }

    saveUserSession({
      roomCode: code,
      playerId: newPlayer.id,
      playerName: newPlayer.name
    });

    const updated = await fetchRoomFromSupabase(code);
    return { room: updated || room, player: newPlayer };
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];

  if (!room) {
    throw new Error(`Chamber code "${code}" was not found. Please verify the 4-letter code.`);
  }

  if (room.players.length >= room.maxPlayers) {
    throw new Error(`Chamber "${code}" is already full (3 of 3 advocates assembled).`);
  }

  const occupiedSlots = new Set(room.players.map(p => p.slot));
  let assignedSlot: 1 | 2 | 3 = 1;
  for (const s of [1, 2, 3] as const) {
    if (!occupiedSlots.has(s)) {
      assignedSlot = s;
      break;
    }
  }

  const newPlayer: Player = {
    id: 'p_' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    isHost: room.players.length === 0,
    slot: assignedSlot,
    joinedAt: Date.now()
  };

  room.players.push(newPlayer);
  if (!room.scores) room.scores = {};
  if (room.scores[newPlayer.id] === undefined) room.scores[newPlayer.id] = 0;
  if (!room.claims) room.claims = {};
  if (!room.locks) room.locks = {};
  if (!room.currentRoundId) room.currentRoundId = 'round_1';
  if (!room.roundEndsAt) room.roundEndsAt = Date.now() + 300000;

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

  saveUserSession({
    roomCode: code,
    playerId: newPlayer.id,
    playerName: newPlayer.name
  });

  return { room, player: newPlayer };
}

/**
 * Retrieves the current state of a room.
 */
export async function getRoomState(rawCode: string): Promise<RoomState | null> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();
  if (supabase) {
    return await fetchRoomFromSupabase(code);
  }
  const rooms = getAllLocalRooms();
  return rooms[code] || null;
}

/**
 * Assigns one of the three lawyer roles to each of the three players.
 */
export async function assignRoles(rawCode: string): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();

  const rolePool: LawyerRoleId[] = ['brothers', 'household', 'authorities'];
  const shuffledRoles = [...rolePool].sort(() => Math.random() - 0.5);

  if (supabase) {
    const room = await fetchRoomFromSupabase(code);
    if (!room) throw new Error(`Chamber "${code}" not found.`);
    if (room.players.length < 3) throw new Error('All 3 advocates must be present before assigning judicial roles.');

    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      const assignedRole = shuffledRoles[i % 3];
      await supabase.from('room_players').update({ role_id: assignedRole }).eq('id', p.id);
    }

    await supabase.from('rooms').update({ status: 'roles_assigned', updated_at: new Date().toISOString() }).eq('code', code);

    const updated = await fetchRoomFromSupabase(code);
    return updated || room;
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) throw new Error(`Chamber "${code}" not found.`);
  if (room.players.length < 3) throw new Error('All 3 advocates must be present before assigning judicial roles.');

  room.players.forEach((player, index) => {
    player.roleId = shuffledRoles[index % 3];
  });
  room.status = 'roles_assigned';
  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

  return room;
}

/**
 * Starts a courtroom round, synchronizes timer duration across all devices.
 */
export async function startRound(rawCode: string, roundId: string = 'round_1'): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();
  const round = getRoundById(roundId) || ROUNDS[0];
  const durationSeconds = round.durationSeconds || 300;
  const roundEndsAt = Date.now() + durationSeconds * 1000;

  if (supabase) {
    ROOM_CACHE[code] = {
      ...ROOM_CACHE[code],
      currentRoundId: round.id,
      roundEndsAt,
      roundIntroActive: true
    };

    try {
      await supabase.from('rooms').update({
        status: 'courtroom_hub',
        current_round_id: round.id,
        round_ends_at: new Date(roundEndsAt).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('code', code);
    } catch {
      // Fallback
    }

    const updated = await fetchRoomFromSupabase(code);
    return updated || (await getRoomState(code))!;
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (room) {
    room.status = 'courtroom_hub';
    room.currentRoundId = round.id;
    room.roundEndsAt = roundEndsAt;
    room.roundIntroActive = true;
    rooms[code] = room;
    saveLocalRooms(rooms);
    notifyLocalSubscribers(room);
  }
  return room;
}

/**
 * Marks that a player has begun unsealing an exhibit (locks it for other players).
 * Automatically releases if abandoned (> 60s).
 */
export async function startUnsealingExhibit(
  rawCode: string,
  exhibitId: string,
  playerId: string,
  playerName: string
): Promise<{ success: boolean; lockedByOther?: string }> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();
  const now = Date.now();

  if (supabase) {
    const current = await fetchRoomFromSupabase(code);
    if (!current) return { success: false };

    // Check if already claimed
    if (current.claims && current.claims[exhibitId]) {
      return { success: false, lockedByOther: current.claims[exhibitId].claimedByPlayerName };
    }

    // Check lock
    const currentLocks = cleanExpiredLocks(current.locks || {});
    const existingLock = currentLocks[exhibitId];
    if (existingLock && existingLock.lockedByPlayerId !== playerId) {
      return { success: false, lockedByOther: existingLock.lockedByPlayerName };
    }

    currentLocks[exhibitId] = {
      lockedByPlayerId: playerId,
      lockedByPlayerName: playerName,
      lockedAt: now
    };

    ROOM_CACHE[code] = { ...ROOM_CACHE[code], locks: currentLocks };

    try {
      await supabase.from('rooms').update({
        locks: currentLocks,
        updated_at: new Date().toISOString()
      }).eq('code', code);
    } catch {
      // Ignore schema column error if not updated yet
    }

    return { success: true };
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) return { success: false };

  if (room.claims && room.claims[exhibitId]) {
    return { success: false, lockedByOther: room.claims[exhibitId].claimedByPlayerName };
  }

  const currentLocks = cleanExpiredLocks(room.locks || {});
  const existingLock = currentLocks[exhibitId];
  if (existingLock && existingLock.lockedByPlayerId !== playerId) {
    return { success: false, lockedByOther: existingLock.lockedByPlayerName };
  }

  currentLocks[exhibitId] = {
    lockedByPlayerId: playerId,
    lockedByPlayerName: playerName,
    lockedAt: now
  };
  room.locks = currentLocks;

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

  return { success: true };
}

/**
 * Releases unsealing lock if player cancels or leaves puzzle before completion.
 */
export async function releaseUnsealingExhibit(
  rawCode: string,
  exhibitId: string,
  playerId?: string
): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();

  if (supabase) {
    const current = await fetchRoomFromSupabase(code);
    if (
      current &&
      current.locks &&
      current.locks[exhibitId] &&
      (!playerId || current.locks[exhibitId].lockedByPlayerId === playerId)
    ) {
      delete current.locks[exhibitId];
      ROOM_CACHE[code] = { ...ROOM_CACHE[code], locks: current.locks };
      try {
        await supabase.from('rooms').update({
          locks: current.locks,
          updated_at: new Date().toISOString()
        }).eq('code', code);
      } catch {
        // Fallback
      }
    }
    return;
  }

  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (
    room &&
    room.locks &&
    room.locks[exhibitId] &&
    (!playerId || room.locks[exhibitId].lockedByPlayerId === playerId)
  ) {
    delete room.locks[exhibitId];
    rooms[code] = room;
    saveLocalRooms(rooms);
    notifyLocalSubscribers(room);
  }
}

/**
 * Unlocks an evidence scroll (backward-compatible / dev helper).
 */
export async function unlockEvidence(
  rawCode: string,
  exhibitId: string,
  actorName: string = 'Tribunal'
): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const item = EVIDENCE_CATALOGUE.find(e => e.id === exhibitId);
  const points = item?.points || 1;
  const tier = item?.tier || 'standard';
  const res = await claimExhibit(code, exhibitId, 'system_' + actorName, actorName, points, tier);
  return res.room;
}

/**
 * Random evidence discovery (dev helper).
 */
export async function unlockRandomEvidence(
  rawCode: string,
  actorName: string = 'Tribunal'
): Promise<{ room: RoomState; unlockedItem: EvidenceItem | null }> {
  const code = rawCode.trim().toUpperCase();
  const room = await getRoomState(code);
  if (!room) throw new Error('Room not found');

  const claims = room.claims || {};
  const unlocked = new Set([...(room.unlockedEvidenceIds || []), ...Object.keys(claims)]);
  const remaining = EVIDENCE_CATALOGUE.filter(e => !unlocked.has(e.id));

  if (remaining.length === 0) {
    return { room, unlockedItem: null };
  }

  const chosen = remaining[Math.floor(Math.random() * remaining.length)];
  const updatedRoom = await unlockEvidence(code, chosen.id, actorName);
  return { room: updatedRoom, unlockedItem: chosen };
}

/**
 * ATOMIC EXCLUSIVE CLAIM:
 * Claims the exhibit for this player, awards points, and releases lock.
 * If another player claimed it first, returns failure with claimer's name.
 */
export async function claimExhibit(
  rawCode: string,
  exhibitId: string,
  playerId: string,
  playerName: string,
  points: number,
  tier: 'strong' | 'standard'
): Promise<{ success: boolean; claimedByOther?: string; room: RoomState }> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();
  const now = Date.now();

  if (supabase) {
    // 1. Fetch freshest state directly from DB
    const current = await fetchRoomFromSupabase(code);
    if (!current) throw new Error('Room not found');

    const claims: Record<string, EvidenceClaim> = { ...(current.claims || {}) };
    if (claims[exhibitId]) {
      return {
        success: false,
        claimedByOther: claims[exhibitId].claimedByPlayerName,
        room: current
      };
    }

    // 2. Perform atomic assignment
    claims[exhibitId] = {
      claimedByPlayerId: playerId,
      claimedByPlayerName: playerName,
      claimedAt: now,
      points,
      tier,
      exhibitId
    };

    const locks = cleanExpiredLocks(current.locks || {});
    delete locks[exhibitId];

    const scores: Record<string, number> = { ...(current.scores || {}) };
    scores[playerId] = (scores[playerId] || 0) + points;

    const unlocked = Array.from(new Set([...(current.unlockedEvidenceIds || []), exhibitId]));

    ROOM_CACHE[code] = {
      ...ROOM_CACHE[code],
      claims,
      locks,
      scores,
      lastClaimedExhibitId: exhibitId,
      lastClaimedByPlayerName: playerName,
      unlockedEvidenceIds: unlocked
    };

    try {
      await supabase.from('rooms').update({
        claims,
        locks,
        scores,
        last_claimed_exhibit: exhibitId,
        last_claimed_by: playerName,
        unlocked_evidence: unlocked,
        updated_at: new Date().toISOString()
      }).eq('code', code);
    } catch {
      // Fallback
    }

    const updated = await fetchRoomFromSupabase(code);
    return {
      success: true,
      room: updated || current
    };
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) throw new Error('Room not found');

  if (!room.claims) room.claims = {};
  if (room.claims[exhibitId]) {
    return {
      success: false,
      claimedByOther: room.claims[exhibitId].claimedByPlayerName,
      room
    };
  }

  room.claims[exhibitId] = {
    claimedByPlayerId: playerId,
    claimedByPlayerName: playerName,
    claimedAt: now,
    points,
    tier,
    exhibitId
  };

  if (!room.scores) room.scores = {};
  room.scores[playerId] = (room.scores[playerId] || 0) + points;

  if (!room.locks) room.locks = {};
  delete room.locks[exhibitId];

  if (!room.unlockedEvidenceIds) room.unlockedEvidenceIds = [];
  if (!room.unlockedEvidenceIds.includes(exhibitId)) {
    room.unlockedEvidenceIds.push(exhibitId);
  }
  room.lastClaimedExhibitId = exhibitId;
  room.lastClaimedByPlayerName = playerName;

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

  return {
    success: true,
    room
  };
}

/**
 * Advance to next round (e.g. from round 1 to round 2 or 3).
 */
export async function nextRound(rawCode: string): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const current = await getRoomState(code);
  if (!current) throw new Error('Room not found');

  const currentIndex = ROUNDS.findIndex(r => r.id === current.currentRoundId);
  const nextIndex = (currentIndex + 1) % ROUNDS.length;
  const next = ROUNDS[nextIndex];

  return await startRound(code, next.id);
}

/**
 * Enters courtroom hub.
 */
export async function enterCourtroomHub(rawCode: string): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const current = await getRoomState(code);
  const roundId = current?.currentRoundId || 'round_1';
  return await startRound(code, roundId);
}

/**
 * Local simulation helper: adds a mock player so solo testers can fill all 3 slots.
 */
export async function addMockPlayer(rawCode: string): Promise<RoomState> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();

  const mockNames = ['Advocate Binyamin', 'Scribe Potiphar', 'Chancellor Senmut', 'Rabbi Jacob', 'Scholar Zulaikha'];

  if (supabase) {
    const room = await fetchRoomFromSupabase(code);
    if (!room) throw new Error(`Chamber "${code}" not found.`);
    if (room.players.length >= room.maxPlayers) throw new Error('Chamber already has maximum of 3 advocates.');

    const existingNames = new Set(room.players.map(p => p.name));
    const chosenName = mockNames.find(n => !existingNames.has(n)) || `Advocate ${room.players.length + 1}`;

    const occupiedSlots = new Set(room.players.map(p => p.slot));
    let assignedSlot: 1 | 2 | 3 = 1;
    for (const s of [1, 2, 3] as const) {
      if (!occupiedSlots.has(s)) {
        assignedSlot = s;
        break;
      }
    }

    const mockId = 'mock_' + Math.random().toString(36).substring(2, 9);
    await supabase.from('room_players').insert({
      id: mockId,
      room_code: code,
      name: chosenName,
      slot: assignedSlot,
      is_host: false,
      is_simulated: true
    });

    const updated = await fetchRoomFromSupabase(code);
    return updated || room;
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) throw new Error(`Chamber "${code}" not found.`);
  if (room.players.length >= room.maxPlayers) throw new Error('Chamber already has maximum of 3 advocates.');

  const existingNames = new Set(room.players.map(p => p.name));
  const chosenName = mockNames.find(n => !existingNames.has(n)) || `Advocate ${room.players.length + 1}`;

  const occupiedSlots = new Set(room.players.map(p => p.slot));
  let assignedSlot: 1 | 2 | 3 = 1;
  for (const s of [1, 2, 3] as const) {
    if (!occupiedSlots.has(s)) {
      assignedSlot = s;
      break;
    }
  }

  const mockPlayer: Player = {
    id: 'mock_' + Math.random().toString(36).substring(2, 9),
    name: chosenName,
    isHost: false,
    slot: assignedSlot,
    joinedAt: Date.now(),
    isSimulated: true
  };

  room.players.push(mockPlayer);
  if (!room.scores) room.scores = {};
  room.scores[mockPlayer.id] = 0;

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

  return room;
}

/**
 * Removes a player from the room.
 */
export async function removePlayer(rawCode: string, playerId: string): Promise<RoomState | null> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();

  if (supabase) {
    const roomBefore = await fetchRoomFromSupabase(code);
    const playerToRemove = roomBefore?.players.find(p => p.id === playerId);

    // If the departing player is the host, or only 1 player was left: delete the whole room!
    // With foreign key ON DELETE CASCADE, all room_players rows are deleted automatically.
    if (!roomBefore || playerToRemove?.isHost || roomBefore.players.length <= 1) {
      await supabase.from('rooms').delete().eq('code', code);
      delete ROOM_CACHE[code];
      clearUserSession();
      return null;
    }

    await supabase.from('room_players').delete().eq('id', playerId);
    const room = await fetchRoomFromSupabase(code);
    if (!room || room.players.length === 0) {
      await supabase.from('rooms').delete().eq('code', code);
      delete ROOM_CACHE[code];
      clearUserSession();
      return null;
    }

    if (room.players.length < 3 && (room.status === 'roles_assigned' || room.status === 'courtroom_hub')) {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('code', code);
      await supabase.from('room_players').update({ role_id: null }).eq('room_code', code);
    }
    return await fetchRoomFromSupabase(code);
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) {
    clearUserSession();
    return null;
  }

  const playerToRemove = room.players.find(p => p.id === playerId);
  if (!playerToRemove || playerToRemove.isHost || room.players.length <= 1) {
    delete rooms[code];
    saveLocalRooms(rooms);
    notifyLocalSubscribers(null);
    clearUserSession();
    return null;
  }

  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length < 3 && (room.status === 'roles_assigned' || room.status === 'courtroom_hub')) {
    room.status = 'lobby';
    room.players.forEach(p => { delete p.roleId; });
  }

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);
  return room;
}

/**
 * Disbands/deletes a room completely from database.
 */
export async function disbandRoom(rawCode: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();
  delete ROOM_CACHE[code];
  clearUserSession();

  if (supabase) {
    await supabase.from('rooms').delete().eq('code', code);
    return;
  }

  const rooms = getAllLocalRooms();
  delete rooms[code];
  saveLocalRooms(rooms);
  notifyLocalSubscribers(null);
}

/**
 * Resets chamber back to lobby status without role assignment.
 */
export async function returnToLobby(rawCode: string): Promise<RoomState | null> {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase.from('rooms').update({ status: 'lobby' }).eq('code', code);
    await supabase.from('room_players').update({ role_id: null }).eq('room_code', code);
    return await fetchRoomFromSupabase(code);
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (room) {
    room.status = 'lobby';
    room.players.forEach(p => { delete p.roleId; });
    rooms[code] = room;
    saveLocalRooms(rooms);
    notifyLocalSubscribers(room);
  }
  return room || null;
}

/**
 * Subscribes to room updates (Realtime channel when Supabase is active, or localStorage listener).
 */
export function subscribeToRoom(code: string, callback: (room: RoomState | null) => void): () => void {
  const cleanCode = code.trim().toUpperCase();
  const supabase = getSupabaseClient();

  if (supabase) {
    fetchRoomFromSupabase(cleanCode).then(callback);

    const channel = supabase
      .channel(`case_yusuf_${cleanCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${cleanCode}` },
        async () => {
          const fresh = await fetchRoomFromSupabase(cleanCode);
          callback(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${cleanCode}` },
        async () => {
          const fresh = await fetchRoomFromSupabase(cleanCode);
          callback(fresh);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchRoomFromSupabase(cleanCode).then(callback);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Local fallback
  const handler = () => {
    const rooms = getAllLocalRooms();
    callback(rooms[cleanCode] || null);
  };
  LISTENERS.add(handler);
  handler();

  return () => {
    LISTENERS.delete(handler);
  };
}
