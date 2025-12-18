import type { Tag } from "./tag";

// 用户资料类型定义
export type UserProfile = {
  userId: string;
  nickname: string;
  tags: Tag[];
  avatarUrl?: string;
  lastActive?: string | Date;
  signature?: string;
  isMe?: boolean;
};
