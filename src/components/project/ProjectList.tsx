import { useEffect, useMemo, useState, useRef } from "react";
import ProjectStatusCard from "./ProjectStatusCard";
import LocalProjectCreator from "./LocalProjectCreator";
import LocalProjectModifier from "./LocalProjectModifier";
import LocalProjectExporter from "./LocalProjectExporter";
import NatureButton from "../NatureButton";
import { Plus } from "lucide-react";
import type { Project } from "../../models/project";

const ArrowButton: React.FC<{ direction: "prev" | "next" }> = ({ direction }) => {
  const isPrev = direction === "prev";

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#374151"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: isPrev ? "none" : "rotate(180deg)" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
};

type ProjectListProps = {
  projects: Project[];
  onAct?: (project: Project) => void;
  onSync?: (project: Project) => void;
  onRefresh?: () => void;
  title?: string;
};

/**
 * 项目列表组件
 * 
 * 试探性分页机制：
 * - pageSize 表社当前每页容量，只在 adaptive list 报告发生裁剪时更新
 * - page 表示当前页码（从0开始）
 * - 当 pageSize 确定后，根据 page 和 pageSize 裁剪数据传递给 adaptive list
 * - 如果当前页的项数 < pageSize，禁用下一页按钮（确定无下一页）
 * - 如果当前页的项数 === pageSize，允许点击下一页（试探是否还有数据）
 */
export default function ProjectList({ projects, onAct, onSync, onRefresh, title }: ProjectListProps) {
  const [page, setPage] = useState<number>(0);
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showModifier, setShowModifier] = useState<boolean>(false);
  const [showExporter, setShowExporter] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState<number>(0);
  const [itemHeight, setItemHeight] = useState<number>(64);

  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;

      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.gap) || 0;
      const pt = parseFloat(style.paddingTop) || 0;
      const pb = parseFloat(style.paddingBottom) || 0;
      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height - pt - pb;

      const measuredHeight = firstItemRef.current
        ? firstItemRef.current.getBoundingClientRect().height
        : itemHeight;

      const safeHeight = measuredHeight > 0 ? measuredHeight : 64;
      setItemHeight(safeHeight);

      const count = Math.floor((availableHeight + gap + 0.1) / (safeHeight + gap));
      const nextCapacity = Math.max(1, count || 1);
      setCapacity(nextCapacity);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    if (firstItemRef.current) {
      ro.observe(firstItemRef.current);
    }

    // 延迟一次，确保首项已渲染后测量
    requestAnimationFrame(measure);

    return () => ro.disconnect();
  }, [projects.length]);

  // 根据当前页码和容量裁剪数据
  const pageProjects = useMemo(() => {
    if (capacity <= 0) {
      return projects;
    }

    const start = page * capacity;
    return projects.slice(start, start + capacity);
  }, [projects, page, capacity]);

  const isNextPageDisabled = capacity > 0 && pageProjects.length < capacity;

  function handleCreatorSave() {
    setShowCreator(false);

    if (onRefresh) {
      onRefresh();
    }
  }

  function handleModify(project: Project) {
    setSelectedProject(project);
    setShowModifier(true);
  }

  function handleModifierSave() {
    setShowModifier(false);
    setSelectedProject(null);

    if (onRefresh) {
      onRefresh();
    }
  }

  function handleExport(project: Project) {
    setSelectedProject(project);
    setShowExporter(true);
  }

  function handleExporterSuccess() {
    setShowExporter(false);
    setSelectedProject(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      {title ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
          <NatureButton variant="mist" minWidth={90} onClick={() => setShowCreator(true)}>
            <Plus size={16} style={{ marginRight: 4 }} />
            新建
          </NatureButton>
        </div>
      ) : null}

      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {projects.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            暂时没有项目哦？
          </div>
        ) : (
          pageProjects.map((project, idx) => (
            <div
              key={project.id}
              ref={idx === 0 ? firstItemRef : undefined}
              style={{ height: itemHeight || undefined }}
            >
              <ProjectStatusCard
                project={project}
                onAct={onAct}
                onSync={onSync}
                onDelete={() => {
                  if (onRefresh) onRefresh();
                }}
                onModify={handleModify}
                onExport={handleExport}
              />
            </div>
          ))
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(() => {
              const isPrevDisabled = page === 0;
              const isNextDisabled = isNextPageDisabled;

              return (
                <>
                  <button
                    aria-label="上一页"
                    title="上一页"
                    onClick={() => {
                      if (isPrevDisabled) return;
                      setPage((prev) => Math.max(0, prev - 1));
                    }}
                    style={{
                      cursor: isPrevDisabled ? "default" : "pointer",
                      opacity: isPrevDisabled ? 0.4 : 1,
                      pointerEvents: isPrevDisabled ? "none" : "auto",
                      background: "none",
                      border: "none",
                      padding: 6,
                    }}
                  >
                    <ArrowButton direction="prev" />
                  </button>

                  <button
                    aria-label="下一页"
                    title="下一页"
                    onClick={() => {
                      if (isNextDisabled) return;
                      setPage((prev) => prev + 1);
                    }}
                    style={{
                      cursor: isNextDisabled ? "default" : "pointer",
                      opacity: isNextDisabled ? 0.4 : 1,
                      pointerEvents: isNextDisabled ? "none" : "auto",
                      background: "none",
                      border: "none",
                      padding: 6,
                    }}
                  >
                    <ArrowButton direction="next" />
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {showCreator ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 10, 8, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 160,
          }}
          onClick={() => setShowCreator(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92%",
              maxHeight: "86%",
            }}
          >
            <LocalProjectCreator
              onSave={handleCreatorSave}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        </div>
      ) : null}

      {showModifier && selectedProject ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 10, 8, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 160,
          }}
          onClick={() => {
            setShowModifier(false);
            setSelectedProject(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92%",
              maxHeight: "86%",
            }}
          >
            <LocalProjectModifier
              project={selectedProject}
              onSave={handleModifierSave}
              onCancel={() => {
                setShowModifier(false);
                setSelectedProject(null);
              }}
            />
          </div>
        </div>
      ) : null}

      {showExporter && selectedProject ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 10, 8, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 160,
          }}
          onClick={() => {
            setShowExporter(false);
            setSelectedProject(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92%",
              maxHeight: "86%",
            }}
          >
            <LocalProjectExporter
              project={selectedProject}
              onSuccess={handleExporterSuccess}
              onCancel={() => {
                setShowExporter(false);
                setSelectedProject(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
