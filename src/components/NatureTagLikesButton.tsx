import React, { useState } from "react";
import type { Tag } from "../models/tag";
import "./NatureTagLikesButton.css";

type Props = {
  tag: Tag;
  initialLikes?: number;
  theme?: "theme-mist" | "theme-glacier" | "theme-sand" | string;
  onToggle?: (liked: boolean) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 自然风格的带点赞数量的 Tag 按钮
 * - 点击切换点赞状态并更新显示数字
 * - 样式由 `nature-tag` 与主题类控制
 */
export default function NatureTagLikesButton({
  tag,
  initialLikes = 0,
  theme = "theme-mist",
  onToggle,
  onClick,
}: Props) {
  const [liked, setLiked] = useState<boolean>(false);
  const [likes, setLikes] = useState<number>(initialLikes);

  // 仅显示字符串的最多前 4 个字符，用于紧凑展示（完整内容仍在 title 中）
  function shortText(s: string): string {
    if (s === undefined || s === null) return "-";

    const str = String(s);

    if (str.length <= 4) {
      return str;
    }

    return str.trim().slice(0, 4) + "..";
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    // If parent provided onClick, treat this as an action to open/detail
    // and avoid toggling like count here.
    if (onClick) {
      onClick(e);
      return;
    }

    // Fallback: original toggle behaviour if no onClick injected
    setLiked((prev) => {
      const next = !prev;

      setLikes((cur) => (next ? cur + 1 : Math.max(0, cur - 1)));

      if (onToggle) {
        onToggle(next);
      }

      return next;
    });
  }

  return (
    <button
      className={`nature-tag ${theme} ${liked ? "liked" : ""}`}
      title={tag.name}
      onClick={handleClick}
      aria-pressed={liked}
    >
      <span className="tag-label">{shortText(tag.name)}</span>

      <span className="tag-divider" aria-hidden />

      <span className="tag-stats">
        <svg className="tag-icon" viewBox="0 0 24 24" aria-hidden>
          <path d="M14,9V5a3,3,0,0,0-3-3l-4,9v11h11.28a2,2,0,0,0,2-1.7l1.38-9a2,2,0,0,0-2-2.3zM7,22H4a2,2,0,0,1-2-2V14a2,2,0,0,1,2-2H7Z" />
        </svg>

        <span className="count">{likes.toLocaleString()}</span>
      </span>
    </button>
  );
}
