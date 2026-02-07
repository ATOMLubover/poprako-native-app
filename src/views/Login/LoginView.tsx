import { useState, useEffect } from "react";
import CheckUpdatePage from "./CheckUpdatePage";
import LoginPage from "./LoginPage";
import { setOnlineStatus, setCurrentUser, setAppView } from "../../store/app";
import "./LoginView.css";
import { getAuthToken } from "../../util/authStore";
import { fetchCurrUserInfo } from "../../ipc/user";

type LoginPhase = "check-update" | "auth";

export default function LoginView() {
  const [phase, setPhase] = useState<LoginPhase>("check-update");
  const [allowUsage, setAllowUsage] = useState<boolean>(true);

  useEffect(() => {
    if (phase === "auth") {
      checkLoginStatus();
    }
  }, [phase]);

  const checkLoginStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const currUser = await fetchCurrUserInfo();

      if (currUser) {
        if (allowUsage) {
          setCurrentUser(currUser);
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
  };

  const handleUpdateComplete = (allow: boolean) => {
    setAllowUsage(allow);
    setPhase("auth");
  };

  const handleOfflineMode = () => {
    setOnlineStatus(false);
    setAppView("panel");
  };

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
      <div className="login-view-wrapper active-tab-login">
        <div className="login-view-content">
          <div className="login-view-panel active" aria-hidden={false}>
            <LoginPage allowOnline={allowUsage} />
          </div>
        </div>
      </div>
    </div>
  );
}
