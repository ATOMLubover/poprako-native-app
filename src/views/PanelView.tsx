import { useState } from "react";
import Icon from "../components/Icon";
import TermbasePage from "./TermbasePage";
import TagPoolPage from "./TagPoolPage";
import SpecialSymbolPage from "./SpecialSymbolPage";
import ComicWorkspacePage from "./ComicWorkspacePage";
import ToolboxPage from "./ToolboxPage.tsx";
import SettingPage from "./SettingPage.tsx";
import ComicPanelPage from "./ComicPanelPage";
import ComicList from "../components/comic/ComicList";
import type { ComicBrief } from "../models/comic/comic";
import "./PanelView.css";

type MenuItem = "draft-board" | "comic-panel" | "tag-pool" | "termbase-pool" | "special-symbols" | "comic-workspace" | "toolbox" | "settings";


type NavItem = {
  id: MenuItem;
  icon: string;
  label: string;
};

/**
 * draft-board 测试组件注意事项
 * 
 * 在 draft-board 中集成需要内部滚动的组件（如 TermList）时，必须确保整个高度约束链路正确传递：
 * 
 * 1. 最外层容器：使用 `display: flex; flex-direction: column; height: 100%; minHeight: 0`
 *    - height: 100% 使其占满父容器（PanelView.main-content）
 *    - minHeight: 0 允许 flex 在空间不足时收缩子项（关键！）
 * 
 * 2. 固定高度项（如 h2 标题）：添加 `flexShrink: 0`
 *    - 防止 flex 自动压缩该项目，保证其完整显示
 * 
 * 3. 卡片容器（.nb-card）：改为 flex 容器
 *    - `display: flex; flex-direction: column; flex: 1; minHeight: 0`
 *    - flex: 1 使其占满剩余空间
 *    - minHeight: 0 允许其进一步压缩内部子项
 * 
 * 4. 包裹测试组件的 div：必须指定
 *    - `flex: 1; minHeight: 0; overflow: hidden`
 *    - 这样测试组件才能接收完整的可用高度
 * 
 * 5. 测试组件本身（如 TermList）：需要支持高度约束
 *    - 在组件中使用 `height: 100%; overflow-y: auto` 实现内部滚动
 *    - 结构：`.term-list-container { height: 100%; display: flex; flex-direction: column; min-height: 0; }`
 * 
 * 错误示例（会导致无法滚动）：
 * - 移除 minHeight: 0
 * - 给中间层设置固定高度
 * - 忘记在 flex 子项上设置 flex: 1
 * - 包裹组件的 div 没有 overflow: hidden
 */

/**
 * 主面板视图
 * 包含侧边栏导航和主内容区域
 */
export default function PanelView() {
  const [activeItem, setActiveItem] = useState<MenuItem>("draft-board");

  const navItems: NavItem[] = [
    { id: "draft-board", icon: "pencil", label: "草稿板" },
    { id: "comic-panel", icon: "dashboard", label: "仪表盘" },
    { id: "comic-workspace", icon: "proofread", label: "工作区" },
    { id: "tag-pool", icon: "tag", label: "标签池" },
    { id: "termbase-pool", icon: "database", label: "术语库" },
    { id: "special-symbols", icon: "star", label: "特殊符号" },
    { id: "toolbox", icon: "wrench", label: "工具箱" },
  ];

  const settingsItem: NavItem = { id: "settings", icon: "settings", label: "设置" };

  const renderContent = () => {
    switch (activeItem) {
      case "draft-board":
        return (
          <DraftBoard />
        );
      case "comic-panel":
        return <ComicPanelPage />;
      case "toolbox":
        return <ToolboxPage />;
      case "comic-workspace":
        return <ComicWorkspacePage />;
      case "tag-pool":
        return <TagPoolPage />;
      case "termbase-pool":
        return <TermbasePage />;
      case "special-symbols":
        return <SpecialSymbolPage />;
      case "settings":
        return <SettingPage />;
      default:
        return <div>页面开发中</div>;
    }
  };

  return (
    <div className="panel-view">
      <nav className="sidebar">
        <div className="logo-section">
          <span className="logo-icon">
            <Icon name="tree-pine" />
          </span>
          <span className="logo-text">PopRaKo 白杨子</span>
        </div>

        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href="#"
                className={`nav-item ${activeItem === item.id ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveItem(item.id);
                }}
              >
                <span className="icon-box">
                  <Icon name={item.icon} className="nav-icon" />
                </span>
                <span className="nav-text">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="footer-section">
          <a
            href="#"
            className={`nav-item ${activeItem === settingsItem.id ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveItem(settingsItem.id);
            }}
          >
            <span className="icon-box">
              <Icon name={settingsItem.icon} className="nav-icon" />
            </span>
            <span className="nav-text">{settingsItem.label}</span>
          </a>

          {/* 工具箱已移入主导航 */}
        </div>
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function DraftBoard() {
  const mockComics: ComicBrief[] = Array.from({ length: 30 }, (_, i) => {
    const titles = [
      "幻象之城",
      "时空旅人",
      "星海远航",
      "记忆碎片",
      "梦境边缘",
      "暗影猎人",
      "光之守护",
      "永恒之夜",
      "命运轮回",
      "失落的世界",
      "虚拟现实",
      "机械之心",
      "异次元空间",
      "神秘代码",
      "未来都市",
    ];

    const tagPool = [
      "科幻",
      "冒险",
      "治愈",
      "悬疑",
      "恋爱",
      "赛博朋克",
      "奇幻",
      "日常",
      "惊悚",
      "校园",
      "历史",
      "战争",
      "萌系",
      "动作",
      "体育",
      "音乐",
    ];

    // Variable tag count (0..6), but inject extreme cases for some indices
    let tagCount = Math.floor(Math.random() * 7);
    if (i === 2) tagCount = 0; // no tags
    if (i === 5) tagCount = 20; // extreme many tags
    if (i === 8) tagCount = 1; // single tag

    const tags = Array.from({ length: tagCount }, (_, j) => ({
      tagId: `tag-${i}-${j}`,
      name: tagPool[(i + j) % tagPool.length],
    }));

    // Occasionally produce a very long title for overflow testing
    const isLongTitle = i % 7 === 0;
    const longTitle = isLongTitle ? `${titles[i % titles.length]} ` + "—".repeat(80) + " 极长标题测试" : titles[i % titles.length];

    // Likes distribution, include extremes
    const likesCount = i % 10 === 0 ? Math.floor(Math.random() * 1000000) + 10000 : Math.floor(Math.random() * 200);

    // Some items are hidden, some have missing progress dates
    const isHidden = i % 17 === 0;

    const maybeDate = (days: number) => (Math.random() > 0.5 ? new Date(Date.now() - Math.random() * days * 24 * 3600 * 1000) : undefined);

    return {
      id: `comic-${String(i + 1).padStart(3, "0")}`,
      collectionId: `collection-${Math.floor(i / 5) + 1}`,
      collectionIndex: String(Math.floor(i / 5) + 1),
      index: (i % 5) + 1,
      author: i % 11 === 0 ? "" : ["山田太郎", "铃木花子", "佐藤次郎", "田中美咲", "小林健太"][i % 5],
      title: longTitle,
      isSeries: i % 3 === 0,
      likesCount,
      tags,
      isHidden,
      translationStartedAt: i % 4 === 0 ? maybeDate(30) : undefined,
      translationCompletedAt: i % 6 === 0 ? maybeDate(20) : undefined,
      proofreadingStartedAt: i % 5 === 0 ? maybeDate(25) : undefined,
      proofreadingCompletedAt: i % 8 === 0 ? maybeDate(10) : undefined,
      typesettingStartedAt: i % 9 === 0 ? maybeDate(18) : undefined,
      typesettingCompletedAt: i % 12 === 0 ? maybeDate(12) : undefined,
      reviewedAt: i % 15 === 0 ? maybeDate(6) : undefined,
      publishedAt: i % 20 === 0 ? maybeDate(3) : undefined,
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 10 * 24 * 3600 * 1000),
    } as ComicBrief;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 16, flexShrink: 0 }}>漫画列表演示</h2>

      <div
        className="nb-card"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ComicList
            comics={mockComics}
            onClick={(comic) => console.log("Clicked comic:", comic)}
            title="我的漫画"
          />
        </div>
      </div>
    </div>
  );
}
