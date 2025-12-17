import type { Tag } from "../models/tag";

type Props = {
  tag: Tag;
  theme?: "theme-mist" | "theme-glacier" | "theme-sand" | string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 自然风格的 Tag 按钮
 * 简洁的外观，样式由现有的 CSS 类 `nature-tag` 与主题类控制
 */
export default function NatureTag({ tag, theme = "theme-mist", onClick }: Props) {
  return (
    <button
      className={`nature-tag ${theme}`}
      title={tag.name}
      onClick={onClick}
      style={{ cursor: "default" }}
    >
      <span className="tag-label">{tag.name}</span>
    </button>
  );
}
