/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase Connection & Configuration Modal
 * Allows user to test connection, enter credentials, and copy the exact SQL schema.
 */

import React, { useState, useEffect, useId } from 'react';
import { AncientFrame, AncientButton } from './AncientFrame';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  Key
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection
} from '../supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: () => void;
}

const SCHEMA_SQL = `-- 1. Ensure rooms table exists with all required columns
create table if not exists public.rooms (
  code text primary key,
  status text not null default 'lobby',
  current_round_id text not null default 'round_1',
  round_ends_at timestamptz,
  claims jsonb not null default '{}'::jsonb,
  locks jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  last_claimed_exhibit text,
  last_claimed_by text,
  unlocked_evidence text[] not null default array['exhibit_torn_tunic'],
  last_unlocked_evidence text,
  last_unlocked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Add columns if table already existed without them
alter table public.rooms add column if not exists status text not null default 'lobby';
alter table public.rooms add column if not exists current_round_id text not null default 'round_1';
alter table public.rooms add column if not exists round_ends_at timestamptz;
alter table public.rooms add column if not exists claims jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists locks jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists scores jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists last_claimed_exhibit text;
alter table public.rooms add column if not exists last_claimed_by text;
alter table public.rooms add column if not exists unlocked_evidence text[] not null default array['exhibit_torn_tunic'];
alter table public.rooms add column if not exists last_unlocked_evidence text;
alter table public.rooms add column if not exists last_unlocked_by text;
alter table public.rooms add column if not exists created_at timestamptz not null default now();
alter table public.rooms add column if not exists updated_at timestamptz not null default now();

-- 3. Drop any outdated restrictive check constraints
alter table public.rooms drop constraint if exists rooms_status_check;

-- 4. Create or update room_players table with ON DELETE CASCADE
create table if not exists public.room_players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  slot smallint not null check (slot in (1, 2, 3)),
  is_host boolean not null default false,
  role_id text,
  is_simulated boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint unique_room_slot unique (room_code, slot)
);

alter table public.room_players drop constraint if exists room_players_role_id_check;

-- 5. Performance index
create index if not exists idx_room_players_room_code on public.room_players(room_code);

-- 6. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- 7. Policies: Allow public anonymous access for game party rooms
drop policy if exists "Allow public access to rooms" on public.rooms;
create policy "Allow public access to rooms"
  on public.rooms for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public access to room_players" on public.room_players;
create policy "Allow public access to room_players"
  on public.room_players for all
  to anon, authenticated
  using (true)
  with check (true);

-- 8. Enable full replication payloads for Supabase Realtime
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;

-- 9. Add tables to supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;
end $$;`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChange
}) => {
  const supabaseUrlId = useId();
  const supabaseAnonKeyId = useId();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      if (cfg) {
        setUrl(cfg.url);
        setAnonKey(cfg.anonKey);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both Project URL and Anon Public Key.'
      });
      return;
    }

    saveSupabaseConfig(url, anonKey);
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);

    if (onConfigChange) onConfigChange();
  };

  const handleTestOnly = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter credentials to test.'
      });
      return;
    }
    saveSupabaseConfig(url, anonKey);
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: false,
      message: 'Supabase configuration cleared. Reverted to local demo mode.'
    });
    if (onConfigChange) onConfigChange();
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-setup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <AncientFrame glow className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close setup modal"
            className="absolute top-4 right-4 p-2 text-[#D9B98A] hover:text-[#FFF4DC] hover:bg-[#C9993A]/15 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 pr-6">
            <span className="text-xs uppercase font-cinzel tracking-widest text-[#C9993A] block mb-1">
              Cross-Device Realtime Multiplayer
            </span>
            <h2 id="supabase-setup-title" className="text-2xl sm:text-3xl font-cinzel font-bold text-[#EBD9B4]">
              Supabase Connection
            </h2>
            <div className="w-16 h-0.5 bg-[#C9993A] mx-auto mt-2 opacity-60" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#C9993A]/20 mb-6 font-cinzel text-xs">
            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-2.5 font-bold tracking-wider transition-colors border-b-2 ${
                activeTab === 'credentials'
                  ? 'border-[#C9993A] text-[#FFF4DC] bg-[#C9993A]/10'
                  : 'border-transparent text-[#D9B98A]/70 hover:text-[#EBD9B4]'
              }`}
            >
              1. Project Credentials
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-4 py-2.5 font-bold tracking-wider transition-colors border-b-2 ${
                activeTab === 'sql'
                  ? 'border-[#C9993A] text-[#FFF4DC] bg-[#C9993A]/10'
                  : 'border-transparent text-[#D9B98A]/70 hover:text-[#EBD9B4]'
              }`}
            >
              2. SQL Schema Script
            </button>
          </div>

          {activeTab === 'credentials' ? (
            <div>
              {/* Quick instructions */}
              <div className="p-3.5 bg-[#1B2A41]/40 border border-[#C9993A]/25 text-xs text-[#D9B98A] mb-5 space-y-1.5 leading-relaxed text-left">
                <div className="font-cinzel text-[#FFD988] flex items-center justify-between">
                  <span>Where to find your credentials:</span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#C9993A] hover:underline"
                  >
                    Supabase Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p>
                  1. In Supabase, go to <strong>Project Settings → API</strong>.
                </p>
                <p>
                  2. Copy <strong>Project URL</strong> (e.g. <code>https://xyz.supabase.co</code>) and <strong>anon public</strong> API key.
                </p>
                <p>
                  3. Paste below, or add them to your <code>.env</code> file as <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor={supabaseUrlId} className="block text-xs font-cinzel uppercase tracking-wider text-[#C9993A] mb-1.5 text-left">
                    Project URL
                  </label>
                  <input
                    id={supabaseUrlId}
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full px-3.5 py-2.5 bg-[#1B2A41]/40 border border-[#C9993A]/40 text-[#FFF4DC] placeholder-[#D9B98A]/30 text-xs font-mono focus:border-[#C9993A] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={supabaseAnonKeyId} className="block text-xs font-cinzel uppercase tracking-wider text-[#C9993A] mb-1.5 text-left">
                    Anon Public Key (API Key)
                  </label>
                  <textarea
                    id={supabaseAnonKeyId}
                    required
                    rows={2}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 bg-[#1B2A41]/40 border border-[#C9993A]/40 text-[#FFF4DC] placeholder-[#D9B98A]/30 text-xs font-mono focus:border-[#C9993A] focus:outline-none resize-none"
                  />
                </div>

                {/* Test Feedback */}
                {testResult && (
                  <div
                    className={`p-3 text-xs border flex items-start gap-2.5 text-left ${
                      testResult.success
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-600/60 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block mb-0.5 font-cinzel">
                        {testResult.success ? 'Connection Verified' : 'Connection Failed'}
                      </span>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 text-xs font-cinzel text-rose-300 hover:text-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset to Local Mode
                  </button>

                  <div className="flex items-center gap-2">
                    <AncientButton
                      type="button"
                      variant="secondary"
                      onClick={handleTestOnly}
                      disabled={isTesting}
                      className="py-2.5 px-4 text-xs"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin inline" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </AncientButton>

                    <AncientButton
                      type="submit"
                      variant="primary"
                      disabled={isTesting}
                      className="py-2.5 px-6 text-xs"
                    >
                      Save & Connect
                    </AncientButton>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="p-3.5 bg-[#1B2A41]/40 border border-[#C9993A]/25 text-xs text-[#D9B98A] mb-4 text-left">
                <span className="font-cinzel text-[#FFD988] block mb-1">
                  How to run this in your Supabase project:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>In Supabase, click <strong>SQL Editor</strong> in the left sidebar.</li>
                  <li>Click <strong>New query</strong>.</li>
                  <li>Click the <strong>Copy SQL</strong> button below and paste it into the editor.</li>
                  <li>Click <strong>Run</strong> (or press Ctrl + Enter).</li>
                </ol>
              </div>

              <div className="relative mb-4">
                <pre className="p-4 bg-[#0A1118] border border-[#C9993A]/30 text-[#D9B98A] text-xs font-mono max-h-56 overflow-y-auto leading-relaxed text-left whitespace-pre-wrap select-all">
                  {SCHEMA_SQL}
                </pre>
                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-[#C9993A] hover:bg-[#DFB75A] text-[#1E140D] font-cinzel font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md"
                >
                  {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>

              <div className="text-center pt-2">
                <AncientButton
                  variant="primary"
                  onClick={handleCopySql}
                  className="py-3 px-8 text-xs"
                >
                  {copiedSql ? 'SQL Copied to Clipboard!' : 'Copy Full SQL Script'}
                </AncientButton>
              </div>
            </div>
          )}
        </AncientFrame>
      </div>
    </div>
  );
};
