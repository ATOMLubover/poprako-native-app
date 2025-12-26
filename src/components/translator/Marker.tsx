import React, { useState } from "react";
import "./Marker.css";
import type { Unit } from "../../models/translator";
import type { TranslatorMode } from "./Translator";
import ConfirmDialogBox from "../ConfirmDialogBox";

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

  // 计算尺寸与位置
  const circleSize = BASE_CIRCLE_SIZE;
  const dotSize = BASE_DOT_SIZE;
  const markerXOnImage = unit.x * imageRenderInfo.width;
  const markerYOnImage = unit.y * imageRenderInfo.height;
  const pointScreenX = imageRenderInfo.left + markerXOnImage;
  const pointScreenY = imageRenderInfo.top + markerYOnImage;
  const totalHeight = circleSize + dotSize - 1;
  const containerLeft = pointScreenX - circleSize / 2;
  const containerTop = pointScreenY - totalHeight;

  // 状态与样式
  const hasTranslated = !!unit.translatedText;
  const isProoved = unit.isProoved;
  let borderColor = "transparent";
  if (mode === "translate" && hasTranslated) {
    borderColor = "#10b981";
  } else if (mode === "proofread" && isProoved) {
    borderColor = "#10b981";
  }
  const backgroundColor = unit.isInbox ? "#fce7f3" : "#fef3c7";

  // 确认对话框控制
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onRemove) return;

    const hasContent = unit.translatedText || unit.proovedText;
    if (hasContent) {
      setConfirmVisible(true);
      return;
    }

    onRemove();
  };

  const handleConfirm = () => {
    setConfirmVisible(false);
    onRemove?.();
  };

  const handleCancel = () => {
    setConfirmVisible(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <>
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

      {confirmVisible && (
        <ConfirmDialogBox
          visible={confirmVisible}
          title="确认删除有内容的单元"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
