// 漫画列表筛选选项

export type ProgressStatus = "not-started" | "in-progress" | "completed";

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  "not-started": "未开始",
  "in-progress": "进行中",
  completed: "已完成",
};

export type ComicFilterOptions = {
  searchText: string;
  collectionId: string | null;
  translationStatus: ProgressStatus | null;
  proofreadingStatus: ProgressStatus | null;
  typesettingStatus: ProgressStatus | null;
  reviewStatus: ProgressStatus | null;
  publishStatus: ProgressStatus | null;
};

export const DEFAULT_FILTER_OPTIONS: ComicFilterOptions = {
  searchText: "",
  collectionId: null,
  translationStatus: null,
  proofreadingStatus: null,
  typesettingStatus: null,
  reviewStatus: null,
  publishStatus: null,
};
