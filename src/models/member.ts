import { TagBrief } from "./tag";

// 汉化组成员信息
export type MemberInfo = {
  memberId: string;
  nickname: string;
  teamId: string;
  teamName: string;
  tags: TagBrief[];
  is_admin: boolean;
  assignedTranslatorAt?: Date;
  assignedProofreaderAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

// 简要成员信息
export type MemberBrief = {
  memberId: string;
  nickname: string;

  tags: TagBrief[];

  assignedTranslatorAt?: Date;
  assignedProofreaderAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;
};
