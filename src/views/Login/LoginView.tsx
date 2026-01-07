// 登录视图主容器

import { useState, useEffect } from "react";
import CheckUpdatePage from "./CheckUpdatePage";
import LoginPage from "./LoginPage";
import ApplyTeamPage from "./ApplyTeamPage";
import { __mockCheckLoginStatus } from "../../ipc/mock_login";
import { setOnlineStatus, setCurrentUser, setAppView } from "../../store/app";
import "./LoginView.css";

type LoginPhase = "check-update" | "auth";
type AuthTab = "login" | "apply";

export default function LoginView() {
  const [phase, setPhase] = useState<LoginPhase>("check-update");
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [allowUsage, setAllowUsage] = useState<boolean>(true);

  useEffect(() => {
    if (phase === "auth") {
      checkLoginStatus();
    }
  }, [phase]);

  async function checkLoginStatus(): Promise<void> {
    try {
      const user = await __mockCheckLoginStatus();

      if (user) {
        if (allowUsage) {
          setCurrentUser(user);
          setOnlineStatus(true);
          setAppView("panel");
        } else {
          // 如果服务器禁止在线使用，强制以离线模式进入
          setOnlineStatus(false);
          setAppView("panel");
        }
      }
    } catch (error) {
      console.error("Check login status failed", error);
    }
  }

  function handleUpdateComplete(allow: boolean): void {
    setAllowUsage(allow);
    setPhase("auth");
  }

  function handleOfflineMode(): void {
    setOnlineStatus(false);
    setAppView("panel");
  }

  if (phase === "check-update") {
    return (
      <CheckUpdatePage
        onComplete={handleUpdateComplete}
        onOfflineMode={handleOfflineMode}
      />
    );
  }

  return (
    <div className="login-view">
      <div className={`login-view-wrapper active-tab-${activeTab}`}>
        <div className="login-view-content">
          <div
            className={`login-view-panel ${activeTab === "login" ? "active" : ""}`}
            aria-hidden={activeTab !== "login"}
          >
            <LoginPage allowOnline={allowUsage} />
          </div>

          <div
            className={`login-view-panel ${activeTab === "apply" ? "active" : ""}`}
            aria-hidden={activeTab !== "apply"}
          >
            <ApplyTeamPage />
          </div>
        </div>

        <div className="login-view-tab-bar">
          <button
            className={`login-view-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            登录
          </button>
          <button
            className={`login-view-tab ${activeTab === "apply" ? "active" : ""}`}
            onClick={() => setActiveTab("apply")}
          >
            申请建组
          </button>
        </div>
      </div>
    </div>
  );
}
