import type { Tag } from "./tag";

// 用户资料类型定义（原名 Profile，已重命名为 UserProfile）
export type UserProfile = {
  userId: string;
  nickname: string;
  tags: Tag[];
  avatarUrl?: string;
  createdAt?: string | Date;
  isMe?: boolean;
};
