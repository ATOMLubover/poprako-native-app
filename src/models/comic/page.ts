// 漫画页的基本元信息
export type PageBrief = {
  id: string;

  index: number;
  unitCount: number;
  translatedCount: number;
  proovedCount: number;

  inboxCount: number;
  outboxCount: number;

  imageUrl: string;

  createdAt: Date;
  updatedAt: Date;
};
