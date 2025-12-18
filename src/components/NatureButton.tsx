import React, { useState } from "react";
import "./NatureButton.css";

// 按钮变体类型说明
type ButtonVariant = "mist" | "rose" | "cloud" | "clay" | "outline" | "glass";

// 组件 props 类型定义
type NatureButtonProps = {
  variant?: ButtonVariant;
  disabled?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  onClick?: () => void | Promise<void>;
  /** 最小宽度，可接收数字（像素）或字符串（CSS 单位） */
  minWidth?: number | string;
};

/**
 * NatureButton
 * 一个将 samples/nature-button.html 中样式封装为 React 组件的轻量实现
 * - 通过 `variant` 选择六种风格
 * - 支持异步 onClick (若返回 Promise，组件会显示 loading)
 */
export default function NatureButton(props: NatureButtonProps) {
  const { variant = "cloud", disabled = false, loadingText = "处理中...", children, onClick } = props;

  const { minWidth } = props;

  const [loading, setLoading] = useState<boolean>(false);

  const handleClick = async () => {
    if (disabled || loading) {
      return;
    }

    if (!onClick) {
      // 没有传入 onClick 则使用短暂的本地 loading 反馈
      setLoading(true);
      setTimeout(() => setLoading(false), 1200);
      return;
    }

    try {
      const result = onClick();
      if (result && typeof (result as Promise<void>).then === "function") {
        setLoading(true);
        await result;
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const variantClass = (() => {
    switch (variant) {
      case "mist":
        return "nb-mist";
      case "rose":
        return "nb-rose";
      case "cloud":
        return "nb-cloud";
      case "clay":
        return "nb-clay";
      case "outline":
        return "nb-outline";
      case "glass":
        return "nb-glass";
      default:
        return "nb-cloud";
    }
  })();

  const classes = ["nb-btn-base", variantClass, disabled ? "nb-disabled" : ""].join(" ");
  const inlineStyle = minWidth ? { minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth } : undefined;

  return (
    <button className={classes} style={inlineStyle} onClick={handleClick} aria-disabled={disabled || loading}>
      {loading ? loadingText : children}
    </button>
  );
}
