import { TermBase } from "../models/term";
import "./TermbaseCard.css";
import NatureButton from "./NatureButton";
// 使用与 TermCard 相同的 modifier-info 样式替代原有 RectNatureTag

type TermbaseCardProps = {
  data: TermBase;
};

// 格式化日期为 YYYY.MM.DD 格式
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// 格式化数字为本地化格式
function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export default function TermbaseCard({ data }: TermbaseCardProps) {
  const createdAtStr = formatDate(data.createdAt);
  const updatedAtStr = formatDate(data.updatedAt);

  return (
    <div className="termbase-card">
      <div className="header">
        <h2 className="term-name" title={data.name}>
          {data.name}
        </h2>
        <span className="time-range">
          {createdAtStr} ~ {updatedAtStr}
        </span>
      </div>

      <p className="term-description">{data.description || "暂无描述信息"}</p>

      <div className="tags-footer-row">
        <div className="tags-row">
        <div className="modifier-info" title={data.teamBrief.name}>
          <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          {data.teamBrief.name}
        </div>

        <div className="modifier-info" title={data.creatorNickname}>
          <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {data.creatorNickname}
        </div>

        <div className="modifier-info" title={String(formatNumber(data.termNum))}>
          <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
          {formatNumber(data.termNum)}
        </div>
        </div>

        <div className="card-footer">
          <NatureButton variant="mist" onClick={() => console.log("View termbase", data.name)} fontSize={11}>
            查看
          </NatureButton>
        </div>
      </div>
    </div>
  );
}
