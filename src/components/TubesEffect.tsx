import { useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import TubesCursor from "@/lib/tubes-cursor.js";

interface TubesEffectProps {
  className?: string;
}

export default function TubesEffect({ className }: TubesEffectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const sizing = useMemo(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxDim = 4096;
    const safeW = Math.min(viewport.width, Math.floor(maxDim / dpr));
    const safeH = Math.min(viewport.height, Math.floor(maxDim / dpr));
    const scaleX = safeW ? viewport.width / safeW : 1;
    const scaleY = safeH ? viewport.height / safeH : 1;
    return { safeW, safeH, scaleX, scaleY };
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    if (!sizing.safeW || !sizing.safeH) return;

    try {
      wrapperRef.current.style.width = `${sizing.safeW}px`;
      wrapperRef.current.style.height = `${sizing.safeH}px`;

      // Initialize Tubes Cursor
      // Dunamis Theme: Gold, Black, Architectural
      const app = TubesCursor(canvasRef.current, {
        tubes: {
          // Gold variations: Metallic Gold, Dark Gold, Pale Gold
          colors: ["#D4AF37", "#B8860B", "#FFD700", "#AA8020"],
          lights: {
            intensity: 200,
            // Lights: White, Bright Gold, Warm Orange
            colors: ["#FFFFFF", "#FFD700", "#FFA500"]
          }
        }
      });

      instanceRef.current = app;
      console.log("TubesEffect initialized", app);
    } catch (error) {
      console.error("Error initializing TubesEffect:", error);
    }

    // Cleanup
    return () => {
      if (instanceRef.current && typeof instanceRef.current.dispose === 'function') {
        instanceRef.current.dispose();
      }
      
      const gl = canvasRef.current?.getContext('webgl');
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, [sizing.safeW, sizing.safeH]);

  return (
    <div
      ref={wrapperRef}
      className={`fixed top-0 left-0 pointer-events-none z-10 ${className}`}
      style={{
        transform: `scale(${sizing.scaleX}, ${sizing.scaleY})`,
        transformOrigin: "top left",
      }}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: "block" }}
      />
    </div>
  );
}
