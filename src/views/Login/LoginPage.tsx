// 登录页面

import { useState } from "react";
import NatureButton from "../../components/NatureButton";
import { __mockLogin } from "../../ipc/mock_login";
import { setOnlineStatus, setCurrentUser, setAppView } from "../../store/app";
import type { LoginReq } from "../../models/user";
import type { UserProfile } from "../../models/user";
import { useToast } from "../../components/NotificationToast";
import { User, Lock, KeyRound } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage({
  allowOnline = true,
}: {
  allowOnline?: boolean;
}) {
  const [account, setAccount] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  // 如果不允许在线使用，则禁用登录表单
  const isOnlineAllowed = allowOnline;

  async function handleLogin(): Promise<void> {
    if (!isOnlineAllowed) {
      showToast("info", "当前服务器禁止在线使用，请以离线模式进入");
      return;
    }
    if (!account.trim()) {
      showToast("error", "请输入账号");
      return;
    }

    if (!password.trim()) {
      showToast("error", "请输入密码");
      return;
    }

    const loginReq: LoginReq = {
      qqId: account.trim(),
      password: password,
    };

    setIsLoading(true);

    try {
      const resp = await __mockLogin(loginReq);

      console.log("Login successful, token:", resp.token);

      const mockUser: UserProfile = {
        id: "mock-user-id",
        nickname: "测试用户",
        qq: account.trim(),
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentUser(mockUser);
      setOnlineStatus(true);
      setAppView("panel");
    } catch (error) {
      console.error("Login failed", error);

      showToast("error", "登录失败，请检查账号密码");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h3>登录『白杨子 Native』</h3>
        </div>

        <div className="login-body">
          {!isOnlineAllowed && (
            <div className="login-warning">
              服务器已禁止在线使用，无法以在线模式继续操作
            </div>
          )}

          <div className="login-field">
            <div className="login-field-icon">
              <User size={18} />
            </div>
            <input
              className="login-input"
              type="text"
              placeholder="QQ 号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              disabled={isLoading || !isOnlineAllowed}
            />
          </div>

          <div className="login-field">
            <div className="login-field-icon">
              <Lock size={18} />
            </div>
            <input
              className="login-input"
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || !isOnlineAllowed}
            />
          </div>

          <div className="login-field">
            <div className="login-field-icon">
              <KeyRound size={18} />
            </div>
            <input
              className="login-input"
              type="text"
              placeholder="邀请码"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              disabled={isLoading || !isOnlineAllowed}
            />
          </div>

          <div style={{ height: 8 }} />

          <div className="login-footer">
            {isOnlineAllowed ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <NatureButton
                  variant="cloud"
                  onClick={() => {
                    setOnlineStatus(false);
                    setAppView("panel");
                  }}
                  disabled={isLoading}
                >
                  离线启动
                </NatureButton>

                <div style={{ width: 8 }} />

                <NatureButton
                  variant="mist"
                  onClick={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "登录中..." : "登录"}
                </NatureButton>
              </div>
            ) : (
              <NatureButton
                variant="cloud"
                onClick={() => {
                  setOnlineStatus(false);
                  setAppView("panel");
                }}
              >
                以离线模式进入
              </NatureButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
