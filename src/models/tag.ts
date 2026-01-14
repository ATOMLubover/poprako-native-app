// 标签类型定义
export type Tag = {
  id: string;
  name: string;
  picaCandidates: string[];
  ehentaiCandidates: string[];
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
};

// 新建标签时使用的类型
export type NewTag = {
  name: string;
  picaCandidates?: string[];
  ehentaiCandidates?: string[];
};

// 更新标签时使用的类型
export type PatchTag = Partial<NewTag>;

// 简单标签类型定义
export type TagBrief = {
  id: string;
  name: string;
};
