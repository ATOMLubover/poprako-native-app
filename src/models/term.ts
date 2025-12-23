import { TeamBrief } from "./team";

// 术语库基础类型
export type Termbase = {
  teamBrief: TeamBrief;
  name: string;
  description: string;
  likedNum: number;
  termNum: number;
  relatedComicId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// 新建术语库时使用的类型
export type NewTermbase = {
  name: string;
  teamId: string; // 所属汉化组 ID
  description: string;
  isPrivate: boolean;
  relatedComicId?: string; // 可选的关联漫画 ID
};

// 术语类型定义
export type Term = {
  termBaseId: string;
  originalText: string;
  targetText: string;
  modifierId: string;
  modifierNickname: string;
  createdAt: Date;
  updatedAt: Date;
};

// 新建术语时使用的类型
export type NewTerm = {
  original: string;
  definition: string;
};

// 更新术语时使用的类型
export type PatchTerm = Partial<NewTerm>;
