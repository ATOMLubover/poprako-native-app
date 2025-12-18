import React from "react";
import "./RectNatureTag.css";

type RectNatureTagProps = {
  // variant 使用风格/颜色名称，而不是语义内容名
  variant?: "breeze" | "mist" | "sunset";
  label: string | number;
  icon?: React.ReactNode;
};

export default function RectNatureTag({ variant = "breeze", label, icon }: RectNatureTagProps) {
  const cls = `rect-tag rect-tag-${variant}`;

  return (
    <span className={cls}>
      {icon ? <span className="rect-tag-icon">{icon}</span> : null}
      <span className="rect-tag-label">{label}</span>
    </span>
  );
}
