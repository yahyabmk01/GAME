/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game State & Room Management Layer
 * 
 * Automatically switches between:
 * 1. Supabase Realtime: When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or browser settings) are provided.
 * 2. Local Demo Mode: Fallback using browser localStorage + multi-tab storage events.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';

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

export interface RoomState {
  code: string;
  status: 'lobby' | 'roles_assigned' | 'in_case';
  players: Player[];
  maxPlayers: 3;
  createdAt: number;
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

// Generate distinct random 4-letter room codes rooted in desert & scriptural themes
const ROOM_CODE_POOL = [
  'YSUF', 'NILE', 'ALEM', 'DUNE', 'SACK', 'WELL', 'GOLD', 'CORN',
  'PALE', 'AZIZ', 'SEAL', 'STAR', 'CUPP', 'GIFT', 'ROBE', 'OATH'
];

export function isRealtimeActive(): boolean {
  return isSupabaseConfigured();
}

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

    return {
      code: roomData.code,
      status: roomData.status,
      players,
      maxPlayers: 3,
      createdAt: new Date(roomData.created_at).getTime()
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

  if (supabase) {
    // 1. Insert room record
    const { error: roomError } = await supabase.from('rooms').insert({
      code,
      status: 'lobby'
    });

    if (roomError) {
      throw new Error(`Failed to create room in Supabase: ${roomError.message}`);
    }

    // 2. Insert host player
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
    createdAt: Date.now()
  };

  rooms[code] = newRoom;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(newRoom);

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
  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);

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

    // 1. Update each player with their assigned role
    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      const assignedRole = shuffledRoles[i % 3];
      await supabase.from('room_players').update({ role_id: assignedRole }).eq('id', p.id);
    }

    // 2. Update room status
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
    await supabase.from('room_players').delete().eq('id', playerId);
    const room = await fetchRoomFromSupabase(code);
    if (!room || room.players.length === 0) {
      await supabase.from('rooms').delete().eq('code', code);
      return null;
    }
    // If no host remaining, assign first player as host
    if (!room.players.some(p => p.isHost)) {
      await supabase.from('room_players').update({ is_host: true }).eq('id', room.players[0].id);
    }
    // Revert role assignment if under 3
    if (room.players.length < 3 && room.status === 'roles_assigned') {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('code', code);
      for (const p of room.players) {
        await supabase.from('room_players').update({ role_id: null }).eq('id', p.id);
      }
    }
    return await fetchRoomFromSupabase(code);
  }

  // Local fallback
  const rooms = getAllLocalRooms();
  const room = rooms[code];
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    delete rooms[code];
    saveLocalRooms(rooms);
    notifyLocalSubscribers(null);
    return null;
  }

  if (!room.players.some(p => p.isHost)) {
    room.players[0].isHost = true;
  }
  if (room.players.length < 3 && room.status === 'roles_assigned') {
    room.status = 'lobby';
    room.players.forEach(p => { delete p.roleId; });
  }

  rooms[code] = room;
  saveLocalRooms(rooms);
  notifyLocalSubscribers(room);
  return room;
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
    // Initial fetch
    fetchRoomFromSupabase(cleanCode).then(callback);

    // Subscribe to Postgres Realtime changes on rooms & room_players
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
          // Immediately sync upon subscription confirmation
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
