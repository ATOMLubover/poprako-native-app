import { TagBrief } from "../tag";
import { AssignmentBrief } from "./assignment";
import { PageBrief } from "./page";

// 漫画的基本信息，包含最新一章的摘要
export type ComicBrief = {
  id: string;

  collectionId: string;
  collectionIndex: string;
  index: number;

  author: string;
  title: string;
  isSeries: boolean;

  likesCount: number;
  tags: TagBrief[];

  isHidden: boolean;

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

  coverImageUrl?: string;

  collectionId: string;
  index: number;

  author: string;
  title: string;
  description?: string;
  isSeries: boolean;

  likesCount: number;
  tags: TagBrief[];

  pageCount: number;
  assignments: AssignmentBrief[];

  pages: PageBrief[];

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
