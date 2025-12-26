import React, { useEffect, useRef } from "react";
import "./UnitList.css";
import type { Page } from "../../models/translator";

type UnitListProps = {
  page: Page;
  onUnitClick?: (unitId: string | null) => void;
  selectedUnitId?: string | null;
  isProofMode?: boolean;
};

export const UnitList: React.FC<UnitListProps> = ({ page, onUnitClick, selectedUnitId, isProofMode = false }) => {
  const listContentRef = useRef<HTMLDivElement>(null);

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

  // 计算统计数据
  const total = page.units.length;
  const unTranslated = total - page.translatedUnitCount;
  const unProoved = page.translatedUnitCount - page.proovedUnitCount;
  const prooved = page.proovedUnitCount;

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
            <span>框内 {page.inboxUnitCount}</span>
            <span className="divider">|</span>
            <span>框外 {page.outboxUnitCount}</span>
          </div>

          {/* 右侧统计标签 */}
          <div className="status-tags">
            <span className="tag tag-gray">未翻译 {unTranslated}</span>
            <span className="tag tag-orange">待校对 {unProoved}</span>
            <span className="tag tag-green">已完成 {prooved}</span>
          </div>
        </div>
      </div>

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
            if (isProofMode && unit.translatedText && unit.proovedText) {
              return (
                <div className="unit-content-dual">
                  <div className="translated-text">{unit.translatedText}</div>
                  <div className="divider-line"></div>
                  <div className="proofed-text">{unit.proovedText}</div>
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
