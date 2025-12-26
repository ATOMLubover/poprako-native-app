import React from "react";
import "./Marker.css";
import type { Unit } from "../../models/translator";
import type { TranslatorMode } from "./Translator";

type MarkerProps = {
  unit: Unit;
  imageRenderInfo: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
  };
  mode: TranslatorMode;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: () => void;
};

export const Marker: React.FC<MarkerProps> = ({
  unit,
  imageRenderInfo,
  mode,
  isSelected,
  onClick,
  onRemove,
}) => {
  // 基础大小（像素）
  const BASE_CIRCLE_SIZE = 32;
  const BASE_DOT_SIZE = 8;

  // 计算抗缩放后的实际大小（只对userScale进行抗缩放，保持fitScale的影响）
  // 这样Marker会随着初始适应缩放，但不会随着用户缩放而变化
  const circleSize = BASE_CIRCLE_SIZE;
  const dotSize = BASE_DOT_SIZE;

  // 计算Marker定位点在图片上的像素位置（相对于图片左上角）
  const markerXOnImage = unit.x * imageRenderInfo.width;
  const markerYOnImage = unit.y * imageRenderInfo.height;

  // 计算Marker定位点在屏幕上的位置
  const pointScreenX = imageRenderInfo.left + markerXOnImage;
  const pointScreenY = imageRenderInfo.top + markerYOnImage;

  // 计算Marker容器的左上角位置
  // 圆圈在点的上方，圆圈和点之间有-1px的margin
  const totalHeight = circleSize + dotSize - 1;
  const containerLeft = pointScreenX - circleSize / 2;
  const containerTop = pointScreenY - totalHeight;

  // 确定状态
  const hasTranslated = !!unit.translatedText;
  const isProoved = unit.isProoved;

  // 根据模式确定边框颜色
  let borderColor = "transparent";
  if (mode === "translate" && hasTranslated) {
    borderColor = "#10b981";
  } else if (mode === "proofread" && isProoved) {
    borderColor = "#10b981";
  }

  // 背景色：inbox粉色，outbox黄色
  const backgroundColor = unit.isInbox ? "#fce7f3" : "#fef3c7";

  // 处理右键删除
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onRemove) return;

    // 如果有文本内容，弹窗确认
    const hasContent = unit.translatedText || unit.proovedText;
    if (hasContent) {
      const confirmed = window.confirm(
        `该单元包含文本内容，确定要删除吗？\n\n${unit.translatedText || unit.proovedText || ""}`
      );
      if (!confirmed) return;
    }

    onRemove();
  };

  // 处理左键点击
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className={`marker ${isSelected ? "marker-selected" : ""}`}
      style={{
        left: `${containerLeft}px`,
        top: `${containerTop}px`,
        width: `${circleSize}px`,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 圆圈 */}
      <div
        className="marker-circle"
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          backgroundColor,
          borderColor,
        }}
      >
        <span className="marker-index">{unit.indexInPage + 1}</span>
      </div>

      {/* 定位点 */}
      <div
        className="marker-pointer"
        style={{
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          backgroundColor,
        }}
      ></div>
    </div>
  );
};
