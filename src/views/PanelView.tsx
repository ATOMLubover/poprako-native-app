import { useState } from "react";
import Icon from "../components/Icon";
import TermbasePage from "./TermbasePage";
import TagPoolPage from "./TagPoolPage";
import { CompressorPage } from "./CompressorPage";
import SpecialSymbolPage from "./SpecialSymbolPage";
import { Translator } from "../components/translator/Translator";
import type { Page, Project, Unit } from "../models/translator";
import "./PanelView.css";

type MenuItem = "draft-board" | "team-list" | "tag-pool" | "termbase-pool" | "font-repo" | "compressor-helper" | "special-symbols" | "settings";

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
    { id: "team-list", icon: "users", label: "汉化组" },
    { id: "tag-pool", icon: "tag", label: "标签池" },
    { id: "termbase-pool", icon: "database", label: "术语库" },
    { id: "font-repo", icon: "font", label: "字体仓库" },
    { id: "special-symbols", icon: "star", label: "特殊符号" },
    { id: "compressor-helper", icon: "image", label: "压图工具" },
  ];

  const settingsItem: NavItem = { id: "settings", icon: "settings", label: "设置" };

  const renderContent = () => {
    switch (activeItem) {
      case "draft-board":
        return (
          <DraftBoard />
        );
      case "team-list":
        return <div>汉化组列表页面开发中</div>;
      case "tag-pool":
        return <TagPoolPage />;
      case "termbase-pool":
        return <TermbasePage />;
      case "font-repo":
        return <div>字体仓库页面开发中</div>;
      case "special-symbols":
        return <SpecialSymbolPage />;
      case "compressor-helper":
        return <CompressorPage />;
      case "settings":
        return <div>设置页面开发中</div>;
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
        </div>
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function DraftBoard() {
  const mockProject: Project = {
    id: "proj-001",
    author: "白杨汉化组",
    title: "某某漫画第一话",
    pageCount: 25,
    unitCount: 120,
    translatedUnitCount: 85,
    proovedUnitCount: 42,
  };

  const [page, setPage] = useState<Page>({
    id: "PG-882104",
    translatedUnitCount: 3,
    proovedUnitCount: 1,
    inboxUnitCount: 8,
    outboxUnitCount: 7,
    units: [
      {
        id: "u1",
        x: 0.1,
        y: 0.05,
        indexInPage: 0,
        translatedText: "第一句翻译",
        isProoved: true,
        isInbox: true,
      },
      {
        id: "u2",
        x: 0.15,
        y: 0.12,
        indexInPage: 1,
        translatedText: "正在等待校对的长文本示例",
        isProoved: false,
        isInbox: false,
      },
      {
        id: "u3",
        x: 0.2,
        y: 0.25,
        indexInPage: 2,
        translatedText: "已翻译完成的对话",
        proovedText: "校对后的终稿文本",
        isProoved: true,
        isInbox: false,
      },
    ],
  });

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const handleUnitSelect = (unitId: string | null) => {
    setSelectedUnitId(unitId);
  };

  const handleUnitSave = (unit: Partial<Unit> & { id: string }) => {
    console.log("[PanelView] handleUnitSave called with:", unit);

    setPage((prevPage) => {
      const updatedUnits = prevPage.units.map((u) =>
        u.id === unit.id ? { ...u, ...unit } : u
      );

      const newPage = {
        ...prevPage,
        units: updatedUnits,
      };

      console.log("[PanelView] Updated page:", newPage);
      return newPage;
    });
  };

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <Translator
        project={mockProject}
        currentPage={page}
        isLoading={false}
        mode="proofread"
        isOffline={false}
        currentPageIndex={0}
        selectedUnitId={selectedUnitId}
        onRequestPage={(idx) => console.log("Request page:", idx)}
        onUnitSave={handleUnitSave}
        onUnitRemove={(id) => console.log("Remove unit:", id)}
        onUnitSelect={handleUnitSelect}
      />
    </div>
  );
}
