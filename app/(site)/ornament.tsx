/**
 * A buta — the Azerbaijani paisley that appears on carpets, tilework and
 * silverware all over Baku. Used as the divider between sections instead of a
 * plain rule, so the page carries something of where the wedding actually is.
 */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a46a]/45 sm:w-24" />
      <svg width="20" height="26" viewBox="0 0 24 32" fill="none" className="shrink-0">
        <path
          d="M12 1.5c7.2 4.2 10 10.4 7.4 16.6-2 4.8-6.6 7.4-10.7 6.2-3.4-1-5.3-4.3-4.4-7.6.8-2.8 3.4-4.5 5.9-3.9 2 .5 3.1 2.3 2.6 4.2-.4 1.5-1.8 2.4-3.1 2.1"
          stroke="#c9a46a"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M12 1.5C6.6 5.3 3.6 10.8 4.3 16.4c.3 2.6 1.4 4.9 3 6.6"
          stroke="#c9a46a"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="12" cy="29" r="1.4" fill="#c9a46a" opacity="0.7" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a46a]/45 sm:w-24" />
    </div>
  );
}
