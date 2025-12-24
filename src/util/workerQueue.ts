// 带容量控制的并发任务队列
export type WorkerTask<T> = () => Promise<T>;

export type WorkerQueueStatus = "pending" | "running" | "completed" | "failed";

export type WorkerQueueItem<T> = {
  task: WorkerTask<T>;
  status: WorkerQueueStatus;
  result?: T;
  error?: Error;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
};

export class WorkerQueue<T = unknown> {
  private capacity: number;
  private queue: WorkerQueueItem<T>[] = [];
  private running: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  // 添加任务到队列
  addTask(
    task: WorkerTask<T>,
    onComplete?: (result: T) => void,
    onError?: (error: Error) => void
  ): WorkerQueueItem<T> {
    const item: WorkerQueueItem<T> = {
      task,
      status: "pending",
      onComplete,
      onError,
    };

    this.queue.push(item);
    this.processQueue();

    return item;
  }

  // 处理队列
  private async processQueue(): Promise<void> {
    while (this.running < this.capacity && this.queue.length > 0) {
      const item = this.queue.find((i) => i.status === "pending");

      if (!item) break;

      item.status = "running";
      this.running++;

      this.executeTask(item);
    }
  }

  // 执行单个任务
  private async executeTask(item: WorkerQueueItem<T>): Promise<void> {
    try {
      const result = await item.task();

      item.status = "completed";
      item.result = result;

      if (item.onComplete) {
        item.onComplete(result);
      }
    } catch (error) {
      item.status = "failed";
      item.error = error as Error;

      if (item.onError) {
        item.onError(error as Error);
      }
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  // 获取队列状态
  getQueueStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      pending: this.queue.filter((i) => i.status === "pending").length,
      running: this.queue.filter((i) => i.status === "running").length,
      completed: this.queue.filter((i) => i.status === "completed").length,
      failed: this.queue.filter((i) => i.status === "failed").length,
    };
  }

  // 清空队列
  clear(): void {
    this.queue = [];
    this.running = 0;
  }

  // 强制停止所有任务并清空队列
  clearAllTasks(): void {
    this.queue.forEach((item) => {
      if (item.status === "running") {
        item.status = "failed";
        item.error = new Error("Task was forcibly stopped.");

        if (item.onError) {
          item.onError(item.error);
        }
      }
    });

    this.clear();
  }

  // 获取所有任务
  getAllTasks(): WorkerQueueItem<T>[] {
    return this.queue;
  }
}
