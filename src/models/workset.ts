// 作品集的详细信息
export type Workset = {
  id: string;
  index: number;
  name: string;
  comicCount: number;
  description?: string;
  creatorId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// 用于创建或更新作品集的数据结构
export type NewWorkset = {
  index: number;
  description?: string;
};

// 更新作品集时使用的类型
export type PatchWorkset = {
  description?: string;
};
