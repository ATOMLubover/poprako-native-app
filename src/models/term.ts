import { TeamBrief } from "./team";

// 术语库基础类型
export type TermBase = {
  teamBrief: TeamBrief;
  name: string;
  description: string;
  termNum: number;
  createdAt: Date;
  updatedAt: Date;
};

// 术语类型定义
export type Term = {
  termBaseId: string;
  original: string;
  definition: string;
  modifierId: string;
  modifierNickname: string;
  createdAt: Date;
  updatedAt: Date;
};
