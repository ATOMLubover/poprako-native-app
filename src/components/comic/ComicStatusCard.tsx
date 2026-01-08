import type { ComicBrief } from "../../models/comic/comic";
import NatureTag from "../NatureTag";
import "./ComicStatusCard.css";

type ComicStatusCardProps = {
  comic: ComicBrief;
  onClick?: (comic: ComicBrief) => void;
};

type ProgressStatus = "pending" | "in-progress" | "completed";

type ProgressItem = {
  label: string;
  status: ProgressStatus;
};

/**
 * 计算进度状态
 */
function calculateProgressStatus(
  startedAt?: Date,
  completedAt?: Date
): ProgressStatus {
  if (completedAt) return "completed";
  if (startedAt) return "in-progress";
  return "pending";
}

/**
 * 构建进度显示数据
 */
function buildProgressItems(comic: ComicBrief): ProgressItem[] {
  return [
    {
      label: "翻译",
      status: calculateProgressStatus(comic.translationStartedAt, comic.translationCompletedAt),
    },
    {
      label: "校对",
      status: calculateProgressStatus(comic.proofreadingStartedAt, comic.proofreadingCompletedAt),
    },
    {
      label: "嵌字",
      status: calculateProgressStatus(comic.typesettingStartedAt, comic.typesettingCompletedAt),
    },
    {
      label: "监修",
      status: comic.reviewedAt ? "completed" : "pending",
    },
    {
      label: "发布",
      status: comic.publishedAt ? "completed" : "pending",
    },
  ];
}

/**
 * 漫画状态卡片
 * 单行布局：标题 + 标签 + 进度
 */
export default function ComicStatusCard({ comic, onClick }: ComicStatusCardProps) {
  const progressItems = buildProgressItems(comic);

  const displayTags = comic.tags.slice(0, 3);

  function handleClick() {
    if (onClick) {
      onClick(comic);
    }
  }

  return (
    <div className="csc-root" onClick={handleClick}>
      {/* 标题 + 标签，共享剩余宽度，标签紧跟标题 */}
      <div className="csc-main">
        <div className="csc-title-wrap">
          <span className="csc-title">
            [{comic.collectionIndex}-{comic.index}]【{comic.author}】{comic.title}
          </span>

          <div className="csc-tags">
            {displayTags.map((tag) => (
              <NatureTag
                key={tag.tagId}
                tag={{ tagId: tag.tagId, name: tag.name, isPinned: false, likedNum: 0 }}
                theme="theme-glacier"
                fontSize={11}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 进度部分 */}
      <div className="csc-progress-section">
        {progressItems.map((item) => (
          <span
            key={item.label}
            className={`csc-progress-tag csc-status-${item.status}`}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* 点赞小区块：使用 NatureTagLikesButton 的拇指图标（SVG），但不是按钮组件 */}
      <div className="csc-like-compact" aria-hidden>
        <svg className="csc-like-icon" viewBox="0 0 24 24" aria-hidden>
          <path d="M14,9V5a3,3,0,0,0-3-3l-4,9v11h11.28a2,2,0,0,0,2-1.7l1.38-9a2,2,0,0,0-2-2.3zM7,22H4a2,2,0,0,1-2-2V14a2,2,0,0,1,2-2H7Z" />
        </svg>
        <span className="csc-like-number">{comic.likesCount ?? 0}</span>
      </div>
    </div>
  );
}
