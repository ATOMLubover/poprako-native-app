import React, { useMemo, useState } from "react";
import NatureButton from "./NatureButton";
import TermCard from "./TermCard";
import "./TermList.css";
import type { Term } from "../models/term";
import TermCreator from "./TermCreator";

type TermListProps = {
  initial?: Term[];
  onExit?: () => void;
};

/**
 * TermList 组件
 * - 输入框按 Enter 搜索
 * - 使用 `NatureButton` 的 `mist` 变体作为添加按钮
 * - 列表项使用 `TermCard` 渲染
 */
export default function TermList({ initial, onExit }: TermListProps) {
  const __mockTerms: Term[] = [
    { termBaseId: "1", originalText: "ふわふわ", targetText: "柔软且轻盈的状态，常形容云朵或蛋糕", modifierId: "u1", modifierNickname: "Hatsu1ki", createdAt: new Date("2024-01-10"), updatedAt: new Date("2024-01-10") },
    { termBaseId: "2", originalText: "Typography", targetText: "排版艺术，研究字体的视觉呈现", modifierId: "u2", modifierNickname: "DesignBot", createdAt: new Date("2024-02-15"), updatedAt: new Date("2024-02-15") },
    { termBaseId: "3", originalText: "Debounce", targetText: "防抖函数，用于限制高频率执行的函数", modifierId: "u3", modifierNickname: "DevExpert", createdAt: new Date("2024-03-20"), updatedAt: new Date("2024-03-20") },
    { termBaseId: "4", originalText: "ぽかぽか", targetText: "形容温暖舒适的感觉，常用于天气或环境描述。", modifierId: "u4", modifierNickname: "Yuki", createdAt: new Date("2024-02-14"), updatedAt: new Date("2024-02-14") },
    { termBaseId: "5", originalText: "Komorebi", targetText: "木漏れ日：指阳光穿过树叶缝隙照射下来的景象。", modifierId: "u5", modifierNickname: "NihonGo", createdAt: new Date("2024-03-20"), updatedAt: new Date("2024-03-20") },
    { termBaseId: "6", originalText: "Accessibility", targetText: "可访问性，确保产品对各种用户都友好可用", modifierId: "u6", modifierNickname: "A11yTeam", createdAt: new Date("2024-04-01"), updatedAt: new Date("2024-04-01") },
    { termBaseId: "7", originalText: "i18n", targetText: "国际化（internationalization）的缩写，支持多语言的实践", modifierId: "u7", modifierNickname: "IntlBot", createdAt: new Date("2024-05-05"), updatedAt: new Date("2024-05-05") },
    { termBaseId: "8", originalText: "Localization", targetText: "本地化：将内容适配特定地区/语言的过程", modifierId: "u8", modifierNickname: "LocTeam", createdAt: new Date("2024-06-10"), updatedAt: new Date("2024-06-10") },
    { termBaseId: "9", originalText: "Debounce (advanced)", targetText: "带有立即执行选项和取消能力的防抖实现", modifierId: "u9", modifierNickname: "DevExpert", createdAt: new Date("2024-06-12"), updatedAt: new Date("2024-06-12") },
    { termBaseId: "10", originalText: "Throttle", targetText: "节流，用于限制函数在单位时间内的执行频率", modifierId: "u10", modifierNickname: "PerfEng", createdAt: new Date("2024-06-13"), updatedAt: new Date("2024-06-13") },
    { termBaseId: "11", originalText: "Memoization", targetText: "缓存函数结果以加速重复计算的优化技术", modifierId: "u11", modifierNickname: "AlgoDept", createdAt: new Date("2024-06-14"), updatedAt: new Date("2024-06-14") },
    { termBaseId: "12", originalText: "Refactor", targetText: "重构：在不改变外部行为的前提下改善代码结构", modifierId: "u12", modifierNickname: "RefactorBot", createdAt: new Date("2024-06-15"), updatedAt: new Date("2024-06-15") },
    { termBaseId: "13", originalText: "CI/CD", targetText: "持续集成与持续交付/部署的实践与工具链", modifierId: "u13", modifierNickname: "CITeam", createdAt: new Date("2024-07-01"), updatedAt: new Date("2024-07-01") },
  ];

  const defaultTerms: Term[] = initial ?? __mockTerms;

  const [terms, setTerms] = useState<Term[]>(defaultTerms);
  const [query, setQuery] = useState<string>("");
  const [showCreator, setShowCreator] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return terms;
    return terms.filter((t) => t.originalText.toLowerCase().includes(q) || t.targetText.toLowerCase().includes(q));
  }, [terms, query]);

  const handleAdd = () => {
    // 打开 TermCreator 悬浮窗，由用户输入完整术语
    setShowCreator(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      setQuery(target.value);
    }
  };

  return (
    <div className="term-list-container">
      <div className="input-section">
        <input
          className="term-input"
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

      <div className="term-list">
        {filtered.length === 0 ? (
          <div className="empty-state">没有找到匹配的术语...</div>
        ) : (
          filtered.map((t) => (
            <div key={t.termBaseId} style={{ flex: "1 1 auto", minWidth: "260px", maxWidth: "320px" }}>
              <TermCard data={t} />
            </div>
          ))
        )}
      </div>

      {showCreator ? (
        <div className="floating-overlay" onClick={() => setShowCreator(false)}>
          <div className="floating-card" onClick={(e) => e.stopPropagation()}>
            <TermCreator
              onCreate={(t) => {
                const next: Term = {
                  termBaseId: `${Date.now()}`,
                  originalText: t.original,
                  targetText: t.definition,
                  modifierId: "local",
                  modifierNickname: "You",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };

                setTerms((s) => [next, ...s]);
                setShowCreator(false);
              }}
              onExit={() => setShowCreator(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
