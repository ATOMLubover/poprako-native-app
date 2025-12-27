import React, { useEffect, useRef, useState } from "react";
import "./UnitList.css";
import type { Page } from "../../models/translator";
import ConfirmDialogBox from "../ConfirmDialogBox";

type UnitListProps = {
  page: Page;
  onUnitClick?: (unitId: string | null) => void;
  selectedUnitId?: string | null;
  isProofMode?: boolean;
  onCopyTranslatedToProof?: (unitId: string) => void;
  onBulkConfirmProofAll?: () => void;
};

export const UnitList: React.FC<UnitListProps> = ({ page, onUnitClick, selectedUnitId, isProofMode = false, onCopyTranslatedToProof, onBulkConfirmProofAll }) => {
  const listContentRef = useRef<HTMLDivElement>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (!listContentRef.current) return;

    const textareas = listContentRef.current.querySelectorAll(".unit-textarea");

    textareas.forEach((textarea) => {
      const element = textarea as HTMLTextAreaElement;
      element.style.height = "0px";
      element.style.height = element.scrollHeight + "px";
    });
  }, [page.units]);

  // 计算统计数据（仅逻辑，保留现有 JSX/样式不变）
  const total = page.units.length;

  // 已完成：所有 isProoved === true 的单元数
  const proovedCount = page.units.filter((u) => !!u.isProoved).length;

  // 待校对：严格定义为 总数 - 已完成
  const unProoved = total - proovedCount;

  // 已完成（用于显示）
  const prooved = proovedCount;

  // 未翻译：既没有 translatedText 也没有 proovedText 的单元数
  const unTranslated = page.units.filter((u) => {
    const hasTranslated = ((u.translatedText ?? "") as string).toString().trim() !== "";
    const hasProovedText = ((u.proovedText ?? "") as string).toString().trim() !== "";
    return !hasTranslated && !hasProovedText;
  }).length;

  const inboxCount = page.units.filter((u) => !!u.isInbox).length;
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
            <span className="tag tag-green">已完成 {prooved}</span>
          </div>
        </div>
      </div>
      {/* 批量操作（仅校对模式可见） */}
      {isProofMode && (
        <div className="list-actions">
          <button
            className="action-button action-button--danger"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmVisible(true);
            }}
          >
            确认校对所有单元
          </button>
        </div>
      )}

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
        {page.units.map((unit) => {
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
                        <div className="translated-text">{unit.translatedText}</div>
                        <button
                          className="copy-button"
                          title="复制到校对文本"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyTranslatedToProof?.(unit.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <rect x="4" y="4" width="11" height="11" rx="2" />
                          </svg>
                        </button>
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

            return <textarea className="unit-textarea" readOnly value={displayText} />;
          };

          return (
            <div
              key={unit.id}
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
      </div>
    </div>
  );
};
