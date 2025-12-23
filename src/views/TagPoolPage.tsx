import React, { useMemo, useState } from "react";
import NatureButton from "../components/NatureButton";
import NatureTagLikesButton from "../components/NatureTagLikesButton";
import Icon from "../components/Icon";
import TagDetailSwitch from "../components/TagDetailSwitch";
import "./TagPoolPage.css";
import type { Tag } from "../models/tag";

export default function TagPoolPage() {
  const themes = ["theme-mist", "theme-glacier", "theme-sand"] as const;

  // 生成较多的 mock tags（至少 40 个），包含随机 likedNum，部分置顶
  const __mockTags: Tag[] = (() => {
    const baseNames = [
      "治愈",
      "校园",
      "冒险",
      "悬疑",
      "奇幻",
      "赛博",
      "职场",
      "治愈系画风",
      "恋爱",
      "青春",
      "搞笑",
      "历史",
      "科幻",
      "战斗",
      "体育",
      "美食",
      "音乐",
      "治愈向",
      "家庭",
      "职场喜剧",
      "悬疑惊悚",
      "心理",
      "校园生活",
      "治愈系日常",
      "旅行",
      "魔法",
      "神话",
      "超能力",
      "女性向",
      "男性向",
      "短篇",
      "长篇",
      "同人",
      "原创",
      "美术",
      "插画",
      "BL",
      "GL",
      "治愈漫画",
      "萌系",
    ];

    const list: Tag[] = [];

    for (let i = 0; i < 100; i++) {
      const name = baseNames[i % baseNames.length] + (i >= baseNames.length ? ` ${Math.floor(i / baseNames.length)}` : "");

      const tag: Tag = {
        tagId: `tg-${i + 1}`,
        name,
        // 前 10 个随机置顶概率较高，其他小概率置顶
        isPinned: i < 10 ? Math.random() < 0.6 : Math.random() < 0.12,
        // 随机点赞数，前面几项倾向更高
        likedNum: Math.floor((Math.random() * (i < 8 ? 800 : 300)) + (i < 8 ? 100 : 0)),
      };

      list.push(tag);
    }

    return list;
  })();

  const pickTheme = () => themes[Math.floor(Math.random() * themes.length)];

  const [tags, setTags] = useState<Tag[]>(__mockTags);
  const [themeMap, setThemeMap] = useState<Record<string, string>>(() => {
    const entries = __mockTags.map((item) => [item.tagId, pickTheme()]);

    return Object.fromEntries(entries);
  });
  const [query, setQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showTagDetail, setShowTagDetail] = useState<boolean>(false);

  function handleOpenTagDetail(tag: Tag) {
    setSelectedTag(tag);
    setShowTagDetail(true);
  }

  function handleCloseTagDetail() {
    setShowTagDetail(false);
    setSelectedTag(null);
  }

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return tags;
    }

    return tags.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [tags, query]);

  const hotList = useMemo(() => {
    const sorted = [...tags].sort((a, b) => b.likedNum - a.likedNum);

    return sorted.slice(0, 4);
  }, [tags]);

  const pinnedList = useMemo(() => {
    return tags.filter((t) => t.isPinned);
  }, [tags]);
  // 固定显示数量：Pinned 显示 5 个，Hot 显示 8 个（无需展开/收起）
  const visiblePinned = pinnedList.slice(0, 5);
  const visibleHot = hotList.slice(0, 8);

  const handleAdd = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      console.log("Need content before create");
      return;
    }

    const nextTag: Tag = {
      tagId: `local-${Date.now()}`,
      name: trimmed,
      isPinned: false,
      likedNum: 0,
    };

    setTags((prev) => [nextTag, ...prev]);

    setThemeMap((prev) => ({ ...prev, [nextTag.tagId]: pickTheme() }));

    setQuery("");
  };

  // `handleModify` removed — 保留编辑占位注释以便未来添加

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;

      setQuery(target.value);
    }
  };

  return (
    <div className="tag-pool-page">
      <div className="tag-pool-content">
        <div className="tag-pool-main">
          {/* 背景装饰图标：使用统一的 Icon（tag）作为视觉纹理 */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: "-30px",
              bottom: "-40px",
              width: 230,
              height: 230,
              color: "#3d403d",
              opacity: 0.06,
              transform: "rotate(-15deg)",
              zIndex: 0,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="tag" size={280} />
          </div>

          <div className="tag-main-header">
            <h1 className="tag-pool-title">标签池</h1>

            <div className="tag-input-section">
              <input
                className="tag-search-input"
                placeholder="输入搜索词并按 Enter 筛选"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <div className="tag-actions">
                <NatureButton variant="mist" fontSize={18} onClick={handleAdd} minWidth={60} aria-label="创建">
                  添加
                </NatureButton>
              </div>
            </div>
          </div>

          <div className="tag-grid" role="list">
            {filtered.length === 0 ? (
              <div className="tag-empty">没有找到匹配的标签...</div>
            ) : (
              filtered.map((item) => (
                <div key={item.tagId} className="tag-item">
                  <NatureTagLikesButton
                    tag={item}
                    initialLikes={item.likedNum}
                    theme={themeMap[item.tagId] ?? pickTheme()}
                    onClick={() => handleOpenTagDetail(item)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ width: "2px", background: "#cbd5e1", alignSelf: "stretch", margin: "24px 0" }} aria-hidden />

        <aside className="tag-pool-sidebar">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Pinned tags followed naturally by Hot tags (no fixed 1/3 - 2/3 split) */}
            <div>
              <div className="sidebar-header">
                <Icon name="tag" size={18} />

                <h2 className="sidebar-title">PINNED TAGS</h2>
              </div>

              <div className="sidebar-list" role="list">
                {pinnedList.length === 0 ? (
                  <div className="tag-empty">暂无固定标签</div>
                ) : (
                  visiblePinned.map((item) => (
                    <div key={`pinned-${item.tagId}`} className="tag-item">
                      <NatureTagLikesButton
                        tag={item}
                        initialLikes={item.likedNum}
                        theme={themeMap[item.tagId] ?? pickTheme()}
                        onClick={() => handleOpenTagDetail(item)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* HOT TAGS */}
            <div>
              <div className="sidebar-header">
                <Icon name="tag" size={18} />

                <h2 className="sidebar-title">HOT TAGS</h2>
              </div>

              <div className="sidebar-list" role="list">
                {visibleHot.map((item) => (
                  <div key={`hot-${item.tagId}`} className="tag-item">
                    <NatureTagLikesButton
                      tag={item}
                      initialLikes={item.likedNum}
                      theme={themeMap[item.tagId] ?? pickTheme()}
                      onClick={() => handleOpenTagDetail(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showTagDetail && selectedTag ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: 400, maxWidth: "95%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TagDetailSwitch
              tagName={selectedTag.name}
              onExit={handleCloseTagDetail}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
