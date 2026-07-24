import type { DetailedHTMLProps, HTMLAttributes } from "react";

type HoverTiltAttributes = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  "tilt-factor"?: number | string;
  "tilt-factor-y"?: number | string;
  "scale-factor"?: number | string;
  "enter-delay"?: number | string;
  "exit-delay"?: number | string;
  shadow?: boolean | string;
  "shadow-blur"?: number | string;
  "blend-mode"?: string;
  "glare-intensity"?: number | string;
  "glare-hue"?: number | string;
  "glare-mask"?: string;
  "glare-mask-mode"?: string;
  "glare-mask-composite"?: string;
  class?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hover-tilt": HoverTiltAttributes;
    }
  }
}

export {};
