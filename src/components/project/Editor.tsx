import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import "./Editor.css";

type EditorProps = {
  indexInPage: number;
  isInsideBox: boolean;
  symbols: string[];
  initialText: string;
  totalUnits: number;
  onTextModify: (newText: string) => void;
  onStatusClick: () => void;
  onIndexChange: (targetIndex: number) => void;
};

export type EditorRef = {
  /**
   * 聚焦到 textarea，可选是否移到文本尾部
   */
  focus: (toEnd?: boolean) => void;
};

const Editor = forwardRef<EditorRef, EditorProps>((
  {
    indexInPage,
    isInsideBox,
    symbols,
    initialText,
    totalUnits,
    onTextModify,
    onStatusClick,
    onIndexChange,
  },
  ref
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initialText);
  const [editingIndex, setEditingIndex] = useState(false);
  const [indexInput, setIndexInput] = useState(String(indexInPage + 1));

  useImperativeHandle(ref, () => ({
    focus: (toEnd?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();

      if (toEnd) {
        // 将光标移到文本尾部
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    },
  }));

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  // 在光标位置插入符号
  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    const beforeText = text.substring(0, startPos);
    const afterText = text.substring(endPos);

    const newValue = beforeText + symbol + afterText;
    setText(newValue);
    onTextModify(newValue);

    setTimeout(() => {
      const newPos = startPos + symbol.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // 文本变化处理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log("[Editor] handleTextChange, newValue:", newValue);
    setText(newValue);
    onTextModify(newValue);
  };

  const handleIndexClick = () => {
    setEditingIndex(true);
    setIndexInput(String(indexInPage + 1));
  };

  const confirmIndex = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      console.log("[Editor] Invalid index input", raw);
      setEditingIndex(false);
      return;
    }

    const maxIndex = Math.max(totalUnits - 1, 0);
    let userOneBased = parsed;
    if (userOneBased < 1) userOneBased = 1;
    if (userOneBased - 1 > maxIndex) userOneBased = maxIndex + 1;

    const target = userOneBased - 1;
    onIndexChange(target);
    setEditingIndex(false);
  };

  const cancelEdit = () => {
    setEditingIndex(false);
  };

  return (
    <div className="editor-card">
      <div className="card-header">
        {editingIndex ? (
          <input
            className="index-input"
            value={indexInput}
            onChange={(e) => setIndexInput(e.target.value)}
            onBlur={() => confirmIndex(indexInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmIndex(indexInput);
              }

              if (e.key === "Escape") {
                cancelEdit();
              }
            }}
            autoFocus
          />
        ) : (
          <span className="index-label" onClick={handleIndexClick}>
            {String(indexInPage + 1).padStart(2, "0")}
          </span>
        )}
        <span
          className={`status-tag ${isInsideBox ? "tag-in" : "tag-out"}`}
          onClick={onStatusClick}
        >
          {isInsideBox ? "框内" : "框外"}
        </span>
      </div>

      <div className="symbol-bar">
        {symbols.map((symbol, index) => (
          <button
            key={index}
            className="symbol-btn"
            onClick={() => insertSymbol(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          placeholder="请输入翻译..."
          value={text}
          onChange={handleTextChange}
        />
      </div>
    </div>
  );
});

Editor.displayName = "Editor";

export default Editor;
