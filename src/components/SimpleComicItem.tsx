import type { SimpleComicInfo } from "../models/comic";
import NatureTag from "./NatureTag";
import "./SimpleComicItem.css";

type SimpleComicItemProps = {
  data: SimpleComicInfo;
};

/**
 * SimpleComicItem 组件
 * 展示单个漫画卡片，显示 【author】title 和 team tag
 */
export default function SimpleComicItem({ data }: SimpleComicItemProps) {
  const teamTag = {
    // Map TeamBrief -> Tag shape required by NatureTag
    tagId: data.team.teamId,
    name: data.team.name,
    isPinned: false,
    likedNum: 0,
  };

  return (
    <div className="simple-comic-item ps-card">
      <div className="ps-item-line1">【{data.author}】{data.title}</div>
      <div className="ps-item-tags">
        <NatureTag tag={teamTag} theme="theme-glacier" />
      </div>
    </div>
  );
}
