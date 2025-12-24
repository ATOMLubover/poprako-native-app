import { useState, useRef, useEffect, KeyboardEvent } from "react";
import SimpleComicItem from "./SimpleComicItem";
import NatureButton from "./NatureButton";
import "./ComicSelector.css";
import type { SimpleComicInfo } from "../models/comic";

type ComicSelectorProps = {
  onSearchComics?: (query: string) => Promise<SimpleComicInfo[]>;
  placeholder?: string;
  onSelect?: (comic: SimpleComicInfo) => void;
  onExit?: () => void;
};

/**
 * ComicSelector 组件
 * - 使用 `SimpleComicInfo` 作为数据模型
 * - 提供内部 mock 数据生成函数 `__mockSearchComics`
 */
export default function ComicSelector({
  onSearchComics,
  placeholder = "搜索漫画...",
  onSelect,
  onExit,
}: ComicSelectorProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SimpleComicInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // 内部 mock：生成符合 SimpleComicInfo 类型的示例数据
  async function __mockSearchComics(q: string): Promise<SimpleComicInfo[]> {
    await new Promise((res) => setTimeout(res, 300));

    // 如果查询为空，使用默认演示词以保证能看到示例数据
    const displayQ = q.trim() || "Demo";

    const teams = [
      { teamId: "t1", name: "A" },
      { teamId: "t2", name: "汉化组" },
      { teamId: "t3", name: "非常长的汉化组名称组织机构" },
      { teamId: "t4", name: "Team Long Long" },
      { teamId: "t5", name: "短" },
    ];

    const authors = [
      "A",
      "张三",
      "非常非常长的作者名字很难放下来啊",
      "Author Long Name",
    ];

    const list: SimpleComicInfo[] = Array.from({ length: 12 }).map((_, i) => ({
      id: `c_${i + 1}`,
      author: authors[i % authors.length],
      title: i % 4 === 0 
        ? `${displayQ}` 
        : i % 4 === 1 
        ? `${displayQ} — 这是一个很长很长的漫画标题我们需要看看怎么处理这种情况呢`
        : i % 4 === 2
        ? `${displayQ} — Comic ${i + 1}`
        : `${displayQ} — 短`,
      team: teams[i % teams.length],
    }));

    return list;
  }

  const doSearch = async (q: string) => {
    setError(null);
    setLoading(true);
    try {
      const fn = onSearchComics ?? __mockSearchComics;
      const res = await fn(q);
      setResults(res);
    } catch (e) {
      setError("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void doSearch(query);
  };

  // 初始自动展示 mock 数据，便于 draft-board 预览
  useEffect(() => {
    void doSearch("Demo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleResults = results.slice(0, 3);

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
        <NatureButton
          variant="mist"
          onClick={() => {
            return doSearch(query);
          }}
          loadingText="搜索中..."
          minWidth={40}
        >
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NatureButton>
        <NatureButton variant="cloud" onClick={() => { if (onExit) onExit(); }} minWidth={40}>
          <svg
            className="close-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NatureButton>
      </div>

      {error ? <div className="ps-error">{error}</div> : null}

      {loading ? <div className="ps-loading">搜索中...</div> : null}

      <div className="ps-results">
        {visibleResults.length === 0 ? null : (
          <div className="ps-list">
            {visibleResults.map((c) => (
              <div key={c.id} style={{ marginBottom: 6 }}>
                <SimpleComicItem
                  data={c}
                  onSelect={(id) => {
                    const selected = results.find((r) => r.id === id);
                    if (selected && onSelect) onSelect(selected);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}