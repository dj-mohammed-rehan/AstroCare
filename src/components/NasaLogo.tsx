import React from 'react';

interface NasaLogoProps {
  size?: number;
  className?: string;
}

export function NasaLogo({ size = 24, className = '' }: NasaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NASA Logo"
      className={`shrink-0 ${className}`}
    >
      {/* Deep NASA Blue Sphere */}
      <circle cx="32" cy="32" r="25" fill="#0B3D91" />
      <circle cx="32" cy="32" r="25" stroke="#B9DDF5" strokeOpacity="0.28" strokeWidth="1" />

      {/* Pinpoint Starfield */}
      <circle cx="21" cy="18" r="1" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="42" cy="16" r="1.1" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="47" cy="24" r="0.9" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="17" cy="40" r="0.9" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="43" cy="46" r="1" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="28" cy="49" r="0.8" fill="#FFFFFF" fillOpacity="0.8" />

      {/* White Orbital Path */}
      <ellipse
        cx="32"
        cy="32"
        rx="28.5"
        ry="10"
        transform="rotate(-26 32 32)"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeOpacity="0.95"
      />

      {/* Red Aerodynamic Vector Chevron */}
      <path
        d="M12.5 43.5L32.8 11.5L35 12.2L29.2 31.8L52.8 41.2L26.5 35.6L14 44.8Z"
        fill="#FC3D21"
      />

      {/* Crisp White NASA Wordmark */}
      <text
        x="32"
        y="37.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="13.5"
        fontWeight="800"
        fontFamily="Space Grotesk, Inter, system-ui, sans-serif"
        letterSpacing="1.2"
      >
        NASA
      </text>
    </svg>
  );
}

interface PoweredByNasaProps {
  size?: 'sm' | 'md';
  tone?: 'theme' | 'dark';
  className?: string;
}

export function PoweredByNasa({
  size = 'sm',
  tone = 'theme',
  className = '',
}: PoweredByNasaProps) {
  const logoSize = size === 'md' ? 24 : 20;
  const textClass = size === 'md' ? 'text-xs' : 'text-[11px]';
  const secondaryClass =
    tone === 'dark' ? 'text-[#A5B3C3]' : 'text-[var(--astra-text-secondary)]';
  const primaryClass =
    tone === 'dark' ? 'text-[#F4F7FA]' : 'text-[var(--astra-text-primary)]';

  return (
    <div
      className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${className}`}
    >
      <NasaLogo size={logoSize} />
      <span className={`${textClass} font-medium tracking-wide ${secondaryClass}`}>
        Powered by <span className={`font-semibold ${primaryClass}`}>NASA</span>
      </span>
    </div>
  );
}
