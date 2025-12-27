import React, { useState, useRef, useEffect } from "react";
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
  onMoveStart?: () => void;
  onMove?: (x: number, y: number) => void;
  onMoveEnd?: (x: number, y: number) => void;
};

export const Marker: React.FC<MarkerProps> = ({
  unit,
  imageRenderInfo,
  mode,
  isSelected,
  onClick,
  onRemove,
  onMoveStart,
  onMove,
  onMoveEnd,
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
  const hasBorder = borderColor !== "transparent";

  // 确认对话框控制
  const [confirmVisible, setConfirmVisible] = useState(false);

  // 拖拽实现（参考 Vue 样板：按下即进入拖拽）
  const draggingRef = useRef(false);
  const markerDragOffset = useRef({ x: 0, y: 0 });
  const dragSuppressClickRef = useRef(false);
  const [dragScreenPos, setDragScreenPos] = useState<{ x: number; y: number } | null>(null);

  const handleWindowMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;

    const pointerX = e.clientX - markerDragOffset.current.x;
    const pointerY = e.clientY - markerDragOffset.current.y;

    const relX = (pointerX - imageRenderInfo.left) / imageRenderInfo.width;
    const relY = (pointerY - imageRenderInfo.top) / imageRenderInfo.height;

    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    const nx = clamp(relX);
    const ny = clamp(relY);

    onMove?.(nx, ny);

    // 将可视位置设置为计算出的 marker 屏幕位置（基于 pointerX/pointerY），
    // 避免直接使用鼠标位置带来的偏移错误。
    setDragScreenPos({ x: pointerX, y: pointerY });
  };

  const handleWindowMouseUp = (e: MouseEvent) => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    const pointerX = e.clientX - markerDragOffset.current.x;
    const pointerY = e.clientY - markerDragOffset.current.y;

    const relX = (pointerX - imageRenderInfo.left) / imageRenderInfo.width;
    const relY = (pointerY - imageRenderInfo.top) / imageRenderInfo.height;

    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    const nx = clamp(relX);
    const ny = clamp(relY);

    onMoveEnd?.(nx, ny);

    setDragScreenPos(null);

    // 抑制随后的 click/contextmenu
    dragSuppressClickRef.current = true;
    setTimeout(() => {
      dragSuppressClickRef.current = false;
    }, 0);

    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragSuppressClickRef.current) {
      dragSuppressClickRef.current = false;
      return;
    }

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
    if (dragSuppressClickRef.current) {
      dragSuppressClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    e.stopPropagation();
    onClick();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 仅左键

    e.stopPropagation();

    // 计算指针到 marker 中心的偏移（使拖拽看起来更自然）
    const pointerX = imageRenderInfo.left + unit.x * imageRenderInfo.width;
    const pointerY = imageRenderInfo.top + unit.y * imageRenderInfo.height;

    markerDragOffset.current = {
      x: e.clientX - pointerX,
      y: e.clientY - pointerY,
    };

    draggingRef.current = true;
    onMoveStart?.();

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // 如果不是拖拽状态，正常处理 mouseup
    if (!draggingRef.current) return;

    // 手动合并一次结束逻辑（兼容在元素上释放的情况）
    handleWindowMouseUp(new MouseEvent("mouseup", { clientX: e.clientX, clientY: e.clientY }));
  };

  return (
    <>
      {mode === "proofread" && isSelected && (
        (() => {
          // 预览框固定展示在 marker 右侧，左上角锚定到 marker 的 top-right + GAP
          const markerLeft = dragScreenPos ? (dragScreenPos.x - circleSize / 2) : containerLeft;
          const markerTop = dragScreenPos ? (dragScreenPos.y - totalHeight) : containerTop;
          const markerRight = markerLeft + circleSize;
          const GAP = 4; // 预览与 marker 之间的间隙（像素）

          const previewLeft = markerRight + GAP;
          const previewTop = markerTop; // 固定为与 marker 顶端对齐，向下扩展不会覆盖 marker

          return (
            <div className="marker-preview" style={{ left: `${previewLeft}px`, top: `${previewTop}px` }}>
              <div className="marker-preview-content">
                {unit.proovedText ?? unit.translatedText ?? "-"}
              </div>
            </div>
          );
        })()
      )}
      <div
        className={`marker ${isSelected ? "marker-selected" : ""} ${dragScreenPos ? "marker-dragging" : ""} ${hasBorder ? "marker-has-border" : ""}`}
        style={{
          left: `${dragScreenPos ? dragScreenPos.x - circleSize / 2 : containerLeft}px`,
          top: `${dragScreenPos ? dragScreenPos.y - totalHeight : containerTop}px`,
          width: `${circleSize}px`,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* 圆圈 */}
        <div
          className="marker-circle"
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            backgroundColor,
            borderColor,
            ["--marker-border-color" as any]: borderColor,
          } as React.CSSProperties}
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
