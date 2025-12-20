// 标签类型定义
export type Tag = {
  tagId: string;
  name: string;
  isPinned: boolean; // 是否置顶
  likedNum: number; // 点赞数
  picaCandidates?: string[]; // 可选的 Pica 对应 tag
  ehentaiCandidates?: string[]; // 可选的 EHentai 对应 tag
};

// 新建标签时使用的类型
export type NewTag = {
  name: string;
  picaCandidates?: string[];
  ehentaiCandidates?: string[];
};

// 更新标签时使用的类型
export type PatchTag = Partial<NewTag>;
