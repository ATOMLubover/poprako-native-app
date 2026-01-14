import type { Tag, TagBrief } from "../models/tag";
import "./NatureTag.css";

type Props = {
  tag: Tag | TagBrief;
  theme?: "theme-mist" | "theme-glacier" | "theme-sand" | string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  fontSize?: number | string;
};

/**
 * 自然风格的 Tag 按钮
 * 简洁的外观，样式由 CSS 类 `nature-tag` 与主题类控制
 */
export default function NatureTag({
  tag,
  theme = "theme-mist",
  onClick,
  fontSize = 14,
}: Props) {
  const cursorStyle = onClick ? "pointer" : "default";

  const fontSizeStyle =
    typeof fontSize === "number" ? `${fontSize}px` : fontSize;

  return (
    <button
      className={`nature-tag ${theme}`}
      title={tag.name}
      onClick={onClick}
      style={{ cursor: cursorStyle, fontSize: fontSizeStyle }}
    >
      <span className="tag-label">{tag.name}</span>
    </button>
  );
}
