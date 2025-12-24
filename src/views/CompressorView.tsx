import { useState, useRef } from 'react';
import { WorkerQueue, WorkerQueueStatus } from '../util/workerQueue';
import { compressImage, selectImageFiles, openCompressDir } from '../ipc/compress';
import NatureButton from '../components/NatureButton';
import { Image, FileText } from 'lucide-react';
import { useToast } from '../components/NotificationToast';
import './CompressorView.css';

type ImageTask = {
  id: string;
  name: string;
  status: WorkerQueueStatus;
  error?: string;
};

// 最大并发数
const MAX_CONCURRENT = 5;

// 默认压缩参数
const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MIN_SCALE = 0.4;
const DEFAULT_MIN_QUALITY = 35;

export function CompressorView() {
  const [tasks, setTasks] = useState<ImageTask[]>([]);

  const queueRef = useRef(new WorkerQueue<void>(MAX_CONCURRENT));
  const { showToast } = useToast();
  const [maxBytes, setMaxBytes] = useState<number>(DEFAULT_MAX_BYTES);

  // 处理点击上传
  const handleClickUpload = async () => {
    try {
      const selected = await selectImageFiles();

      if (!selected || selected.length === 0) return;

      processFilePaths(selected);
    } catch (error) {
      console.error('selectImageFiles failed', error);
      showToast('error', '选择文件失败');
    }
  };

  // 处理文件路径列表
  const processFilePaths = (paths: string[]) => {
    const newTasks: ImageTask[] = paths.map((path) => {
      const name = path.split(/[\\/]/).pop() || path;

      return {
        id: `${Date.now()}-${Math.random()}`,
        name,
        status: 'pending',
      };
    });

    setTasks((prev) => [...prev, ...newTasks]);

    paths.forEach((path, index) => {
      const taskId = newTasks[index].id;

      // 先标记为 running
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'running' } : t))
      );

      queueRef.current.addTask(
        async () => {
          console.log('开始压缩:', path);

          const fileName = path.split(/[\\/]/).pop() || 'compressed';
          const dstPath = `compressed_${Date.now()}_${fileName}`;

          console.log('验证路径:', path);

          await compressImage(path, dstPath, maxBytes, DEFAULT_MIN_SCALE, DEFAULT_MIN_QUALITY);

          console.log('压缩完成:', path);
        },
        () => {
          console.log('任务成功:', taskId);
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
          );
        },
        (error) => {
          console.error('任务失败:', taskId, error);
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: 'failed', error: error.message } : t))
          );
        }
      );
    });
  };

  // 打开压缩目录
  const handleOpenCompressedDir = async () => {
    try {
      await openCompressDir();
      showToast('success', '已打开压缩目录');
    } catch (err) {
      console.error('openCompressDir failed', err);
      showToast('error', '打开目录失败');
    }
  };

  // 清除所有任务
  const handleClearTasks = () => {
    // 强制停止所有任务
    queueRef.current.clearAllTasks();

    // 清空任务列表
    setTasks([]);
  };

  // 获取状态文本
  const getStatusText = (status: WorkerQueueStatus): string => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'running':
        return '压缩中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  // 获取状态样式类名
  const getStatusClassName = (status: WorkerQueueStatus): string => {
    return `image-item-status status-${status}`;
  };

  return (
    <div className="compressor-view">
      <h1 className="compressor-title">压图工具</h1>

      <div className="compressor-content">
        {/* 点击上传区域 */}
        <div
          className="compressor-drop-zone"
          onClick={handleClickUpload}
        >
          <div className="drop-zone-icon"><Image /></div>
          <div className="drop-zone-text">点击选择图片</div>
          <div className="drop-zone-hint">支持 PNG 和 JPG 格式</div>
        </div>

        {/* 右侧列表区域 */}
        <div className="compressor-list-panel">
          <div className="list-panel-header">任务列表</div>

          <div className="list-panel-content">
            {tasks.length === 0 ? (
              <div className="empty-list">
                <div className="empty-list-icon"><FileText /></div>
                <div className="empty-list-text">暂无压缩任务</div>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="image-item">
                  <div className="image-item-name" title={task.name}>
                    {task.name}
                  </div>
                  <div className={getStatusClassName(task.status)}>
                    {getStatusText(task.status)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="list-panel-footer">
            <div className="footer-left" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: 8 }}>压缩上限</label>
              <select
                className="max-bytes-select"
                value={maxBytes}
                onChange={(e) => setMaxBytes(Number(e.target.value))}
              >
                <option value={5 * 1024 * 1024}>5 MB</option>
                <option value={1 * 1024 * 1024}>1 MB</option>
                <option value={512 * 1024}>512 KB</option>
              </select>
            </div>

            <div className="button-wrapper">
              <NatureButton onClick={handleOpenCompressedDir}>
                打开压缩目录
              </NatureButton>
            </div>

            <div className="button-wrapper">
              <NatureButton onClick={handleClearTasks}>
                清除已有任务
              </NatureButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
