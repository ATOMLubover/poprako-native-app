import type { ComicBrief } from "../models/comic/comic";
// import NatureTag from "./NatureTag";
import "./BriefComicCard.css";

type Props = {
  comic: ComicBrief;
  className?: string;
  style?: React.CSSProperties;
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
 * 漫画摘要卡片
 * 瘦长布局，展示核心信息和进度
 */
export default function BriefComicCard({
  comic,
  className = "",
  style,
}: Props) {
  const progressItems: ProgressItem[] = [
    {
      label: "翻译",
      status: calculateProgressStatus(
        comic.translatingStartedAt,
        comic.translatingCompletedAt
      ),
    },
    {
      label: "校对",
      status: calculateProgressStatus(
        comic.proofreadingStartedAt,
        comic.proofreadingCompletedAt
      ),
    },
    {
      label: "嵌字",
      status: calculateProgressStatus(
        comic.typesettingStartedAt,
        comic.typesettingCompletedAt
      ),
    },
    {
      label: "监修",
      status: comic.reviewingCompletedAt ? "completed" : "pending",
    },
    {
      label: "发布",
      status: comic.uploadingCompletedAt ? "completed" : "pending",
    },
  ];

  // const displayTags = comic.tags.slice(0, 3);

  const formattedDate = comic.updatedAt
    ? new Date(comic.updatedAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  const metaInfo = [];
  metaInfo.push(`${comic.likesCount} Likes!`);
  metaInfo.push(formattedDate);

  return (
    <div className={`brief-comic-card ${className}`} style={style}>
      {/* 第一行: 标题 + 进度标签 */}
      <div className="card-row-1">
        <div className="title-area">
          <span className="title-text">
            [{comic.worksetId}-{comic.index}]【{comic.author}】{comic.title}
          </span>
        </div>

        <div className="progress-area">
          {progressItems.map((item) => (
            <span
              key={item.label}
              className={`progress-tag progress-${item.status}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* 第二行: 标签 + 元信息 */}
      <div className="card-row-2">
        {/* <div className="tags-area">
          {displayTags.map((tag) => (
            <NatureTag
              key={tag.id}
              tag={tag}
              theme="theme-glacier"
              fontSize={12}
            />
          ))}
        </div> */}

        <div className="date-area">{metaInfo.join(" | ")}</div>
      </div>
    </div>
  );
}
