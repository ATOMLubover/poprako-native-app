import React, { useMemo, useState } from "react";
import NatureButton from "./NatureButton";
import TermbaseCard from "./TermbaseCard";
import "./TermbaseList.css";
import type { TermBase } from "../models/term";

type TermbaseListProps = {
  initial?: TermBase[];
  onExit?: () => void;
};

/**
 * TermbaseList 组件
 * - 输入框按 Enter 搜索
 * - 使用 `NatureButton` 的 `mist` 变体作为添加按钮
 * - 列表项使用 `TermbaseCard` 渲染
 * - 无虚线边框，使用大 padding
 * - 支持滚动，按行密堆积可换行
 */
export default function TermbaseList({ initial, onExit }: TermbaseListProps) {
  const __mockTermbases: TermBase[] = [
    {
      teamBrief: { teamId: "t-1", name: "白杨汉化组" },
      name: "日语流行词汇",
      description: "收录日本流行文化中的常见词汇和网络用语",
      termNum: 128,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-12-15"),
    },
    {
      teamBrief: { teamId: "t-2", name: "星辰翻译社" },
      name: "前端开发术语",
      description: "Web 前端开发相关的技术术语集合",
      termNum: 256,
      createdAt: new Date("2024-02-05"),
      updatedAt: new Date("2024-12-18"),
    },
    {
      teamBrief: { teamId: "t-3", name: "月光工作室" },
      name: "设计基础词典",
      description: "UI/UX 设计、排版、色彩理论相关术语",
      termNum: 89,
      createdAt: new Date("2024-03-12"),
      updatedAt: new Date("2024-12-10"),
    },
    {
      teamBrief: { teamId: "t-4", name: "晨曦漫译" },
      name: "动漫专用术语",
      description: "动画、漫画制作与翻译中的专业术语",
      termNum: 342,
      createdAt: new Date("2024-04-20"),
      updatedAt: new Date("2024-12-19"),
    },
    {
      teamBrief: { teamId: "t-5", name: "清风轩" },
      name: "游戏本地化",
      description: "电子游戏翻译与本地化常用术语库",
      termNum: 512,
      createdAt: new Date("2024-05-08"),
      updatedAt: new Date("2024-12-17"),
    },
    {
      teamBrief: { teamId: "t-1", name: "白杨汉化组" },
      name: "拟声拟态词集",
      description: "日语中的オノマトペ（拟声拟态词）专项收录",
      termNum: 76,
      createdAt: new Date("2024-06-15"),
      updatedAt: new Date("2024-12-16"),
    },
    {
      teamBrief: { teamId: "t-2", name: "星辰翻译社" },
      name: "TypeScript 类型系统",
      description: "TypeScript 类型、泛型、工具类型等术语",
      termNum: 145,
      createdAt: new Date("2024-07-01"),
      updatedAt: new Date("2024-12-14"),
    },
    {
      teamBrief: { teamId: "t-6", name: "云端社区" },
      name: "国际化 i18n",
      description: "软件国际化与本地化技术术语",
      termNum: 98,
      createdAt: new Date("2024-08-10"),
      updatedAt: new Date("2024-12-12"),
    },
    {
      teamBrief: { teamId: "t-3", name: "月光工作室" },
      name: "无障碍设计",
      description: "Accessibility 相关的设计与开发术语",
      termNum: 67,
      createdAt: new Date("2024-09-05"),
      updatedAt: new Date("2024-12-11"),
    },
    {
      teamBrief: { teamId: "t-7", name: "极光团队" },
      name: "性能优化",
      description: "前端性能优化、缓存、加载策略相关术语",
      termNum: 189,
      createdAt: new Date("2024-10-15"),
      updatedAt: new Date("2024-12-13"),
    },
  ];

  const defaultTermbases: TermBase[] = initial ?? __mockTermbases;

  const [termbases, setTermbases] = useState<TermBase[]>(defaultTermbases);
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return termbases;

    return termbases.filter(
      (tb) =>
        tb.name.toLowerCase().includes(q) ||
        tb.description.toLowerCase().includes(q) ||
        tb.teamBrief.name.toLowerCase().includes(q)
    );
  }, [termbases, query]);

  const handleAdd = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      console.log("请输入内容后再添加");
      return;
    }

    const next: TermBase = {
      teamBrief: { teamId: "local", name: "本地团队" },
      name: trimmed,
      description: "",
      termNum: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTermbases((s) => [next, ...s]);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      setQuery(target.value);
    }
  };

  return (
    <div className="termbase-list-container">
      <div className="input-section">
        <input
          className="termbase-input"
          placeholder="输入搜索词并按 Enter 筛选"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <NatureButton variant="mist" onClick={handleAdd} minWidth={50} aria-label="添加">
            <svg
              className="plus-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NatureButton>

          {onExit ? (
            <NatureButton variant="rose" onClick={onExit} minWidth={40} aria-label="退出">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </NatureButton>
          ) : null}
        </div>
      </div>

      <div className="termbase-list">
        {filtered.length === 0 ? (
          <div className="empty-state">没有找到匹配的术语库...</div>
        ) : (
          filtered.map((tb, idx) => (
            <div key={`${tb.teamBrief.teamId}-${tb.name}-${idx}`} style={{ flex: "1 1 auto", minWidth: "220px", maxWidth: "280px" }}>
              <TermbaseCard data={tb} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
