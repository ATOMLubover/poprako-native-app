// 漫画页的基本元信息
export type PageBrief = {
  id: string;

  comicId: string;
  index: number;

  ossKey: string;
  sizeBytes: number;

  uploaded: boolean;

  unitCount: number;
  translatedCount: number;
  proovedCount: number;

  inboxCount: number;
  outboxCount: number;

  createdAt: Date;
  updatedAt: Date;
};

// 新建漫画页时使用的类型
export type NewPage = {
  comicId: string;
  index: number;
  ossKey: string;
  sizeBytes: number;
};
