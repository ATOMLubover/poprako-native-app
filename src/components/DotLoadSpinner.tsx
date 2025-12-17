import "./DotLoadSpinner.css";

/**
 * 波浪跳动加载动画组件
 * 基于三个圆点的依次跳动效果，展示加载状态
 */
export default function DotLoadSpinner() {
  return (
    <div className="dot-flashing">
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}
