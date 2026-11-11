/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AncientFrame: Polished container with thin gold borders, corner ornaments,
 * and low-poly desert courtroom styling.
 */

import React from 'react';

interface AncientFrameProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const AncientFrame: React.FC<AncientFrameProps> = ({
  children,
  className = '',
  glow = false
}) => {
  return (
    <div
      className={`relative border border-[#C9993A]/30 bg-[#1E140D]/85 backdrop-blur-md p-6 sm:p-8 transition-all duration-300 ${
        glow ? 'shadow-[0_0_35px_rgba(232,136,58,0.18)] border-[#C9993A]/50' : 'shadow-2xl'
      } ${className}`}
    >
      {/* Top-Left Corner Ornament */}
      <span className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t-2 border-l-2 border-[#C9993A] pointer-events-none" />
      {/* Top-Right Corner Ornament */}
      <span className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t-2 border-r-2 border-[#C9993A] pointer-events-none" />
      {/* Bottom-Left Corner Ornament */}
      <span className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b-2 border-l-2 border-[#C9993A] pointer-events-none" />
      {/* Bottom-Right Corner Ornament */}
      <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b-2 border-r-2 border-[#C9993A] pointer-events-none" />

      {/* Subtle interior hairline */}
      <div className="absolute inset-1 pointer-events-none border border-[#C9993A]/10" />

      {children}
    </div>
  );
};

export const AncientButton: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}> = ({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button',
  fullWidth = false
}) => {
  const base =
    'relative inline-flex items-center justify-center font-cinzel font-semibold tracking-wider text-sm uppercase transition-all duration-200 cursor-pointer disabled:cursor-not-allowed select-none px-6 py-3.5';

  const variants = {
    primary:
      'bg-gradient-to-b from-[#C9993A] to-[#A87926] text-[#1E140D] font-bold shadow-[0_2px_12px_rgba(201,153,58,0.35)] hover:from-[#DFB75A] hover:to-[#B98830] hover:shadow-[0_4px_20px_rgba(232,136,58,0.45)] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none border border-[#FFD988]',
    secondary:
      'bg-[#1B2A41]/80 text-[#EBD9B4] border border-[#C9993A]/40 hover:bg-[#1B2A41] hover:border-[#C9993A] hover:text-[#FFF4DC] hover:shadow-[0_0_15px_rgba(201,153,58,0.2)] active:scale-[0.99] disabled:opacity-40',
    ghost:
      'bg-transparent text-[#D9B98A] border border-[#C9993A]/20 hover:border-[#C9993A]/60 hover:text-[#EBD9B4] hover:bg-[#C9993A]/10 active:scale-[0.99] disabled:opacity-40'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Corner bracket accents on buttons */}
      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current pointer-events-none opacity-80" />
      <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-current pointer-events-none opacity-80" />
      <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-current pointer-events-none opacity-80" />
      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current pointer-events-none opacity-80" />
      {children}
    </button>
  );
};
