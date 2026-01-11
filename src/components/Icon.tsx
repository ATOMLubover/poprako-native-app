import type { SVGProps } from "react";
import { Settings as LucideSettings, TreePine as LucideTreePine, Clock as LucideClock, Users as LucideUsers, Tag as LucideTag, Database as LucideDatabase, Image as LucideImage, Type as LucideType, Star as LucideStar, Wrench as LucideWrench } from "lucide-react";

type IconProps = {
  name: string;
  size?: number;
  className?: string;
};

// 极简单色图标组件，主要使用内置路径。针对 settings 使用 lucide-react 的 Settings
export default function Icon({ name, size = 19, className }: IconProps) {
  const svgProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  } as any;

  if (name === "settings") {
    return <LucideSettings size={size} className={className} />;
  }

  if (name === "tree-pine") {
    return <LucideTreePine size={size} className={className} />;
  }

  if (name === "clock") {
    return <LucideClock size={size} className={className} />;
  }

  if (name === "users") {
    return <LucideUsers size={size} className={className} />;
  }

  if (name === "tag") {
    return <LucideTag size={size} className={className} />;
  }

  if (name === "database") {
    return <LucideDatabase size={size} className={className} />;
  }

  if (name === "image") {
    return <LucideImage size={size} className={className} />;
  }

  if (name === "star") {
    return <LucideStar size={size} className={className} />;
  }

  if (name === "wrench") {
    return <LucideWrench size={size} className={className} />;
  }

  if (name === "font" || name === "type") {
    return <LucideType size={size} className={className} />;
  }

  switch (name) {
    case "cloud":
      return (
        <svg {...svgProps}>
          <path d="M20 17.58A4.5 4.5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25" />
        </svg>
      );

    case "mist":
      return (
        <svg {...svgProps}>
          <path d="M3 12h18" />
          <path d="M3 16h18" />
          <path d="M3 20h18" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...svgProps}>
          <path d="M3 21v-3.75L14.06 6.19l3.75 3.75L6.75 21H3z" />
          <path d="M18.37 6.63l-1.01-1.01 1.01 1.01z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...svgProps}>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...svgProps}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
        </svg>
      );
    case "message":
      return (
        <svg {...svgProps}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...svgProps}>
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-6" />
          <path d="M3 3h18" />
        </svg>
      );
    case "layers":
      return (
        <svg {...svgProps}>
          <path d="M12 2L1 7l11 5 11-5L12 2z" />
          <path d="M12 12l11-5v6l-11 5-11-5V7l11 5z" />
        </svg>
      );
    case "proofread":
      return (
        <svg {...svgProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          <path d="M15 5l3 3" />
        </svg>
      );
    case "power":
      return (
        <svg {...svgProps}>
          <path d="M12 2v10" />
          <path d="M5.07 6.07a10 10 0 1 0 13.86 0" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}
