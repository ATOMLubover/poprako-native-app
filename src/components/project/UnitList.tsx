import React, { useEffect, useRef, useState } from "react";
import "./UnitList.css";
import type { Unit } from "../../models/project";
import ConfirmDialogBox from "../ConfirmDialogBox";

type UnitListProps = {
  units: Unit[];
  onUnitClick?: (unitId: string | null) => void;
  selectedUnitId?: string | null;
  isProofMode?: boolean;
  onCopyTranslatedToProof?: (unitId: string) => void;
  onBulkConfirmProofAll?: () => void;
};

export const UnitList: React.FC<UnitListProps> = ({ units, onUnitClick, selectedUnitId, isProofMode = false, onBulkConfirmProofAll }) => {
  const listContentRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);

  // 自动调整 textarea 高度（使用每项 ref，确保在文本更新时也能生效）
  const _contentKey = units.map((u) => `${u.id}:${u.translatedText ?? ""}:${u.proovedText ?? ""}`).join("|");

  const resizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;

    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    units.forEach((u) => {
      const el = textareaRefs.current[u.id];
      resizeTextarea(el);
    });
    // 当文本、数量或模式变化时统一重新计算
  }, [_contentKey, units.length, isProofMode]);

  // 当选中单元变化时，自动滚动到可视区域
  useEffect(() => {
    if (!selectedUnitId || !listContentRef.current) return;

    const selectedElement = listContentRef.current.querySelector(`[data-unit-id="${selectedUnitId}"]`);

    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedUnitId]);

  // 计算统计数据（仅逻辑，保留现有 JSX/样式不变）
  const total = units.length;

  // 已完成：所有 isProoved === true 的单元数
  const proovedCount = units.filter((u) => !!u.isProoved).length;

  // 待校对：严格定义为 总数 - 已完成
  const unProoved = total - proovedCount;

  // 已完成（用于显示）
  const prooved = proovedCount;

  // 未翻译：既没有 translatedText 也没有 proovedText 的单元数
  const unTranslated = units.filter((u) => {
    const hasTranslated = ((u.translatedText ?? "") as string).toString().trim() !== "";
    const hasProovedText = ((u.proovedText ?? "") as string).toString().trim() !== "";
    return !hasTranslated && !hasProovedText;
  }).length;

  const inboxCount = units.filter((u) => !!u.isInbox).length;
  const outboxCount = total - inboxCount;

  const handleUnitClick = (unitId: string) => {
    if (onUnitClick) {
      if (unitId === selectedUnitId) {
        onUnitClick(null);
      } else {
        onUnitClick(unitId);
      }
    }
  };

  return (
    <div className="unit-list">
      {/* 列表头部 */}
      <div className="list-header">
        <div className="header-content">
          {/* 左侧框计数 */}
          <div className="box-stats">
            <span>框内 {inboxCount}</span>
            <span className="divider">|</span>
            <span>框外 {outboxCount}</span>
          </div>

          {/* 右侧统计标签 */}
          <div className="status-tags">
            <span className="tag tag-gray">未翻译 {unTranslated}</span>
            <span className="tag tag-orange">待校对 {unProoved}</span>
            <span className="tag tag-green">已校对 {prooved}</span>
          </div>
        </div>
      </div>
      {/* 列表内容 */}

      {/* 确认对话框 */}
      <ConfirmDialogBox
        visible={!!confirmVisible}
        title="确认校对所有单元"
        description="此操作会将所有单元标记为已校对，是否继续？"
        confirmText="确认"
        cancelText="取消"
        onConfirm={() => {
          onBulkConfirmProofAll?.();
          setConfirmVisible(false);
        }}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* 列表内容 */}
      <div className="list-content" ref={listContentRef}>
        {units.map((unit) => {
          const hasText = !!(unit.proovedText || unit.translatedText);

          // 确定状态颜色
          let statusClass = "status-empty";
          if (unit.isProoved) {
            statusClass = "status-prooved";
          } else if (hasText) {
            statusClass = "status-pending";
          }

          // 确定索引类型
          const indexClass = unit.isInbox ? "index-inbox" : "index-outbox";

          // 是否选中
          const isSelected = unit.id === selectedUnitId;

          // 渲染内容
          const renderContent = () => {
            const hasTranslated = (unit.translatedText ?? "").toString().trim() !== "";
            const hasProoved = (unit.proovedText ?? "").toString().trim() !== "";

            if (isProofMode) {
              return (
                <div className="unit-content-dual">
                  {/* 1. 如果有 translatedText，则显示 translated-row */}
                  {hasTranslated ? (
                    <>
                      <div className="translated-row">
                        <div className={`translated-text ${hasProoved ? "translated-text--muted" : ""}`}>{unit.translatedText}</div>
                        {/*
                        <button
                          className="copy-button"
                          title="复制到校对文本"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyTranslatedToProof?.(unit.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="9" y="9" width="10" height="10" rx="2" />
                            <rect x="4" y="4" width="10" height="10" rx="2" />
                          </svg>
                        </button>
                        */}
                      </div>

                      {hasProoved ? <div className="divider-line" /> : null}
                    </>
                  ) : null}

                  {/* 3-4. proofed text 显示逻辑 */}
                  {hasProoved ? (
                    <div className="proofed-text">{unit.proovedText}</div>
                  ) : (
                    // 没有 proovedText 的两种情况：
                    // - 如果没有 translatedText：显示 '_'（占位）
                    // - 如果有 translatedText：略去不显示
                    !hasTranslated ? <div className="proofed-text">-</div> : null
                  )}
                </div>
              );
            }

            const displayText = unit.proovedText || unit.translatedText || "-";

            return (
              <textarea
                className="unit-textarea"
                readOnly
                value={displayText}
                ref={(el) => {
                  textareaRefs.current[unit.id] = el;
                  // 立即调整新挂载/更新的 textarea 高度，避免切换模式后高度未更新
                  if (el) {
                    el.style.height = "0px";
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
              />
            );
          };

          return (
            <div
              key={unit.id}
              data-unit-id={unit.id}
              className={`unit-item ${statusClass} ${isSelected ? "selected" : ""}`}
              onClick={() => handleUnitClick(unit.id)}
            >
              <div className={`unit-index ${indexClass}`}>
                {unit.indexInPage + 1}
              </div>
              <div className="unit-content">
                {renderContent()}
              </div>
            </div>
          );
        })}

        {/* 将批量确认作为列表最后一项展示（仅在校对模式且存在单元时） */}
        {isProofMode && units.length > 0 ? (
          <div
            className={`unit-item bulk-action unit-item--transparent`}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmVisible(true);
            }}
          >
            <div className={`unit-index`} />
            <div className="unit-content">
              <button
                className="action-button action-button--danger"
                title={"确认校对所有单元 (Ctrl+P)"}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmVisible(true);
                }}
              >
                确认校对所有单元
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
