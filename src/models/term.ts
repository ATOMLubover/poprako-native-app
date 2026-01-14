// 术语库基础类型
export type Termbase = {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
};

// 新建术语库时使用的类型
export type NewTermbase = {
  name: string;
  description?: string;
};

// 术语类型定义
export type Term = {
  id: string;
  termbaseId: string;
  sourceText: string;
  targetText: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
};

// 新建术语时使用的类型
export type NewTerm = {
  termbaseId: string;
  sourceText: string;
  targetText: string;
};

// 更新术语时使用的类型
export type PatchTerm = {
  sourceText?: string;
  targetText?: string;
};
