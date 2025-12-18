import React, { useEffect, useRef, useState } from "react";
import type { Tag } from "../models/tag";
import NatureTag from "./NatureTag";
import "./TextSelector.css";

// 列表项的通用类型，使用 Record 避免 any
// 列表项的通用类型，使用 Record 避免 any
type Item = Record<string, unknown>;

type Props<T extends Item> = {
  listContent: T[];
  // 以 Tag 形式渲染的提示词，可复用 NatureTag
  listHints?: Tag[];
  // 将 item 转为可搜索文本的函数，默认会尝试 name/label 字段
  getItemText?: (item: T) => string;
  // 自定义渲染单条列表项，默认显示 getItemText 的字符串
  renderItem?: (item: T) => React.ReactNode;
  onEnter?: (value: T | string) => void;
  placeholder?: string;
};

/**
 * 可复用的文字选择器组件
 * - 支持自定义列表项类型，通过 `getItemText` 将 item 映射为文本
 * - 支持 `renderItem` 自定义渲染
 * - 提示词可复用 `NatureTag` 组件
 */
export default function TextSelector<T extends Item>({
  listContent,
  listHints = [],
  getItemText,
  renderItem,
  onEnter,
  placeholder = "搜索或输入新内容...",
}: Props<T>) {
  // 默认将 item 映射为文本：优先使用 name、label 字段
  const defaultGetText = (it: T) => {
    const maybe = it as unknown as Record<string, unknown>;

    if ("name" in maybe && typeof maybe["name"] === "string") {
      return maybe["name"] as string;
    }

    if ("label" in maybe && typeof maybe["label"] === "string") {
      return maybe["label"] as string;
    }

    return String(maybe);
  };

  const textFor = getItemText || defaultGetText;

  const [query, setQuery] = useState("");

  const [filtered, setFiltered] = useState<T[]>([...listContent]);

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 依据当前 query 与最新的 listContent 计算过滤结果
    const newFiltered = listContent.filter((item) =>
      textFor(item).toLowerCase().includes(query.trim().toLowerCase())
    );

    setFiltered(newFiltered);

    // 如果当前没有输入，则不选中任何项
    if (query.trim() === "") {
      setActiveIndex(-1);

      return;
    }

    // 如果父组件在 onEnter 后更新了 listContent，尝试在新数据中定位与输入完全匹配的项并自动选中
    const matchedIndex = newFiltered.findIndex((it) =>
      textFor(it).toLowerCase() === query.trim().toLowerCase()
    );

    setActiveIndex(matchedIndex >= 0 ? matchedIndex : -1);
  }, [query, listContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();

        handleEnter();

        break;
      case "ArrowDown":
        e.preventDefault();

        navigate(1);

        break;
      case "ArrowUp":
        e.preventDefault();

        navigate(-1);

        break;
    }
  };

  const navigate = (dir: number) => {
    if (filtered.length === 0) return;

    let index = activeIndex + dir;

    if (index < 0) index = filtered.length - 1;

    if (index >= filtered.length) index = 0;

    setActiveIndex(index);

    // 滚动到可视区域
    const listEl = containerRef.current?.querySelectorAll<HTMLLIElement>(".ts-list-item");

    const el = listEl ? listEl[index] : null;

    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const handleEnter = () => {
    let finalValue: T | string = query;

    if (activeIndex !== -1 && filtered[activeIndex]) {
      finalValue = filtered[activeIndex];

      setQuery(textFor(filtered[activeIndex]));
    }

    if (onEnter) onEnter(finalValue);

    // 简单弹性反馈
    if (containerRef.current) {
      containerRef.current.style.transform = "scale(0.99)";

      setTimeout(() => {
        if (containerRef.current) containerRef.current.style.transform = "scale(1)";
      }, 150);
    }
  };

  return (
    <div className="ts-wrapper" ref={containerRef}>
      <div className="ts-input-wrap">
        <input
          ref={inputRef}
          className="ts-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      <div className="ts-hints">
        {listHints.length === 0 ? null : (
          listHints.map((hint) => (
            <NatureTag
              key={hint.tagId}
              tag={hint}
              theme="theme-mist"
              onClick={() => {
                setQuery(hint.name);

                // focus 并触发过滤
                inputRef.current?.focus();
              }}
            />
          ))
        )}
      </div>

      <ul className="ts-list" role="listbox">
        {filtered.length === 0 ? (
          <li className="ts-empty">未发现匹配项</li>
        ) : (
          filtered.map((item, index) => (
            <li
              key={String((item as Record<string, unknown>)["id"] ?? index)}
              className={`ts-list-item ${index === activeIndex ? "active" : ""}`}
              onClick={() => {
                setActiveIndex(index);

                setQuery(textFor(item));

                handleEnter();
              }}
            >
              {renderItem ? renderItem(item) : <span>{textFor(item)}</span>}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
