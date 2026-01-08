import { useState } from "react";
import Icon from "../components/Icon";
import TermbasePage from "./TermbasePage";
import TagPoolPage from "./TagPoolPage";
import SpecialSymbolPage from "./SpecialSymbolPage";
import ComicWorkspacePage from "./ComicWorkspacePage";
import ToolboxPage from "./ToolboxPage.tsx";
import SettingPage from "./SettingPage.tsx";
import BriefComicCard from "../components/BriefComicCard";
import type { ComicBrief } from "../models/comic/comic";
import "./PanelView.css";

type MenuItem = "draft-board" | "tag-pool" | "termbase-pool" | "special-symbols" | "comic-workspace" | "toolbox" | "settings";


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
    { id: "comic-workspace", icon: "proofread", label: "漫画翻校" },
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
  const mockComics: ComicBrief[] = [
    {
      id: "comic-001",
      collectionId: "COL-001",
      index: 1,
      author: "米二",
      title: "一人之下 - 第560话",
      isSeries: true,
      likesCount: 128,
      tags: [
        { tagId: "tag-1", name: "热血" },
        { tagId: "tag-2", name: "动作" },
        { tagId: "tag-3", name: "剧情" },
        { tagId: "tag-4", name: "武侠" },
      ],
      isHidden: false,
      translationStartedAt: new Date("2026-01-01"),
      translationCompletedAt: new Date("2026-01-03"),
      proofreadingStartedAt: new Date("2026-01-04"),
      proofreadingCompletedAt: undefined,
      typesettingStartedAt: undefined,
      typesettingCompletedAt: undefined,
      reviewedAt: undefined,
      publishedAt: undefined,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-06"),
    },
    {
      id: "comic-002",
      collectionId: "COL-002",
      index: 15,
      author: "尾田荣一郎",
      title: "ONE PIECE 第1095话 世界即将崩塌",
      isSeries: true,
      likesCount: 256,
      tags: [
        { tagId: "tag-5", name: "冒险" },
        { tagId: "tag-6", name: "热血" },
        { tagId: "tag-7", name: "搞笑" },
      ],
      isHidden: false,
      translationStartedAt: new Date("2026-01-02"),
      translationCompletedAt: new Date("2026-01-03"),
      proofreadingStartedAt: new Date("2026-01-04"),
      proofreadingCompletedAt: new Date("2026-01-05"),
      typesettingStartedAt: new Date("2026-01-05"),
      typesettingCompletedAt: new Date("2026-01-06"),
      reviewedAt: new Date("2026-01-06"),
      publishedAt: new Date("2026-01-07"),
      createdAt: new Date("2026-01-02"),
      updatedAt: new Date("2026-01-07"),
    },
    {
      id: "comic-003",
      collectionId: "COL-001",
      index: 2,
      author: "米二",
      title: "一人之下 - 第561话",
      isSeries: true,
      likesCount: 89,
      tags: [
        { tagId: "tag-1", name: "热血" },
        { tagId: "tag-8", name: "奇幻" },
      ],
      isHidden: false,
      translationStartedAt: undefined,
      translationCompletedAt: undefined,
      proofreadingStartedAt: undefined,
      proofreadingCompletedAt: undefined,
      typesettingStartedAt: undefined,
      typesettingCompletedAt: undefined,
      reviewedAt: undefined,
      publishedAt: undefined,
      createdAt: new Date("2026-01-05"),
      updatedAt: new Date("2026-01-05"),
    },
  ];

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", padding: 12, boxSizing: "border-box", gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>BriefComicCard 预览</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 900 }}>
        {mockComics.map((comic) => (
          <BriefComicCard key={comic.id} comic={comic} />
        ))}
      </div>
    </div>
  );
}
