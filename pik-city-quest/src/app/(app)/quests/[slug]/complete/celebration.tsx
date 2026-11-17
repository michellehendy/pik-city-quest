"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
export function Celebration() {
  useEffect(() => {
    const end = Date.now() + 1800;
    const colors = ["#087088", "#40c0c8", "#f8b818", "#ffffff", "#ff6b5b"];
    (function frame() { confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors }); confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors }); if (Date.now() < end) requestAnimationFrame(frame); })();
  }, []);
  return null;
}
