import { useState, useRef, useEffect, KeyboardEvent } from "react";
import NatureButton from "./NatureButton";
import "./TeamSelector.css";

type Team = { teamId: string; name: string };

type TeamSelectorProps = {
  onSearchTeams?: (query: string) => Promise<Team[]>;
  placeholder?: string;
  onSelect?: (teamId: string) => void;
  onExit?: () => void;
  teams?: Team[];
};

/**
 * TeamSelector
 * - 参考 TextSelector 行为实现：输入、搜索、退出、最多显示 3 个匹配项
 * - 最大宽度由样式限制到 290px，适合放在 modal 中
 */
export default function TeamSelector({
  onSearchTeams,
  placeholder = "搜索汉化组...",
  onSelect,
  onExit,
  teams,
}: TeamSelectorProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function __mockSearchTeams(q: string): Promise<Team[]> {
    await new Promise((res) => setTimeout(res, 220));

    const displayQ = q.trim() || "Demo";

    const list: Team[] = Array.from({ length: 6 }).map((_, i) => ({
      teamId: `t_${i + 1}`,
      name:
        i % 3 === 0
          ? `${displayQ}`
          : i % 3 === 1
          ? `${displayQ} — 演示汉化组很长的名称测试溢出情况`
          : `${displayQ} — 短`,
    }));

    return list;
  }

  const doSearch = async (q: string) => {
    setError(null);
    setLoading(true);
    try {
      const fn = onSearchTeams
        ? onSearchTeams
        : teams && teams.length
        ? async (qq: string) => {
            const f = qq.trim().toLowerCase();
            return teams.filter((t) => t.name.toLowerCase().includes(f));
          }
        : __mockSearchTeams;

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

  useEffect(() => {
    void doSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = results.slice(0, 3);

  return (
    <div className="project-selector" ref={containerRef}>
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

        <NatureButton variant="cloud" minWidth={40} onClick={() => { if (onExit) onExit(); }}>
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
        {visible.length === 0 ? null : (
          <div className="ps-list">
            {visible.map((t) => (
              <div key={t.teamId} style={{ marginBottom: 6 }}>
                <div
                  className="ps-card"
                  onClick={() => {
                    if (onSelect) onSelect(t.teamId);
                  }}
                >
                  <div className="ps-item-line1">{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
