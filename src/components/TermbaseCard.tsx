import { useState } from "react";
import { TermBase } from "../models/term";
import "./TermbaseCard.css";
// NatureButton removed: open-on-click behavior moved to the whole card
import TermList from "./TermList";
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
function formatNumber(num?: number): string {
  // 若传入为空或非数字，则默认显示 0，避免出现 NaN
  const n = typeof num === "number" && !Number.isNaN(num) ? num : 0;

  return new Intl.NumberFormat().format(n);
}

// 仅显示字符串的最多前 4 个字符，用于紧凑展示（完整内容仍在 title 中）
function shortText(s: string): string {
  if (s === undefined || s === null) return "-";

  const str = String(s);

  if (str.length <= 4) {
    return str;
  }

  return str.trim().slice(0, 4) + "..";
}

export default function TermbaseCard({ data }: TermbaseCardProps) {
  const [open, setOpen] = useState(false);

  const createdAtStr = formatDate(data.createdAt);
  const updatedAtStr = formatDate(data.updatedAt);

  return (
    <>
      <div
        className="termbase-card"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(true);
          }
        }}
      >
        <div className="header">
          <h2 className="term-name" title={data.name}>
            {data.name}
          </h2>
          <span className="time-range">
            {createdAtStr} ~ {updatedAtStr}
          </span>
        </div>

        <p className="term-description">{data.description || "暂无描述信息"}</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 0 }}>
            <div className="modifier-info" title={data.teamBrief.name}>
              <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              {shortText(data.teamBrief.name)}
            </div>

            <div className="modifier-info" title={String(formatNumber(data.termNum))}>
              <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
              {shortText(formatNumber(data.termNum))}
            </div>

            <div className="modifier-info" title={String(formatNumber(data.likedNum))}>
              <svg width="10" height="10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M14,9V5a3,3,0,0,0-3-3l-4,9v11h11.28a2,2,0,0,0,2-1.7l1.38-9a2,2,0,0,0-2-2.3zM7,22H4a2,2,0,0,1-2-2V14a2,2,0,0,1,2-2H7Z" fill="currentColor" />
              </svg>
              {shortText(formatNumber(data.likedNum))}
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: 700, maxWidth: "95%", height: "85vh", maxHeight: "85vh", background: "#fff", borderRadius: 10, padding: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>术语库：{data.name}</div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <TermList onExit={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
