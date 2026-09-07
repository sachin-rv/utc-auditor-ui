export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="8" className="fill-signal-pass" />
      <circle cx="14" cy="14" r="7.25" stroke="white" strokeOpacity="0.35" strokeWidth="1.75" />
      <path
        d="M14 6.75A7.25 7.25 0 0 1 21.25 14"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M10.2 14.15l2.15 2.2 5.45-5.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
