import { useState } from "react";
import "./NatureSwitchButton.css";
import DotLoadSpinner from "./DotLoadSpinner";

// 组件 props 类型定义，使用 type 而非 interface
type NatureSwitchButtonProps = {
  initialState?: "on" | "off";
  onToggle?: (newState: "on" | "off") => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * NatureSwitchButton
 * 将 samples/nature-switch-button.html 转为可复用的 React 组件
 * - 支持异步 onToggle 回调
 * - 保持原始样式类名以便复用样式表
 */
export default function NatureSwitchButton(props: NatureSwitchButtonProps) {
  const { initialState = "off", onToggle, disabled = false, className = "" } = props;

  const [state, setState] = useState<"on" | "off">(initialState);
  const [loading, setLoading] = useState<boolean>(false);

  // 点击处理函数：若 onToggle 返回 Promise，则等待其完成
  const handleClick = async () => {
    if (disabled || loading) {
      return;
    }

    const newState: "on" | "off" = state === "off" ? "on" : "off";

    setLoading(true);

    try {
      const result = onToggle ? onToggle(newState) : undefined;

      if (result && typeof (result as Promise<void>).then === "function") {
        await result;
      }

      // 成功后切换本地 UI 状态
      setState(newState);
    } catch (err) {
      // 简单错误处理：在控制台记录
      // 真实项目可通过 props 回传错误提示
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isOn = state === "on";

  const classes = ["btn-base", isOn ? "btn-switch-on" : "btn-switch-off", loading ? "is-loading" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      data-state={state}
      onClick={handleClick}
      aria-pressed={isOn}
      aria-busy={loading}
      disabled={disabled}
    >
      <span className="nsb-icon mr-2">
        {loading ? <DotLoadSpinner /> : isOn ? "●" : "○"}
      </span>

      <span className="nsb-text">{loading ? "处理中..." : isOn ? "已开启" : "已关闭"}</span>
    </button>
  );
}
