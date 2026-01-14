import type { ComicInfo } from "../models/comic/comic";

/**
 * Mock 函数：模拟从服务器获取漫画详细信息
 */
async function __mockGetComicInfo(comicId: string): Promise<ComicInfo> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockInfo: ComicInfo = {
    id: comicId,
    // coverImageUrl: undefined,
    worksetId: "collection-1",
    worksetIndex: 1,
    index: 1,
    author: "示例作者",
    title: "示例漫画标题",
    description: "这是一个示例漫画的详细描述，用于展示漫画详情卡片的功能。",
    likesCount: 42,
    // tags: [
    //   { tagId: "tag-1", name: "搞笑" },
    //   { tagId: "tag-2", name: "日常" },
    // ],
    pageCount: 24,
    assignments: [
      {
        userId: "user-1",
        userNickname: "翻译员A",
        assignedTranslatorAt: new Date(),
      },
      {
        userId: "user-2",
        userNickname: "校对员B",
        assignedProofreaderAt: new Date(),
      },
    ],
    pages: [],
    translatingStartedAt: new Date(),
    translatingCompletedAt: undefined,
    proofreadingStartedAt: undefined,
    proofreadingCompletedAt: undefined,
    typesettingStartedAt: undefined,
    typesettingCompletedAt: undefined,
    reviewingCompletedAt: undefined,
    uploadingCompletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    creatorId: "testuser",
  };

  return mockInfo;
}

/**
 * 获取漫画详细信息
 */
export async function getComicInfo(comicId: string): Promise<ComicInfo> {
  return __mockGetComicInfo(comicId);
}
