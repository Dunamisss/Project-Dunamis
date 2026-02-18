import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ElectricFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  color?: string;
};

const PX_PER_SEC = 100;
const SIZE_FACTOR = 1.4;

export default function ElectricFrame({
  children,
  className,
  contentClassName,
  color = "#f5c04a",
}: ElectricFrameProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const filterIdRef = useRef(`electric-displace-${Math.random().toString(36).slice(2, 10)}`);
  const animateDy1Ref = useRef<SVGAnimateElement>(null);
  const animateDy2Ref = useRef<SVGAnimateElement>(null);
  const animateDx1Ref = useRef<SVGAnimateElement>(null);
  const animateDx2Ref = useRef<SVGAnimateElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const updateAnimationValues = () => {
      const { width, height } = card.getBoundingClientRect();

      const filterHeight = Math.max(height * SIZE_FACTOR, 1);
      const durY = filterHeight / PX_PER_SEC;
      animateDy1Ref.current?.setAttribute("values", `${filterHeight}; 0`);
      animateDy1Ref.current?.setAttribute("dur", `${durY}s`);
      animateDy2Ref.current?.setAttribute("values", `0; -${filterHeight}`);
      animateDy2Ref.current?.setAttribute("dur", `${durY}s`);

      const filterWidth = Math.max(width * SIZE_FACTOR, 1);
      const durX = filterWidth / PX_PER_SEC;
      animateDx1Ref.current?.setAttribute("values", `${filterWidth}; 0`);
      animateDx1Ref.current?.setAttribute("dur", `${durX}s`);
      animateDx2Ref.current?.setAttribute("values", `0; -${filterWidth}`);
      animateDx2Ref.current?.setAttribute("dur", `${durX}s`);
    };

    const resizeObserver = new ResizeObserver(updateAnimationValues);
    updateAnimationValues();
    resizeObserver.observe(card);
    return () => resizeObserver.disconnect();
  }, []);

  const style = {
    "--electric-border-color": color,
    "--electric-filter": `url(#${filterIdRef.current})`,
  } as CSSProperties;

  return (
    <div ref={cardRef} className={cn("electric-frame", className)} style={style}>
      <div className="electric-frame__layer electric-frame__layer--main" />
      <div className="electric-frame__layer electric-frame__layer--glow-tight" />
      <div className="electric-frame__layer electric-frame__layer--glow-wide" />
      <div className="electric-frame__layer electric-frame__layer--overlay-primary" />
      <div className="electric-frame__layer electric-frame__layer--overlay-secondary" />
      <div className="electric-frame__layer electric-frame__layer--background-glow" />

      <div className={cn("electric-frame__content", contentClassName)}>{children}</div>

      <svg className="electric-frame__defs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter
            id={filterIdRef.current}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              seed={1}
              result="verticalNoise"
            />
            <feOffset in="verticalNoise" result="animatedVertical_1">
              <animate ref={animateDy1Ref} attributeName="dy" values="700; 0" dur="4s" repeatCount="indefinite" />
            </feOffset>
            <feOffset in="verticalNoise" result="animatedVertical_2">
              <animate ref={animateDy2Ref} attributeName="dy" values="0; -700" dur="4s" repeatCount="indefinite" />
            </feOffset>
            <feComposite in="animatedVertical_1" in2="animatedVertical_2" operator="over" result="seamlessVerticalNoise" />

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              seed={2}
              result="horizontalNoise"
            />
            <feOffset in="horizontalNoise" result="animatedHorizontal_1">
              <animate ref={animateDx1Ref} attributeName="dx" values="400; 0" dur="4s" repeatCount="indefinite" />
            </feOffset>
            <feOffset in="horizontalNoise" result="animatedHorizontal_2">
              <animate ref={animateDx2Ref} attributeName="dx" values="0; -400" dur="4s" repeatCount="indefinite" />
            </feOffset>
            <feComposite in="animatedHorizontal_1" in2="animatedHorizontal_2" operator="over" result="seamlessHorizontalNoise" />

            <feBlend in="seamlessVerticalNoise" in2="seamlessHorizontalNoise" mode="color-dodge" result="finalBlendedNoise" />

            <feDisplacementMap in="SourceGraphic" in2="finalBlendedNoise" scale={30} xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

