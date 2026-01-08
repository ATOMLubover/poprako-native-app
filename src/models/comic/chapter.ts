// 漫画章节的基本信息
export type ChapterInfo = {
  id: string;

  index: string;
  name: string;

  pageCount: number;

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
