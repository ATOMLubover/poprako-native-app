import { useEffect, useRef, useState } from "react";
import NatureButton from "../NatureButton";
import { Type as LucideType } from "lucide-react";
import { useToast } from "../NotificationToast";
import type { NewCollection } from "../../models/collection";
import { getAppState, subscribeAppState } from "../../store/app";
import "../TermbaseCreator.css";
import "./CollectionCreator.css";

type CollectionCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave?: (payload: NewCollection) => Promise<void> | void;
};

export default function CollectionCreator({ visible, onClose, onSave }: CollectionCreatorProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const { showToast } = useToast();

  const [teamId, setTeamId] = useState<string>(getAppState().currentTeamId ?? "");
  const [name, setName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // 同步全局团队信息，确保浮窗内显示的身份是最新状态
  useEffect(() => {
    const unsubscribe = subscribeAppState(() => {
      setTeamId(getAppState().currentTeamId ?? "");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!visible) {
      setName("");
      setSaving(false);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  async function handleSave(): Promise<void> {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast("info", "请输入作品集名称");
      return;
    }

    if (!teamId) {
      showToast("error", "未检测到可用的汉化组身份");
      return;
    }

    setSaving(true);

    const payload: NewCollection = {
      teamId,
      name: trimmedName,
    };

    try {
      if (onSave) {
        await onSave(payload);
      }

      showToast("success", "已提交作品集创建");
      handleClose();
    } catch (error) {
      console.error("Create collection failed", error);
      showToast("error", "创建作品集失败");
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  }

  function handleClose(): void {
    setName("");
    onClose();
  }

  return (
    <div
      className="collection-creator-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-creator-title"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="collection-creator-panel">
        <div className="termbase-creator-card">
          <div className="tbc-header tbc-header-centered">
            <h3 id="collection-creator-title">创建作品集</h3>
          </div>

          <div className="tbc-body">
            {/* 自动读取全局汉化组身份，不再提供选择输入 */}

            <div className="tbc-field">
              <div className="tbc-field-icon">
                <LucideType size={18} />
              </div>

              <input
                className="tbc-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入作品集名称"
              />
            </div>
          </div>

          <div className="tbc-footer">
            <div className="tbc-footer-btn">
              <NatureButton variant="cloud" onClick={handleClose}>
                取消
              </NatureButton>
            </div>

            <div style={{ width: 12 }} />

            <div className="tbc-footer-btn">
              <NatureButton variant="mist" onClick={handleSave} disabled={saving}>
                {saving ? "创建中..." : "创建"}
              </NatureButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
