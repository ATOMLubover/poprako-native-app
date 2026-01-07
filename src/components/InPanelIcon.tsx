/**
 * In-Panel Icon (I)
 * 居中的字母 I，在一致的 14x14 框内
 */
type InPanelIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export default function InPanelIcon({
  size = 29,
  color = "currentColor",
  strokeWidth = 1.5,
  className = "",
}: InPanelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 标准框体 - 完整盒子 */}
      <rect width="14" height="14" x="5" y="5" rx="1.5" />
      {/* 居中字母 I */}
      <path d="M12 9v6M10 9h4M10 15h4" />
    </svg>
  );
}
