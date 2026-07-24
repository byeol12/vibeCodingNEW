"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

type CardTiltProps = {
  children: ReactNode;
  className?: string;
  glareHue?: number;
  style?: CSSProperties;
};

export function CardTilt({
  children,
  className,
  glareHue = 270,
  style,
}: CardTiltProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (customElements.get("hover-tilt")) return;
    void import("hover-tilt/web-component").catch(() => undefined);
  }, []);

  return (
    <hover-tilt
      className={className}
      style={style}
      tilt-factor={1.35}
      tilt-factor-y={1.15}
      scale-factor={1.04}
      glare-intensity={0}
      glare-hue={glareHue}
      exit-delay={160}
    >
      {children}
    </hover-tilt>
  );
}
