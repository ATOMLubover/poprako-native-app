import { TeamBrief } from "./team";

// 使用 simple 选项时获取到的漫画信息
export type SimpleComicInfo = {
  id: string;
  author: string;
  title: string;
  team: TeamBrief;
};

// 漫画章节的基本信息
export type ChapterBrief = {
  id: string;

  index: string;

  translationStartedAt?: Date;
  translationCompletedAt?: Date;
  translatorComment?: string;

  proofreadingStartedAt?: Date;
  proofreadingCompletedAt?: Date;
  proofreaderComment?: string;

  typesettingStartedAt?: Date;
  typesettingCompletedAt?: Date;
  typesetterComment?: string;

  reviewedAt?: Date;
  publisherComment?: string;

  createdAt: Date;
  updatedAt: Date;
};

// 漫画的基本信息，包含最新一章的摘要
export type ComicBrief = {
  id: string;

  author: string;
  title: string;
  isSeries: boolean;

  likesCount: number;

  isHidden: boolean;
};
