// 版本检查页面

import { useState, useEffect, useRef } from "react";
import DotLoadSpinner from "../../components/DotLoadSpinner";
import NatureButton from "../../components/NatureButton";
import {
  checkUpdate as ipcCheckUpdate,
  getNativeAppVersion,
} from "../../ipc/check";
import type { CheckUpdateResp } from "../../models/check";
import "./CheckUpdatePage.css";

type CheckUpdatePageProps = {
  onComplete: (allowUsage: boolean) => void;
  onOfflineMode: () => void;
};

type CheckState = "checking" | "has-update" | "no-update" | "failed";

export default function CheckUpdatePage({
  onComplete,
  onOfflineMode,
}: CheckUpdatePageProps) {
  const [state, setState] = useState<CheckState>("checking");
  const [updateInfo, setUpdateInfo] = useState<CheckUpdateResp | null>(null);
  const [localVersion, setLocalVersion] = useState<string>("");
  const attemptsRef = useRef<number>(0);

  useEffect(() => {
    checkUpdate();
  }, []);

  async function checkUpdate(): Promise<void> {
    setState("checking");

    try {
      const [local, update] = await Promise.all([
        getNativeAppVersion(),
        ipcCheckUpdate(),
      ]);

      setLocalVersion(local);
      setUpdateInfo(update);

      if (update.latestVersion > local) {
        setState("has-update");
      } else {
        setState("no-update");
        onComplete(update.allowUsage);
      }
    } catch (error) {
      console.error("Check update failed", error);

      if (attemptsRef.current < 1) {
        attemptsRef.current += 1;

        setTimeout(() => {
          checkUpdate();
        }, 1000);
      } else {
        setState("failed");
      }
    }
  }

  function handleConfirm(): void {
    onComplete(true);
  }

  function handleRetry(): void {
    attemptsRef.current = 0;
    checkUpdate();
  }

  if (state === "checking") {
    return (
      <div className="check-update-page">
        <div className="check-update-loading">
          <DotLoadSpinner />
          <p className="check-update-loading-text">正在检查更新...</p>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="check-update-page">
        <div className="check-update-failed">
          <p className="check-update-failed-title">无法连接到服务器</p>
          <p className="check-update-failed-desc">
            检查更新失败，请检查网络连接后重试
          </p>
          <div className="check-update-failed-actions">
            <NatureButton variant="mist" onClick={handleRetry} minWidth={150}>
              重试
            </NatureButton>
            <NatureButton
              variant="cloud"
              onClick={onOfflineMode}
              minWidth={150}
            >
              以离线模式启动
            </NatureButton>
          </div>
        </div>
      </div>
    );
  }

  if (state === "has-update" && updateInfo) {
    return (
      <div className="check-update-page">
        <div className="check-update-content">
          <div className="check-update-header">
            <h2 className="check-update-title">{updateInfo.title}</h2>
            <div className="check-update-version">
              <span className="version-label">当前版本:</span>
              <span className="version-number">{localVersion}</span>
              <span className="version-arrow">→</span>
              <span className="version-number latest">
                {updateInfo.latestVersion}
              </span>
            </div>
          </div>

          <div className="check-update-description">
            <p>{updateInfo.description}</p>
          </div>

          <div className="check-update-footer">
            {updateInfo.allowUsage ? (
              <NatureButton
                variant="mist"
                onClick={handleConfirm}
                minWidth={150}
              >
                确认
              </NatureButton>
            ) : (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                <div style={{ color: "#b91c1c", fontWeight: 600 }}>
                  客户端版本过低，不再支持在线使用
                </div>
                <NatureButton
                  variant="cloud"
                  onClick={onOfflineMode}
                  minWidth={150}
                >
                  以离线模式启动
                </NatureButton>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
