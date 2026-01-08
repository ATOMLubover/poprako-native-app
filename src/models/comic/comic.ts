// // 使用 simple 选项时获取到的漫画信息
// export type SimpleComicInfo = {
//   id: string;
//   author: string;
//   title: string;
//   team: TeamBrief;
// };

import { TagBrief } from "../tag";

// 漫画的基本信息，包含最新一章的摘要
export type ComicBrief = {
  id: string;

  collectionId: string;
  index: number;

  author: string;
  title: string;
  isSeries: boolean;

  likesCount: number;
  tags: TagBrief[];

  isHidden: boolean;

  // 下述字段由服务器自动根据最新章节信息生成
  translationStartedAt?: Date;
  translationCompletedAt?: Date;

  proofreadingStartedAt?: Date;
  proofreadingCompletedAt?: Date;

  typesettingStartedAt?: Date;
  typesettingCompletedAt?: Date;

  reviewedAt?: Date;
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// 漫画的详细信息
export type ComicInfo = {
  id: string;

  collectionId: string;
  collectionName: string;
  index: number;

  author: string;
  title: string;
  description?: string;
  isSeries: boolean;
  chapterCount: number;

  likesCount: number;
  tags: TagBrief[];

  createdAt: Date;
  updatedAt: Date;
};
