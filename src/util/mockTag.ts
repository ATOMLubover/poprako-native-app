import type { Tag } from "../models/tag";

/**
 * 创建 mock Tag 对象
 * 用于测试和演示，填充必需字段
 */
export function createMockTag(id: string, name: string): Tag {
  return {
    id,
    name,
    picaCandidates: [],
    ehentaiCandidates: [],
    creatorId: "mock-creator",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 为兼容旧代码，支持从 TagBrief 转换为 Tag
 */
export function tagBriefToTag(brief: { id: string; name: string }): Tag {
  return createMockTag(brief.id, brief.name);
}
