import { useState, useRef, useEffect } from "react";
import { WorkerQueue, WorkerQueueStatus } from "../util/workerQueue";
import {
  compressImage,
  selectImageFiles,
  openCompressDir,
} from "../ipc/compress";
import NatureButton from "../components/NatureButton";
import NatureSwitchButton from "../components/NatureSwitchButton";
import NatureTag from "../components/NatureTag";
import { Image, FileText } from "lucide-react";
import { useToast } from "../components/NotificationToast";
import "./CompressorPage.css";
import { Tag } from "../models/tag";

type ImageTask = {
  id: string;
  name: string;
  path: string;
  status: WorkerQueueStatus;
  error?: string;
};

// 默认最大并发数（用于初始化队列和线程选择）
const MAX_CONCURRENT = 8;

// 默认压缩参数
const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MIN_SCALE = 0.4;
const DEFAULT_MIN_QUALITY = 35;

const buildTag = (label: string, tagId: string): Tag => ({
  id: tagId,
  name: label,
  picaCandidates: [],
  ehentaiCandidates: [],
  creatorId: "system",
  createdAt: new Date(),
  updatedAt: new Date(),
});

export function CompressorPage() {
  const [tasks, setTasks] = useState<ImageTask[]>([]);

  const queueRef = useRef(new WorkerQueue<void>(MAX_CONCURRENT));
  const [threadCount, setThreadCount] = useState<number>(MAX_CONCURRENT);

  useEffect(() => {
    // 当线程数变化时，使用新的并发队列替换旧队列（仅影响后续加入的任务）
    queueRef.current = new WorkerQueue<void>(threadCount);
  }, [threadCount]);
  const { showToast } = useToast();
  const [maxBytes, setMaxBytes] = useState<number>(DEFAULT_MAX_BYTES);
  const [picaMode, setPicaMode] = useState<boolean>(false);
  const isFirstBatchRef = useRef<boolean>(true);

  const totalCount = tasks.length;
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const completedCount = tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;

  const updateTaskStatus = (
    taskId: string,
    status: WorkerQueueStatus,
    error?: string
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status, error } : task
      )
    );
  };

  const scheduleCompression = (
    taskId: string,
    path: string,
    prefix = "[content]",
    customMaxBytes?: number
  ) => {
    updateTaskStatus(taskId, "running", undefined);

    queueRef.current.addTask(
      async () => {
        console.log("Start compress:", path);

        const fileName = path.split(/[\\/]/).pop() || "compressed";
        const dstPath = `${prefix}${fileName}`;
        const targetMaxBytes = customMaxBytes ?? maxBytes;

        console.log("Validate path:", path);

        await compressImage(
          path,
          dstPath,
          targetMaxBytes,
          DEFAULT_MIN_SCALE,
          DEFAULT_MIN_QUALITY
        );

        console.log("Compress completed:", path);
      },
      () => {
        console.log("Task success:", taskId);

        updateTaskStatus(taskId, "completed", undefined);
      },
      (error) => {
        console.error("Task failed:", taskId, error);

        const errorMessage =
          error instanceof Error ? error.message : "未知错误";

        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, status: "failed", error: errorMessage }
              : task
          )
        );
      }
    );
  };

  // 处理点击上传
  const handleClickUpload = async () => {
    try {
      const selected = await selectImageFiles();

      if (!selected || selected.length === 0) return;

      processFilePaths(selected);
    } catch (error) {
      console.error("selectImageFiles failed", error);
      showToast("error", "选择文件失败");
    }
  };

  // 处理文件路径列表
  const processFilePaths = (paths: string[]) => {
    const isFirstBatch = isFirstBatchRef.current;

    const newTasks: ImageTask[] = paths.map((path) => {
      const name = path.split(/[\\/]/).pop() || path;

      return {
        id: `${Date.now()}-${Math.random()}`,
        name,
        path,
        status: "pending",
      };
    });

    setTasks((prev) => [...prev, ...newTasks]);

    newTasks.forEach((task, index) => {
      if (picaMode) {
        if (isFirstBatch && index === 0) {
          scheduleCompression(task.id, task.path, "[cover]", 512 * 1024);
        }

        scheduleCompression(task.id, task.path, "", 1024 * 1024);
      } else {
        scheduleCompression(task.id, task.path);
      }
    });

    if (isFirstBatch) {
      isFirstBatchRef.current = false;
    }
  };

  // 打开压缩目录
  const handleOpenCompressedDir = async () => {
    try {
      await openCompressDir();
      showToast("success", "已打开压缩目录");
    } catch (err) {
      console.error("openCompressDir failed", err);
      showToast("error", "打开目录失败");
    }
  };

  // 清除所有任务
  const handleClearTasks = () => {
    // 强制停止所有任务
    queueRef.current.clearAllTasks();

    // 清空任务列表
    setTasks([]);

    // 重置首批标记
    isFirstBatchRef.current = true;
  };

  // 重试单个失败任务
  const handleRetryTask = (taskId: string) => {
    const targetTask = tasks.find(
      (task) => task.id === taskId && task.status === "failed"
    );

    if (!targetTask) {
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: "pending", error: undefined }
          : task
      )
    );

    scheduleCompression(taskId, targetTask.path);
  };

  // 重试全部失败任务
  const handleRetryFailedGroup = () => {
    const failedTasks = tasks.filter((task) => task.status === "failed");

    if (failedTasks.length === 0) {
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.status === "failed"
          ? { ...task, status: "pending", error: undefined }
          : task
      )
    );

    failedTasks.forEach((task) => {
      scheduleCompression(task.id, task.path);
    });
  };

  // 获取状态文本
  const getStatusText = (status: WorkerQueueStatus): string => {
    switch (status) {
      case "pending":
        return "等待中";
      case "running":
        return "压缩中";
      case "completed":
        return "已完成";
      case "failed":
        return "失败";
      default:
        return "未知";
    }
  };

  // 获取状态样式类名
  const getStatusClassName = (status: WorkerQueueStatus): string => {
    return `image-item-status status-${status}`;
  };

  return (
    <div className="compressor-view">
      <div className="compressor-header">
        <div className="compressor-toolbar">
          <div className="toolbar-left">
            <label className="footer-label">压缩上限</label>
            <select
              className="max-bytes-select"
              value={maxBytes}
              onChange={(e) => setMaxBytes(Number(e.target.value))}
              disabled={picaMode}
            >
              <option value={5 * 1024 * 1024}>5 MB</option>
              <option value={1 * 1024 * 1024}>1 MB</option>
              <option value={512 * 1024}>512 KB</option>
            </select>

            <label className="footer-label">压缩线程数</label>
            <select
              className="threads-select"
              value={threadCount}
              onChange={(e) => setThreadCount(Number(e.target.value))}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={12}>12</option>
            </select>
          </div>

          <div className="toolbar-right">
            <NatureSwitchButton
              initialState="off"
              onToggle={(newState) => {
                const enabled = newState === "on";
                setPicaMode(enabled);
                isFirstBatchRef.current = true;
              }}
              onText="哔咔模式"
              offText="哔咔模式"
              height={36}
            />
          </div>
        </div>
      </div>

      <div className="compressor-content">
        {/* 点击上传区域 */}
        <div className="compressor-drop-zone" onClick={handleClickUpload}>
          <div className="drop-zone-icon">
            <Image />
          </div>
          <div className="drop-zone-text">点击选择图片（PNG/JPG）</div>
          <div className="drop-zone-hint">考虑到性能，不支持拖入</div>
        </div>

        {/* 右侧列表区域 */}
        <div className="compressor-list-panel">
          <div className="list-panel-header">
            <div className="list-panel-title">任务列表</div>

            <div className="status-tag-group">
              <NatureTag
                tag={buildTag(`压缩中 ${runningCount}`, "compress-running")}
                theme="theme-glacier"
              />
              <NatureTag
                tag={buildTag(`已完成 ${completedCount}`, "compress-completed")}
                theme="theme-mist"
              />
              <NatureTag
                tag={buildTag(`已失败 ${failedCount}`, "compress-failed")}
                theme="theme-rose"
                onClick={
                  failedCount > 0 ? () => handleRetryFailedGroup() : undefined
                }
              />
              <NatureTag
                tag={buildTag(`总数 ${totalCount}`, "compress-total")}
                theme="theme-amber"
              />
            </div>
          </div>

          <div className="list-panel-content">
            {tasks.length === 0 ? (
              <div className="empty-list">
                <div className="empty-list-icon">
                  <FileText />
                </div>
                <div className="empty-list-text">暂无压缩任务</div>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="image-item">
                  <div className="image-item-name" title={task.name}>
                    {task.name}
                  </div>

                  <div className="image-item-meta">
                    <div
                      className={getStatusClassName(task.status)}
                      title={task.error}
                    >
                      {getStatusText(task.status)}
                    </div>

                    {task.status === "failed" && (
                      <button
                        className="retry-button"
                        onClick={() => handleRetryTask(task.id)}
                      >
                        重试
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="list-panel-footer">
            <div className="button-wrapper">
              <NatureButton
                onClick={handleRetryFailedGroup}
                disabled={failedCount === 0}
                variant="cloud"
              >
                重试所有失败
              </NatureButton>
            </div>

            <div className="button-wrapper">
              <NatureButton
                onClick={handleClearTasks}
                variant="rose"
                disabled={tasks.length === 0}
              >
                清除已有任务
              </NatureButton>
            </div>

            <div className="button-wrapper">
              <NatureButton onClick={handleOpenCompressedDir}>
                打开压缩目录
              </NatureButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
