import { useState } from "react";
import Icon from "../components/Icon";
import TermbasePage from "./TermbasePage";
import TagPoolPage from "./TagPoolPage";
import { CompressorPage } from "./CompressorPage";
import SpecialSymbolPage from "./SpecialSymbolPage";
import { Translator } from "../components/translator/Translator";
import { useToast } from "../components/NotificationToast";
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
  const [project, setProject] = useState<Project>({
    id: "proj-001",
    author: "白杨汉化组",
    title: "某某漫画第一话",
    pageCount: 4,
    unitCount: 120,
    translatedUnitCount: 85,
    proovedUnitCount: 42,
  });

  const initialPages: Page[] = [
    {
      id: "PG-882104-1",
      localImageUrl: "/tests/images/01_001.jpg",
      units: [
        {
          id: "u1",
          x: 0.3,
          y: 0.15,
          indexInPage: 0,
          translatedText: "第一句翻译",
          isProoved: true,
          isInbox: true,
        },
        {
          id: "u2",
          x: 0.5,
          y: 0.35,
          indexInPage: 1,
          translatedText: "正在等待校对的长文本示例\n测试测试第二行\n测试第三行",
          isProoved: false,
          isInbox: false,
        },
        {
          id: "u3",
          x: 0.7,
          y: 0.55,
          indexInPage: 2,
          translatedText: "已翻译完成的对话",
          proovedText: "校对后的终稿文本",
          isProoved: true,
          isInbox: false,
        },
        {
          id: "u4",
          x: 0.2,
          y: 0.7,
          indexInPage: 3,
          translatedText: "测试文本4",
          isProoved: false,
          isInbox: true,
        },
        {
          id: "u5",
          x: 0.8,
          y: 0.25,
          indexInPage: 4,
          isProoved: false,
          isInbox: true,
        },
      ],
    },

    {
      id: "PG-882104-2",
      localImageUrl: "/tests/images/02_003.jpg",
      units: [],
    },

    {
      id: "PG-882104-3",
      localImageUrl: "/tests/images/03_004.jpg",
      units: [],
    },

    {
      id: "PG-882104-4",
      localImageUrl: "/tests/images/04_005.jpg",
      units: [],
    },
  ];

  const [pages, setPages] = useState<Page[]>(initialPages);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { showToast } = useToast();

  const handleUnitSelect = (unitId: string | null) => {
    setSelectedUnitId(unitId);
  };

  const handleUnitRemove = (unitId: string) => {
    console.log("[PanelView] handleUnitRemove called with:", unitId);

    let computed = { inbox: 0, outbox: 0, translated: 0, prooved: 0 };

    setPages((prev) => {
      const next = [...prev];
      const p = next[currentPageIndex];

      const filtered = p.units.filter((u) => u.id !== unitId);
      const reindexed = filtered.map((u, idx) => ({ ...u, indexInPage: idx }));

      next[currentPageIndex] = {
        ...p,
        units: reindexed,
      };

      if (selectedUnitId && selectedUnitId === unitId) {
        setSelectedUnitId(null);
      }

      console.log("[PanelView] Updated page after remove:", next[currentPageIndex]);

      return next;
    });

    setProject((p) => ({
      ...p,
      unitCount: Math.max(0, (p.unitCount ?? 0) - 1),
      // project-level counts remain updated from computed values
      inboxUnitCount: computed.inbox,
      outboxUnitCount: computed.outbox,
      translatedUnitCount: computed.translated,
      proovedUnitCount: computed.prooved,
    }));

    showToast("success", "单元已删除");
  };


  const handleUnitSave = (unit: Partial<Unit> & { id: string }) => {
    console.log("[PanelView] handleUnitSave called with:", unit);
    let isNew = false;
    let unitCountDelta = 0;
    let inboxDelta = 0;
    let outboxDelta = 0;
    let translatedDelta = 0;
    let proovedDelta = 0;

    setPages((prev) => {
      const next = [...prev];
      const prevPage = next[currentPageIndex];

      const exists = prevPage.units.some((u) => u.id === unit.id);

      let updatedUnits: Unit[];

      if (exists) {
        updatedUnits = prevPage.units.map((u) => (u.id === unit.id ? { ...u, ...unit } : u));
        next[currentPageIndex] = { ...prevPage, units: updatedUnits };
        console.log("[PanelView] Updated page:", next[currentPageIndex]);
        return next;
      } else {
        const newIndex = prevPage.units.length;
        const newUnit: Unit = {
          id: unit.id,
          x: (unit.x as number) ?? 0,
          y: (unit.y as number) ?? 0,
          indexInPage: unit.indexInPage ?? newIndex,
          isInbox: (unit.isInbox as boolean) ?? true,
          isProoved: (unit.isProoved as boolean) ?? false,
          translatedText: (unit.translatedText as string) ?? undefined,
          proovedText: (unit.proovedText as string) ?? undefined,
        };

        updatedUnits = [...prevPage.units, newUnit];

        // update outer deltas so project-level counts can be updated after setPages
        inboxDelta = newUnit.isInbox ? 1 : 0;
        outboxDelta = newUnit.isInbox ? 0 : 1;
        translatedDelta = newUnit.translatedText ? 1 : 0;
        proovedDelta = newUnit.proovedText ? 1 : 0;
        isNew = true;
        unitCountDelta = 1;

        next[currentPageIndex] = {
          ...prevPage,
          units: updatedUnits,
        };

        return next;
      }
    });

    if (isNew) {
      setProject((p) => ({
        ...p,
        unitCount: (p.unitCount ?? 0) + unitCountDelta,
        inboxUnitCount: (p.inboxUnitCount ?? 0) + inboxDelta,
        outboxUnitCount: (p.outboxUnitCount ?? 0) + outboxDelta,
        translatedUnitCount: (p.translatedUnitCount ?? 0) + translatedDelta,
        proovedUnitCount: (p.proovedUnitCount ?? 0) + proovedDelta,
      }));
    }

  };

  const rearrangeUnits = (unitId: string, targetIndex: number) => {
    setPages((prev) => {
      const next = [...prev];
      const prevPage = next[currentPageIndex];

      const currentIndex = prevPage.units.findIndex((u) => u.id === unitId);

      if (currentIndex === -1) {
        console.log("[PanelView] Rearrange skipped, unit not found", unitId);
        return prev;
      }

      const maxIndex = Math.max(prevPage.units.length - 1, 0);
      const safeIndex = Math.min(Math.max(targetIndex, 0), maxIndex);

      if (safeIndex === currentIndex) return prev;

      const nextUnits = [...prevPage.units];
      const [movedUnit] = nextUnits.splice(currentIndex, 1);

      nextUnits.splice(safeIndex, 0, movedUnit);

      const reindexedUnits = nextUnits.map((unit, index) => ({ ...unit, indexInPage: index }));

      next[currentPageIndex] = { ...prevPage, units: reindexedUnits };

      return next;
    });
  };

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <Translator
        project={project}
        currentPage={pages[currentPageIndex]}
        isLoading={false}
        mode="proofread"
        isOffline={false}
        currentPageIndex={currentPageIndex}
        selectedUnitId={selectedUnitId}
        onRequestPage={(idx) => setCurrentPageIndex(Math.min(Math.max(idx, 0), pages.length - 1))}
        onUnitSave={handleUnitSave}
        onUnitRemove={handleUnitRemove}
        onUnitSelect={handleUnitSelect}
        onRearrangeUnits={rearrangeUnits}
      />
    </div>
  );
}
