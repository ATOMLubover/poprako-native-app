import { useEffect, useRef, useState, ReactNode } from "react";
import "./VerticalAdaptiveList.css";

// 列表项的配置类型
type ListItemConfig = {
  id: string;
  height: number;
  content: ReactNode;
};

type VerticalAdaptiveListProps = {
  // 列表项数组，每个项包含唯一 id、高度和内容
  items: ListItemConfig[];
  // 项目之间的间隙高度（像素）
  gap?: number;
  // 容器标题
  title?: string;
  // 调试模式：打印详细日志
  debug?: boolean;
};

/**
 * 垂直自适应列表组件
 * 根据容器高度动态计算能显示多少个列表项，自动隐藏超出显示范围的项
 */
export default function VerticalAdaptiveList({
  items,
  gap = 5,
  title = "自适应列表",
  debug = true,
}: VerticalAdaptiveListProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // 当前可见项的数量（用于状态管理和调试）
  const [visibleCount, setVisibleCount] = useState<number>(items.length);

  // 项引用列表（用于测量）
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * 计算理论的纯内容高度（用于调试）
   */
  const calculateTheoreticalContentHeight = (): number => {
    if (!wrapperRef.current || !titleRef.current) {
      if (debug) console.warn("[VAL Debug] Wrapper or Title ref not available");
      return 0;
    }

    const wrapperClientHeight = wrapperRef.current.clientHeight;
    const titleOccupancy = titleRef.current.offsetHeight;

    const spaceForContainerIncludingOverhead = wrapperClientHeight - titleOccupancy;

    // 内部容器固定开销: padding (2*10=20px) + border (2*2=4px) = 24px
    const containerFixedOverhead = 20 + 4;

    const finalContentHeight = spaceForContainerIncludingOverhead - containerFixedOverhead;

    return finalContentHeight;
  };

  /**
   * 核心功能：使用浏览器布局模拟来确定可见元素数量
   * 这个方法基于容器的 overflow: hidden 属性来检测元素是否被裁剪
   */
  const calculateVisibleItems_Simulation = (): number => {
    if (!containerRef.current) {
      if (debug) console.warn("[VAL Debug] Container ref not available");
      return 0;
    }

    // 1. 先确保所有元素都可见，让浏览器进行完整布局计算
    itemRefs.current.forEach((item) => {
      if (item) item.classList.remove("hidden");
    });

    // 2. 测量容器的底边位置
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerBottom = containerRect.bottom;
    const containerTop = containerRect.top;
    const containerHeight = containerRect.height;

    if (debug) {
      console.log(
        `[VAL Simulation Start] Title: "${title}", Items count: ${items.length}`
      );
      console.log(
        `[VAL Simulation] Container geometry - Top: ${containerTop.toFixed(2)}px, Bottom: ${containerBottom.toFixed(2)}px, Height: ${containerHeight.toFixed(2)}px`
      );
    }

    let visibleCountResult = 0;

    // 3. 遍历并检查每个 Item 是否被裁剪
    for (let i = 0; i < itemRefs.current.length; i++) {
      const item = itemRefs.current[i];
      if (!item) continue;

      const itemRect = item.getBoundingClientRect();
      const itemHeight = itemRect.height;
      const itemTop = itemRect.top;
      const itemBottom = itemRect.bottom;
      const isClipped = itemBottom > containerBottom;

      if (debug && i < 3) {
        console.log(
          `[VAL Simulation] Item[${i}] - Top: ${itemTop.toFixed(2)}px, Bottom: ${itemBottom.toFixed(2)}px, Height: ${itemHeight.toFixed(2)}px, Clipped: ${isClipped}`
        );
      }

      // 检查 Item 的底部是否超出了容器的底部边界
      if (itemRect.bottom > containerBottom) {
        visibleCountResult = i;
        if (debug) {
          console.log(
            `[VAL Simulation] ⚠️ Item[${i}] exceeds container (${itemBottom.toFixed(2)}px > ${containerBottom.toFixed(2)}px), visible count set to: ${visibleCountResult}`
          );
        }
        break;
      }

      visibleCountResult = i + 1;
    }

    if (debug) {
      console.log(
        `[VAL Simulation End] ✅ Final visible count: ${visibleCountResult}/${items.length}`
      );
    }

    return visibleCountResult;
  };

  /**
   * 更新元素的可见性并记录调试信息
   */
  const updateVisibility = (newVisibleCount: number, theoreticalHeight: number) => {
    let consumedHeight = 0;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;

      const isVisible = index < newVisibleCount;

      if (isVisible) {
        item.classList.remove("hidden");
        // 获取项的实际高度
        const itemHeight = item.offsetHeight;
        consumedHeight += itemHeight;

        // 只有不是最后一个可见项才计算间隙
        if (index < newVisibleCount - 1) {
          consumedHeight += gap;
        }

        if (debug && index === 0) {
          console.log(`[VAL Visibility] Item[0] height: ${itemHeight}px, gap: ${gap}px`);
        }
      } else {
        item.classList.add("hidden");
      }
    });

    // 更新状态以保持同步
    setVisibleCount(newVisibleCount);

    if (debug) {
      console.log(`--- [VAL Final Result] ---`);
      console.log(`Wrapper Client Height: ${wrapperRef.current?.clientHeight}px`);
      console.log(`Title Occupancy (h2): ${titleRef.current?.offsetHeight}px`);
      console.log(`Theoretical H_content: ${theoreticalHeight.toFixed(2)}px`);
      console.log(`N (Visible count): ${newVisibleCount} / ${items.length}`);
      console.log(`H_consumed (needed height): ${consumedHeight.toFixed(2)}px`);
      console.log(`-----------------------------`);
    }
  };

  /**
   * 触发自适应计算的主函数
   */
  const recalculateVisibility = () => {
    const newVisibleCount = calculateVisibleItems_Simulation();
    const theoreticalHeight = calculateTheoreticalContentHeight();

    setVisibleCount(newVisibleCount);
    updateVisibility(newVisibleCount, theoreticalHeight);
  };

  // 设置 ResizeObserver 监听容器尺寸变化
  useEffect(() => {
    if (!wrapperRef.current) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;

    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout);

      if (debug) {
        const entry = entries[0];
        console.log(
          `[VAL ResizeObserver] Triggered - New size: ${entry.contentRect.width.toFixed(0)}x${entry.contentRect.height.toFixed(0)}px`
        );
      }

      // 使用 setTimeout 进行防抖
      resizeTimeout = setTimeout(() => {
        if (debug) {
          console.log(`[VAL ResizeObserver] After debounce (50ms), recalculating visibility for "${title}"...`);
        }
        recalculateVisibility();
      }, 50);
    });

    resizeObserver.observe(wrapperRef.current);

    if (debug) {
      console.log(`[VAL ResizeObserver] Setup complete for "${title}"`);
    }

    return () => {
      if (debug) {
        console.log(`[VAL ResizeObserver] Cleanup for "${title}"`);
      }
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [items, gap, debug, title]);

  // 初始化时运行一次
  useEffect(() => {
    if (debug) {
      console.log(
        `[VAL Mount] 🟢 Component mounted - Title: "${title}", Items: ${items.length}, Gap: ${gap}px`
      );
    }

    requestAnimationFrame(() => {
      if (debug) {
        console.log(`[VAL Mount] requestAnimationFrame triggered for "${title}", starting initial calculation...`);
      }
      recalculateVisibility();
    });
  }, [items, gap, debug, title]);

  return (
    <div
      ref={wrapperRef}
      className="vertical-adaptive-list-wrapper"
      data-visible-count={visibleCount}
    >
      <h2 ref={titleRef} className="adaptive-list-title">
        {title}
      </h2>
      <div ref={containerRef} className="vertical-adaptive-item-container">
        {items.map((itemConfig, index) => (
          <div
            key={itemConfig.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="vertical-adaptive-item"
            style={{ height: `${itemConfig.height}px`, marginBottom: `${gap}px` }}
          >
            {itemConfig.content}
          </div>
        ))}
      </div>
    </div>
  );
}
