import "./ProjectStatusCard.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProgressBar from "../ProgressBar";
import NatureButton from "../NatureButton";
import { Type, Check, Cloud, HardDrive, FileText, Layers } from "lucide-react";
import type { Project } from "../../models/project";
import { deleteProject } from "../../ipc/project";
import ConfirmDialogBox from "../ConfirmDialogBox";
import { useToast } from "../NotificationToast";

type ProjectStatusCardProps = {
  project: Project;
  onAct?: (project: Project) => void;
  onSync?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onExport?: (project: Project) => void;
  onModify?: (project: Project) => void;
};

// 极简 ProjectStatusCard 组件，仅接受 Project DTO
export default function ProjectStatusCard({ project, onAct, onSync, onDelete, onExport, onModify }: ProjectStatusCardProps) {
  const author = project.author ?? "";
  const title = project.title ?? "";
  const pages = project.pageCount ?? 0;
  const units = project.unitCount ?? 0;

  const trPercent = project.unitCount > 0
    ? (project.translatedUnitCount / project.unitCount) * 100
    : 0;
  const prPercent = project.unitCount > 0
    ? (project.proovedUnitCount / project.unitCount) * 100
    : 0;

  const tr = Math.max(0, Math.min(100, Math.round(trPercent)));
  const pr = Math.max(0, Math.min(100, Math.round(prPercent)));
  const remote = Boolean(project.relatedRemoteComicId);

  const translatedCount = project.translatedUnitCount;
  const proovedCount = project.proovedUnitCount;
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    function handleDocClick(e: Event) {
      const target = e.target as Node;

      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }

      setMenuOpen(false);
    }

    if (menuOpen) {
      document.addEventListener("click", handleDocClick);
    }

    return () => {
      document.removeEventListener("click", handleDocClick);
    };
  }, [menuOpen]);

  function handleExport() {
    if (onExport) {
      onExport(project);
    }
  }

  function handleModify() {
    if (onModify) {
      onModify(project);
    }
  }

  function handleSync() {
    if (onSync) {
      onSync(project);
    }
  }

  async function handleDelete() {
    setConfirmVisible(true);
  }

  const [confirmVisible, setConfirmVisible] = useState(false);

  const { showToast } = useToast();

  async function doDelete() {
    try {
      await deleteProject(project.id);

      if (onDelete) {
        onDelete(project);
      }
      // 使用回调通知父组件完成删除（全局事件已被禁止）
    } catch (e) {
      console.error("Delete project failed", e);
      showToast("error", (e as Error).message || String(e), 5000);
    } finally {
      setMenuOpen(false);
      setConfirmVisible(false);
    }
  }

  return (
    <div
      className="psc-root"
      onClick={() => {
        if (onAct) onAct(project);
      }}
    >
      <div className="psc-left">
        <div className="psc-icon" aria-hidden>
          {remote ? <Cloud size={18} /> : <HardDrive size={18} />}
        </div>

        <div className="psc-main">
          <div style={{ minWidth: 0 }}>
            <span className="psc-title">{author ? `【${author}】${title}` : title}</span>
          </div>
        </div>

          <ConfirmDialogBox
            visible={confirmVisible}
            title="删除项目"
            description="确定要删除该项目吗？此操作不可恢复。"
            confirmText="删除"
            cancelText="取消"
            onConfirm={doDelete}
            onCancel={() => setConfirmVisible(false)}
          />
      </div>

      <div className="psc-metrics">
        <div className="psc-metric-row">
          <div className="psc-metric-item" title="pages">
            <FileText size={16} />
            <span>{pages}</span>
          </div>

          <div className="psc-metric-item" title="units">
            <Layers size={16} />
            <span>{units}</span>
          </div>

          <div className="psc-metric-item" title="translated">
            <Type size={16} />
            <span>{translatedCount}</span>
          </div>

          <div className="psc-metric-item" title="prooved">
            <Check size={16} />
            <span>{proovedCount}</span>
          </div>
        </div>

        <div className="psc-progress-wrap" aria-hidden>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ width: "100%" }}>
              <ProgressBar
                items={[
                  { color: "#fed7aa", length: tr },
                  { color: "#bbf7d0", length: pr },
                ]}
                height={8}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="psc-right">
        <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8 }}>

          <div className="psc-extra">
            <div
              ref={buttonRef as any}
              style={{ display: "inline-block" }}
              onClick={(e) => {
                e.stopPropagation();
                if (!menuOpen && buttonRef.current) {
                  const rect = buttonRef.current.getBoundingClientRect();
                  setPos({ left: rect.left + rect.width / 2, top: rect.bottom });
                }

                setMenuOpen((s) => !s);
              }}
            >
              <NatureButton variant="cloud" minWidth={40} onClick={() => {}}>⋯</NatureButton>
            </div>

            {menuOpen && pos
              ? createPortal(
                <div
                  ref={menuRef}
                  className="psc-dropdown"
                  role="menu"
                  aria-hidden={!menuOpen}
                  style={{
                    position: "fixed",
                    left: pos.left,
                    top: pos.top + 8,
                    transform: "translateX(-50%)",
                    zIndex: 9999,
                  }}
                >
                  {remote ? (
                    <>
                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSync();
                          setMenuOpen(false);
                        }}
                      >
                        同步
                      </div>

                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport();
                          setMenuOpen(false);
                        }}
                      >
                        导出
                      </div>

                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                      >
                        删除
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport();
                          setMenuOpen(false);
                        }}
                      >
                        导出
                      </div>

                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModify();
                          setMenuOpen(false);
                        }}
                      >
                        修改
                      </div>

                      <div
                        className="psc-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                      >
                        删除
                      </div>
                    </>
                  )}
                </div>,
                document.body,
              )
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
