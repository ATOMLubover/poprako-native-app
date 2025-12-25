import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import NatureSwitchButton from "../components/NatureSwitchButton";
import { useToast } from "../components/NotificationToast";
import { useSpecialSymbolsStore } from "../store/specialSymbols";
import "./SpecialSymbolPage.css";
import { createPortal } from "react-dom";

type Mode = "normal" | "select";

type SymbolSection = {
  title: string;
  symbols: string[];
};

const SYMBOL_SECTIONS: SymbolSection[] = [
  {
    title: "星形与爱心",
    symbols: ["★", "☆", "❤", "♡","❈", "✿", "❀"],
  },

  {
    title: "状态与标记",
    symbols: ["✔", "✘", "●", "○", "✕"],
  },

  {
    title: "音乐符号",
    symbols: ["♩", "♪", "♫", "♬", "♯", "♭", "♮"],
  },

  {
    title: "引号（成对）",
    symbols: ["『』", "「」", "【】", "〈〉"],
  },

  {
    title: "其他",
    symbols: ["©", "®", "♂", "♀", "♁", "▶", "◀", "§"],
  },
];

const MAX_CUSTOM_SYMBOLS = 15;
const LONG_PRESS_DURATION = 360;
const CUSTOM_INPUT_MAX = 6;

export default function SpecialSymbolPage() {
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>("normal");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const customSymbols = useSpecialSymbolsStore((state) => state.customSymbols);
  const loadCustomSymbolsIfNeeded = useSpecialSymbolsStore((state) => state.loadCustomSymbolsIfNeeded);
  const addCustomSymbolAndPersist = useSpecialSymbolsStore((state) => state.addCustomSymbolAndPersist);
  const removeCustomSymbol = useSpecialSymbolsStore((state) => state.removeCustomSymbol);
  const reorderCustomSymbols = useSpecialSymbolsStore((state) => state.reorderCustomSymbols);

  const pressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  const isSelectMode = mode === "select";

  // customSymbols are managed in-memory; persistence will be handled by backend (Rust)

  useEffect(() => {
    loadCustomSymbolsIfNeeded();
  }, [loadCustomSymbolsIfNeeded]);

  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        window.clearTimeout(pressTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (draggingIndex === null) {
      return;
    }

    const handlePointerUp = () => {
      setDraggingIndex(null);

      longPressTriggeredRef.current = false;
    };

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingIndex]);

  const copySymbol = async (symbol: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(symbol);

        showToast("success", `已复制 ${symbol}`);

        return;
      }

      throw new Error("Clipboard API not available");
    } catch (err) {
      const textarea = document.createElement("textarea");

      textarea.value = symbol;

      textarea.setAttribute("readonly", "true");

      textarea.style.position = "absolute";

      textarea.style.left = "-9999px";

      document.body.appendChild(textarea);

      textarea.select();

      document.execCommand("copy");

      document.body.removeChild(textarea);

      if (err instanceof Error) {
        console.error("Copy fallback triggered", err);
      }

      showToast("success", `已复制 ${symbol}`);
    }
  };

  const addCustomSymbol = async (symbol: string) => {
    const value = symbol.trim();

    if (!value) {
      return;
    }

    if (customSymbols.includes(value)) {
      showToast("info", "已在自定义表");
      return;
    }

    if (customSymbols.length >= MAX_CUSTOM_SYMBOLS) {
      showToast("error", "自定义表已达 15 个上限");
      return;
    }

    try {
      await addCustomSymbolAndPersist(value);

      showToast("success", "已添加到自定义表");
    } catch (error) {
      console.error("Add custom symbol failed", error);

      showToast("error", "保存失败，请稍后重试");
    }
  };

  const handleGeneralSymbolClick = (symbol: string) => {
    if (!isSelectMode) {
      copySymbol(symbol);
      return;
    }

    void addCustomSymbol(symbol);
  };

  const handleCustomPointerDown = (index: number) => {
    if (!isSelectMode) {
      return;
    }

    if (pressTimeoutRef.current) {
      window.clearTimeout(pressTimeoutRef.current);
    }

    longPressTriggeredRef.current = false;

    pressTimeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;

      setDraggingIndex(index);
    }, LONG_PRESS_DURATION);
  };

  const handleCustomPointerUp = (index: number) => {
    if (pressTimeoutRef.current) {
      window.clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }

    if (!isSelectMode) {
      copySymbol(customSymbols[index]);
      return;
    }

    if (longPressTriggeredRef.current) {
      setDraggingIndex(null);

      longPressTriggeredRef.current = false;

      return;
    }

    removeCustomSymbol(index);

    showToast("info", "已从自定义表移除");
  };

  const handleCustomPointerEnter = (index: number) => {
    if (draggingIndex === null) {
      return;
    }

    if (!isSelectMode) {
      return;
    }

    if (index === draggingIndex) {
      return;
    }

    reorderCustomSymbols(draggingIndex, index);

    setDraggingIndex(index);
  };

  const handleAddCustomFromInput = async () => {
    if (customSymbols.length >= MAX_CUSTOM_SYMBOLS) {
      showToast("error", "自定义表已达 15 个上限");
      return;
    }

    const input = window.prompt("请输入要加入的符号（最多 6 个字符）");

    if (!input) {
      return;
    }

    const trimmed = input.trim().slice(0, CUSTOM_INPUT_MAX);

    if (!trimmed) {
      return;
    }

    await addCustomSymbol(trimmed);
  };

  const handleModeToggle = (newState: "on" | "off") => {
    const nextMode: Mode = newState === "on" ? "select" : "normal";

    setMode(nextMode);

    // only show toast when entering select mode; do not notify when switching back to normal (copy) mode
    if (nextMode === "select") {
      showToast("info", "已切换到编辑模式，现在可以添加/删除自定义符号");
    }
  };

  return (
    <div className="special-symbol-page">

      <div className="symbol-layout">
        <section className={`symbol-board ${isSelectMode ? "select-mode" : ""}`}>
          <div
            aria-hidden
            className="symbol-decoration"
          >
            <Icon name="star" size={260} />
          </div>

          <div className="symbol-page-header">
            <h2 className="page-title">特殊符号库</h2>
          </div>

          <header className="board-header">
            <div className="board-title">
              <Icon name="star" className="board-icon" />
              <span>总字符表</span>
            </div>
            {/* hint removed: keep UI minimal, copy is default behavior */}
          </header>

          <div className="board-scroll">
            {SYMBOL_SECTIONS.map((section) => (
              <div key={section.title} className="symbol-section">
                <div className="section-header">
                  <span className="section-dot" />
                  <span className="section-title">{section.title}</span>
                </div>

                <div className="symbol-grid">
                  {section.symbols.map((symbol) => (
                    <button
                      key={`${section.title}-${symbol}`}
                      type="button"
                      className="symbol-item"
                      onClick={() => handleGeneralSymbolClick(symbol)}
                    >
                      <span className="symbol-char">{symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="symbol-divider" />

        <section className={`custom-board ${isSelectMode ? "select-mode" : ""}`}>
          <header className="board-header custom-header">
            <div className="board-title">
              <Icon name="dashboard" className="board-icon" />
                  <span>自定义表</span>

                  {/* 在标题右侧显示一个小问号，hover/聚焦时通过 portal 展示帮助提示 */}
                  <HelpBadge text={"可以在翻校模式中使用的快捷符号表，如果设置过多可能会影响翻校页面编辑区的显示。"} />
            </div>

            <div className="board-controls-row">
              <div className="board-controls">
                <span className="counter-pill">{customSymbols.length}/{MAX_CUSTOM_SYMBOLS}</span>

                <div className="header-actions">
                  <NatureSwitchButton
                    initialState="off"
                    onToggle={handleModeToggle}
                    onText="选择模式"
                    offText="编辑模式"
                    width={120}
                    height={36}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="board-scroll custom-scroll">
            <div className="symbol-grid custom-grid">
              {customSymbols.map((symbol, index) => (
                <button
                  key={`${symbol}-${index}`}
                  type="button"
                  className={`symbol-item custom-item ${draggingIndex === index ? "is-dragging" : ""}`}
                  onPointerDown={() => handleCustomPointerDown(index)}
                  onPointerUp={() => handleCustomPointerUp(index)}
                  onPointerEnter={() => handleCustomPointerEnter(index)}
                >
                  <span className="symbol-char">{symbol}</span>
                </button>
              ))}

              {isSelectMode && (
                <button
                  type="button"
                  className={`symbol-item custom-add ${customSymbols.length >= MAX_CUSTOM_SYMBOLS ? "is-disabled" : ""}`}
                  onClick={handleAddCustomFromInput}
                  disabled={customSymbols.length >= MAX_CUSTOM_SYMBOLS}
                >
                  <span className="add-icon">＋</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HelpBadge({ text }: { text: string }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const el = anchorRef.current;

    if (!el) {
      return;
    }

    const update = () => {
      const r = el.getBoundingClientRect();

      setPos({ left: r.left + r.width / 2, top: r.bottom + 8 });
    };

    update();

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setPos(null);
    }
  }, [visible]);

  const tooltip = pos
    ? (
      <div
        className="help-tooltip-portal"
        style={{ left: pos.left, top: pos.top, transform: "translateX(-50%)" }}
        role="note"
      >
        {text}
      </div>
    )
    : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="help-badge"
        tabIndex={0}
        aria-label="帮助"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        ?
      </span>

      {visible && tooltip && createPortal(tooltip, document.body)}
    </>
  );
}
