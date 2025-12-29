import React, { useEffect, useRef, useState } from "react";
import "./Translator.css";
import ProgressBar from "../ProgressBar";
import { UnitList } from "./UnitList";
import Editor, { type EditorRef } from "./Editor";
import { Stage, type StageHandle } from "./Stage";
import { useSpecialSymbolsStore } from "../../store/specialSymbols";
import ConfirmDialogBox from "../ConfirmDialogBox";
import { useToast } from "../NotificationToast";
import { RefreshCw } from "lucide-react";
import type { Project, Page, Unit } from "../../models/project";
import { SpecialSymbolCard } from "./SpecialSymbolCard";

export type TranslatorMode = "translate" | "proofread" | "read";

export type TranslatorProps = {
  project: Project;
  currentPage: Page;
  isLoading: boolean;
  mode: TranslatorMode;
  isOffline: boolean;
  currentPageIndex: number;
  selectedUnitId?: string | null;
  isMeTranslator?: boolean;
  isMeProofreader?: boolean;
  onRequestPage: (pageIndex: number) => void;
  onUnitSave: (unit: Partial<Unit> & { id: string }) => void;
  onUnitRemove: (unitId: string) => void;
  onUnitSelect?: (unitId: string | null) => void;
  onRearrangeUnits?: (unitId: string, targetIndex: number) => void;
  // 父组件可注入该回调以接收强制刷新通知
  // TODO: 在父组件 TranslatorPage 内注入一个空实现以便后续实现刷新逻辑
  onFlush?: () => void;
  // `mode` is used as initial mode only; Translator owns its internal mode state
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
    >
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize="16" fill="#374151">♪</text>
    </svg>
  );
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

const MemoIcon: React.FC = () => {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#374151">?</text>
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

/**
 * 快捷键说明：
 * - Home: 取消选择单元
 * - Tab: 切换到下一个单元（循环）
 * - Shift+Tab: 切换到上一个单元（循环）
 * - ← : 上一页
 * - → : 下一页
 * - Ctrl+M: 在翻译和校对模式之间切换
 * - Ctrl+P: 确认校对该页
 * - 画布左键: 创建新单元（框内）
 * - 画布右键: 创建新单元（框外）
 * - Marker左键: 聚焦选中单元
 * - Marker右键: 删除单元（有文本时会弹窗确认）
 */

export const Translator: React.FC<TranslatorProps> = ({
  project,
  currentPage,
  mode,
  currentPageIndex,
  selectedUnitId,
  isMeTranslator: isMeTranslatorProp,
  isMeProofreader: isMeProofreaderProp,
  onRequestPage,
  onFlush,
  onUnitSelect,
  onUnitSave,
  onUnitRemove,
  onRearrangeUnits,
}) => {
  // Ensure `isMeProofreader` implicitly includes `isMeTranslator`.
  const isMeProofreader = isMeProofreaderProp ?? false;
  const isMeTranslator = isMeProofreader ? true : (isMeTranslatorProp ?? false);
  const { customSymbols, loadCustomSymbolsIfNeeded } = useSpecialSymbolsStore();
  const { showToast } = useToast();
  // `mode` prop is treated as initial mode only; Translator manages its own mode thereafter
  const [localMode, setLocalMode] = useState<TranslatorMode>(mode);
  const [editMode, setEditMode] = useState<TranslatorMode>(mode === "read" ? "translate" : mode);
  const [isRepositionMode, setIsRepositionMode] = useState<boolean>(false);
  const [pageInput, setPageInput] = useState<string>((currentPageIndex + 1).toString());
  const editorRef = useRef<EditorRef>(null);
  const stageRef = useRef<StageHandle>(null);

  const selectedUnit = currentPage.units.find((u) => u.id === selectedUnitId);
  const effectiveMode = localMode;
  const [showMemo, setShowMemo] = useState(false);
  const [showSymbolCard, setShowSymbolCard] = useState(false);

  // 抽离模式切换逻辑以供快捷键复用
  const toggleMode = () => {
    if (effectiveMode === "read") return;

    const next = editMode === "translate" ? "proofread" : "translate";
    setEditMode(next);
    setLocalMode(next);

    const labelMap: Record<TranslatorMode, string> = {
      translate: "翻译模式",
      proofread: "校对模式",
      read: "阅览模式",
    };

    showToast("success", `已切换到 ${labelMap[next]}`);
  };

  useEffect(() => {
    setPageInput((currentPageIndex + 1).toString());
  }, [currentPageIndex]);

  // 批量操作：确认校对所有单元（设 isProoved = true）
  const handleBulkConfirmProofAll = () => {
    for (const u of currentPage.units) {
      // 若单元有任何文本（翻译文本或校对文本），则可被标记为已校对
      const hasAnyText = ((u.translatedText ?? "") as string).toString().trim() !== "" ||
        ((u.proovedText ?? "") as string).toString().trim() !== "";

      if (!u.isProoved && hasAnyText) {
        onUnitSave({ id: u.id, isProoved: true });
      }
    }
  };

  // 复制单个 unit 的 translatedText 到 proovedText 并保存
  const handleCopyTranslatedToProof = (unitId: string) => {
    const u = currentPage.units.find((x) => x.id === unitId);
    if (!u) return;
    if (!u.translatedText) return;

    onUnitSave({ id: unitId, proovedText: u.translatedText });
  };

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

  // 当切换选中单元时，如果处于重定位模式则将画布居中到该单元
  useEffect(() => {
    if (isRepositionMode && selectedUnitId) {
      stageRef.current?.centerUnit(selectedUnitId);
    }
  }, [selectedUnitId, isRepositionMode]);

  // 处理创建新unit
  const handleUnitCreate = (unit: Omit<Unit, "id" | "indexInPage">) => {
    // 生成临时ID和索引
    const newId = `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newIndexInPage = currentPage.units.length;

    const newUnit: Unit = {
      ...unit,
      id: newId,
      indexInPage: newIndexInPage,
    };

    onUnitSave(newUnit);
    
    // 自动选中新创建的unit
    if (onUnitSelect) {
      onUnitSelect(newId);
    }
  };

  // 刷新按钮处理（占位）
  const handleRefreshClick = () => {
    if (typeof onRequestPage === "function") {
      // 由 Translator 自己发起刷新：重新请求当前页（即使索引相同）
      onRequestPage(currentPageIndex);
      showToast("success", "已刷新当前页");
      return;
    }

    // 如果父组件提供了 onFlush，则调用以通知父组件执行更强的刷新/重载逻辑
    if (typeof onFlush === "function") {
      onFlush();
      showToast("success", "已通知父组件执行强制刷新");
      return;
    }

    showToast("info", "刷新功能尚未配置");
  };

  // 重定位模式切换（占位）
  const handleRepositionToggle = () => {
    const next = !isRepositionMode;
    setIsRepositionMode(next);
    showToast("success", `重定位模式 ${next ? "已开启" : "已关闭"}`);

    // 如果开启并且已有选中单元，则将该单元居中
    if (next && selectedUnit) {
      stageRef.current?.centerUnit(selectedUnit.id);
    }
  };

  // 页码输入处理
  const handlePageInputChange = (v: string) => {
    setPageInput(v.replace(/[^0-9]/g, ""));
  };

  const submitPageInput = () => {
    const v = Number(pageInput);
    if (!Number.isInteger(v) || v < 1 || v > (project.pageCount ?? 1)) {
      showToast("error", `页码非法，请输入 1 到 ${project.pageCount ?? 1}`);
      setPageInput((currentPageIndex + 1).toString());
      return;
    }

    const targetIndex = v - 1;
    if (targetIndex !== currentPageIndex) {
      onRequestPage(targetIndex);
    }
  };

  const shortcuts: ShortcutConfig[] = [
    {
      key: "Home",
      handler: () => {
        if (onUnitSelect) {
          onUnitSelect(null);
        }

        // Home 额外重置视图
        stageRef.current?.resetView();
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
      key: "m",
      ctrl: true,
      handler: () => {
        toggleMode();
      },
      description: "切换模式 (Ctrl+M)",
    },
    {
      key: "l",
      ctrl: true,
      handler: () => {
        handleRepositionToggle();
      },
      description: "切换重定位模式 (Ctrl+L)",
    },
    {
      key: "p",
      ctrl: true,
      handler: () => {
        // 通过快捷键直接执行批量确认校对（等价于按下确认所有校对单元的确认操作）
        handleBulkConfirmProofAll();
      },
      description: "确认校对该页 (Ctrl+P)",
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
    {
      key: "ArrowLeft",
      handler: () => {
        if (!onRequestPage) return;

        const prev = Math.max(0, currentPageIndex - 1);
        if (prev !== currentPageIndex) {
          onRequestPage(prev);
        }
      },
      description: "上一页",
    },
    {
      key: "ArrowRight",
      handler: () => {
        if (!onRequestPage) return;

        const next = Math.min((project.pageCount ?? 1) - 1, currentPageIndex + 1);
        if (next !== currentPageIndex) {
          onRequestPage(next);
        }
      },
      description: "下一页",
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
  }, [onUnitSelect, selectedUnitId, currentPage.units, shortcuts]);

  const handleTextModify = (newText: string) => {
    if (!selectedUnit) return;

    console.log("[Translator] handleTextModify called, newText:", newText);

    if (effectiveMode === "translate") {
      onUnitSave({ id: selectedUnit.id, translatedText: newText });
    } else if (effectiveMode === "proofread") {
      onUnitSave({ id: selectedUnit.id, proovedText: newText });
    }
  };

  return (
    <>
      <div className="translator-container" data-is-me-translator={isMeTranslator} data-is-me-proofreader={isMeProofreader}>
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
          <div className="toolbox-pill" aria-label="翻译模式" title="翻译模式（Ctrl+M）">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setLocalMode("translate");
                setEditMode("translate");
                showToast("success", "已切换到 翻译模式");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLocalMode("translate");
                  setEditMode("translate");
                  showToast("success", "已切换到 翻译模式");
                }
              }}
              style={{ display: "inline-flex", cursor: "pointer" }}
            >
              <ModeIcon mode="translate" />
            </div>
          </div>

          <div className="toolbox-pill" aria-label="校对模式" title="校对模式（Ctrl+M）">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setLocalMode("proofread");
                setEditMode("proofread");
                showToast("success", "已切换到 校对模式");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLocalMode("proofread");
                  setEditMode("proofread");
                  showToast("success", "已切换到 校对模式");
                }
              }}
              style={{ display: "inline-flex", cursor: "pointer" }}
            >
              <ModeIcon mode="proofread" />
            </div>
          </div>

          <div className="toolbox-pill" aria-label="阅览模式" title="阅览模式">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setLocalMode("read");
                showToast("success", "已切换到 阅览模式");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLocalMode("read");
                  showToast("success", "已切换到 阅览模式");
                }
              }}
              style={{ display: "inline-flex", cursor: "pointer" }}
            >
              <ModeIcon mode="read" />
            </div>
          </div>

          <div
            className="toolbox-pill"
            aria-label="刷新"
            title="刷新"
            onClick={handleRefreshClick}
            style={{ cursor: "pointer" }}
          >
            <RefreshCw size={18} color="#374151" />
          </div>

          <div
            className="toolbox-pill"
            aria-label="导出"
            title="导出"
            onClick={() => {
              // TODO: implement export functionality
            }}
            style={{ cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <div
            className="toolbox-pill"
            aria-label="重定位模式"
            title="切换重定位模式（Ctrl+L）"
            onClick={handleRepositionToggle}
            style={{ cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="2" fill="#374151" />
            </svg>
          </div>

          

          <div
            className="toolbox-pill"
            aria-label="特殊符号"
            title="特殊符号"
            onClick={() => setShowSymbolCard(true)}
            style={{ cursor: "pointer" }}
          >
            <NoteIcon />
          </div>

          <div className="toolbox-pill" aria-label="快捷键说明" title="快捷键说明" onClick={() => setShowMemo(true)} style={{ cursor: 'pointer' }}>
            <MemoIcon />
          </div>

          {/* prev / next moved to the right to sit near page indicator */}
          {(() => {
            const isPrevDisabled = currentPageIndex <= 0;
            const isNextDisabled = currentPageIndex >= (project.pageCount ?? 1) - 1;

            return (
              <>
                <div
                  className="toolbox-pill"
                  aria-label="上一页"
                  title="上一页 (←)"
                  onClick={() => {
                    if (isPrevDisabled) return;

                    const prev = Math.max(0, currentPageIndex - 1);
                    if (prev !== currentPageIndex) {
                      onRequestPage(prev);
                    }
                  }}
                  style={{ cursor: isPrevDisabled ? "default" : "pointer", opacity: isPrevDisabled ? 0.4 : 1, pointerEvents: isPrevDisabled ? "none" : "auto" }}
                >
                  <ArrowButton direction="prev" />
                </div>

                <div
                  className="toolbox-pill"
                  aria-label="下一页"
                  title="下一页 (→)"
                  onClick={() => {
                    if (isNextDisabled) return;

                    const next = Math.min((project.pageCount ?? 1) - 1, currentPageIndex + 1);
                    if (next !== currentPageIndex) {
                      onRequestPage(next);
                    }
                  }}
                  style={{ cursor: isNextDisabled ? "default" : "pointer", opacity: isNextDisabled ? 0.4 : 1, pointerEvents: isNextDisabled ? "none" : "auto" }}
                >
                  <ArrowButton direction="next" />
                </div>
              </>
            );
          })()}
        </div>

        <div className="page-indicator" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            aria-label="输入页码"
            value={pageInput}
            onChange={(e) => handlePageInputChange(e.target.value)}
            onBlur={() => submitPageInput()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitPageInput();
              }
            }}
            style={{ width: 48, padding: "2px 6px", borderRadius: 4, border: "1px solid #e5e7eb", textAlign: "center" }}
          />
          <span>/</span>
          <span>{project.pageCount}</span>
        </div>
      </div>

      {/* 主体区域 */}
      <div className="translator-body">
        {/* 中间画布区 */}
        <div className="translator-stage">
          <Stage
            ref={stageRef}
            page={currentPage}
            mode={effectiveMode}
            selectedUnitId={selectedUnitId}
            onUnitClick={onUnitSelect}
            onUnitCreate={handleUnitCreate}
            onUnitRemove={onUnitRemove}
            onUnitMoveEnd={(unitId, x, y) => {
              // 持久化单元位置变更为 patch
              onUnitSave({ id: unitId, x, y });
            }}
          />
        </div>

        {/* 右侧侧边栏 */}
        <div className={`translator-sidebar ${effectiveMode === 'read' ? 'hidden' : ''}`}>
          <div className="sidebar-unitlist">
            <UnitList
              page={currentPage}
              onUnitClick={onUnitSelect}
              selectedUnitId={selectedUnitId}
              isProofMode={effectiveMode === "proofread"}
              onCopyTranslatedToProof={handleCopyTranslatedToProof}
              onBulkConfirmProofAll={handleBulkConfirmProofAll}
            />
          </div>

          {selectedUnit && isMeProofreader && (
            <div className="sidebar-editor">
              <Editor
                ref={editorRef}
                key={selectedUnit.id}
                indexInPage={selectedUnit.indexInPage}
                isInsideBox={selectedUnit.isInbox}
                symbols={customSymbols}
                initialText={
                  effectiveMode === "proofread"
                    ? selectedUnit.proovedText ??
                      selectedUnit.translatedText ??
                      ""
                    : selectedUnit.translatedText ?? ""
                }
                totalUnits={currentPage.units.length}
                onTextModify={handleTextModify}
                onStatusClick={() => {
                  // 切换 isInbox 状态并保存
                  const newIsInbox = !selectedUnit.isInbox;
                  onUnitSave({ id: selectedUnit.id, isInbox: newIsInbox });
                }}
                onIndexChange={(targetIndex) => {
                  if (!onRearrangeUnits) return;

                  onRearrangeUnits(selectedUnit.id, targetIndex);
                }}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      <ConfirmDialogBox
        visible={showMemo}
        title="快捷键说明"
        description={SHORTCUT_TEXT}
        confirmText="确认"
        onConfirm={() => setShowMemo(false)}
      />

      <SpecialSymbolCard
        visible={showSymbolCard}
        onClose={() => setShowSymbolCard(false)}
      />
    </>
  );
};

// Shortcut description text used in memo card
const SHORTCUT_TEXT = `快捷键说明：\n- Home: 恢复归中\n- Tab: 切换到下一个单元\n- Shift+Tab: 切换到上一个单元\n- Ctrl+M: 在翻译和校对模式之间切换\n- 左键空白: 创建新框内\n- 右键空白: 创建新框外\n- 左键标记: 聚焦\n- 右键标记: 删除标记`;
