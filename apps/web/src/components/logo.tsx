import { useId } from 'react';

/** FAMS mark: a calendar page with a check, on a blue gradient tile. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2B88D8" />
          <stop offset="1" stopColor="#0B3A66" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${id})`} />
      <rect x="14" y="17" width="36" height="33" rx="5" fill="#fff" />
      <path d="M14 26h36v-4a5 5 0 0 0-5-5H19a5 5 0 0 0-5 5v4Z" fill="#fff" fillOpacity=".55" />
      <rect x="22" y="11" width="4.5" height="12" rx="2.25" fill="#fff" />
      <rect x="37.5" y="11" width="4.5" height="12" rx="2.25" fill="#fff" />
      <path d="m23 38.5 6.5 6.5L42 32" fill="none" stroke="#0F6CBD" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tagline = true, light = false }: { tagline?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={36} />
      <span className="leading-tight">
        <span className={`block font-display text-base font-bold tracking-tight ${light ? 'text-white' : ''}`}>FAMS</span>
        {tagline && <span className={`block text-[11px] ${light ? 'text-white/80' : 'text-muted'}`}>Faculty Attendance</span>}
      </span>
    </span>
  );
}
