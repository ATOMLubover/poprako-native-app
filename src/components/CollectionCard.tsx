import React from "react";
import { Workset } from "../models/workset";
import "./CollectionCard.css";

type CollectionCardProps = {
  workset: Workset;
  onClick?: (workset: Workset) => void;
};

/**
 * CollectionCard 组件 - 紧凑两行设计
 * 参考 TermbaseCard 样式
 */
export const CollectionCard: React.FC<CollectionCardProps> = ({
  workset,
  onClick,
}) => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const handleClick = () => {
    onClick?.(workset);
  };

  return (
    <div
      className="collection-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="row row--top">
        <h3
          className="collection-name"
          title={workset.description ?? `#${workset.index}`}
        >
          {workset.description ?? `#${workset.index}`}
        </h3>
        <div
          className="collection-updated"
          title={formatDate(workset.updatedAt)}
        >
          {formatDate(workset.updatedAt)}
        </div>
      </div>

      <div className="divider" />

      <div className="row row--bottom">
        <div style={{ flex: 1 }} />
        <div className="modifier-info" title={`Items: ${workset.comicCount}`}>
          <svg
            width="10"
            height="10"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M13 8H7" />
            <path d="M17 12H7" />
          </svg>
          <span className="modifier-info__count">{workset.comicCount}</span>
        </div>
      </div>
    </div>
  );
};
