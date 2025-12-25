import React, { useEffect, useRef } from "react";
import "./Translator.css";
import ProgressBar from "../ProgressBar";
import { UnitList } from "./UnitList";
import Editor, { type EditorRef } from "./Editor";
import { useSpecialSymbolsStore } from "../../store/specialSymbols";
import type { Project, Page, Unit } from "../../models/translator";

export type TranslatorMode = "translate" | "proofread" | "read";

export type TranslatorProps = {
  project: Project;
  currentPage: Page;
  isLoading: boolean;
  mode: TranslatorMode;
  isOffline: boolean;
  currentPageIndex: number;
  selectedUnitId?: string | null;
  onRequestPage: (pageIndex: number) => void;
  onRefresh?: () => void;
  onUnitSave: (unit: Partial<Unit> & { id: string }) => void;
  onUnitRemove: (unitId: string) => void;
  onUnitSelect?: (unitId: string | null) => void;
};

const ModeIcon: React.FC<{ mode: TranslatorMode }> = ({ mode }) => {
  if (mode === "translate") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    );
  }

  if (mode === "proofread") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="6" />
        <line x1="16" y1="16" x2="21" y2="21" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

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

const NoteIcon: React.FC = () => {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
      <path d="M18 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
      <path d="M11 14V6l7-2v8" />
    </svg>
  );
};

type ShortcutConfig = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
};

export const Translator: React.FC<TranslatorProps> = ({
  project,
  currentPage,
  mode,
  currentPageIndex,
  selectedUnitId,
  onUnitSelect,
  onUnitSave,
}) => {
  const { customSymbols, loadCustomSymbolsIfNeeded } = useSpecialSymbolsStore();
  const editorRef = useRef<EditorRef>(null);

  const selectedUnit = currentPage.units.find((u) => u.id === selectedUnitId);

  useEffect(() => {
    loadCustomSymbolsIfNeeded();
  }, [loadCustomSymbolsIfNeeded]);

  useEffect(() => {
    if (selectedUnit && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.focus(true);
      }, 0);
    }
  }, [selectedUnitId]);

  const shortcuts: ShortcutConfig[] = [
    {
      key: "Home",
      handler: () => {
        if (onUnitSelect) {
          onUnitSelect(null);
        }
      },
      description: "取消选择单元",
    },
    {
      key: "Tab",
      handler: () => {
        if (!onUnitSelect) return;

        const units = currentPage.units;
        if (units.length === 0) return;

        if (!selectedUnitId) {
          onUnitSelect(units[0].id);
          return;
        }

        const currentIndex = units.findIndex((u) => u.id === selectedUnitId);
        if (currentIndex === -1) {
          onUnitSelect(units[0].id);
          return;
        }

        // 循环到第一个
        const nextIndex = (currentIndex + 1) % units.length;
        onUnitSelect(units[nextIndex].id);
      },
      description: "切换到下一个单元（循环）",
    },
    {
      key: "Tab",
      shift: true,
      handler: () => {
        if (!onUnitSelect) return;

        const units = currentPage.units;
        if (units.length === 0) return;

        if (!selectedUnitId) {
          onUnitSelect(units[0].id);
          return;
        }

        const currentIndex = units.findIndex((u) => u.id === selectedUnitId);
        if (currentIndex === -1) {
          onUnitSelect(units[0].id);
          return;
        }

        // 循环到最后一个
        const prevIndex = (currentIndex - 1 + units.length) % units.length;
        onUnitSelect(units[prevIndex].id);
      },
      description: "切换到上一个单元（循环）",
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedShortcut = shortcuts.find((shortcut) => {
        const keyMatch = event.key === shortcut.key;
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onUnitSelect, selectedUnitId, currentPage.units]);

  const handleTextModify = (newText: string) => {
    if (!selectedUnit) return;

    console.log("[Translator] handleTextModify called, newText:", newText);

    if (mode === "translate") {
      onUnitSave({ id: selectedUnit.id, translatedText: newText });
    } else if (mode === "proofread") {
      onUnitSave({ id: selectedUnit.id, proovedText: newText });
    }
  };

  return (
    <div className="translator-container">
      {/* 顶部栏 */}
      <div className="translator-header">
        <div className="project-info">
          [{project.author}] {project.title}
        </div>

        <div className="progress-area" style={{ justifyContent: 'flex-start' }}>
          <div style={{ width: 200 }}>
            <ProgressBar
              items={[
                {
                  color: "#fed7aa",
                  length: project.unitCount > 0 ? (project.translatedUnitCount / project.unitCount) * 100 : 0,
                },
                {
                  color: "#bbf7d0",
                  length: project.unitCount > 0 ? (project.proovedUnitCount / project.unitCount) * 100 : 0,
                },
              ]}
              height={14}
            />
          </div>
        </div>

        <div className="header-toolbox" style={{ marginLeft: 'auto' }}>
          <div className="toolbox-pill" aria-label="模式">
            <ModeIcon mode={mode} />
          </div>

          <div className="toolbox-pill" aria-label="上一页">
            <ArrowButton direction="prev" />
          </div>

          <div className="toolbox-pill" aria-label="下一页">
            <ArrowButton direction="next" />
          </div>

          <div className="toolbox-pill" aria-label="特殊符号">
            <NoteIcon />
          </div>
        </div>

        <div className="page-indicator">
          {currentPageIndex + 1} / {project.pageCount}
        </div>
      </div>

      {/* 主体区域 */}
      <div className="translator-body">
        {/* 中间画布区 */}
        <div className="translator-stage">
          <div className="stage-placeholder">
            <div>画布区域</div>
            <div style={{ fontSize: "12px", marginTop: "8px" }}>
              Image + Marker Overlay
            </div>
          </div>
        </div>

        {/* 右侧侧边栏 */}
        {mode !== "read" && (
          <div className="translator-sidebar">
            <div className="sidebar-unitlist">
              <UnitList
                page={currentPage}
                onUnitClick={onUnitSelect}
                selectedUnitId={selectedUnitId}
                isProofMode={mode === "proofread"}
              />
            </div>

            {selectedUnit && (
              <div className="sidebar-editor">
                <Editor
                  ref={editorRef}
                  key={selectedUnit.id}
                  indexInPage={selectedUnit.indexInPage}
                  isInsideBox={selectedUnit.isInbox}
                  symbols={customSymbols}
                  initialText={
                    mode === "proofread"
                      ? selectedUnit.proovedText ??
                        selectedUnit.translatedText ??
                        ""
                      : selectedUnit.translatedText ?? ""
                  }
                  onTextModify={handleTextModify}
                  onStatusClick={() => {
                    // 切换 isInbox 状态并保存
                    const newIsInbox = !selectedUnit.isInbox;
                    onUnitSave({ id: selectedUnit.id, isInbox: newIsInbox });
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
