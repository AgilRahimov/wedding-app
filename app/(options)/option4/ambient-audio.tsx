"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The little speaker button in the corner: a quiet ambient loop behind the
 * page. Off until the guest taps it — phones refuse sound that starts by
 * itself. (Once the invitation film is in front of this page, the tap that
 * opens the envelope can start the music as well.)
 */
export function AmbientAudio({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (on) a.play().catch(() => setOn(false));
    else a.pause();
  }, [on]);

  return (
    <>
      <audio ref={audio} src={src} loop preload="none" />
      <button
        type="button"
        onClick={() => setOn(!on)}
        aria-label={on ? "Turn music off" : "Turn music on"}
        aria-pressed={on}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[#dcc28f]/50 bg-[#161d4a]/85 text-[#f3ead8] shadow-lg backdrop-blur transition hover:bg-[#161d4a]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          {on ? (
            <>
              <path d="M16.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 6a8.5 8.5 0 0 1 0 12" />
            </>
          ) : (
            <path d="M17 9l4 6M21 9l-4 6" />
          )}
        </svg>
      </button>
    </>
  );
}
