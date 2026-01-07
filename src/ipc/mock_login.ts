import type { CheckUpdateResp } from "../models/update";
import type { LoginReq, LoginResp } from "../models/user";
import type { CreateTeamApplicationReq } from "../models/team";
import type { MemberInfo } from "../models/member";

// Mock 获取本地版本号
export async function __mockGetLocalVersion(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return "1.0.0";
}

// Mock 检查更新
export async function __mockCheckUpdate(): Promise<CheckUpdateResp> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    latestVersion: "1.1.0",
    title: "白杨子 Native v1.1.0 发布",
    description:
      "本次更新带来了全新的在线协作功能，支持团队成员实时同步翻译进度。",
    allowUsage: true,
  };
}

// Mock 登录
export async function __mockLogin(req: LoginReq): Promise<LoginResp> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  console.log("Mock login with request", req);

  return {
    token: "mock-jwt-token-" + Date.now(),
  };
}

// Mock 检查登录状态
export async function __mockCheckLoginStatus(): Promise<MemberInfo | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return null;
}

// Mock 申请创建团队
export async function __mockApplyTeam(
  req: CreateTeamApplicationReq
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  console.log("Mock apply team with request", req);
}
