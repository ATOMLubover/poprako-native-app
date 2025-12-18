import { ReactNode } from "react";

// 列表项的配置类型
export type ListItemConfig = {
  id: string;
  height: number;
  content: ReactNode;
};

/**
 * 小项目高度数据（40px）
 * 用于演示自适应列表处理小尺寸项的能力
 */
export const smallHeightItems: ListItemConfig[] = Array.from(
  { length: 10 },
  (_, i) => ({
    id: `small-item-${i}`,
    height: 40,
    content: `小项 ${String.fromCharCode(65 + i)} (40px)`,
  })
);

/**
 * 大项目高度数据（80px）
 * 用于演示自适应列表处理大尺寸项的能力
 */
export const largeHeightItems: ListItemConfig[] = Array.from(
  { length: 10 },
  (_, i) => ({
    id: `large-item-${i}`,
    height: 80,
    content: `大项 ${String.fromCharCode(65 + i)} (80px)`,
  })
);
