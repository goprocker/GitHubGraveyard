"use client";

import { useEffect, useRef } from "react";

interface Wisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const MAX_WISPS = 90;

/**
 * A lantern glow that trails the pointer and sheds ghostly wisps as it moves.
 * Only on fine pointers, and never under reduced motion.
 */
export function LanternCursor() {
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const glow = glowRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!glow || !canvas || !context) return;

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    const light = { ...pointer };
    const wisps: Wisp[] = [];
    let visible = false;
    let frame = 0;

    const resize = () => {
      const scale = Math.min(devicePixelRatio, 2);
      canvas.width = innerWidth * scale;
      canvas.height = innerHeight * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const onMove = (event: PointerEvent) => {
      const speed = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        visible = true;
        light.x = pointer.x;
        light.y = pointer.y;
        glow.style.opacity = "1";
      }
      const count = Math.min(3, Math.floor(speed / 14) + 1);
      for (let i = 0; i < count && wisps.length < MAX_WISPS; i++) {
        wisps.push({
          x: pointer.x + (Math.random() - 0.5) * 10,
          y: pointer.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.4 - Math.random() * 0.8,
          life: 1,
          size: 2 + Math.random() * 4,
        });
      }
    };

    const onLeave = () => {
      visible = false;
      glow.style.opacity = "0";
    };

    const tick = () => {
      // The light lags behind the pointer, like a lantern swinging on a hand.
      light.x += (pointer.x - light.x) * 0.14;
      light.y += (pointer.y - light.y) * 0.14;
      glow.style.transform = `translate3d(${light.x}px, ${light.y}px, 0)`;

      context.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = wisps.length - 1; i >= 0; i--) {
        const wisp = wisps[i]!;
        wisp.life -= 0.018;
        if (wisp.life <= 0) {
          wisps.splice(i, 1);
          continue;
        }
        wisp.vx += Math.sin((wisp.y + wisp.life * 40) * 0.05) * 0.03;
        wisp.x += wisp.vx;
        wisp.y += wisp.vy;
        const radius = wisp.size * (1.4 - wisp.life * 0.4);
        const gradient = context.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, radius * 3);
        gradient.addColorStop(0, `rgba(200, 216, 255, ${0.55 * wisp.life})`);
        gradient.addColorStop(1, "rgba(200, 216, 255, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(wisp.x, wisp.y, radius * 3, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={glowRef}
        className="absolute top-0 left-0 opacity-0 transition-opacity duration-500"
        style={{ willChange: "transform" }}
      >
        <div className="lantern-light -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}
