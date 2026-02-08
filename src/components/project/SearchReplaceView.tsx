import React, { useEffect, useState, useMemo } from "react";
import "./SearchReplaceView.css";
import NatureButton from "../NatureButton";
import { RefreshCw } from "lucide-react";
import { getProjectPages } from "../../ipc/project";
import type { Page } from "../../models/project";
import {
  getPageUnits,
  searchComicText,
  replaceComicText,
} from "../../ipc/project/unit";
import { useToast } from "../NotificationToast";
import DotLoadSpinner from "../DotLoadSpinner";
import ConfirmDialogBox from "../ConfirmDialogBox";

type SearchReplaceViewProps = {
  projectId: string;
  onPageSelect: (pageIndex: number) => void;
  onClose?: () => void;
};

export const SearchReplaceView: React.FC<SearchReplaceViewProps> = ({
  projectId,
  onPageSelect,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [allPages, setAllPages] = useState<Page[]>([]);

  const pageMap = useMemo(() => {
    const map = new Map<string, Page>();
    allPages.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPages]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        setInitializing(true);
        const pages = await getProjectPages(projectId);
        setAllPages(pages);
      } catch (err) {
        showToast("error", "无法加载项目页面索引");
        console.error("Failed to load project pages", err);
      } finally {
        setInitializing(false);
      }
    };

    fetchPages();
  }, [projectId]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showToast("info", "请输入搜索内容");
      return;
    }

    setLoading(true);
    try {
      const pageIds = await searchComicText(projectId, searchTerm);
      setMatches(pageIds);

      if (pageIds.length === 0) {
        showToast("info", "未找到匹配项");
        setMatchCounts({});
      } else {
        showToast("success", `找到 ${pageIds.length} 个匹配页面`);
        // compute per-page match counts
        const counts: Record<string, number> = {};
        await Promise.all(
          pageIds.map(async (pid) => {
            try {
              const units = await getPageUnits(pid);
              const q = searchTerm.toLowerCase();
              const cnt = units.reduce((acc, u) => {
                const t1 = u.translatedText ?? "";
                const t2 = u.proovedText ?? "";
                if (
                  t1.toLowerCase().includes(q) ||
                  t2.toLowerCase().includes(q)
                ) {
                  return acc + 1;
                }
                return acc;
              }, 0);
              counts[pid] = cnt;
            } catch (e) {
              counts[pid] = 0;
            }
          }),
        );

        setMatchCounts(counts);
      }
    } catch (err) {
      showToast("error", "搜索失败");
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async () => {
    if (matches.length === 0) return;

    if (!replaceTerm) {
      showToast("error", "请输入替换内容");
      return;
    }
    // show confirm dialog instead of window.confirm
    setConfirmVisible(true);
  };

  const [confirmVisible, setConfirmVisible] = useState(false);

  const doReplace = async () => {
    setConfirmVisible(false);
    setLoading(true);
    try {
      await replaceComicText(projectId, matches, searchTerm, replaceTerm);
      showToast("success", "替换完成");

      setMatches([]);
      handleSearch();
    } catch (err) {
      showToast("error", "替换失败");
      console.error("Replace failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div
        className="search-replace-container"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <DotLoadSpinner />
      </div>
    );
  }

  return (
    <div className="search-replace-container">
      <div className="input-group">
        <div style={{ position: "relative" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: 4,
              display: "block",
            }}
          >
            查找内容
          </span>

          <input
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="原文本..."
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        <div style={{ position: "relative" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: 4,
              display: "block",
            }}
          >
            替换为
          </span>

          <input
            className="input-field"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="替换后文本..."
          />
        </div>
      </div>

      <div className="search-action-bar">
        <NatureButton
          variant="mist"
          onClick={handleSearch}
          disabled={loading}
          minWidth="120px"
        >
          {loading ? (
            "Searching..."
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              查找
            </span>
          )}
        </NatureButton>
      </div>

      <div className="results-area">
        <div className="results-header">
          {matches.length > 0
            ? `找到 ${matches.length} 个匹配页面`
            : "暂无结果"}
        </div>

        {matches.length > 0 && (
          <div className="results-list">
            {matches.map((pageId) => {
              const page = pageMap.get(pageId);
              if (!page) return null;

              const originalIndex = allPages.findIndex((p) => p.id === pageId);

              const pageNumber = originalIndex !== -1 ? originalIndex + 1 : 0;
              const count = matchCounts[pageId] ?? 0;

              return (
                <div
                  key={pageId}
                  className="result-row"
                  onClick={() =>
                    onPageSelect(originalIndex !== -1 ? originalIndex : 0)
                  }
                  role="button"
                >
                  <div className="result-page-num">{pageNumber} P</div>
                  <div className="result-match-count">{count} 个符合文本</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="replace-action-bar">
        <NatureButton
          variant="rose"
          onClick={handleReplace}
          disabled={loading || matches.length === 0 || !replaceTerm}
          minWidth="100%"
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <RefreshCw size={16} /> 全部替换
          </span>
        </NatureButton>
      </div>
      <ConfirmDialogBox
        visible={confirmVisible}
        title="确认替换"
        description={`确定要在 ${matches.length} 个页面中进行替换吗？此操作不可撤销。`}
        confirmText="替换"
        cancelText="取消"
        onConfirm={doReplace}
        onCancel={() => setConfirmVisible(false)}
      />
    </div>
  );
};
