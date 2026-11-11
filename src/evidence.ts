/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Evidence & Exhibits Catalogue for The Case of Yusuf
 * Contains points, tiers, historical scripture comparisons, and rounds data.
 */

import { LawyerRoleId } from './gameState';
import evidenceData from './data/evidence.json';
import roundsData from './data/rounds.json';

export type EvidenceTier = 'strong' | 'standard';

export interface EvidenceItem {
  id: string;
  number: string;
  title: string;
  shortLabel: string;
  category: string;
  roundId: string;
  tier: EvidenceTier;
  points: number; // strong = 3, standard = 1
  description: string;
  scriptureReferences: {
    tradition: 'Quran' | 'Genesis' | 'Comparative Commentary' | string;
    citation: string;
    text: string;
  }[];
  forensicFinding: string;
  relevantRoles: LawyerRoleId[];
}

export interface CourtroomRound {
  id: string;
  title: string;
  number: number;
  question: string;
  durationSeconds: number;
  exhibitIds: string[];
}

export const EVIDENCE_CATALOGUE: EvidenceItem[] = evidenceData as EvidenceItem[];
export const ROUNDS: CourtroomRound[] = roundsData as CourtroomRound[];

export function getRoundById(roundId: string): CourtroomRound | undefined {
  return ROUNDS.find(r => r.id === roundId) || ROUNDS[0];
}

export function getExhibitsForRound(roundId: string): EvidenceItem[] {
  const round = getRoundById(roundId);
  if (!round) return EVIDENCE_CATALOGUE.slice(0, 6);
  const idSet = new Set(round.exhibitIds);
  return EVIDENCE_CATALOGUE.filter(e => idSet.has(e.id));
}

export const INITIAL_UNLOCKED_EVIDENCE_IDS = ['exhibit_torn_tunic'];
