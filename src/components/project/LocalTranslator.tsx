import { useEffect, useState, useRef, useCallback } from "react";
import { Translator } from "./Translator";
import type { Project, Page, Unit } from "../../models/project";
import { getProjectPages, getPageUnits, savePageUnits, setActiveProjectPageIndex, getActiveProjectPageIndex, getProjects } from "../../store/project";
import { useToast } from "../NotificationToast";

export type LocalTranslatorProps = {
  project: Project;
  onExit: () => void;
  /** 当 project 元数据更新时通知父组件（可选） */
  onProjectChange?: (project: Project) => void;
};

/**
 * LocalTranslator 组件
 * 
 * 职责：
 * 1. 持有本地项目所有页面元数据
 * 2. 按需加载当前页面的 units
 * 3. 维护当前页的 units diff 缓冲区，减少数据库写入次数
 * 4. 仅在切页（onRequestPage）或强制刷新（onFlush）时批量保存
 * 5. 为 Translator 组件提供所需的所有数据和回调
 */
export const LocalTranslator: React.FC<LocalTranslatorProps> = ({
  project: initialProject,
  onExit,
  onProjectChange,
}) => {
  // 内部维护 project 状态副本，以便 flush 后同步更新
  const [project, setProject] = useState<Project>(initialProject);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentUnits, setCurrentUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // 当前页的 units 是否已修改
  const currentPageDirtyRef = useRef<boolean>(false);

  const { showToast } = useToast();

  // 初始加载所有页面元数据
  useEffect(() => {
    let mounted = true;

    async function loadPages() {
      try {
        setLoading(true);

        const loadedPages = await getProjectPages(project.id);

        if (!mounted) return;

        setPages(loadedPages);

        // 尝试从内存中恢复上次的页面索引（仅运行时保存）
        let initialIndex = 0;

        try {
          const storedIndex = getActiveProjectPageIndex();

          if (typeof storedIndex === "number" && storedIndex >= 0 && storedIndex < loadedPages.length) {
            initialIndex = storedIndex;
          }
        } catch (err) {
          // ignore
        }

        setCurrentPageIndex(initialIndex);

        // 加载初始页面的 units
        if (loadedPages.length > 0) {
          await loadPageUnits(loadedPages[initialIndex].id);
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

  // 加载指定页面的 units
  const loadPageUnits = useCallback(async (pageId: string) => {
    try {
      setLoadingUnits(true);

      const units = await getPageUnits(pageId);

      setCurrentUnits(units);
      currentPageDirtyRef.current = false;

      setLoadingUnits(false);
    } catch (err) {
      console.error(`Failed to load units for page ${pageId}`, err);

      setCurrentUnits([]);
      setLoadingUnits(false);

      throw err;
    }
  }, []);

  // 保存当前页的 units 到数据库
  const flushCurrentPage = useCallback(async () => {
    if (!currentPageDirtyRef.current) return;

    const currentPage = pages[currentPageIndex];

    if (!currentPage) return;

    try {
      await savePageUnits(currentPage.id, currentUnits);

      currentPageDirtyRef.current = false;

      console.log(`Flushed page ${currentPage.id} to database`);
    } catch (err) {
      console.error("Failed to flush current page", err);

      throw err;
    }
  }, [pages, currentPageIndex, currentUnits]);

  // 标记当前页为已修改
  const markCurrentPageDirty = useCallback(() => {
    currentPageDirtyRef.current = true;
  }, []);

  // 处理页面切换：先保存当前页，再切换并加载新页
  const handleRequestPage = useCallback(
    async (pageIndex: number) => {
      const targetIndex = Math.max(
        0,
        Math.min(pageIndex, pages.length - 1)
      );

      // 如果切换到同一页，不做任何操作
      if (targetIndex === currentPageIndex) return;

      // 切页前先保存当前页
      try {
        await flushCurrentPage();
      } catch (err) {
        showToast("error", "保存失败，无法切换页面");
        return;
      }

      // 加载目标页的 units
      try {
        await loadPageUnits(pages[targetIndex].id);
      } catch (err) {
        showToast("error", "加载页面失败");
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
    [pages, currentPageIndex, flushCurrentPage, loadPageUnits, showToast]
  );

  // 强制刷新：保存当前页并更新 project 元数据
  const handleFlush = useCallback(async () => {
    try {
      await flushCurrentPage();

      // 重新获取 project 列表，找到当前 project 并通知父组件
      try {
        const projects = await getProjects(true);
        const updatedProject = projects.find((p) => p.id === project.id);

        if (updatedProject) {
          // 更新内部 project 状态副本
          setProject(updatedProject);

          // 通知父组件
          if (onProjectChange) {
            onProjectChange(updatedProject);
          }
        }
      } catch (refreshErr) {
        console.error("Failed to refresh project metadata", refreshErr);
      }

      showToast("success", "已保存所有修改");
    } catch (err) {
      showToast("error", "保存失败");
    }
  }, [flushCurrentPage, showToast, project.id, onProjectChange]);

  // 处理单元保存（仅更新内存 + 标记 dirty）
  const handleUnitSave = useCallback(
    (unit: Partial<Unit> & { id: string }) => {
      setCurrentUnits((prevUnits) => {
        const existingUnitIndex = prevUnits.findIndex(
          (u) => u.id === unit.id
        );

        let updatedUnits: Unit[];

        if (existingUnitIndex >= 0) {
          // 正确处理字段更新：对于可选字段，如果 unit 中明确包含该 key（即使值为 undefined），则覆盖
          const updated: Unit = { ...prevUnits[existingUnitIndex] };

          // 逐字段复制，确保 undefined 会覆盖原有值（实现字段删除）
          if ("x" in unit) updated.x = unit.x!;
          if ("y" in unit) updated.y = unit.y!;
          if ("indexInPage" in unit) updated.indexInPage = unit.indexInPage!;
          if ("isInbox" in unit) updated.isInbox = unit.isInbox!;
          if ("isProoved" in unit) updated.isProoved = unit.isProoved!;
          if ("translatedText" in unit) updated.translatedText = unit.translatedText;
          if ("proovedText" in unit) updated.proovedText = unit.proovedText;
          if ("comment" in unit) updated.comment = unit.comment;

          updatedUnits = prevUnits.map((u, idx) =>
            idx === existingUnitIndex ? updated : u
          );
        } else {
          const newUnit: Unit = {
            id: unit.id,
            x: unit.x ?? 0,
            y: unit.y ?? 0,
            // Use 1-based default index
            indexInPage: unit.indexInPage ?? (prevUnits.length + 1),
            isInbox: unit.isInbox ?? true,
            isProoved: unit.isProoved ?? false,
            translatedText: unit.translatedText,
            proovedText: unit.proovedText,
            comment: unit.comment,
          };

          updatedUnits = [...prevUnits, newUnit];
        }

        markCurrentPageDirty();

        return updatedUnits;
      });
    },
    [markCurrentPageDirty]
  );

  // 处理单元删除（仅更新内存 + 标记 dirty）
  const handleUnitRemove = useCallback(
    (unitId: string) => {
      setCurrentUnits((prevUnits) => {
        const filteredUnits = prevUnits.filter((u) => u.id !== unitId);
        const reindexedUnits = filteredUnits.map((u, idx) => ({
          ...u,
          indexInPage: idx + 1,
        }));

        markCurrentPageDirty();

        if (selectedUnitId === unitId) {
          setSelectedUnitId(null);
        }

        return reindexedUnits;
      });
    },
    [selectedUnitId, markCurrentPageDirty]
  );

  // 处理单元选择
  const handleUnitSelect = useCallback((unitId: string | null) => {
    setSelectedUnitId(unitId);
  }, []);

  // 处理单元重排序（仅更新内存 + 标记 dirty）
  const handleRearrangeUnits = useCallback(
    (unitId: string, targetIndex: number) => {
      setCurrentUnits((prevUnits) => {
        const currentIndex = prevUnits.findIndex(
          (u) => u.id === unitId
        );

        if (currentIndex === -1) return prevUnits;

        const maxIndex = Math.max(prevUnits.length - 1, 0);
        const safeIndex = Math.min(Math.max(targetIndex, 0), maxIndex);

        if (safeIndex === currentIndex) return prevUnits;

        const nextUnits = [...prevUnits];
        const [movedUnit] = nextUnits.splice(currentIndex, 1);

        nextUnits.splice(safeIndex, 0, movedUnit);

        const reindexedUnits = nextUnits.map((u, idx) => ({
          ...u,
          indexInPage: idx + 1,
        }));

        markCurrentPageDirty();

        return reindexedUnits;
      });
    },
    [markCurrentPageDirty]
  );

  // 退出前强制保存
  const handleExitWithSave = useCallback(async () => {
    try {
      await flushCurrentPage();

      // 保存退出前的当前页索引到内存状态
      try {
        setActiveProjectPageIndex(currentPageIndex);
      } catch (err) {
        // ignore
      }

      // 退出前也刷新 project 元数据
      try {
        const projects = await getProjects(true);
        const updatedProject = projects.find((p) => p.id === project.id);

        if (updatedProject) {
          // 更新内部 project 状态副本
          setProject(updatedProject);

          // 通知父组件
          if (onProjectChange) {
            onProjectChange(updatedProject);
          }
        }
      } catch (refreshErr) {
        console.error("Failed to refresh project metadata on exit", refreshErr);
      }

      onExit();
    } catch (err) {
      showToast("error", "保存失败，无法退出");
    }
  }, [flushCurrentPage, currentPageIndex, onExit, showToast, project.id, onProjectChange]);

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
        currentUnits={currentUnits}
        isLoading={loadingUnits}
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
