import React from "react";
import ReactDOM from "react-dom";
import "./ConfirmDialogBox.css";
import NatureButton from "./NatureButton";

type ConfirmDialogBoxProps = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

const ConfirmDialogBox: React.FC<ConfirmDialogBoxProps> = ({
  title = "确认",
  description,
  confirmText = "确认",
  cancelText = "取消",
  visible,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const node = (
    <div className="cdb-overlay" role="dialog" aria-modal="true">
      <div className="cdb-card">
        <div className="cdb-title">{title}</div>
        {description && <div className="cdb-desc">{description}</div>}
        <div className="cdb-actions">
          {onCancel && (
            <NatureButton variant="cloud" onClick={onCancel}>
              {cancelText}
            </NatureButton>
          )}

          <NatureButton variant="mist" onClick={onConfirm}>
            {confirmText}
          </NatureButton>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
};

export default ConfirmDialogBox;
