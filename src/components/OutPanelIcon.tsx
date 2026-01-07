/**
 * Out-of-Panel Icon (A)
 * 突出的字母 A，跨越框的左侧间隙
 * A 的中央轴线略微右移以获得更好的集成效果
 */
type OutPanelIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export default function OutPanelIcon({
  size = 29,
  color = "currentColor",
  strokeWidth = 1.5,
  className = "",
}: OutPanelIconProps) {
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
      {/* 框体 - 部分盒子 */}
      <path d="M8.5 5h8.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H8.5" />
      
      {/* 字母 A - 6 单位宽度，中心轴向右偏移至 x=8 */}
      {/* 顶部在 (8, 8)，左下在 (5, 16)，右下在 (11, 16) */}
      <path d="M8 8l-3 8M8 8l3 8M6 14h4" />
    </svg>
  );
}
