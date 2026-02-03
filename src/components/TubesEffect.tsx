import { useEffect, useRef } from "react";
// @ts-ignore
import TubesCursor from "@/lib/tubes-cursor.js";

interface TubesEffectProps {
  className?: string;
}

export default function TubesEffect({ className }: TubesEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
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
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-10 block ${className}`}
      style={{ display: "block" }}
    />
  );
}
