/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Low-poly night desert courtroom backdrop.
 * Rendered purely in geometric SVG with faceted dunes, pyramid silhouette,
 * celestial disc, and warm torch braziers.
 */

import React from 'react';

export const DesertBackdrop: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#1E140D]">
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Deep night sky gradient */}
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080E17" />
            <stop offset="45%" stopColor="#121D2D" />
            <stop offset="80%" stopColor="#1B2A41" />
            <stop offset="100%" stopColor="#2E1D13" />
          </linearGradient>

          {/* Celestial moon radiance */}
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EBD9B4" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#C9993A" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#E8883A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1B2A41" stopOpacity="0" />
          </radialGradient>

          {/* Left torch glow */}
          <radialGradient id="torchGlowLeft" cx="120" cy="740" r="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8883A" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#C9993A" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#E8883A" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1E140D" stopOpacity="0" />
          </radialGradient>

          {/* Right torch glow */}
          <radialGradient id="torchGlowRight" cx="1320" cy="740" r="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8883A" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#C9993A" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#E8883A" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1E140D" stopOpacity="0" />
          </radialGradient>

          {/* Courtroom upper arch ambient glow */}
          <radialGradient id="ambientCenterGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#E8883A" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#C9993A" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1E140D" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Night Sky Field */}
        <rect width="1440" height="900" fill="url(#nightSky)" />

        {/* Ambient Courtroom Glow */}
        <rect width="1440" height="900" fill="url(#ambientCenterGlow)" />

        {/* Low-Poly Geometric Stars */}
        <g opacity="0.65">
          <polygon points="180,95 183,105 193,108 183,111 180,121 177,111 167,108 177,105" fill="#EBD9B4" opacity="0.8" />
          <polygon points="340,60 342,66 348,68 342,70 340,76 338,70 332,68 338,66" fill="#D9B98A" opacity="0.7" />
          <polygon points="560,130 562,136 568,138 562,140 560,146 558,140 552,138 558,136" fill="#C9993A" opacity="0.9" />
          <polygon points="720,70 722,77 729,79 722,81 720,88 718,81 711,79 718,77" fill="#EBD9B4" opacity="0.85" />
          <polygon points="910,115 912,120 917,122 912,124 910,129 908,124 903,122 908,120" fill="#D9B98A" opacity="0.6" />
          <polygon points="1080,75 1083,83 1091,85 1083,87 1080,95 1077,87 1069,85 1077,83" fill="#EBD9B4" opacity="0.75" />
          <polygon points="1260,110 1262,116 1268,118 1262,120 1260,126 1258,120 1252,118 1258,116" fill="#C9993A" opacity="0.7" />
          <polygon points="450,160 451,164 455,165 451,166 450,170 449,166 445,165 449,164" fill="#EBD9B4" opacity="0.5" />
          <polygon points="840,150 841,154 845,155 841,156 840,160 839,156 835,155 839,154" fill="#D9B98A" opacity="0.5" />
          <polygon points="980,180 982,185 987,186 982,187 980,192 978,187 973,186 978,185" fill="#EBD9B4" opacity="0.65" />
        </g>

        {/* Low-Poly Celestial Disc (Moon of Yusuf) */}
        <g transform="translate(720, 190)">
          {/* Subtle Glow Aura */}
          <circle cx="0" cy="0" r="140" fill="url(#moonGlow)" />
          {/* Faceted Outer Rays */}
          <polygon points="0,-72 16,-56 36,-64 42,-44 64,-36 56,-16 72,0 56,16 64,36 42,44 36,64 16,56 0,72 -16,56 -36,64 -42,44 -64,36 -56,16 -72,0 -56,-16 -64,-36 -42,-44 -36,-64 -16,-56" fill="#C9993A" opacity="0.25" />
          {/* Low-Poly Faceted Moon Body */}
          <polygon points="0,-48 34,-34 48,0 34,34 0,48 -34,34 -48,0 -34,-34" fill="#EBD9B4" opacity="0.95" />
          <polygon points="0,-48 34,-34 18,0 0,0" fill="#FFF4DC" opacity="0.6" />
          <polygon points="34,-34 48,0 18,0" fill="#EBD9B4" opacity="0.8" />
          <polygon points="48,0 34,34 18,0" fill="#D9B98A" opacity="0.75" />
          <polygon points="34,34 0,48 0,0 18,0" fill="#C9993A" opacity="0.45" />
          <polygon points="0,48 -34,34 0,0" fill="#B3862A" opacity="0.5" />
          <polygon points="-34,34 -48,0 0,0" fill="#D9B98A" opacity="0.65" />
          <polygon points="-48,0 -34,-34 0,0" fill="#EBD9B4" opacity="0.8" />
          <polygon points="-34,-34 0,-48 0,0" fill="#F5E8CE" opacity="0.85" />
        </g>

        {/* Distant Faceted Pyramids in Silhouette */}
        <g opacity="0.85">
          {/* Main Central Pyramid */}
          {/* Lit Face */}
          <polygon points="620,440 760,250 760,455" fill="#1B2A41" opacity="0.75" />
          {/* Shadow Face */}
          <polygon points="760,250 900,445 760,455" fill="#101B2B" opacity="0.9" />
          {/* Gold capstone facet */}
          <polygon points="748,266 760,250 772,266 760,268" fill="#C9993A" opacity="0.65" />

          {/* Secondary Left Pyramid */}
          <polygon points="320,460 430,320 430,470" fill="#162336" opacity="0.7" />
          <polygon points="430,320 540,465 430,470" fill="#0E1724" opacity="0.85" />
          <polygon points="420,334 430,320 440,334 430,336" fill="#C9993A" opacity="0.45" />

          {/* Far Right Small Pyramid */}
          <polygon points="980,470 1060,370 1060,480" fill="#18273D" opacity="0.6" />
          <polygon points="1060,370 1140,475 1060,480" fill="#0C1420" opacity="0.8" />
        </g>

        {/* Low-Poly Dunes - Layer 1 (Distant Deep Hues) */}
        <g>
          <polygon points="-50,560 140,480 320,530 -50,600" fill="#241B1F" />
          <polygon points="140,480 380,450 560,510 320,530" fill="#2D2124" />
          <polygon points="380,450 670,425 840,490 560,510" fill="#362524" />
          <polygon points="670,425 940,440 1120,500 840,490" fill="#2B1F23" />
          <polygon points="940,440 1240,460 1490,520 1120,500" fill="#221920" />
        </g>

        {/* Low-Poly Dunes - Layer 2 (Mid-ground Warm Sandstone & Umber) */}
        <g>
          <polygon points="-60,670 180,560 380,620 -60,720" fill="#3B261D" />
          <polygon points="180,560 460,530 680,610 380,620" fill="#4B3123" />
          <polygon points="460,530 790,505 1020,590 680,610" fill="#583A27" />
          <polygon points="790,505 1110,520 1320,610 1020,590" fill="#482F20" />
          <polygon points="1110,520 1500,550 1500,670 1320,610" fill="#382419" />

          {/* Faceted Ridge Highlights */}
          <polygon points="460,530 570,570 680,610" fill="#6E482F" opacity="0.6" />
          <polygon points="790,505 905,545 1020,590" fill="#7D5133" opacity="0.5" />
          <polygon points="180,560 280,590 380,620" fill="#5B3A27" opacity="0.4" />
        </g>

        {/* Low-Poly Dunes - Layer 3 (Foreground Courtroom Sands & Warm Glow) */}
        <g>
          <polygon points="-40,780 220,660 520,730 -40,860" fill="#4F321E" />
          <polygon points="220,660 520,730 420,780" fill="#6A4328" />
          <polygon points="220,660 540,640 820,720 520,730" fill="#754B2B" />
          <polygon points="540,640 880,615 1180,710 820,720" fill="#88562E" />
          <polygon points="880,615 1260,635 1500,740 1180,710" fill="#6B4324" />
          <polygon points="1260,635 1500,660 1500,820 1500,740" fill="#4A2F1B" />

          {/* Golden Sandstone Facets on Ridge Crests */}
          <polygon points="540,640 680,678 820,720" fill="#9E6838" opacity="0.65" />
          <polygon points="880,615 1030,662 1180,710" fill="#A86E3A" opacity="0.6" />
          <polygon points="220,660 370,695 520,730" fill="#86562E" opacity="0.5" />
        </g>

        {/* Low-Poly Valley Floor / Platform Base */}
        <polygon points="-40,860 380,780 740,820 1120,770 1500,840 1500,900 -40,900" fill="#241710" />
        <polygon points="380,780 740,820 560,860" fill="#332015" />
        <polygon points="740,820 1120,770 930,850" fill="#3D2619" />

        {/* Ancient Low-Poly Stone Braziers (Left & Right) */}
        {/* Left Torch Stand */}
        <g>
          {/* Torch Light Radial Aura */}
          <rect x="-100" y="450" width="500" height="500" fill="url(#torchGlowLeft)" />

          {/* Brazier Pedestal - Faceted Stone */}
          <polygon points="90,880 150,880 135,760 105,760" fill="#150E09" />
          <polygon points="105,760 135,760 150,735 90,735" fill="#2B1D14" />
          <polygon points="85,735 155,735 160,720 80,720" fill="#3E2A1E" />
          {/* Gold Inlaid Rim */}
          <polygon points="80,720 160,720 155,715 85,715" fill="#C9993A" opacity="0.8" />
          {/* Coals */}
          <polygon points="88,715 152,715 140,705 100,705" fill="#E8883A" opacity="0.9" />

          {/* Low-Poly Faceted Flame */}
          <g className="animate-torch" style={{ transformOrigin: '120px 715px' }}>
            <polygon points="120,630 102,680 118,710 138,680" fill="#E8883A" />
            <polygon points="120,630 118,710 138,680" fill="#F4A24B" />
            <polygon points="112,650 128,685 118,705" fill="#FFE182" />
            <polygon points="95,675 110,695 102,680" fill="#C44D18" opacity="0.8" />
            <polygon points="145,675 130,695 138,680" fill="#C44D18" opacity="0.8" />
            {/* Embers */}
            <polygon points="118,610 122,614 118,618 114,614" fill="#FFC145" opacity="0.85" />
            <polygon points="128,590 131,593 128,596 125,593" fill="#E8883A" opacity="0.75" />
          </g>
        </g>

        {/* Right Torch Stand */}
        <g>
          {/* Torch Light Radial Aura */}
          <rect x="1040" y="450" width="500" height="500" fill="url(#torchGlowRight)" />

          {/* Brazier Pedestal - Faceted Stone */}
          <polygon points="1290,880 1350,880 1335,760 1305,760" fill="#150E09" />
          <polygon points="1305,760 1335,760 1350,735 1290,735" fill="#2B1D14" />
          <polygon points="1285,735 1355,735 1360,720 1280,720" fill="#3E2A1E" />
          {/* Gold Inlaid Rim */}
          <polygon points="1280,720 1360,720 1355,715 1285,715" fill="#C9993A" opacity="0.8" />
          {/* Coals */}
          <polygon points="1288,715 1352,715 1340,705 1300,705" fill="#E8883A" opacity="0.9" />

          {/* Low-Poly Faceted Flame */}
          <g className="animate-torch" style={{ transformOrigin: '1320px 715px', animationDelay: '-1.8s' }}>
            <polygon points="1320,630 1302,680 1318,710 1338,680" fill="#E8883A" />
            <polygon points="1320,630 1318,710 1338,680" fill="#F4A24B" />
            <polygon points="1312,650 1328,685 1318,705" fill="#FFE182" />
            <polygon points="1295,675 1310,695 1302,680" fill="#C44D18" opacity="0.8" />
            <polygon points="1345,675 1330,695 1338,680" fill="#C44D18" opacity="0.8" />
            {/* Embers */}
            <polygon points="1322,605 1326,609 1322,613 1318,609" fill="#FFC145" opacity="0.85" />
            <polygon points="1312,585 1315,588 1312,591 1309,588" fill="#E8883A" opacity="0.75" />
          </g>
        </g>

        {/* Subtle geometric framing border lines for the courtroom aesthetic */}
        <line x1="40" y1="30" x2="1400" y2="30" stroke="#C9993A" strokeWidth="0.75" strokeOpacity="0.25" />
        <line x1="40" y1="30" x2="40" y2="870" stroke="#C9993A" strokeWidth="0.75" strokeOpacity="0.25" />
        <line x1="1400" y1="30" x2="1400" y2="870" stroke="#C9993A" strokeWidth="0.75" strokeOpacity="0.25" />
        <line x1="40" y1="870" x2="1400" y2="870" stroke="#C9993A" strokeWidth="0.75" strokeOpacity="0.25" />

        {/* Four Corner Ancient Geometric Ornaments */}
        <polygon points="40,30 55,30 40,45" fill="#C9993A" opacity="0.7" />
        <polygon points="1400,30 1385,30 1400,45" fill="#C9993A" opacity="0.7" />
        <polygon points="40,870 55,870 40,855" fill="#C9993A" opacity="0.7" />
        <polygon points="1400,870 1385,870 1400,855" fill="#C9993A" opacity="0.7" />
      </svg>
    </div>
  );
};
