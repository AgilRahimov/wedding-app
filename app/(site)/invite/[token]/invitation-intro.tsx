"use client";

import { useEffect, useRef, useState } from "react";

// The animated invitation that greets a guest before their page: a sealed
// envelope fills the screen, the guest taps it, and the film plays WITH its
// music (a browser only allows sound after a tap — that is why it does not
// start by itself). "Skip" is always there. Once watched or skipped, a cookie
// remembers it, so coming back to change an RSVP goes straight to the page;
// "Watch the invitation again" in the footer brings the film back.

const VIDEO = "/invitation/invitation.mp4";
const POSTER = "/invitation/poster.jpg"; // the film's first frame — the sealed envelope
const INTRO_SEEN_COOKIE = "invitation_seen"; // the invitation page reads the same name

type Stage = "sealed" | "playing" | "leaving" | "gone";

export function InvitationIntro({ alreadySeen }: { alreadySeen: boolean }) {
  const [stage, setStage] = useState<Stage>(alreadySeen ? "gone" : "sealed");
  const video = useRef<HTMLVideoElement>(null);

  // The page behind must not scroll while the envelope covers it.
  useEffect(() => {
    if (stage === "gone") return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [stage]);

  function open() {
    const v = video.current;
    if (!v) return leave();
    setStage("playing");
    // If a phone refuses to play for any reason, never trap the guest here.
    v.play().catch(leave);
  }

  function leave() {
    document.cookie = `${INTRO_SEEN_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    video.current?.pause();
    setStage("leaving");
    setTimeout(() => setStage("gone"), 700); // the length of the fade below
  }

  if (stage === "gone") {
    return (
      <button
        onClick={() => setStage("sealed")}
        className="mt-3 block w-full text-center text-[11px] uppercase tracking-[0.2em] text-white/25 transition hover:text-white/50"
      >
        Watch the invitation again
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Your invitation"
      className={`fixed inset-0 z-50 bg-[#f1ebe0] transition-opacity duration-700 ${
        stage === "leaving" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* On a computer the space either side is a soft blur of the envelope's
          white fabric, so the film has no hard edge. */}
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-70 blur-2xl"
        style={{ backgroundImage: `url(${POSTER})` }}
      />
      {/* A phone is filled edge to edge; on a computer the film keeps its
          tall phone shape in the middle of an ivory screen. */}
      <div className="relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)]">
        <video
          ref={video}
          src={VIDEO}
          poster={POSTER}
          preload="auto"
          playsInline
          onEnded={leave}
          className="h-full w-full object-cover"
        />

        {stage === "sealed" && (
          <button
            onClick={open}
            aria-label="Open the invitation"
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-end pb-[16vh] text-[#6f552b]"
          >
            <span
              className="animate-pulse text-2xl font-light tracking-wide"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Açmaq üçün toxunun
            </span>
            <span className="mt-2 text-[11px] uppercase tracking-[0.32em] opacity-80">
              Tap to open
            </span>
          </button>
        )}
      </div>

      <button
        onClick={leave}
        className="absolute right-4 top-4 rounded-full border border-[#8a6a35]/30 bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#6f552b] backdrop-blur transition hover:bg-white"
      >
        Skip
      </button>
    </div>
  );
}
