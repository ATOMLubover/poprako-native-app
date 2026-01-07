import React, { useState, useRef, useEffect } from "react";
import "./Marker.css";
import { firstNonEmpty } from "../../util/string";
import type { Unit } from "../../models/project";
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
  const hasTranslated = (firstNonEmpty(unit.translatedText) ?? "").toString().trim() !== "";
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

  // 拖拽实现
  const draggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 }); // 记录拖动开始的鼠标位置
  const dragThresholdExceededRef = useRef(false); // 是否已超过拖动死区
  const markerDragOffset = useRef({ x: 0, y: 0 });
  const dragSuppressClickRef = useRef(false);
  const [dragScreenPos, setDragScreenPos] = useState<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 6; // px，拖动死区

  const handleWindowMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;

    // 检查是否超过死区
    if (!dragThresholdExceededRef.current) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > DRAG_THRESHOLD) {
        dragThresholdExceededRef.current = true;
        onMoveStart?.(); // 真正开始拖动时才触发
      } else {
        // 未超过死区，不执行拖动
        return;
      }
    }

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

    const wasRealDrag = dragThresholdExceededRef.current;

    draggingRef.current = false;
    dragThresholdExceededRef.current = false;

    // 只有真正拖动过才触发 onMoveEnd
    if (wasRealDrag) {
      const pointerX = e.clientX - markerDragOffset.current.x;
      const pointerY = e.clientY - markerDragOffset.current.y;

      const relX = (pointerX - imageRenderInfo.left) / imageRenderInfo.width;
      const relY = (pointerY - imageRenderInfo.top) / imageRenderInfo.height;

      const clamp = (v: number) => Math.max(0, Math.min(1, v));

      const nx = clamp(relX);
      const ny = clamp(relY);

      onMoveEnd?.(nx, ny);

      // 抑制随后的 click/contextmenu
      dragSuppressClickRef.current = true;
      setTimeout(() => {
        dragSuppressClickRef.current = false;
      }, 0);
    }

    setDragScreenPos(null);

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

    const hasContent = !!firstNonEmpty(unit.translatedText, unit.proovedText);
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

    // 记录拖动开始的鼠标位置
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragThresholdExceededRef.current = false;

    // 计算指针到 marker 中心的偏移（使拖拽看起来更自然）
    const pointerX = imageRenderInfo.left + unit.x * imageRenderInfo.width;
    const pointerY = imageRenderInfo.top + unit.y * imageRenderInfo.height;

    markerDragOffset.current = {
      x: e.clientX - pointerX,
      y: e.clientY - pointerY,
    };

    draggingRef.current = true;
    // onMoveStart 移到真正开始拖动时调用

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
                {firstNonEmpty(unit.proovedText, unit.translatedText) ?? "-"}
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
          <span className="marker-index">{unit.indexInPage}</span>
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
