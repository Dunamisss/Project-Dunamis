import { useEffect, useMemo, useRef, useState } from "react";

interface TubesEffectProps {
  className?: string;
}

const importRuntimeModule = new Function("path", "return import(path)") as (path: string) => Promise<any>;

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

    let isDisposed = false;

    const loadEffect = async () => {
      try {
        wrapperRef.current!.style.width = `${sizing.safeW}px`;
        wrapperRef.current!.style.height = `${sizing.safeH}px`;

        const module = await importRuntimeModule("/vendor/tubes-cursor.js");
        if (isDisposed) return;

        const TubesCursor = module.default;
        const app = TubesCursor(canvasRef.current!, {
          tubes: {
            colors: ["#D4AF37", "#B8860B", "#FFD700", "#AA8020"],
            lights: {
              intensity: 200,
              colors: ["#FFFFFF", "#FFD700", "#FFA500"],
            },
          },
        });

        instanceRef.current = app;
      } catch (error) {
        console.error("Error initializing TubesEffect:", error);
      }
    };

    void loadEffect();

    // Cleanup
    return () => {
      isDisposed = true;
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
        mixBlendMode: "screen",
        opacity: 0.65,
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
