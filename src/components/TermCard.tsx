import { Term } from "../models/term";
import "./TermCard.css";
import NatureButton from "./NatureButton";
import Icon from "./Icon";

type TermCardProps = {
  data: Term;
  onEdit?: (term: Term) => void;
  onDelete?: (term: Term) => void;
  onClick?: (term: Term) => void;
};

/**
 * 术语条目卡片组件
 * 展示术语的原文、定义、修改者和更新时间
 */
export default function TermCard({ data, onEdit, onDelete, onClick }: TermCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(data);
    }
  };

  const formatUpdateTime = (date: Date): string => {
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="term-card" onClick={handleClick}>
      <div className="term-content">
        <span className="term-original">{data.original}</span>
        <span className="term-definition">{data.definition}</span>
      </div>

      <div className="term-footer">
        <div className="footer-left">
          <div className="modifier-info" title={data.modifierNickname}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {data.modifierNickname}
          </div>
          <span className="update-time">{formatUpdateTime(data.updatedAt)}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <NatureButton
            variant="mist"
            minWidth={18}
            fontSize={12}
            onClick={() => {
              if (onEdit) {
                onEdit(data);
              }
            }}
          >
            <Icon name="pencil" size={14} />
          </NatureButton>

          <NatureButton
            variant="rose"
            minWidth={20}
            fontSize={12}
            onClick={() => {
              if (onDelete) {
                onDelete(data);
              }
            }}
          >
            <Icon name="trash" size={14} />
          </NatureButton>
        </div>
      </div>
    </div>
  );
}
