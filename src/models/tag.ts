// 标签类型定义
export type Tag = {
  tagId: string;
  name: string;
  picaCandidates?: string[]; // 可选的 Pica 对应 tag
  ehentaiCandidates?: string[]; // 可选的 EHentai 对应 tag
};
