"use client";

import { useEffect, useRef } from "react";

type CardCelebrateProps = {
  sessionId: string;
  enabled: boolean;
  children: React.ReactNode;
};

const seenKey = (sessionId: string) => `dojang-card-seen:${sessionId}`;

export function CardCelebrate({
  sessionId,
  enabled,
  children,
}: CardCelebrateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    let alreadySeen = false;
    try {
      alreadySeen = Boolean(localStorage.getItem(seenKey(sessionId)));
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) return;

    try {
      localStorage.setItem(seenKey(sessionId), "1");
    } catch {
      // ignore
    }

    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#8066e8", "#74d2a1", "#ff8fb8", "#ffd76a", "#6ec8ff"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const piece of pieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.05;
        piece.rot += piece.vr;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      }
      if (frame < 120) {
        raf = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, sessionId]);

  return (
    <div className="card-celebrate">
      {children}
      <canvas
        ref={canvasRef}
        className="card-celebrate__canvas"
        aria-hidden="true"
      />
    </div>
  );
}
