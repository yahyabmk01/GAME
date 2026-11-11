/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Faceted vector SVG icons for the three courtroom advocate roles.
 * Strict rule: No human faces anywhere; pure geometric and symbolic vector art.
 */

import React from 'react';

export const BrothersIcon: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Symbol of the Brothers: Sheaf of Grain and Traveler's Staff"
  >
    {/* Background emblem disc */}
    <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#1B2A41" stroke="#C9993A" strokeWidth="1.5" strokeOpacity="0.4" />
    <polygon points="50,14 80,32 80,68 50,86 20,68 20,32" fill="#2A1B14" opacity="0.6" />

    {/* Traveler's Staff - diagonal */}
    <polygon points="30,82 72,18 76,21 34,85" fill="#D9B98A" />
    <polygon points="72,18 78,14 82,18 76,21" fill="#C9993A" />
    {/* Staff grip wraps */}
    <line x1="48" y1="52" x2="54" y2="56" stroke="#1E140D" strokeWidth="2" />
    <line x1="52" y1="46" x2="58" y2="50" stroke="#1E140D" strokeWidth="2" />

    {/* Faceted Grain Sheaves - Canaanite harvest */}
    {/* Central Ear */}
    <polygon points="50,26 44,38 50,48 56,38" fill="#FFC145" />
    <polygon points="50,26 50,48 56,38" fill="#E8883A" opacity="0.75" />
    {/* Left Ears */}
    <polygon points="40,36 32,46 40,54 46,46" fill="#D9B98A" />
    <polygon points="40,36 40,54 46,46" fill="#C9993A" opacity="0.8" />
    {/* Right Ears */}
    <polygon points="60,36 54,46 60,54 68,46" fill="#FFC145" />
    <polygon points="60,36 60,54 68,46" fill="#C9993A" opacity="0.9" />

    {/* Stems bundle tied */}
    <polygon points="45,54 55,54 52,78 48,78" fill="#C9993A" />
    {/* Rope tie */}
    <polygon points="43,58 57,58 55,64 45,64" fill="#E8883A" stroke="#1E140D" strokeWidth="0.5" />

    {/* Decorative diamond stars */}
    <polygon points="50,16 52,20 50,24 48,20" fill="#EBD9B4" />
  </svg>
);

export const HouseholdIcon: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Symbol of the Household: Egyptian Manor Portal and Lotus Seal"
  >
    {/* Background emblem disc */}
    <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#1B2A41" stroke="#C9993A" strokeWidth="1.5" strokeOpacity="0.4" />
    <polygon points="50,14 80,32 80,68 50,86 20,68 20,32" fill="#2E1812" opacity="0.6" />

    {/* Pylon Palace Gate Silhouette */}
    <polygon points="26,78 30,36 40,36 42,78" fill="#3D291F" />
    <polygon points="74,78 70,36 60,36 58,78" fill="#2D1C14" />
    <polygon points="24,36 76,36 72,28 28,28" fill="#C9993A" />
    <polygon points="28,28 72,28 70,24 30,24" fill="#D9B98A" />

    {/* Lotus Floral Ornament (Faceted Vector) */}
    {/* Center petal */}
    <polygon points="50,42 45,56 50,66 55,56" fill="#EBD9B4" />
    <polygon points="50,42 50,66 55,56" fill="#D9B98A" opacity="0.7" />
    {/* Left petal */}
    <polygon points="45,56 34,50 40,64 50,66" fill="#C9993A" />
    {/* Right petal */}
    <polygon points="55,56 66,50 60,64 50,66" fill="#C9993A" />
    {/* Lotus base calyx */}
    <polygon points="40,64 60,64 56,72 44,72" fill="#1B2A41" stroke="#C9993A" strokeWidth="0.75" />

    {/* Torn garment thread symbol (clean geometric fold) */}
    <polygon points="46,72 54,72 56,82 44,82" fill="#E8883A" opacity="0.85" />
    <polygon points="48,82 52,82 50,88" fill="#EBD9B4" />
  </svg>
);

export const AuthoritiesIcon: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Symbol of the Authorities: The Scales of Justice and Royal Goblet"
  >
    {/* Background emblem disc */}
    <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#1B2A41" stroke="#C9993A" strokeWidth="1.5" strokeOpacity="0.4" />
    <polygon points="50,14 80,32 80,68 50,86 20,68 20,32" fill="#1A2433" opacity="0.6" />

    {/* Central Pillar of State / Scepter */}
    <polygon points="48,22 52,22 51,76 49,76" fill="#C9993A" />
    <polygon points="50,14 55,20 50,24 45,20" fill="#FFC145" />
    <polygon points="42,76 58,76 55,82 45,82" fill="#D9B98A" />

    {/* Balance Beam (Scales of Ma'at) */}
    <polygon points="24,34 76,34 74,37 26,37" fill="#EBD9B4" />
    <polygon points="50,32 53,35 50,38 47,35" fill="#E8883A" />

    {/* Left Scale Pan */}
    <line x1="28" y1="36" x2="22" y2="52" stroke="#C9993A" strokeWidth="1" />
    <line x1="28" y1="36" x2="34" y2="52" stroke="#C9993A" strokeWidth="1" />
    <polygon points="20,52 36,52 32,58 24,58" fill="#D9B98A" stroke="#C9993A" strokeWidth="0.5" />

    {/* Right Scale Pan holding the Royal Silver Goblet */}
    <line x1="72" y1="36" x2="66" y2="52" stroke="#C9993A" strokeWidth="1" />
    <line x1="72" y1="36" x2="78" y2="52" stroke="#C9993A" strokeWidth="1" />
    <polygon points="64,52 80,52 76,58 68,58" fill="#D9B98A" stroke="#C9993A" strokeWidth="0.5" />

    {/* The Royal Divining Goblet on the right pan */}
    <polygon points="69,42 75,42 74,48 70,48" fill="#EBD9B4" />
    <polygon points="71,48 73,48 73,51 71,51" fill="#FFFFFF" />
    <polygon points="68,51 76,51 75,52 69,52" fill="#C9993A" />
  </svg>
);
