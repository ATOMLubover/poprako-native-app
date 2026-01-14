// 漫画翻译单元类型定义
export type ComicUnit = {
  id: string;

  pageId: string;
  index: number;

  xCoordinate: number;
  yCoordinate: number;

  isInBox: boolean;

  translatedText?: string;
  translatorId: string;
  translatorComment?: string;

  provedText?: string;
  proved: boolean;
  proofreaderId: string;
  proofreaderComment?: string;

  creatorId: string;

  createdAt: Date;
  updatedAt: Date;
};

// 新建漫画单元时使用的类型
export type NewComicUnit = {
  pageId: string;
  index: number;
  xCoordinate: number;
  yCoordinate: number;
  isInBox?: boolean;
  translatorId: string;
  proofreaderId: string;
};

// 更新漫画单元时使用的类型
export type PatchComicUnit = {
  translatedText?: string;
  translatorComment?: string;
  provedText?: string;
  proved?: boolean;
  proofreaderComment?: string;
};
