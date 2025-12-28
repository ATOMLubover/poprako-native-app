import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import "./ImageLayer.css";
import { getLocalImage, getRemoteImage } from "../../store/image";
import DotLoadSpinner from "../DotLoadSpinner";

export type ImageLayerHandle = {
  resetView: () => void;
  // 将图片上的相对点（0-1）平移到容器中心
  centerOn: (relativeX: number, relativeY: number) => void;
};

type ImageLayerProps = {
  imageUrl: string;
  onRenderUpdate: (info: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
  }) => void;
  onCanvasClick?: (e: React.MouseEvent) => void;
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
};

const ZOOM_STEP = 0.08; // 每次滚轮的乘法缩放步长（降低灵敏度）
const MAX_SCALE = 5; // 最大放大倍数（相对于fitScale）

const ImageLayer = forwardRef<ImageLayerHandle, ImageLayerProps>(({ imageUrl, onRenderUpdate, onCanvasClick, onCanvasContextMenu }, ref) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const contextMenuHandledRef = useRef(false);
  const DRAG_THRESHOLD = 5; // px
  
  // 图片的自然尺寸
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  
  // 前端最终用于 <img> 的 src（可能是原始 URL，也可能是 base64 data URL）
  const [srcToUse, setSrcToUse] = useState<string>("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  
  // 初始适应缩放比例
  const [fitScale, setFitScale] = useState(1);
  
  // 用户操作的缩放和平移
  const [userScale, setUserScale] = useState(1);
  const [userOffset, setUserOffset] = useState({ x: 0, y: 0 });

  // 计算并通知渲染信息
  const updateRenderInfo = () => {
    if (!containerRef.current || naturalSize.width === 0) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 计算最终渲染尺寸（基础缩放 × 用户缩放）
    const renderWidth = naturalSize.width * fitScale * userScale;
    const renderHeight = naturalSize.height * fitScale * userScale;

    // 计算总缩放
    const totalScale = fitScale * userScale;

    // 计算图片左上角在容器中的位置
    // 默认居中，然后应用用户偏移
    const left = containerWidth / 2 - renderWidth / 2 + userOffset.x;
    const top = containerHeight / 2 - renderHeight / 2 + userOffset.y;

    onRenderUpdate({
      width: renderWidth,
      height: renderHeight,
      left,
      top,
      scale: totalScale,
    });
  };

  // 基于给定的 userScale 和 userOffset 计算渲染信息（用于在事件中即时通知）
  const computeRenderInfo = (scale: number, offset: { x: number; y: number }) => {
    if (!containerRef.current || naturalSize.width === 0) return null;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const renderWidth = naturalSize.width * fitScale * scale;
    const renderHeight = naturalSize.height * fitScale * scale;
    const totalScale = fitScale * scale;

    const left = containerWidth / 2 - renderWidth / 2 + offset.x;
    const top = containerHeight / 2 - renderHeight / 2 + offset.y;

    return {
      width: renderWidth,
      height: renderHeight,
      left,
      top,
      scale: totalScale,
    };
  };

  // 当任何影响渲染的状态变化时，更新渲染信息
  useEffect(() => {
    updateRenderInfo();
  }, [naturalSize, fitScale, userScale, userOffset]);

  useImperativeHandle(ref, () => ({
    resetView() {
      if (naturalSize.width === 0) return;

      setUserScale(1);
      setUserOffset({ x: 0, y: 0 });
    },
    centerOn(relativeX: number, relativeY: number) {
      if (!containerRef.current || naturalSize.width === 0) return;
      const renderWidth = naturalSize.width * fitScale * userScale;
      const renderHeight = naturalSize.height * fitScale * userScale;

      const newOffsetX = renderWidth * (0.5 - relativeX);
      const newOffsetY = renderHeight * (0.5 - relativeY);

      setUserOffset({ x: newOffsetX, y: newOffsetY });

      const info = computeRenderInfo(userScale, { x: newOffsetX, y: newOffsetY });
      if (info) {
        onRenderUpdate(info);
      }
    },
  }));

  // 判断是否为本地操作系统绝对路径
  const isAbsoluteOsPath = (p: string) => {
    if (!p) return false;
    if (p.startsWith("file://")) return true;
    // Windows: C:\ or C:/
    if (/^[a-zA-Z]:[\\\/]/.test(p)) return true;
    // Unix: /foo/bar
    if (p.startsWith("/")) return true;
    // UNC path like \\\\server\\share
    if (p.startsWith("\\\\")) return true;
    return false;
  };

  // 当 imageUrl 改变时：如果是本地绝对路径则通过 IPC 获取 base64 data URL；否则直接使用
  useEffect(() => {
    let cancelled = false;

    if (isAbsoluteOsPath(imageUrl)) {
      setIsLoadingImage(true);
      setSrcToUse("");

      getLocalImage(imageUrl)
        .then((result) => {
          if (!cancelled) {
            setSrcToUse(result.objectUrl);
            setIsLoadingImage(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load local image:", err);
          if (!cancelled) {
            setSrcToUse("");
            setIsLoadingImage(false);
          }
        });
    } else if (/^https?:\/\//i.test(imageUrl)) {
      // remote URL: try proxying via IPC to avoid CORS and return data URL
      setIsLoadingImage(true);
      setSrcToUse("");

      getRemoteImage(imageUrl, {})
        .then((result) => {
          if (!cancelled) {
            setSrcToUse(result.objectUrl);
            setIsLoadingImage(false);
          }
        })
        .catch((err) => {
          console.error("Failed to proxy remote image:", err);
          if (!cancelled) {
            // fallback to direct URL
            setSrcToUse(imageUrl);
            setIsLoadingImage(false);
          }
        });
    } else {
      setSrcToUse(imageUrl);
      setIsLoadingImage(false);
    }

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // 图片加载完成
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    setNaturalSize({ width: naturalWidth, height: naturalHeight });

    // 计算适应容器的初始缩放（留有边距）
    const container = containerRef.current;
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const availableWidth = containerWidth * 0.9;
      const availableHeight = containerHeight * 0.87;

      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      const initialFitScale = Math.min(scaleX, scaleY, 1);

      setFitScale(initialFitScale);
    }
  };

  // 鼠标按下开始拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || naturalSize.width === 0) return;

    // 只在鼠标位于真实图片区域时才启用拖动
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const currentWidth = naturalSize.width * fitScale * userScale;
    const currentHeight = naturalSize.height * fitScale * userScale;

    const currentLeft = rect.width / 2 - currentWidth / 2 + userOffset.x;
    const currentTop = rect.height / 2 - currentHeight / 2 + userOffset.y;

    const isOnImage = mouseX >= currentLeft && mouseX <= currentLeft + currentWidth && mouseY >= currentTop && mouseY <= currentTop + currentHeight;

    if (!isOnImage) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - userOffset.x, y: e.clientY - userOffset.y });
  };

  // 取消移动边界限制
  const passthroughOffset = (offset: { x: number; y: number }) => offset;

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      // 如果移动超过阈值，标记为拖动以抑制后续 click/contextmenu
      const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > DRAG_THRESHOLD;
      if (moved) {
        suppressClickRef.current = true;
      }
      setUserOffset(passthroughOffset(newOffset));
      // 立即计算并通知渲染信息，避免 MarkerOverlay 因 useEffect 延迟而产生滞后
      const info = computeRenderInfo(userScale, newOffset);
      if (info) {
        onRenderUpdate(info);
      }
    }
  };

  // 鼠标释放
  const handleMouseUp = () => {
    setIsDragging(false);
    // 在 mouseup 发生后，click event 会紧随其后；保留 suppressClickRef 直到 click 处理完毕。
    // 在 click/contextmenu 处理处会清除 suppressClickRef。
  };

  // 防止在容器外松开鼠标仍然保持拖动
  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("mouseleave", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("mouseleave", handleWindowMouseUp);
    };
  }, []);

  

  // 鼠标滚轮缩放（保持鼠标在画布上的绝对百分比位置不变）
  const handleWheelNative = (e: WheelEvent) => {
    e.preventDefault();

    if (!containerRef.current || naturalSize.width === 0) return;

    // 使用乘法缩放，降低单次变化幅度
    const factor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
    const newUserScale = Math.max(0.1, Math.min(MAX_SCALE, userScale * factor));

    if (newUserScale === userScale) return; // 达到边界，不再缩放

    // 计算鼠标在容器中的位置
    const rect = containerRef.current.getBoundingClientRect();
    const mouseXInContainer = (e as WheelEvent & { clientX: number }).clientX - rect.left;
    const mouseYInContainer = (e as WheelEvent & { clientY: number }).clientY - rect.top;

    // 当前图片的显示尺寸
    const currentWidth = naturalSize.width * fitScale * userScale;
    const currentHeight = naturalSize.height * fitScale * userScale;

    // 当前图片左上角在容器中的位置
    const currentLeft = rect.width / 2 - currentWidth / 2 + userOffset.x;
    const currentTop = rect.height / 2 - currentHeight / 2 + userOffset.y;

    // 鼠标在图片上的相对位置（0-1）
    const relativeX = (mouseXInContainer - currentLeft) / currentWidth;
    const relativeY = (mouseYInContainer - currentTop) / currentHeight;

    // 新缩放后的图片尺寸
    const newWidth = naturalSize.width * fitScale * newUserScale;
    const newHeight = naturalSize.height * fitScale * newUserScale;

    // 新缩放后，鼠标应该在图片上的像素位置
    const mouseOnNewImageX = relativeX * newWidth;
    const mouseOnNewImageY = relativeY * newHeight;

    // 新的图片左上角位置，使鼠标在容器中的位置保持不变
    const newLeft = mouseXInContainer - mouseOnNewImageX;
    const newTop = mouseYInContainer - mouseOnNewImageY;

    // 反推出新的 userOffset
    const newOffsetX = newLeft - (rect.width / 2 - newWidth / 2);
    const newOffsetY = newTop - (rect.height / 2 - newHeight / 2);

    setUserScale(newUserScale);
    setUserOffset({ x: newOffsetX, y: newOffsetY });

    // 立即通知新的渲染信息，使 MarkerOverlay 能同步更新
    const infoAfter = computeRenderInfo(newUserScale, { x: newOffsetX, y: newOffsetY });
    if (infoAfter) {
      onRenderUpdate(infoAfter);
    }
  };

  // Attach native wheel listener as non-passive so we can call preventDefault()
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (ev: WheelEvent) => handleWheelNative(ev);

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
    };
  }, [containerRef, naturalSize, fitScale, userScale, userOffset]);

  // 计算最终渲染尺寸（不使用CSS scale，直接设置width/height）
  const renderWidth = naturalSize.width * fitScale * userScale;
  const renderHeight = naturalSize.height * fitScale * userScale;

  return (
    <div
      ref={containerRef}
      className="image-layer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
        /* wheel is attached as a native non-passive listener to allow preventDefault */
      onPointerDown={(e) => {
        // Handle right-button presses at pointer-down to ensure outbox creation
        // still works even if contextmenu handling or click bubbling is interrupted.
        if (e.button === 2) {
          console.log("[ImageLayer] onPointerDown button=", e.button, "client=", e.clientX, e.clientY);
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            (e as React.PointerEvent).stopPropagation?.();
            (e as React.PointerEvent).preventDefault?.();
            return;
          }

          // Mark that we've handled the contextmenu via pointerdown so the
          // subsequent native `contextmenu` event won't trigger the handler
          // again and create a duplicate unit.
          contextMenuHandledRef.current = true;

          (e as unknown as React.MouseEvent).preventDefault?.();

          if (typeof onCanvasContextMenu === 'function') {
            onCanvasContextMenu(e as unknown as React.MouseEvent);
          }
        }
      }}
      onClick={(e) => {
        console.log("[ImageLayer] onClick button=", (e as React.MouseEvent).button, "client=", e.clientX, e.clientY);
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        if (typeof onCanvasClick === 'function') {
          onCanvasClick(e);
        }
      }}
      onContextMenu={(e) => {
        console.log("[ImageLayer] onContextMenu button=", e.button, "client=", e.clientX, e.clientY);
        // If pointerdown already handled the contextmenu, skip to avoid
        // duplicate invocation. Clear the flag either way.
        if (contextMenuHandledRef.current) {
          contextMenuHandledRef.current = false;
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        if (typeof onCanvasContextMenu === 'function') {
          onCanvasContextMenu(e);
        }
      }}
    >
      {isLoadingImage && (
        <div className="image-layer-loading">
          <DotLoadSpinner />
        </div>
      )}

      {srcToUse && (
        <img
          ref={imageRef}
          src={srcToUse}
          alt="漫画页"
          className={`stage-image ${isDragging ? 'no-transition' : ''}`}
          onLoad={handleImageLoaded}
          draggable={false}
          style={{
            width: `${renderWidth}px`,
            height: `${renderHeight}px`,
            transform: `translate(${userOffset.x}px, ${userOffset.y}px)`,
            cursor: isDragging ? "grabbing" : "default",
          }}
        />
      )}
    </div>
  );
});

export default React.memo(ImageLayer);
