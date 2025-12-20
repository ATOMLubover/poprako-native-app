
import React, { useState, useRef, KeyboardEvent, ReactNode } from "react";
import VerticalAdaptiveList from "./VerticalAdaptiveList";
import "./ProjectSelector.css";

// 项目 DTO 类型
type Project = {
  id: string;
  name: string;
  subtitle?: string;
};

type ProjectSelectorProps = {
  // 可选：外部提供的搜索函数
  onSearchProjects?: (query: string) => Promise<Project[]>;
  // 输入框占位文案
  placeholder?: string;
};

/**
 * ProjectSelector 组件
 * - 接受一个字符串作为输入，按 Enter 触发搜索
 * - 如果没有提供 onSearchProjects，则使用内部 __mockSearchProjects
 * - 搜索结果展示在输入下方，使用 VerticalAdaptiveList 呈现
 */
export default function ProjectSelector({
  onSearchProjects,
  placeholder = "Search projects...",
}: ProjectSelectorProps) {
  // 输入状态
  const [query, setQuery] = useState<string>("");
  // 搜索结果
  const [results, setResults] = useState<Project[]>([]);
  // 是否正在加载
  const [loading, setLoading] = useState<boolean>(false);
  // 错误信息（仅用于简单显示）
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // 内部 mock 搜索函数，名称以 __mock 开头以便后续移除或替换
  async function __mockSearchProjects(q: string): Promise<Project[]> {
    // 模拟网络延迟
    await new Promise((res) => setTimeout(res, 400));

    if (!q.trim()) {
      return [];
    }

    const base = [
      { id: "p1", name: `${q} — Alpha`, subtitle: "Team A" },
      { id: "p2", name: `${q} — Beta`, subtitle: "Team B" },
      { id: "p3", name: `${q} — Gamma`, subtitle: "Team C" },
      { id: "p4", name: `${q} — Delta`, subtitle: "Team D" },
      { id: "p5", name: `${q} — Epsilon`, subtitle: "Team E" },
    ];

    return base;
  }

  // 触发搜索的统一函数
  const doSearch = async (q: string) => {
    setError(null);
    setLoading(true);
    try {
      const fn = onSearchProjects ?? __mockSearchProjects;
      const res = await fn(q);
      setResults(res);
    } catch (e) {
      setError("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 监听回车键
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void doSearch(query);
    }
  };

  // 将 Project 映射为 VerticalAdaptiveList 所需的项
  const listItems: { id: string; height: number; content: ReactNode }[] = results.map((p) => {
    const content = (
      <div className="ps-item">
        <div className="ps-item-title">{p.name}</div>
        {p.subtitle ? <div className="ps-item-sub">{p.subtitle}</div> : null}
      </div>
    );

    return {
      id: p.id,
      height: 56,
      content,
    };
  });

  return (
    <div className="project-selector">
      <div className="ps-input-row">
        <input
          ref={inputRef}
          className="ps-input"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="ps-search-btn"
          onClick={() => {
            void doSearch(query);
          }}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error ? <div className="ps-error">{error}</div> : null}

      <div className="ps-results">
        <VerticalAdaptiveList items={listItems} title={`Results (${results.length})`} gap={6} debug={false} />
      </div>
    </div>
  );
}