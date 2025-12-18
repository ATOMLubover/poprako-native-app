import type { Tag } from "./tag";

// 团队资料类型定义
export type TeamProfile = {
  teamId: string;
  signature: string;
  memberNum: number;
  comicNum: number;
  isHidden?: boolean;
  tags?: Tag[];
};

// 团队简要类型定义
export type TeamBrief = {
  teamId: string;
  name: string;
};
