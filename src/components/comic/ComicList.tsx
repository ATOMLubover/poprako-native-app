import { useEffect, useMemo, useState, useRef } from "react";
import ComicStatusCard from "./ComicStatusCard";
import NatureButton from "../NatureButton";
import ConfirmDialogBox from "../ConfirmDialogBox";
import CollectionCreator from "../collection/CollectionCreator";
import type { ComicBrief } from "../../models/comic/comic";
import type { Collection, NewCollection } from "../../models/collection";
import type { ComicFilterOptions, ProgressStatus } from "../../models/comic/option";
import { PROGRESS_STATUS_LABELS, DEFAULT_FILTER_OPTIONS } from "../../models/comic/option";

const ArrowButton: React.FC<{ direction: "prev" | "next" }> = ({ direction }) => {
  const isPrev = direction === "prev";

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#374151"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: isPrev ? "none" : "rotate(180deg)" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
};

/**
 * 动态容量计算 Hook
 * 
 * 基于容器尺寸和模板项尺寸，实时计算可容纳的项目数量
 */
const useDynamicCapacity = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  templateRef: React.RefObject<HTMLDivElement | null>
) => {
  const [capacity, setCapacity] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !templateRef.current) return;

    const calculate = () => {
      const container = containerRef.current;
      const template = templateRef.current;

      if (!container || !template) return;

      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.gap) || 0;
      const pt = parseFloat(style.paddingTop) || 0;
      const pb = parseFloat(style.paddingBottom) || 0;

      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height - pt - pb;

      const singleItemHeight = template.getBoundingClientRect().height;
      setItemHeight(singleItemHeight);

      if (singleItemHeight > 0) {
        const count = Math.floor((availableHeight + gap + 0.1) / (singleItemHeight + gap));
        setCapacity(Math.max(1, count));
      }
    };

    const observer = new ResizeObserver(calculate);
    observer.observe(containerRef.current!);
    observer.observe(templateRef.current!);

    calculate();

    return () => observer.disconnect();
  }, []);

  return { capacity, itemHeight };
};

/**
 * 下拉选择器组件
 */
const FilterSelect: React.FC<{
  label: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
  placeholder?: string;
}> = ({ label, value, options, onChange, placeholder = "全部" }) => {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 0 }}>
      <label style={{ width: 64, fontSize: 12, color: "#6b7280", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        style={{
          padding: "6px 10px",
          fontSize: 13,
          border: "1px solid #d1d5db",
          borderRadius: 6,
          backgroundColor: "#fff",
          color: "#374151",
          cursor: "pointer",
          outline: "none",
          flex: 1,
          minWidth: 0,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

type ComicListProps = {
  comics: ComicBrief[];
  collections?: Collection[];
  onClick?: (comic: ComicBrief) => void;
  title?: string;
  filterOptions?: ComicFilterOptions;
  onFilterChange?: (options: ComicFilterOptions) => void;
  onCollectionCreate?: (payload: NewCollection) => Promise<void> | void;
};

/**
 * 漫画列表组件
 * 
 * 试探性分页机制：
 * - capacity 表示当前每页容量，由动态计算得出
 * - page 表示当前页码（从 0 开始）
 * - 根据 page 和 capacity 裁剪数据
 * - 如果当前页的项数 < capacity，禁用下一页按钮（确定无下一页）
 * - 如果当前页的项数 === capacity，允许点击下一页（试探是否还有数据）
 */
export default function ComicList({
  comics,
  collections = [],
  onClick,
  filterOptions = DEFAULT_FILTER_OPTIONS,
  onFilterChange,
  onCollectionCreate,
}: ComicListProps) {
  const [page, setPage] = useState<number>(0);
  const [collectionCreatorVisible, setCollectionCreatorVisible] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  const { capacity, itemHeight } = useDynamicCapacity(containerRef, templateRef);

  const [helpVisible, setHelpVisible] = useState<boolean>(false);

  const pageComics = useMemo(() => {
    if (capacity <= 0) {
      return comics;
    }

    const start = page * capacity;
    return comics.slice(start, start + capacity);
  }, [comics, page, capacity]);

  const isNextPageDisabled = capacity > 0 && pageComics.length < capacity;

  const collectionOptions = useMemo(
    () => collections.map((c) => ({ value: c.id, label: c.name })),
    [collections]
  );

  const progressOptions = useMemo(() => {
    return Object.entries(PROGRESS_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }, []);

  const handleFilterUpdate = (updates: Partial<ComicFilterOptions>) => {
    if (onFilterChange) {
      onFilterChange({ ...filterOptions, ...updates });
    }
  };

  const handleCollectionSave = async (payload: NewCollection) => {
    if (onCollectionCreate) {
      await onCollectionCreate(payload);
    }

    setCollectionCreatorVisible(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", width: "100%", overflow: "hidden", boxSizing: "border-box", position: "relative" }}>
      {/* Title removed as requested */}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="搜索作者名、漫画名或成员名..."
            value={filterOptions.searchText}
            onChange={(e) => handleFilterUpdate({ searchText: e.target.value })}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              outline: "none",
              flex: 1,
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <NatureButton variant="mist" minWidth={110} onClick={() => setCollectionCreatorVisible(true)}>
              新建作品集
            </NatureButton>

            <NatureButton variant="mist" minWidth={110} onClick={() => {}}>
              新建漫画
            </NatureButton>

            <NatureButton variant="cloud" minWidth={110} onClick={() => setHelpVisible(true)}>
              帮助
            </NatureButton>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, width: "98%", flexWrap: "nowrap", paddingBottom: 4, margin: "0 auto" }}>
          <FilterSelect
            label="作品集"
            value={filterOptions.collectionId}
            options={collectionOptions}
            onChange={(value) => handleFilterUpdate({ collectionId: value })}
          />
          <FilterSelect
            label="翻译进度"
            value={filterOptions.translationStatus}
            options={progressOptions}
            onChange={(value) => handleFilterUpdate({ translationStatus: value as ProgressStatus | null })}
          />
          <FilterSelect
            label="校对进度"
            value={filterOptions.proofreadingStatus}
            options={progressOptions}
            onChange={(value) => handleFilterUpdate({ proofreadingStatus: value as ProgressStatus | null })}
          />
          <FilterSelect
            label="嵌字进度"
            value={filterOptions.typesettingStatus}
            options={progressOptions}
            onChange={(value) => handleFilterUpdate({ typesettingStatus: value as ProgressStatus | null })}
          />
          <FilterSelect
            label="监修进度"
            value={filterOptions.reviewStatus}
            options={progressOptions}
            onChange={(value) => handleFilterUpdate({ reviewStatus: value as ProgressStatus | null })}
          />
          <FilterSelect
            label="发布进度"
            value={filterOptions.publishStatus}
            options={progressOptions}
            onChange={(value) => handleFilterUpdate({ publishStatus: value as ProgressStatus | null })}
          />
        </div>
        <ConfirmDialogBox
          visible={helpVisible}
          title="搜索帮助"
          description={`搜索时，可以使用“author:”来模糊查询作者，"member:"来模糊查询组员。条件之间应该使用空格分开。
示例：“魔王 author:rev member:LB”可以搜索到LB参加的rev3漫画《魔王姫は好意が弱い》。`}
          confirmText="知道了"
          onConfirm={() => setHelpVisible(false)}
          onCancel={() => setHelpVisible(false)}
        />
      </div>

      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "2px", width: "98%", margin: "0 auto", overflow: "hidden" }}>
        <div ref={templateRef} style={{ visibility: "hidden", position: "absolute" }}>
          {comics.length > 0 ? (
            <ComicStatusCard comic={comics[0]} />
          ) : (
            <div style={{ width: 1, height: 56 }} />
          )}
        </div>

        {comics.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            暂时没有漫画哦？
          </div>
        ) : (
          pageComics.map((comic) => (
            <div key={comic.id} style={{ height: itemHeight }}>
              <ComicStatusCard comic={comic} onClick={onClick} />
            </div>
          ))
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(() => {
              const isPrevDisabled = page === 0;
              const isNextDisabled = isNextPageDisabled;

              return (
                <>
                  <button
                    aria-label="上一页"
                    title="上一页"
                    onClick={() => {
                      if (isPrevDisabled) return;
                      setPage((prev) => Math.max(0, prev - 1));
                    }}
                    style={{
                      cursor: isPrevDisabled ? "default" : "pointer",
                      opacity: isPrevDisabled ? 0.4 : 1,
                      pointerEvents: isPrevDisabled ? "none" : "auto",
                      background: "none",
                      border: "none",
                      padding: 6,
                    }}
                  >
                    <ArrowButton direction="prev" />
                  </button>

                  <button
                    aria-label="下一页"
                    title="下一页"
                    onClick={() => {
                      if (isNextDisabled) return;
                      setPage((prev) => prev + 1);
                    }}
                    style={{
                      cursor: isNextDisabled ? "default" : "pointer",
                      opacity: isNextDisabled ? 0.4 : 1,
                      pointerEvents: isNextDisabled ? "none" : "auto",
                      background: "none",
                      border: "none",
                      padding: 6,
                    }}
                  >
                    <ArrowButton direction="next" />
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <CollectionCreator
        visible={collectionCreatorVisible}
        onClose={() => setCollectionCreatorVisible(false)}
        onSave={handleCollectionSave}
      />
    </div>
  );
}
