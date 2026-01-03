// 翻校单元，每个标记的所有信息，包括位置和翻译文本
export type Unit = {
  id: string;
  x: number; // 相对于漫画页左上角的 X 坐标，是 [0, 1] 之间的比例值
  y: number; // 相对于漫画页左上角的 Y 坐标，是 [0, 1] 之间的比例值
  indexInPage: number; // 在漫画页中的索引位置，从 0 开始
  isInbox: boolean; // 是否是框内翻译（相反的为框外翻译）
  translatedText?: string; // 翻译提供的文本
  isProoved: boolean; // 翻译文本是否已校对，默认为 false
  proovedText?: string; // 校对提供的文本，优先级高于 translatedText
  comment?: string;
};

// 漫画页，包含多个标记以及相关的信息
export type Page = {
  id: string;
  localImageUrl?: string; // 漫画页在本地的存储路径（可选)
  remoteImageUrl?: string; // 漫画页的远程 URL 地址（可选）
};

/* // 漫画页元数据，包含基本信息但不含单元列表
export type PageMeta = {
  id: string;
  localImageUrl?: string; // 漫画页在本地的存储路径（可选)
  remoteImageUrl?: string; // 漫画页的远程 URL 地址（可选）
  translatedUnitCount: number; // 已翻译的单元数量
  proovedUnitCount: number; // 已校对的单元数量
  inboxUnitCount?: number; // 框内单元数量
  outboxUnitCount?: number; // 框外单元数量
}; */

// 翻校项目，包含多个漫画页以及相关的信息
export type Project = {
  id: string;
  author: string;
  title: string;
  localImageDir?: string; // 项目在本地的存储路径（可选）
  relatedRemoteComicId?: string; // 关联的漫画 ID（可选），当项目关联在线漫画时存在
  unitCount: number; // 翻校单元总数量
  translatedUnitCount: number; // 已翻译的翻校单元数量
  proovedUnitCount: number; // 已校对的翻校单元数量
  inboxUnitCount?: number; // 框内单元总数量
  outboxUnitCount?: number; // 框外单元总数量
  pageCount: number; // 漫画页总数量
  updatedAt?: string; // 最后更新时间（ISO 8601 格式，可选）
};

// 新建本地项目时使用的类型
export type NewLocalProject = {
  author: string;
  title: string;
  localImageDir: string;
};

// 从远程漫画创建新项目时使用的类型
export type NewRemoteProject = {
  id: string;
  author: string;
  title: string;
  relatedRemoteComicId: string;
  unitCount: number;
  translatedUnitCount: number;
  proovedUnitCount: number;
  inboxUnitCount?: number;
  outboxUnitCount?: number;
  pageCount: number;
};
