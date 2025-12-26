import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import "./Stage.css";
import ImageLayer, { type ImageLayerHandle } from "./ImageLayer.tsx";
import MarkerOverlay from "./MarkerOverlay.tsx";
import DotLoadSpinner from "../DotLoadSpinner";
import type { Page, Unit } from "../../models/translator";
import type { TranslatorMode } from "./Translator";

export type StageHandle = {
  resetView: () => void;
};

type StageProps = {
  page: Page;
  mode: TranslatorMode;
  selectedUnitId?: string | null;
  onUnitClick?: (unitId: string) => void;
  onUnitCreate?: (unit: Omit<Unit, "id" | "indexInPage">) => void;
  onUnitRemove?: (unitId: string) => void;
};

export const Stage = forwardRef<StageHandle, StageProps>(({ page, mode, selectedUnitId, onUnitClick, onUnitCreate, onUnitRemove }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<ImageLayerHandle>(null);
  const [imageRenderInfo, setImageRenderInfo] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    scale: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = page.localImageUrl || page.remoteImageUrl;

  useImperativeHandle(ref, () => ({
    resetView() {
      imageLayerRef.current?.resetView();
    },
  }));

  const handleImageRenderUpdate = (info: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
  }) => {
    setImageRenderInfo(info);
    if (isLoading) {
      setIsLoading(false);
    }
  };

  // 处理画布点击事件（创建新unit）
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!onUnitCreate || !containerRef.current || isLoading) return;

    // 只处理直接点击画布的情况（不是点击marker）
      // 允许子元素（如 image-layer 的空白区域）触发创建，
      // 但 Marker 会阻止事件传播，所以不需要检查 e.target

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 计算点击位置在图片上的相对坐标
    const relativeX = (clickX - imageRenderInfo.left) / imageRenderInfo.width;
    const relativeY = (clickY - imageRenderInfo.top) / imageRenderInfo.height;

    // 检查是否在图片范围内
    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
      return;
    }

    // 左键创建inbox，右键创建outbox
    const isInbox = e.button === 0;

    onUnitCreate({
      x: relativeX,
      y: relativeY,
      isInbox,
      isProoved: false,
    });
  };

  // 处理画布右键点击
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handleCanvasClick(e);
  };

  // 阅读模式隐藏Marker
  const showMarkers = mode !== "read";

  return (
    <div
      className="stage"
      ref={containerRef}
    >
      {isLoading && (
        <div className="stage-loading">
          <DotLoadSpinner />
        </div>
      )}

      {imageUrl && (
        <>
          <ImageLayer
            ref={imageLayerRef}
            imageUrl={imageUrl}
            onRenderUpdate={handleImageRenderUpdate}
            onCanvasClick={handleCanvasClick}
            onCanvasContextMenu={handleCanvasContextMenu}
          />

          {showMarkers && !isLoading && (
            <MarkerOverlay
              units={page.units}
              imageRenderInfo={imageRenderInfo}
              mode={mode}
              selectedUnitId={selectedUnitId}
              onUnitClick={onUnitClick}
              onUnitRemove={onUnitRemove}
            />
          )}
        </>
      )}

      {!imageUrl && !isLoading && (
        <div className="stage-placeholder">
          <div>无图片</div>
        </div>
      )}
    </div>
  );
});
