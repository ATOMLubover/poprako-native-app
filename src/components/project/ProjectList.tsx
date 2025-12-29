import { useEffect, useMemo, useState, useRef } from "react";
import ProjectStatusCard from "./ProjectStatusCard";
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

// 动态容量计算 Hook
const useDynamicCapacity = (containerRef: React.RefObject<HTMLDivElement | null>, templateRef: React.RefObject<HTMLDivElement | null>) => {
  const [capacity, setCapacity] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !templateRef.current) return;

    const calculate = () => {
      const container = containerRef.current;
      const template = templateRef.current;

      if (!container || !template) return; // Add null checks

      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.gap) || 0;
      const pt = parseFloat(style.paddingTop) || 0;
      const pb = parseFloat(style.paddingBottom) || 0;

      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height - pt - pb;

      const singleItemHeight = template.getBoundingClientRect().height;
      setItemHeight(singleItemHeight);

      if (singleItemHeight > 0) {
        const count = Math.floor((availableHeight + gap + 0.1) / (singleItemHeight + gap));
        setCapacity(Math.max(1, count));
      }
    };

    const observer = new ResizeObserver(calculate);
    observer.observe(containerRef.current!);
    observer.observe(templateRef.current!);

    calculate();
    return () => observer.disconnect();
  }, []);

  return { capacity, itemHeight };
};

type ProjectListProps = {
  projects: Project[];
  onAct?: (project: Project) => void;
  onSync?: (project: Project) => void;
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
export default function ProjectList({ projects, onAct, onSync, title }: ProjectListProps) {
  const [page, setPage] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  const { capacity, itemHeight } = useDynamicCapacity(containerRef, templateRef);

  // 根据当前页码和容量裁剪数据
  const pageProjects = useMemo(() => {
    if (capacity <= 0) {
      return projects;
    }

    const start = page * capacity;
    return projects.slice(start, start + capacity);
  }, [projects, page, capacity]);

  const isNextPageDisabled = capacity > 0 && pageProjects.length < capacity;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      {title ? <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3> : null}

      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* 隐藏的测量模板 */}
        <div ref={templateRef} style={{ visibility: "hidden", position: "absolute" }}>
          <ProjectStatusCard project={projects[0]} />
        </div>

        {pageProjects.map((project) => (
          <div key={project.id} style={{ height: itemHeight }}>
            <ProjectStatusCard project={project} onAct={onAct} onSync={onSync} />
          </div>
        ))}

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
    </div>
  );
}
