// 工作集的详细信息
export type Collection = {
  id: string;

  teamId: string;
  // 作品集名称
  name: string;

  comicCount: number;

  createdAt: Date;
  updatedAt: Date;
};

// 用于创建或更新作品集的数据结构
export type NewCollection = {
  teamId: string;
  name: string;
};
