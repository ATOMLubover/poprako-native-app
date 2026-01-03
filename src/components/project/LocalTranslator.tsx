import { useEffect, useState, useRef, useCallback } from "react";
import { Translator } from "./Translator";
import type { Project, Page, Unit } from "../../models/project";
import { getProjectPages, savePageUnits, setActiveProjectPageIndex, getActiveProjectPageIndex } from "../../store/project";
import { useToast } from "../NotificationToast";

export type LocalTranslatorProps = {
  project: Project;
  onExit: () => void;
};

/**
 * LocalTranslator 组件
 * 
 * 职责：
 * 1. 持有本地项目所有页面数据的所有权
 * 2. 维护 diff 缓冲区，减少数据库写入次数
 * 3. 仅在切页（onRequestPage）或强制刷新（onFlush）时批量保存
 * 4. 为 Translator 组件提供所需的所有数据和回调
 */
export const LocalTranslator: React.FC<LocalTranslatorProps> = ({
  project,
  onExit,
}) => {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Diff 缓冲区：记录所有修改过的页面
  const pendingChangesRef = useRef<Map<string, Page>>(new Map());

  const { showToast } = useToast();

  // 初始加载所有页面数据
  useEffect(() => {
    let mounted = true;

    async function loadPages() {
      try {
        setLoading(true);

        const loadedPages = await getProjectPages(project.id);

        if (!mounted) return;

        setPages(loadedPages);

        // 尝试从内存中恢复上次的页面索引（仅运行时保存）
        try {
          const storedIndex = getActiveProjectPageIndex();

          if (typeof storedIndex === "number" && storedIndex >= 0 && storedIndex < loadedPages.length) {
            setCurrentPageIndex(storedIndex);
          }
        } catch (err) {
          // ignore
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;

        setError((err as Error).message || String(err));
        setLoading(false);
      }
    }

    loadPages();

    return () => {
      mounted = false;
    };
  }, [project.id]);

  // 批量保存 pending changes 到数据库
  const flushPendingChanges = useCallback(async () => {
    const changedPages = Array.from(pendingChangesRef.current.values());

    if (changedPages.length === 0) return;

    try {
      // For translation workflow we only need to persist units. Save units per page.
      for (const page of changedPages) {
        if (!page.units || page.units.length === 0) continue;

        await savePageUnits(page.id, page.units);
      }

      pendingChangesRef.current.clear();

      console.log(`Flushed ${changedPages.length} page(s) to database`);
    } catch (err) {
      console.error("Failed to flush pending changes", err);

      throw err;
    }
  }, [project.id]);

  // 标记某页为已修改
  const markPageAsChanged = useCallback((page: Page) => {
    pendingChangesRef.current.set(page.id, page);
  }, []);

  // 处理页面切换：先保存当前页，再切换
  const handleRequestPage = useCallback(
    async (pageIndex: number) => {
      const targetIndex = Math.max(
        0,
        Math.min(pageIndex, pages.length - 1)
      );

      // 切页前先保存 pending changes
      try {
        await flushPendingChanges();
      } catch (err) {
        showToast("error", "保存失败，无法切换页面");
        return;
      }

      setCurrentPageIndex(targetIndex);
      // 保存当前页索引到内存状态
      try {
        setActiveProjectPageIndex(targetIndex);
      } catch (err) {
        // ignore
      }
      setSelectedUnitId(null);
    },
    [pages.length, flushPendingChanges, showToast]
  );

  // 强制刷新：保存所有 pending changes
  const handleFlush = useCallback(async () => {
    try {
      await flushPendingChanges();

      showToast("success", "已保存所有修改");
    } catch (err) {
      showToast("error", "保存失败");
    }
  }, [flushPendingChanges, showToast]);

  // 处理单元保存（仅更新内存 + 标记 pending）
  const handleUnitSave = useCallback(
    (unit: Partial<Unit> & { id: string }) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const currentPage = nextPages[currentPageIndex];

        if (!currentPage) return prevPages;

        const existingUnitIndex = currentPage.units.findIndex(
          (u) => u.id === unit.id
        );

        let updatedUnits: Unit[];

        if (existingUnitIndex >= 0) {
          updatedUnits = currentPage.units.map((u, idx) =>
            idx === existingUnitIndex ? { ...u, ...unit } : u
          );
        } else {
          const newUnit: Unit = {
            id: unit.id,
            x: unit.x ?? 0,
            y: unit.y ?? 0,
            indexInPage: unit.indexInPage ?? currentPage.units.length,
            isInbox: unit.isInbox ?? true,
            isProoved: unit.isProoved ?? false,
            translatedText: unit.translatedText,
            proovedText: unit.proovedText,
            comment: unit.comment,
          };

          updatedUnits = [...currentPage.units, newUnit];
        }

        const updatedPage: Page = {
          ...currentPage,
          units: updatedUnits,
        };

        nextPages[currentPageIndex] = updatedPage;

        markPageAsChanged(updatedPage);

        return nextPages;
      });
    },
    [currentPageIndex, markPageAsChanged]
  );

  // 处理单元删除（仅更新内存 + 标记 pending）
  const handleUnitRemove = useCallback(
    (unitId: string) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const currentPage = nextPages[currentPageIndex];

        if (!currentPage) return prevPages;

        const filteredUnits = currentPage.units.filter((u) => u.id !== unitId);
        const reindexedUnits = filteredUnits.map((u, idx) => ({
          ...u,
          indexInPage: idx,
        }));

        const updatedPage: Page = {
          ...currentPage,
          units: reindexedUnits,
        };

        nextPages[currentPageIndex] = updatedPage;

        markPageAsChanged(updatedPage);

        if (selectedUnitId === unitId) {
          setSelectedUnitId(null);
        }

        return nextPages;
      });
    },
    [currentPageIndex, selectedUnitId, markPageAsChanged]
  );

  // 处理单元选择
  const handleUnitSelect = useCallback((unitId: string | null) => {
    setSelectedUnitId(unitId);
  }, []);

  // 处理单元重排序（仅更新内存 + 标记 pending）
  const handleRearrangeUnits = useCallback(
    (unitId: string, targetIndex: number) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const currentPage = nextPages[currentPageIndex];

        if (!currentPage) return prevPages;

        const currentIndex = currentPage.units.findIndex(
          (u) => u.id === unitId
        );

        if (currentIndex === -1) return prevPages;

        const maxIndex = Math.max(currentPage.units.length - 1, 0);
        const safeIndex = Math.min(Math.max(targetIndex, 0), maxIndex);

        if (safeIndex === currentIndex) return prevPages;

        const nextUnits = [...currentPage.units];
        const [movedUnit] = nextUnits.splice(currentIndex, 1);

        nextUnits.splice(safeIndex, 0, movedUnit);

        const reindexedUnits = nextUnits.map((u, idx) => ({
          ...u,
          indexInPage: idx,
        }));

        const updatedPage: Page = {
          ...currentPage,
          units: reindexedUnits,
        };

        nextPages[currentPageIndex] = updatedPage;

        markPageAsChanged(updatedPage);

        return nextPages;
      });
    },
    [currentPageIndex, markPageAsChanged]
  );

  // 退出前强制保存
  const handleExitWithSave = useCallback(async () => {
    try {
      await flushPendingChanges();

      // 保存退出前的当前页索引到内存状态
      try {
        setActiveProjectPageIndex(currentPageIndex);
      } catch (err) {
        // ignore
      }

      onExit();
    } catch (err) {
      showToast("error", "保存失败，无法退出");
    }
  }, [flushPendingChanges, onExit, showToast]);

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        加载中…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div>加载项目页面失败：{error}</div>

        <button onClick={handleExitWithSave}>返回</button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div>该项目暂无页面</div>

        <button onClick={handleExitWithSave}>返回</button>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  if (!currentPage) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        页面不存在
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <Translator
        project={project}
        currentPage={currentPage}
        isLoading={false}
        mode="translate"
        isOffline={false}
        isMeTranslator={true}
        isMeProofreader={true}
        currentPageIndex={currentPageIndex}
        selectedUnitId={selectedUnitId}
        onRequestPage={handleRequestPage}
        onUnitSave={handleUnitSave}
        onUnitRemove={handleUnitRemove}
        onUnitSelect={handleUnitSelect}
        onRearrangeUnits={handleRearrangeUnits}
        onFlush={handleFlush}
        onReturn={handleExitWithSave}
      />
    </div>
  );
};
