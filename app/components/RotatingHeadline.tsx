"use client";
import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

const phrases = [
  "Closer than you think.",
  "Waiting to be opened.",
  "One good book away.",
  "Yours to discover.",
];

export function RotatingHeadline() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!motion || paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % phrases.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [motion, paused]);
  return (
    <span className="rotating-headline">
      <span className="sr-only">Closer than you think.</span>
      <em className="headline-phrases" aria-hidden="true">
        {phrases.map((phrase, index) => (
          <span key={phrase} className={index === active ? "is-active" : ""}>
            {phrase}
          </span>
        ))}
      </em>
      {motion && (
        <button
          type="button"
          className="headline-motion-toggle"
          aria-label={
            paused ? "Resume rotating headline" : "Pause rotating headline"
          }
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? "Play" : "Pause"}</span>
        </button>
      )}
    </span>
  );
}
