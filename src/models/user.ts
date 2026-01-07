import type { Tag } from "./tag";

// 用户资料类型定义
export type UserProfile = {
  userId: string;
  nickname: string;
  tags: Tag[];
  avatarUrl?: string;
  lastActive?: string;
  signature?: string;
  isMe?: boolean;
};

// 登录请求
export type LoginReq = {
  qqNumber?: string;
  email?: string;
  password: string;
  invitaionCode?: string;
};

// 登录响应
export type LoginResp = {
  token: string;
};
