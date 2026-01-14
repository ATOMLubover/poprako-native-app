import { AssignmentBrief, NewAssignment } from "./assignment";
import { PageBrief } from "./page";

// 漫画的基本信息
export type ComicBrief = {
  id: string;

  worksetId: string;
  worksetIndex: number;
  index: number;

  creatorId: string;

  author: string;
  title: string;
  comment?: string;
  description?: string;

  pageCount: number;
  likesCount: number;

  // tags: TagBrief[];

  translatingStartedAt?: Date;
  translatingCompletedAt?: Date;

  proofreadingStartedAt?: Date;
  proofreadingCompletedAt?: Date;

  typesettingStartedAt?: Date;
  typesettingCompletedAt?: Date;

  reviewingCompletedAt?: Date;
  uploadingCompletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// 漫画的详细信息
export type ComicInfo = {
  id: string;

  worksetId: string;
  worksetIndex: number;
  index: number;

  creatorId: string;

  author: string;
  title: string;
  comment?: string;
  description?: string;

  pageCount: number;
  likesCount: number;

  // tags: TagBrief[];
  assignments: AssignmentBrief[];
  pages: PageBrief[];

  translatingStartedAt?: Date;
  translatingCompletedAt?: Date;

  proofreadingStartedAt?: Date;
  proofreadingCompletedAt?: Date;

  typesettingStartedAt?: Date;
  typesettingCompletedAt?: Date;

  reviewingCompletedAt?: Date;
  uploadingCompletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// 用于创建或更新漫画的数据结构
export type NewComic = {
  worksetId: string;

  author: string;
  title: string;
  comment?: string;
  description?: string;

  // tagIds: string[];

  preAssignments: NewAssignment[];
};
