import Icon from "./Icon";
import "./TagDetailCard.css";

type PicaTag = {
  name: string;
};

type EhentaiTag = {
  name: string;
};

type Props = {
  tagName: string;
  picaTags?: PicaTag[];
  ehentaiTags?: EhentaiTag[];
  relatedComics?: string[];
  onEdit?: () => void;
  onExit?: () => void;
};

/**
 * 标签详情卡片
 * 展示标签详情、关联标签和相关漫画列表
 */
export default function TagDetailCard({
  tagName = "和服 (Kimono)",
  picaTags = [
    { name: "和服" },
    { name: "传统服饰" },
    { name: "大和抚子" },
  ],
  ehentaiTags = [
    { name: "kimono" },
    { name: "traditional clothes" },
    { name: "female:kimono" },
  ],
  relatedComics = [
    "京都物语：樱花下的邂逅",
    "风铃馆的夏日回忆",
    "大正浪漫：银座的黄昏",
    "绸缎之梦",
    "和服少女的秘密花园",
  ],
  onEdit,
  onExit,
}: Props) {
  return (
    <div className="tag-detail-card">
      <div className="header-row">
        <div className="term-name-wrapper">
          <h1 className="term-name">{tagName}</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="edit-action-btn"
            title="修改标签配置"
            onClick={onEdit}
          >
            <Icon name="pencil" className="edit-icon" />
          </button>

          <button
            className="close-action-btn"
            title="关闭"
            onClick={onExit}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tags-container">
        {picaTags.map((tag, idx) => (
          <span key={`pica-${idx}`} className="tag-pill tag-pica">
            {tag.name}
          </span>
        ))}

        {ehentaiTags.map((tag, idx) => (
          <span key={`eh-${idx}`} className="tag-pill tag-eh">
            {tag.name}
          </span>
        ))}
      </div>

      <div className="comic-recommendation">
        <div className="comic-list">
          {relatedComics.map((comic, idx) => (
            <div key={idx} className="comic-item">
              {comic}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
