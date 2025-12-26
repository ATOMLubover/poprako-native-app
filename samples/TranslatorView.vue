<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useToastStore } from '../stores/toast';
import { useCacheStore } from '../stores/cache';
import {
  createSource,
  deleteSource,
  getPageSources,
  proxyImage,
  submitTranslation,
  updateTranslation,
  updateSource,
} from '../ipc/project';
import { loadCachedFile } from '../ipc/image_cache';
import type { PageTranslation } from '../ipc/project';
import LoadingCircle from '../components/LoadingCircle.vue';

// Constants
const DEFAULT_EDITOR_POSITION = { x: 50, y: 50 };
const DEFAULT_EDITOR_SIZE = { width: 400, height: 300 };
const PANEL_COLLAPSE_BREAKPOINT = 768;
const WORKSPACE_VERTICAL_OFFSET = 100;
const PANEL_COLLAPSED_WIDTH = 50;
const PANEL_WIDTH_RATIO = 0.3;
const MARKER_REFERENCE_WIDTH = 1920;
const MAX_MARKER_VIEWPORT_SCALE = 2.0;
const MIN_MARKER_VIEWPORT_SCALE = 0.5;
const ZOOM_STEP = 0.25;
const PANNING_THRESHOLD = 10;
const WORKSPACE_BOTTOM_GUTTER = 20;
const KEYBOARD_ZOOM_RATIO = 0.1;
const KEYBOARD_PAN_STEP = 50;

interface SourcePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 强制绕过一切内存/本地缓存，直接向后端请求代理图片并替换当前页图片（用于手动刷新）
async function forceReloadImage(): Promise<void> {
  const file = props.files[currentPageIndex.value];

  if (!file) {
    showToast('当前页无图片可刷新', 'error');
    return;
  }

  const key = makeImageCacheKey(props.projectId, file.id);

  try {
    // 直接请求后端代理，不走本地缓存
    const reply = await proxyImage(file.url);

    const url = createObjectUrlFromBase64(reply.b64, reply.content_type);

    // 将新 URL 写入内存缓存（会撤销旧的 objectURL）
    cacheStore.storeImageCacheEntry(key, url);

    // 更新当前页面引用并替换 img.src
    currentImageObjectUrl.value = url;
    if (projectPage.value) projectPage.value.imageUrl = url;

    // 尝试找到当前 img 元素并替换 src
    const img = imageWrapperRef.value?.querySelector('img.board__image') as HTMLImageElement | null;
    if (img) {
      img.src = url;
    }

    showToast('已刷新图片');
  } catch (err) {
    console.error('强制刷新图片失败', err);
    showToast('刷新图片失败', 'error');
  }
}

type SourceStatus = 'empty' | 'translated' | 'proofed';

type SourceCategory = 'outside' | 'inside';

interface TranslationRecord {
  id: string;
  content: string;
  proofreadContent: string;
  selected: boolean;
  isMine: boolean;
}

interface TranslationSource {
  id: string;
  category: SourceCategory;
  status: SourceStatus;
  translationText: string;
  proofText: string;
  position: SourcePosition;
  records: TranslationRecord[];
  myTranslationId: string | null;
  selectedTranslationId: string | null;
  primaryTranslationId: string | null;
  serverTranslationText: string;
  serverProofText: string;
}

interface ProjectPageData {
  imageUrl: string;
  pageIndex: number;
  pageCount: number;
  title: string;
  sources: TranslationSource[];
}

interface SourceLabelInfo {
  number: string;
  suffix: string;
}

// interface ShortcutHint {
//   combo: string;
//   description: string;
// }

// 全局 toast store
const toastStore = useToastStore();

// 全局 cache store
const cacheStore = useCacheStore();

// 传入：项目 ID、目标语言 ID、文件列表、当前页索引、是否具备编辑权限、初始模式
interface FileInfo {
  id: string;
  name: string;
  sourceCount: number;
  url: string; // 图片URL（Moetran API 总是返回）
}

function makeImageCacheKey(projectId: string, fileId: string): string {
  return `${projectId}::${fileId}`;
}

function createObjectUrlFromBase64(b64: string, contentType: string): string {
  const binary = atob(b64);

  const length = binary.length;

  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: contentType });

  return URL.createObjectURL(blob);
}

// 测试 object URL 是否仍然有效（未被 revoke 且能被加载）
function testImageUrlAlive(url: string, timeout = 3000): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;

    const timer = window.setTimeout(() => {
      if (!done) {
        done = true;
        console.debug('[testImageUrlAlive] Timeout for URL:', url);
        resolve(false);
      }
    }, timeout);

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        console.debug('[testImageUrlAlive] URL is alive:', url);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        console.debug('[testImageUrlAlive] URL failed to load:', url);
        resolve(false);
      }
    };

    img.src = url;
  });
}

async function fetchImageForFile(projectId: string, file: FileInfo): Promise<string> {
  const key = makeImageCacheKey(projectId, file.id);

  console.log('[fetchImageForFile] Start fetching image', { projectId, fileId: file.id, key });

  const cached = cacheStore.promoteImageCacheEntry(key);

  if (cached) {
    console.log('[fetchImageForFile] Found cached object URL', { key, url: cached });

    // 健康检测：确认该 object URL 仍然可用
    const alive = await testImageUrlAlive(cached);

    if (alive) {
      console.log('[fetchImageForFile] Cached URL is alive, reusing', { key });
      return cached;
    }

    console.warn('[fetchImageForFile] Cached URL is dead (revoked or invalid), will fallback', {
      key,
      url: cached,
    });

    // 从内存缓存中移除已失效的 URL
    cacheStore.imageCache.delete(key);
  }

  let pending = cacheStore.imageFetches.get(key);

  if (!pending) {
    pending = (async () => {
      console.log('[fetchImageForFile] No pending fetch, creating new fetch promise', { key });

      // 检查是否已有磁盘缓存
      const hasDiskCache = cacheStore.getProjectFileCacheState(projectId);
      console.log('[fetchImageForFile] Disk cache state for project', {
        projectId,
        hasDiskCache,
      });

      // 优先尝试从本地缓存加载
      if (hasDiskCache !== false) {
        try {
          const fileIndex = props.files.findIndex(f => f.id === file.id);
          console.log('[fetchImageForFile] Attempting to load from disk cache', {
            projectId,
            fileIndex,
          });

          if (fileIndex !== -1) {
            const cachedData = await loadCachedFile(projectId, fileIndex);

            if (cachedData) {
              console.log('[fetchImageForFile] Loaded from disk cache successfully', {
                projectId,
                fileIndex,
                contentType: cachedData.content_type,
              });

              const url = createObjectUrlFromBase64(cachedData.b64, cachedData.content_type);

              cacheStore.storeImageCacheEntry(key, url);

              return url;
            } else {
              console.log('[fetchImageForFile] Disk cache returned null, fallback to proxy', {
                projectId,
                fileIndex,
              });
            }
          }
        } catch (err) {
          // 本地缓存读取失败，回退到网络加载
          console.warn('[fetchImageForFile] Disk cache read failed, fallback to proxy', err);
        }
      }

      // 回退到网络代理
      console.log('[fetchImageForFile] Fetching via proxyImage', { fileUrl: file.url });

      const reply = await proxyImage(file.url);

      console.log('[fetchImageForFile] proxyImage succeeded', {
        contentType: reply.content_type,
      });

      const url = createObjectUrlFromBase64(reply.b64, reply.content_type);

      cacheStore.storeImageCacheEntry(key, url);

      return url;
    })();

    cacheStore.imageFetches.set(key, pending);
  } else {
    console.log('[fetchImageForFile] Found pending fetch, awaiting', { key });
  }

  try {
    const url = await pending;

    cacheStore.promoteImageCacheEntry(key);

    console.log('[fetchImageForFile] Final URL obtained', { key, url });

    return url;
  } finally {
    cacheStore.imageFetches.delete(key);
  }
}

const props = defineProps<{
  projectId: string;
  targetId: string;
  files: FileInfo[];
  pageIndex: number;
  isEnabled: boolean;
  initialMode?: 'translate' | 'read'; // 初始模式：translate=翻校, read=阅览
  hasPoprako: boolean;
  isProofreader: boolean;
}>();

// 是否允许编辑（参与者）
const canEdit = computed(() => props.isEnabled);

// 是否允许切换到翻校模式：只有初始就是翻校模式才能切换回去
const canSwitchToEdit = computed(() => {
  return props.isEnabled && props.initialMode === 'translate';
});

const emit = defineEmits<{
  (event: 'update:pageIndex', value: number): void;
  (event: 'back'): void;
}>();

const MIN_ZOOM = 0.6;

const MAX_ZOOM = 2.4;

const MIN_WORKSPACE_HEIGHT = 420;
async function addSourceAtPointer(
  event: MouseEvent | PointerEvent,
  category: SourceCategory,
  activate = true
): Promise<void> {
  if (!canEdit.value) return;

  const wrapper = imageWrapperRef.value;
  const currentFile = props.files[currentPageIndex.value];

  if (!wrapper || !projectPage.value || !currentFile) {
    return;
  }

  const rect = wrapper.getBoundingClientRect();

  // 屏幕坐标 -> wrapper本地坐标（考虑zoom和pan）-> 图像相对坐标(0-1)
  const wrapperLocalX = (event.clientX - rect.left) / zoom.value;
  const wrapperLocalY = (event.clientY - rect.top) / zoom.value;

  // wrapper的原始尺寸就是rect.width和rect.height除以zoom
  const originalWidth = rect.width / zoom.value;
  const originalHeight = rect.height / zoom.value;

  const relativeX = wrapperLocalX / originalWidth;
  const relativeY = wrapperLocalY / originalHeight;

  if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
    return;
  }

  if (!props.targetId) {
    showToast('缺少目标语言', 'error');

    return;
  }

  const clampedX = Math.min(Math.max(relativeX, 0), 1);
  const clampedY = Math.min(Math.max(relativeY, 0), 1);

  const positionType = category === 'inside' ? 1 : 2;

  try {
    const created = await createSource({
      fileId: currentFile.id,
      targetId: props.targetId,
      positionType,
      x: clampedX,
      y: clampedY,
    });

    const records: TranslationRecord[] = [];

    if (created.myTranslation) {
      records.push(toTranslationRecord(created.myTranslation, true));
    }

    (created.translations || []).forEach(item => {
      records.push(toTranslationRecord(item, false));
    });

    const proofed = records.find(item => item.selected);
    const mine = records.find(item => item.isMine);
    const primary = proofed || mine || records[0];

    const translationText = primary?.content ?? '';
    const proofText = primary?.proofreadContent ?? '';

    const newSource: TranslationSource = {
      id: created.id,
      category,
      // Status is determined solely by the `selected` flag on any record
      status: records.some(r => r.selected === true)
        ? 'proofed'
        : translationText
          ? 'translated'
          : 'empty',
      translationText,
      proofText,
      position: {
        x: created.x,
        y: created.y,
        width: 0,
        height: 0,
      },
      records,
      myTranslationId: mine?.id ?? null,
      selectedTranslationId: proofed?.id ?? null,
      primaryTranslationId: primary?.id ?? null,
      serverTranslationText: translationText,
      serverProofText: proofText,
    };

    sources.value = [...sources.value, newSource];

    persistPageSources(currentPageIndex.value);

    if (activate) {
      activeSourceId.value = newSource.id;
      editorTranslationText.value = '';
      editorProofText.value = '';
    }

    showToast('翻译源已创建');
  } catch (error) {
    console.error('创建翻译源失败', error);
    showToast('创建翻译源失败', 'error');
  }
}

const SHORTCUT_HINTS = computed(() => {
  const baseHints = [
    {
      combo: 'Ctrl + ↑ / ↓ / ← / →',
      description: '按当前缩放比例平移画布视图',
    },
    {
      combo: 'Ctrl + + / Ctrl + -',
      description: '一次调整 25% 的缩放比例',
    },
  ];

  // 阅览模式：只有基本导航快捷键
  if (!canEdit.value) {
    return [
      ...baseHints,
      {
        combo: 'Ctrl + D',
        description: '下一页',
      },
      {
        combo: 'Ctrl + U',
        description: '上一页',
      },
    ];
  }

  // 翻校模式：所有编辑快捷键
  const editHints = [
    {
      combo: 'Tab',
      description: '切换到下一个标记',
    },
    {
      combo: 'Ctrl + L',
      description: '收起或展开源列表',
    },
    {
      combo: 'Ctrl + `',
      description: '显示/隐藏编辑器',
    },
    {
      combo: 'Ctrl + P',
      description: '切换翻译/校对模式',
    },
    {
      combo: 'Ctrl + F',
      description: '切换自动重定位',
    },
    {
      combo: 'Ctrl + D',
      description: '下一页',
    },
    {
      combo: 'Ctrl + U',
      description: '上一页',
    },
    ...baseHints,
  ];

  // 在校对模式下添加校对专用快捷键
  if (isProofMode.value) {
    editHints.push({
      combo: 'Ctrl + Enter',
      description: '提交校对',
    });
    editHints.push({
      combo: 'Ctrl + T',
      description: '将当前聚焦的翻译文本复制到校对框（不会确认校对）',
    });
    editHints.push({
      combo: 'Ctrl + A + T',
      description: '将当前页所有翻译文本复制到对应的校对框（不会确认校对）',
    });
    editHints.push({
      combo: 'Ctrl + A + Enter',
      description: '确认当前页所有标记为校对状态（有无翻译的源则失败）',
    });
  }

  return editHints;
});

const SPECIAL_SYMBOLS = [
  '★',
  '✰',
  '❤',
  '♥',
  '♡',
  '♂',
  '♁',
  '❈',
  '•',
  '♩',
  '♪',
  '♫',
  '◯',
  '✕',
  '「',
  '」',
  '『',
  '』',
];

const currentPageIndex = ref(props.pageIndex);

const projectPage = ref<ProjectPageData | null>(null);
const currentImageObjectUrl = ref<string | null>(null);

const sources = ref<TranslationSource[]>([]);

let previousPageIndex: number | null = null;

let hasInitialWarmup = false;

const pageInputValue = ref(currentPageIndex.value + 1);

const zoom = ref(1);

const pan = ref({ x: 0, y: 0 });

const activeSourceId = ref<string | null>(null);

// 控制 editor 是否应该显示（独立于 activeSourceId）
const showEditor = ref(false);

const isLoading = ref(false);

// 编辑器持有的独立副本，用于在切换页时保持显示内容
const editorSource = ref<TranslationSource | null>(null);

const editorTranslationText = ref('');

const editorProofText = ref('');

const isSubmittingProof = ref(false);

// 根据initialMode设置初始activeMode
const activeMode = ref<'translate' | 'proof'>(props.initialMode === 'read' ? 'proof' : 'translate');

const isProofMode = computed(() => activeMode.value === 'proof');

const translationTextareaRef = ref<HTMLTextAreaElement | null>(null);

const proofTextareaRef = ref<HTMLTextAreaElement | null>(null);

const editorPosition = ref({ ...DEFAULT_EDITOR_POSITION });

const editorSize = ref({ ...DEFAULT_EDITOR_SIZE });

const isDraggingEditor = ref(false);

const editorPointerStart = ref({ x: 0, y: 0 });

const editorPositionStart = ref({ ...DEFAULT_EDITOR_POSITION });

// 是否正在调整编辑器大小
const isResizingEditor = ref(false);

// 调整大小时的起始信息
const editorResizeStart = ref({
  x: 0,
  y: 0,
  width: editorSize.value.width,
  height: editorSize.value.height,
});

const imageWrapperRef = ref<HTMLDivElement | null>(null);

const panelRef = ref<HTMLElement | null>(null);

const boardRef = ref<HTMLElement | null>(null);

const workspaceRef = ref<HTMLElement | null>(null);

const windowSize = ref({ width: window.innerWidth, height: window.innerHeight });

const hasPanelOverride = ref(false);

const isPanelCollapsed = ref(window.innerWidth < PANEL_COLLAPSE_BREAKPOINT);

const isAutoRelocateEnabled = ref(false);

const draggingSourceId = ref<string | null>(null);

const markerDragOffset = ref({ x: 0, y: 0 });

const isCanvasPointerDown = ref(false);

const isPanningCanvas = ref(false);

const canvasPointerId = ref<number | null>(null);

const canvasPointerStart = ref({ x: 0, y: 0 });

const panStart = ref({ x: 0, y: 0 });

const lastCanvasPointerEvent = ref<PointerEvent | null>(null);

const canvasPointerButton = ref<0 | 2 | null>(null);

const panelHeightPx = ref<number | null>(null);

const workspaceHeightPx = ref<number | null>(null);

let latestPageLoadToken = 0;

const pageSourceStore = new Map<string, TranslationSource[]>();

// 增量更新追踪：translationId -> 待更新的内容
const pendingContentUpdates = new Map<string, string>();
const pendingProofreadUpdates = new Map<string, string>();
const pendingSelectedUpdates = new Map<string, boolean>();

let pendingFlushTimeout: number | null = null;

const FLUSH_DELAY = 1500; // 1.5秒后自动提交

const hasEditorBeenDragged = ref(false);

let boardResizeObserver: ResizeObserver | null = null;

const isShortcutHelpVisible = ref(false);

const shortcutHelpRef = ref<HTMLDivElement | null>(null);

// 跟踪当前按下的按键（用于检测组合 Ctrl + A + Enter）
const _pressedKeys = new Set<string>();

// 确认删除对话框状态
const confirmVisible = ref(false);
const confirmMessage = ref('');
const confirmResolve = ref<((value: boolean) => void) | null>(null);

function showConfirm(message: string): Promise<boolean> {
  confirmMessage.value = message;
  confirmVisible.value = true;

  return new Promise<boolean>(resolve => {
    confirmResolve.value = resolve;
  });
}

function confirmOk(): void {
  confirmVisible.value = false;

  if (confirmResolve.value) {
    confirmResolve.value(true);
    confirmResolve.value = null;
  }
}

function confirmCancel(): void {
  confirmVisible.value = false;

  if (confirmResolve.value) {
    confirmResolve.value(false);
    confirmResolve.value = null;
  }
}

// 使用全局 store，不再维护本地状态

function cloneSource(source: TranslationSource): TranslationSource {
  return {
    ...source,
    position: { ...source.position },
    records: source.records.map(item => ({ ...item })),
  };
}

function cloneSourceList(list: TranslationSource[]): TranslationSource[] {
  return list.map(item => cloneSource(item));
}

// 维护翻译记录列表
function upsertTranslationRecord(source: TranslationSource, record: TranslationRecord): void {
  const index = source.records.findIndex(item => item.id === record.id);

  const nextRecord: TranslationRecord = {
    id: record.id,
    content: record.content,
    proofreadContent: record.proofreadContent,
    selected: record.selected,
    isMine: record.isMine,
  };

  if (index >= 0) {
    source.records.splice(index, 1, nextRecord);

    return;
  }

  source.records.push(nextRecord);
}

// 找到校对目标
function resolveProofTarget(source: TranslationSource): TranslationRecord | null {
  if (source.primaryTranslationId) {
    const found = source.records.find(item => item.id === source.primaryTranslationId);

    if (found) {
      return found;
    }
  }

  if (source.records.length > 0) {
    return source.records[0];
  }

  return null;
}

// 转换 Moetran 翻译对象
function toTranslationRecord(entry: PageTranslation, isMine: boolean): TranslationRecord {
  return {
    id: entry.id,
    content: entry.content || '',
    proofreadContent: entry.proofreadContent || '',
    selected: entry.selected,
    isMine,
  };
}

// 同步记录到源对象
function applyRecordToSource(source: TranslationSource, record: TranslationRecord): void {
  if (record.isMine) {
    source.records.forEach(item => {
      if (item.id !== record.id && item.isMine) {
        item.isMine = false;
      }
    });
  }

  if (record.selected) {
    source.records.forEach(item => {
      if (item.id !== record.id) {
        item.selected = false;
      }
    });
  }

  upsertTranslationRecord(source, record);

  if (record.isMine) {
    source.myTranslationId = record.id;
  }

  if (record.selected) {
    source.selectedTranslationId = record.id;
  } else if (source.selectedTranslationId === record.id) {
    source.selectedTranslationId = null;
  }

  source.primaryTranslationId = record.id;
  source.translationText = record.content;
  source.proofText = record.proofreadContent;
  source.serverTranslationText = record.content;
  source.serverProofText = record.proofreadContent;

  // Status is determined solely by whether any record is selected
  if (source.records.some(r => r.selected === true)) {
    source.status = 'proofed';
  } else if (source.translationText) {
    source.status = 'translated';
  } else {
    source.status = 'empty';
  }

  if (editorSource.value && editorSource.value.id === source.id) {
    // 同步编辑器副本的文本（当底层 source 更新时刷新 editor 副本）
    editorSource.value.translationText = source.translationText;
    editorSource.value.proofText = source.proofText;
    editorTranslationText.value = source.translationText;
    editorProofText.value = source.proofText;
  }
}

// 判断一个 source 是否已被校对
// 判定**唯一**依据：任意 records 元素的 `selected` 字段为 true
// records 已包含 myTranslation 与 translations 中的所有条目
function isSourceProofed(source: TranslationSource): boolean {
  return source.records.some(item => item.selected === true);
}

// 生成徽章的提示文字（当前仅返回简单文案，后续可扩展为校对者/时间）
function getProofBadgeTitle(source: TranslationSource): string {
  const sel = source.records.find(item => item.selected === true);

  if (sel) {
    return `Proofread (id: ${sel.id})`;
  }

  return 'Proofread';
}

// 获取 marker overlay 中要显示的文本：
// - 如果 source 被选中（任意 record.selected === true），显示该被选中记录的 proofreadContent（若为空则显示占位符）
// - 否则始终显示译者文本（translationText），即使存在 proofText 也不显示
function getMarkerOverlayText(source: TranslationSource | null): string {
  if (!source) return '〈empty〉';

  if (isSourceProofed(source)) {
    const sel = source.records.find(r => r.selected === true) as TranslationRecord | undefined;

    if (sel) {
      // 如果被选中的记录有 proofreadContent 则优先显示
      if (sel.proofreadContent && sel.proofreadContent.trim() !== '') {
        return sel.proofreadContent;
      }

      // 否则回退到第一个非空的 translation content（包括 myTranslation 与 translations）
      const firstNonEmpty = source.records.find(r => r.content && r.content.trim() !== '');

      if (firstNonEmpty) {
        console.debug(
          '[getMarkerOverlayText] proofed source missing proofreadContent, falling back to translation content',
          {
            sourceId: source.id,
            fallbackId: firstNonEmpty.id,
          }
        );

        return firstNonEmpty.content;
      }

      // 最终回退到 source.translationText（历史遗留字段）或占位符
      return source.translationText || '〈empty〉';
    }

    return '〈empty〉';
  }

  return source.translationText || '〈empty〉';
}

function persistPageSources(pageIndex: number): void {
  if (pageIndex < 0) {
    return;
  }

  const file = props.files[pageIndex];

  if (!file) {
    return;
  }

  const key = makeImageCacheKey(props.projectId, file.id);

  pageSourceStore.set(key, cloneSourceList(sources.value));
}

const boardTransform = computed(
  () => `matrix(${zoom.value}, 0, 0, ${zoom.value}, ${pan.value.x}, ${pan.value.y})`
);

const showMarkers = computed(() => !isPanelCollapsed.value);

const workspaceStyle = computed(() => {
  if (typeof workspaceHeightPx.value === 'number') {
    const clampedHeight = Math.max(MIN_WORKSPACE_HEIGHT, workspaceHeightPx.value);

    return {
      minHeight: `${clampedHeight}px`,
      height: `${clampedHeight}px`,
    };
  }

  const fallbackHeight = Math.max(
    MIN_WORKSPACE_HEIGHT,
    windowSize.value.height - WORKSPACE_VERTICAL_OFFSET
  );

  return {
    minHeight: `${fallbackHeight}px`,
    height: `${fallbackHeight}px`,
  };
});

const boardGridClass = computed(() => ({ 'board--full': isPanelCollapsed.value }));

const panelStyle = computed(() => {
  const style: Record<string, string> = {};

  if (isPanelCollapsed.value) {
    style.flexBasis = `${PANEL_COLLAPSED_WIDTH}px`;
    style.maxWidth = `${PANEL_COLLAPSED_WIDTH}px`;
    style.minWidth = '0px';
  } else {
    const panelPercent = Math.round(PANEL_WIDTH_RATIO * 100);

    style.flexBasis = `clamp(260px, ${panelPercent}%, 520px)`;
    style.maxWidth = '520px';
    style.minWidth = '260px';
  }

  style.height = panelHeightPx.value ? `${panelHeightPx.value}px` : '100%';

  return style;
});

const markerViewportScale = computed(() => {
  const widthFactor = windowSize.value.width / MARKER_REFERENCE_WIDTH;

  return Math.min(MAX_MARKER_VIEWPORT_SCALE, Math.max(MIN_MARKER_VIEWPORT_SCALE, widthFactor));
});

const markerScale = computed(() => markerViewportScale.value / zoom.value);

const markerTransform = computed(() => {
  const scale = markerScale.value;

  // 倒三角的下顶点对准position坐标
  return `translate(-50%, -100%) scale(${scale})`;
});

const selectedSource = computed(() => {
  if (!activeSourceId.value) {
    return null;
  }

  const target = sources.value.find(item => item.id === activeSourceId.value) ?? null;

  return target;
});

// 当 activeSourceId 变化时，更新 editorSource 副本（如果对应的 source 在当前页）
watch(activeSourceId, id => {
  if (!id) return;

  const found = sources.value.find(s => s.id === id) ?? null;

  if (found) {
    editorSource.value = cloneSource(found);
    // 同步 editor 文本
    editorTranslationText.value = editorSource.value.translationText;
    editorProofText.value = editorSource.value.proofText;
  }
});

const proofOverlayStyle = computed(() => {
  if (!isProofMode.value || !editorSource.value) {
    return {} as Record<string, string>;
  }

  const { x, y } = editorSource.value.position;

  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
  } satisfies Record<string, string>;
});

const sourceLabelMap = computed(() => {
  const labelMap = new Map<string, SourceLabelInfo>();

  let index = 1;

  for (const item of sources.value) {
    const number = String(index);

    const suffix = item.category === 'inside' ? '框内' : '框外';

    labelMap.set(item.id, {
      number,
      suffix,
    });

    index += 1;
  }

  return labelMap;
});

const selectedSourceLabelInfo = computed(() => {
  if (!editorSource.value) {
    return null;
  }

  const info = sourceLabelMap.value.get(editorSource.value.id);
  if (!info) return null;

  return { number: info.number, suffix: info.suffix };
});

// 切换翻译/校对模式
// 切换翻译 / 校对模式（只读模式下禁止）
function handleToggleMode(): void {
  if (!canEdit.value) return;

  // 如果当前是proof模式要切换到translate，检查是否允许
  const nextMode: 'translate' | 'proof' = isProofMode.value ? 'translate' : 'proof';

  if (nextMode === 'translate' && !canSwitchToEdit.value) {
    showToast('当前模式不支持切换到翻校模式', 'error');
    return;
  }

  activeMode.value = nextMode;

  showToast(nextMode === 'proof' ? '已进入校对模式' : '已切换为翻译模式');
}

// 切换自动重定位
// 切换自动重定位（只读模式下禁止，或不在翻校模式下禁止）
function handleToggleAutoRelocate(): void {
  if (!canEdit.value || !canSwitchToEdit.value) return;
  const nextState = !isAutoRelocateEnabled.value;

  isAutoRelocateEnabled.value = nextState;

  showToast(nextState ? '自动重定位已开启' : '自动重定位已关闭');
}

// 复制特殊符号
function copySymbol(symbol: string): void {
  navigator.clipboard
    .writeText(symbol)
    .then(() => {
      showToast(`已复制 ${symbol}`);
    })
    .catch(() => {
      showToast('复制失败', 'error');
    });
}

// 调整textarea高度
function adjustTextareaHeight(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

watch(
  () => props.pageIndex,
  async value => {
    // 翻页前强制提交当前页的所有待更新内容
    await flushPendingUpdates();

    currentPageIndex.value = value;
  }
);

watch(
  () => props.projectId,
  () => {
    previousPageIndex = null;

    hasInitialWarmup = false;
  }
);

watch(editorSource, (source, previousSource) => {
  if (!source) {
    editorTranslationText.value = '';

    editorProofText.value = '';

    moveEditorToDefault();

    return;
  }

  editorTranslationText.value = source.translationText;

  editorProofText.value = source.proofText;

  if (!previousSource) {
    hasEditorBeenDragged.value = false;

    moveEditorNearPanel(true);
  }

  nextTick(() => {
    if (isProofMode.value) {
      proofTextareaRef.value?.focus();
      adjustTextareaHeight(proofTextareaRef.value);
      adjustTextareaHeight(translationTextareaRef.value); // for readonly translation in proof mode

      return;
    }

    translationTextareaRef.value?.focus();
    adjustTextareaHeight(translationTextareaRef.value);
  });

  if (source && isAutoRelocateEnabled.value) {
    nextTick(() => {
      centerSourceOnBoard(source);
    });
  }
});

watch(activeMode, mode => {
  if (!editorSource.value) {
    return;
  }

  nextTick(() => {
    if (mode === 'proof') {
      proofTextareaRef.value?.focus();

      return;
    }

    translationTextareaRef.value?.focus();
  });
});

watch(
  currentPageIndex,
  (value, oldValue) => {
    pageInputValue.value = value + 1;

    if (typeof oldValue === 'number') {
      persistPageSources(oldValue);
    }

    initPage(value);
  },
  { immediate: true }
);

watch(windowSize, value => {
  clampEditorWithinViewport();

  if (!hasPanelOverride.value) {
    isPanelCollapsed.value = value.width < PANEL_COLLAPSE_BREAKPOINT;
  }

  updateWorkspaceHeight();

  syncPanelHeightWithBoard();
});

watch(isPanelCollapsed, () => {
  nextTick(() => {
    syncPanelHeightWithBoard();

    updateWorkspaceHeight();
  });
});

watch(isAutoRelocateEnabled, value => {
  if (!value || !editorSource.value) {
    return;
  }

  nextTick(() => {
    if (!editorSource.value) {
      return;
    }

    centerSourceOnBoard(editorSource.value);
  });
});

// 初始化页面数据
async function initPage(pageIndex: number): Promise<void> {
  const requestToken = ++latestPageLoadToken;

  isLoading.value = true;

  try {
    // 获取当前页对应的文件 ID
    const currentFile = props.files[pageIndex];
    if (!currentFile) {
      throw new Error(`页面索引 ${pageIndex} 超出文件列表范围`);
    }

    let convertedSources: TranslationSource[] = [];

    // 只有翻校模式需要加载 sources
    if (props.initialMode === 'translate' && props.targetId) {
      // 从 API 获取页面 sources
      const apiSources = await getPageSources(currentFile.id, props.targetId);

      console.log('API raw sources:', apiSources);

      // 检查是否已被新请求替代
      if (requestToken !== latestPageLoadToken) {
        return;
      }

      // 转换 API 数据到内部格式
      convertedSources = apiSources.map(src => {
        const records: TranslationRecord[] = [];
        const seen = new Set<string>();

        const pushRecord = (record: PageTranslation | undefined, isMine: boolean) => {
          if (!record) {
            return;
          }

          if (seen.has(record.id)) {
            return;
          }

          seen.add(record.id);

          records.push(toTranslationRecord(record, isMine));
        };

        pushRecord(src.myTranslation, true);

        (src.translations || []).forEach(item => {
          pushRecord(item, false);
        });

        const proofed = records.find(item => item.selected);
        const mine = records.find(item => item.isMine);
        const primary = proofed || mine || records[0];

        const translationText = primary?.content ?? '';
        const proofText = primary?.proofreadContent ?? '';

        // Status must be decided solely by the `selected` flag across records
        let status: SourceStatus = 'empty';
        if (records.some(r => r.selected === true)) {
          status = 'proofed';
        } else if (translationText) {
          status = 'translated';
        }

        return {
          id: src.id,
          category: src.positionType === 1 ? 'inside' : 'outside',
          status,
          translationText,
          proofText,
          position: {
            x: src.x,
            y: src.y,
            width: 0,
            height: 0,
          },
          records,
          myTranslationId: mine?.id ?? null,
          selectedTranslationId: proofed?.id ?? null,
          primaryTranslationId: primary?.id ?? null,
          serverTranslationText: translationText,
          serverProofText: proofText,
        };
      });

      console.log('Converted sources:', convertedSources);
    }
    // else: 阅览模式不加载sources，convertedSources保持为空数组

    // 更新页面数据
    const result: ProjectPageData = {
      imageUrl: '', // will be filled by proxied object URL
      pageIndex: pageIndex + 1,
      pageCount: props.files.length,
      title: currentFile.name,
      sources: convertedSources,
    };

    projectPage.value = result;

    // 缓存项目详情 - 移除：不应该缓存除了图片以外的内容
    // cacheStore.storeProjectDetailCacheEntry(props.projectId, props.files);

    // 通过共享缓存获取图片
    try {
      const objectUrl = await fetchImageForFile(props.projectId, currentFile);

      currentImageObjectUrl.value = objectUrl;

      if (projectPage.value) {
        projectPage.value.imageUrl = objectUrl;
      }
    } catch (err) {
      console.error('加载代理图片失败', err);
      showToast('加载图片失败', 'error');
      // keep imageUrl empty
    }

    const key = makeImageCacheKey(props.projectId, currentFile.id);

    // 如果 API 返回了非空 sources，则使用它覆盖缓存；否则保持已有缓存不变
    if (result.sources.length > 0 || !pageSourceStore.has(key)) {
      pageSourceStore.set(key, cloneSourceList(result.sources));
    }

    const hydratedSources = pageSourceStore.get(key) ?? [];

    sources.value = cloneSourceList(hydratedSources);

    // 如果 showEditor 为 true 且当前页有 sources，则自动选中第一个
    if (showEditor.value && hydratedSources.length > 0) {
      activeSourceId.value = hydratedSources[0].id;
    } else {
      activeSourceId.value = null;
    }

    // 如果当前没有打开 editor，清空编辑器副本，避免切页时保留旧页面的数据
    if (!showEditor.value) {
      editorSource.value = null;
      editorTranslationText.value = '';
      editorProofText.value = '';
    }
  } catch (error) {
    console.error('加载项目页面失败', error);
    showToast('加载页面失败', 'error');
  } finally {
    if (requestToken === latestPageLoadToken) {
      editorTranslationText.value = editorSource.value?.translationText ?? '';

      editorProofText.value = editorSource.value?.proofText ?? '';

      zoom.value = 1;

      pan.value = { x: 0, y: 0 };

      isLoading.value = false;

      const direction: -1 | 0 | 1 =
        previousPageIndex === null
          ? 0
          : pageIndex > previousPageIndex
            ? 1
            : pageIndex < previousPageIndex
              ? -1
              : 0;

      previousPageIndex = pageIndex;

      if (!hasInitialWarmup) {
        warmupAroundPage(pageIndex);
      }

      touchCacheForPage(pageIndex);

      preloadAdjacent(pageIndex, direction);
    }
  }
}

async function ensureImageCachedByIndex(index: number, promoteWhenCached = true): Promise<void> {
  const file = props.files[index];

  if (!file) {
    return;
  }

  if (!promoteWhenCached) {
    const key = makeImageCacheKey(props.projectId, file.id);

    if (cacheStore.imageCache.has(key)) {
      return;
    }
  }

  try {
    await fetchImageForFile(props.projectId, file);
  } catch (error) {
    // 忽略预加载失败
    console.warn('预加载失败', file.id, error);
  }
}

// 私有类型：预加载任务
interface _PreloadTask {
  index: number;
  promote: boolean;
}

function preloadAdjacent(pageIndex: number, direction: -1 | 0 | 1): void {
  const tasks: _PreloadTask[] = [];

  if (direction === 1 && pageIndex + 2 < props.files.length) {
    tasks.push({ index: pageIndex + 2, promote: true });
  } else if (direction === -1 && pageIndex - 2 >= 0) {
    tasks.push({ index: pageIndex - 2, promote: true });
  }

  if (pageIndex + 1 < props.files.length) {
    tasks.push({ index: pageIndex + 1, promote: false });
  }

  if (pageIndex - 1 >= 0) {
    tasks.push({ index: pageIndex - 1, promote: false });
  }

  if (!tasks.length) {
    return;
  }

  void (async () => {
    for (const task of tasks) {
      await ensureImageCachedByIndex(task.index, task.promote);
    }

    touchCacheForPage(pageIndex);
  })();
}

function touchCacheForPage(pageIndex: number): void {
  const file = props.files[pageIndex];

  if (!file) {
    return;
  }

  cacheStore.promoteImageCacheEntry(makeImageCacheKey(props.projectId, file.id));
}

function warmupAroundPage(pageIndex: number): void {
  if (hasInitialWarmup) {
    return;
  }

  hasInitialWarmup = true;

  const offsets = [-1, 1, -2, 2];

  void (async () => {
    for (const offset of offsets) {
      const target = pageIndex + offset;

      if (target < 0 || target >= props.files.length) {
        continue;
      }

      await ensureImageCachedByIndex(target);
    }

    touchCacheForPage(pageIndex);
  })();
}

// 强制提交所有待更新内容
async function flushPendingUpdates(): Promise<void> {
  const contentUpdates = Array.from(pendingContentUpdates.entries());
  const proofreadUpdates = Array.from(pendingProofreadUpdates.entries());
  const selectedUpdates = Array.from(pendingSelectedUpdates.entries());

  if (
    contentUpdates.length === 0 &&
    proofreadUpdates.length === 0 &&
    selectedUpdates.length === 0
  ) {
    return;
  }

  // 合并同一个 translationId 的更新
  const updateMap = new Map<
    string,
    { content?: string; proofreadContent?: string; selected?: boolean }
  >();

  for (const [translationId, content] of contentUpdates) {
    const existing = updateMap.get(translationId) || {};
    existing.content = content;
    updateMap.set(translationId, existing);
  }

  for (const [translationId, proofreadContent] of proofreadUpdates) {
    const existing = updateMap.get(translationId) || {};
    existing.proofreadContent = proofreadContent;
    updateMap.set(translationId, existing);
  }

  for (const [translationId, selected] of selectedUpdates) {
    const existing = updateMap.get(translationId) || {};
    existing.selected = selected;
    updateMap.set(translationId, existing);
  }

  // 依次提交更新
  const successfulIds: string[] = [];

  for (const [translationId, updates] of updateMap.entries()) {
    try {
      await updateTranslation({
        translationId,
        ...updates,
      });

      successfulIds.push(translationId);

      // 更新成功后，同步 serverTranslationText 和 serverProofText
      const source = sources.value.find(
        s =>
          s.myTranslationId === translationId ||
          s.selectedTranslationId === translationId ||
          s.primaryTranslationId === translationId
      );

      if (source) {
        if (updates.content !== undefined) {
          source.serverTranslationText = updates.content;
          source.translationText = updates.content;
        }
        if (updates.proofreadContent !== undefined) {
          source.serverProofText = updates.proofreadContent;
          source.proofText = updates.proofreadContent;
        }

        // 注意：状态更新应该在专门的状态管理逻辑中处理，不在这里
      }
    } catch (err) {
      // 如果是 source_id 无效（404 等），自动从待更新列表中移除
      const errMsg = String(err);
      if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('无效')) {
        console.warn('[TranslatorView] translationId 无效，自动移除:', translationId, err);
        successfulIds.push(translationId);
      } else {
        console.error('[TranslatorView] 更新翻译失败:', translationId, err);
      }
    }
  }

  // 清除已成功提交的更新
  for (const translationId of successfulIds) {
    pendingContentUpdates.delete(translationId);
    pendingProofreadUpdates.delete(translationId);
    pendingSelectedUpdates.delete(translationId);
  }
}

// 处理翻译文本输入
function handleTranslationInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  const value = textarea.value;

  if (!editorSource.value) {
    return;
  }

  // 更新编辑器副本文本
  editorSource.value.translationText = value;

  // 注意：状态不应该因为文本内容的变化而改变
  // 状态（selected/proofed）与文本内容是完全独立的

  // 如果还没有 myTranslationId，需要先创建翻译记录
  if (!editorSource.value.myTranslationId) {
    if (!canEdit.value || !props.targetId) {
      return;
    }

    // 异步创建翻译记录（使用 editorSource 的 id）
    void (async () => {
      const currentSource = editorSource.value;
      if (!currentSource) return;

      try {
        const result = await submitTranslation({
          sourceId: currentSource.id,
          targetId: props.targetId,
          content: value,
        });

        const record = toTranslationRecord(result, true);
        applyRecordToSource(currentSource, record);
        currentSource.serverTranslationText = value;

        persistPageSources(currentPageIndex.value);
      } catch (err) {
        console.error('[TranslatorView] 自动创建翻译失败', err);
      }
    })();
  } else {
    // 已有翻译记录，标记为待更新
    const translationId = editorSource.value.myTranslationId;

    if (translationId && value !== editorSource.value.serverTranslationText) {
      pendingContentUpdates.set(translationId, value);

      // 节流提交：清除之前的timeout，设置新的
      if (pendingFlushTimeout !== null) {
        clearTimeout(pendingFlushTimeout);
      }
      pendingFlushTimeout = window.setTimeout(() => {
        void flushPendingUpdates();
        pendingFlushTimeout = null;
      }, FLUSH_DELAY);
    }
  }

  nextTick(() => adjustTextareaHeight(translationTextareaRef.value));
}

// 处理校对文本输入
function handleProofInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  const value = textarea.value;

  if (!editorSource.value) {
    return;
  }

  editorSource.value.proofText = value;

  // 标记校对文本为待更新
  const translationId =
    editorSource.value.selectedTranslationId || editorSource.value.myTranslationId;
  if (translationId && value !== editorSource.value.serverProofText) {
    pendingProofreadUpdates.set(translationId, value);

    // 节流提交：清除之前的timeout，设置新的
    if (pendingFlushTimeout !== null) {
      clearTimeout(pendingFlushTimeout);
    }
    pendingFlushTimeout = window.setTimeout(() => {
      void flushPendingUpdates();
      pendingFlushTimeout = null;
    }, FLUSH_DELAY);
  }

  nextTick(() => adjustTextareaHeight(proofTextareaRef.value));
}

// 收起 / 展开源列表（只读模式下禁止）
function handleTogglePanel(): void {
  if (!canEdit.value) return;
  if (!hasPanelOverride.value) {
    hasPanelOverride.value = true;
  }

  isPanelCollapsed.value = !isPanelCollapsed.value;

  if (isPanelCollapsed.value) {
    activeSourceId.value = null;

    return;
  }

  nextTick(() => {
    moveEditorNearPanel(true);

    syncPanelHeightWithBoard();

    updateWorkspaceHeight();
  });
}

// 拖拽标记开始
// 拖拽标记开始（只读模式下禁止）
function handleSourcePointerDown(event: PointerEvent, sourceId: string): void {
  if (!canEdit.value) return;
  if (event.button !== 0) {
    return;
  }

  event.stopPropagation();

  const wrapper = imageWrapperRef.value;

  const targetSource = sources.value.find(item => item.id === sourceId);

  if (!wrapper || !targetSource) {
    return;
  }

  const rect = wrapper.getBoundingClientRect();

  const pointerX = rect.left + targetSource.position.x * rect.width;

  const pointerY = rect.top + targetSource.position.y * rect.height;

  const offsetX = event.clientX - pointerX;

  const offsetY = event.clientY - pointerY;

  markerDragOffset.value = {
    x: offsetX,
    y: offsetY,
  };

  draggingSourceId.value = sourceId;

  activeSourceId.value = sourceId;
}

// 拖拽标记移动
// 拖拽标记移动（只读模式下禁止）
function updateDraggingSourcePosition(event: PointerEvent): void {
  if (!canEdit.value) return;
  if (!draggingSourceId.value) {
    return;
  }

  const wrapper = imageWrapperRef.value;

  const targetSource = sources.value.find(item => item.id === draggingSourceId.value);

  if (!wrapper || !targetSource) {
    return;
  }

  const rect = wrapper.getBoundingClientRect();

  const pointerX = event.clientX - markerDragOffset.value.x;

  const pointerY = event.clientY - markerDragOffset.value.y;

  // wrapper已经被zoom和pan变换，需要逆向计算
  const wrapperLocalX = (pointerX - rect.left) / zoom.value;
  const wrapperLocalY = (pointerY - rect.top) / zoom.value;

  const originalWidth = rect.width / zoom.value;
  const originalHeight = rect.height / zoom.value;

  const relativeX = wrapperLocalX / originalWidth;
  const relativeY = wrapperLocalY / originalHeight;

  targetSource.position.x = Math.min(Math.max(relativeX, 0), 1);

  targetSource.position.y = Math.min(Math.max(relativeY, 0), 1);
}

// 停止拖拽标记
async function stopDraggingSource(): Promise<void> {
  if (!draggingSourceId.value) {
    return;
  }

  const sourceId = draggingSourceId.value;
  draggingSourceId.value = null;

  // 提交位置更新到后端
  const targetSource = sources.value.find(item => item.id === sourceId);
  if (targetSource) {
    try {
      await updateSource({
        sourceId: targetSource.id,
        x: targetSource.position.x,
        y: targetSource.position.y,
      });
      showToast('标记位置已更新');
    } catch (error) {
      console.error('更新标记位置失败', error);
      showToast('更新标记位置失败', 'error');
    }
  }
}

// 删除标记
// 删除标记（只读模式下禁止）
async function handleRemoveSource(sourceId: string): Promise<void> {
  if (!canEdit.value) return;

  // 如果本地存在该 source，且其包含翻译或校对内容，需要先确认
  const local = sources.value.find(s => s.id === sourceId) ?? null;

  if (local) {
    const hasContent =
      (local.translationText && local.translationText.trim() !== '') ||
      (local.proofText && local.proofText.trim() !== '');

    if (hasContent) {
      const confirmed = await showConfirm('该标记包含翻译或校对内容，删除将不可恢复，确认删除吗？');

      if (!confirmed) {
        return;
      }
    }
  }

  const file = props.files[currentPageIndex.value];

  // 如果是服务端已存在的 source，尝试通知后端删除
  if (!sourceId.startsWith(`${props.projectId}-src-`)) {
    try {
      await deleteSource(sourceId);
    } catch (e) {
      console.error('删除服务端 source 失败', e);
      showToast('删除标记失败', 'error');
      // 继续从本地移除以保证 UI 响应
    }
  }

  // 从本地移除
  sources.value = sources.value.filter(item => item.id !== sourceId);

  if (file) {
    const pageKey = makeImageCacheKey(props.projectId, file.id);
    const cached = pageSourceStore.get(pageKey);
    if (cached) {
      const next = cached.filter(item => item.id !== sourceId);
      pageSourceStore.set(pageKey, cloneSourceList(next));
    }
  }

  if (activeSourceId.value === sourceId) {
    activeSourceId.value = sources.value[0]?.id ?? null;
  }
}

// 更新缩放
function handleCanvasWheel(event: WheelEvent): void {
  if (!projectPage.value) {
    return;
  }

  event.preventDefault();

  const direction = event.deltaY > 0 ? -1 : 1;

  const candidate = zoom.value + direction * ZOOM_STEP;

  applyZoomWithAnchor(candidate, event.clientX, event.clientY);
}

// 处理画布鼠标按下
function handleCanvasPointerDown(event: PointerEvent): void {
  if (event.button !== 0 && event.button !== 2) {
    return;
  }

  const target = event.target as HTMLElement;

  if (target.closest('[data-source-id]')) {
    return;
  }

  canvasPointerButton.value = event.button as 0 | 2;

  isCanvasPointerDown.value = true;

  isPanningCanvas.value = false;

  canvasPointerId.value = event.pointerId;

  canvasPointerStart.value = {
    x: event.clientX,
    y: event.clientY,
  };

  panStart.value = { ...pan.value };

  lastCanvasPointerEvent.value = event;

  const currentTarget = event.currentTarget as HTMLElement | null;

  currentTarget?.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerMove(event: PointerEvent): void {
  if (!isCanvasPointerDown.value || canvasPointerId.value !== event.pointerId) {
    return;
  }

  lastCanvasPointerEvent.value = event;

  const deltaX = event.clientX - canvasPointerStart.value.x;

  const deltaY = event.clientY - canvasPointerStart.value.y;

  if (!isPanningCanvas.value) {
    const distance = Math.hypot(deltaX, deltaY);

    if (distance >= PANNING_THRESHOLD) {
      isPanningCanvas.value = true;
    }
  }

  if (!isPanningCanvas.value) {
    return;
  }

  pan.value = {
    x: panStart.value.x + deltaX,
    y: panStart.value.y + deltaY,
  };
}

function handleCanvasPointerUp(event: PointerEvent): void {
  if (!isCanvasPointerDown.value || canvasPointerId.value !== event.pointerId) {
    return;
  }

  const currentTarget = event.currentTarget as HTMLElement | null;

  currentTarget?.releasePointerCapture?.(event.pointerId);

  const pointerWasPanning = isPanningCanvas.value;

  isCanvasPointerDown.value = false;

  isPanningCanvas.value = false;

  canvasPointerId.value = null;

  const referenceEvent = lastCanvasPointerEvent.value ?? event;

  lastCanvasPointerEvent.value = null;

  const pointerButton = canvasPointerButton.value;

  canvasPointerButton.value = null;

  if (pointerWasPanning) {
    return;
  }

  if (isPanelCollapsed.value || (pointerButton !== 0 && pointerButton !== 2)) {
    return;
  }

  const wrapper = imageWrapperRef.value;

  if (!wrapper) {
    return;
  }

  const rect = wrapper.getBoundingClientRect();

  if (
    referenceEvent.clientX < rect.left ||
    referenceEvent.clientX > rect.right ||
    referenceEvent.clientY < rect.top ||
    referenceEvent.clientY > rect.bottom
  ) {
    return;
  }

  const category: SourceCategory = pointerButton === 2 ? 'outside' : 'inside';

  const shouldActivate = pointerButton !== 2;

  addSourceAtPointer(referenceEvent, category, shouldActivate);
}

function handleCanvasPointerCancel(event: PointerEvent): void {
  if (!isCanvasPointerDown.value || canvasPointerId.value !== event.pointerId) {
    return;
  }

  const currentTarget = event.currentTarget as HTMLElement | null;

  currentTarget?.releasePointerCapture?.(event.pointerId);

  isCanvasPointerDown.value = false;

  isPanningCanvas.value = false;

  canvasPointerId.value = null;

  canvasPointerButton.value = null;

  lastCanvasPointerEvent.value = null;
}

function handleWindowResize(): void {
  windowSize.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  updateWorkspaceHeight();

  syncPanelHeightWithBoard();
}

// 根据画板高度同步面板高度，保持两侧一致
function syncPanelHeightWithBoard(): void {
  const boardElement = boardRef.value;

  if (!boardElement) {
    panelHeightPx.value = null;

    return;
  }

  const rect = boardElement.getBoundingClientRect();

  panelHeightPx.value = Math.round(rect.height);
}

// 同步工作区高度以减少底部留白
function updateWorkspaceHeight(): void {
  const workspaceElement = workspaceRef.value;

  if (!workspaceElement) {
    workspaceHeightPx.value = null;

    return;
  }

  const rect = workspaceElement.getBoundingClientRect();

  const availableHeight = window.innerHeight - rect.top - WORKSPACE_BOTTOM_GUTTER;

  workspaceHeightPx.value = Math.max(MIN_WORKSPACE_HEIGHT, Math.floor(availableHeight));
}

// 图片加载完同步布局尺寸
function handleBoardContentLoaded(): void {
  syncPanelHeightWithBoard();

  updateWorkspaceHeight();
}

// 当 <img> 加载失败（例如本地 blob URL 被移除导致 net::ERR_FILE_NOT_FOUND）时的回退处理
async function handleImageLoadError(event: Event): Promise<void> {
  const img = event.target as HTMLImageElement | null;

  if (!img) return;

  const src = img.src ?? '';

  // 仅对本地 blob URL 做回退（其他情况保持现有行为）
  if (!src.startsWith('blob:')) return;

  const file = props.files[currentPageIndex.value];

  if (!file) return;

  const key = makeImageCacheKey(props.projectId, file.id);

  try {
    // 请求后端代理图片并生成新的 object URL
    const reply = await proxyImage(file.url);

    const url = createObjectUrlFromBase64(reply.b64, reply.content_type);

    // 将新 URL 写入缓存（会撤销旧的缓存 URL 并按限制清理）
    cacheStore.storeImageCacheEntry(key, url);

    // 更新当前页面引用并触发 img 重新加载
    currentImageObjectUrl.value = url;

    if (projectPage.value) projectPage.value.imageUrl = url;

    // 直接替换 img.src 会触发浏览器加载新资源
    img.src = url;
  } catch (err) {
    console.error('Fallback proxy image failed', err);
    showToast('回退加载图片失败', 'error');
  }
}

// 根据当前源进行画面居中
function centerSourceOnBoard(source: TranslationSource): void {
  const boardElement = boardRef.value;

  const wrapper = imageWrapperRef.value;

  if (!boardElement || !wrapper) {
    return;
  }

  const baseWidth = wrapper.offsetWidth;

  const baseHeight = wrapper.offsetHeight;

  if (baseWidth === 0 || baseHeight === 0) {
    return;
  }

  const markerX = source.position.x * baseWidth;

  const markerY = source.position.y * baseHeight;

  const nextPanX = baseWidth / 2 - markerX * zoom.value;

  const nextPanY = baseHeight / 2 - markerY * zoom.value;

  pan.value = {
    x: nextPanX,
    y: nextPanY,
  };
}

function showToast(message: string, tone: 'success' | 'error' = 'success', duration = 2000): void {
  toastStore.show(message, tone, duration);
}

// 根据锚点调整缩放
function applyZoomWithAnchor(targetZoom: number, anchorX: number, anchorY: number): void {
  const wrapper = imageWrapperRef.value;

  if (!wrapper) {
    return;
  }

  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(targetZoom.toFixed(4))));

  if (clamped === zoom.value) {
    return;
  }

  const rect = wrapper.getBoundingClientRect();

  const baseLeft = rect.left - pan.value.x;

  const baseTop = rect.top - pan.value.y;

  const offsetX = anchorX - rect.left;

  const offsetY = anchorY - rect.top;

  const baseX = offsetX / zoom.value;

  const baseY = offsetY / zoom.value;

  const nextPanX = anchorX - baseLeft - clamped * baseX;

  const nextPanY = anchorY - baseTop - clamped * baseY;

  pan.value = {
    x: nextPanX,
    y: nextPanY,
  };

  zoom.value = clamped;
}

// 处理键盘平移
function handleKeyboardPan(deltaX: number, deltaY: number): void {
  pan.value = {
    x: pan.value.x + deltaX,
    y: pan.value.y + deltaY,
  };
}

// 处理键盘缩放
function handleKeyboardZoom(direction: 1 | -1): void {
  if (!projectPage.value) {
    return;
  }

  const boardElement = boardRef.value;

  if (!boardElement) {
    return;
  }

  const boardRect = boardElement.getBoundingClientRect();

  const anchorX = boardRect.left + boardRect.width / 2;

  const anchorY = boardRect.top + boardRect.height / 2;

  const factor = direction > 0 ? 1 + KEYBOARD_ZOOM_RATIO : 1 - KEYBOARD_ZOOM_RATIO;

  const nextZoom = zoom.value * factor;

  applyZoomWithAnchor(nextZoom, anchorX, anchorY);
}

// 选中标记
// 选中标记（只读模式下禁止进入编辑）
function handleSelectSource(sourceId: string): void {
  if (!canEdit.value) return;
  showEditor.value = true;
  if (activeSourceId.value === sourceId) {
    if (!isAutoRelocateEnabled.value) {
      return;
    }

    const target = sources.value.find(item => item.id === sourceId);

    if (!target) {
      return;
    }

    // 更新 editor 的副本为当前选中的源
    editorSource.value = cloneSource(target);

    nextTick(() => {
      centerSourceOnBoard(target);
    });

    return;
  }

  activeSourceId.value = sourceId;
}

// 拖拽编辑器开始
// 拖拽编辑器浮窗（只读模式下禁止）
function handleEditorPointerDown(event: PointerEvent): void {
  if (!canEdit.value) return;
  event.preventDefault();

  isDraggingEditor.value = true;

  editorPointerStart.value = {
    x: event.clientX,
    y: event.clientY,
  };

  editorPositionStart.value = { ...editorPosition.value };
}

// 拖拽编辑器移动
function updateEditorPosition(event: PointerEvent): void {
  if (!isDraggingEditor.value) {
    return;
  }

  const deltaX = event.clientX - editorPointerStart.value.x;

  const deltaY = event.clientY - editorPointerStart.value.y;

  const nextX = editorPositionStart.value.x + deltaX;

  const nextY = editorPositionStart.value.y + deltaY;

  const maxX = window.innerWidth - editorSize.value.width - 12;

  const maxY = window.innerHeight - editorSize.value.height - 12;

  editorPosition.value = {
    x: Math.min(Math.max(12, nextX), Math.max(12, maxX)),
    y: Math.min(Math.max(12, nextY), Math.max(12, maxY)),
  };

  if (!hasEditorBeenDragged.value && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
    hasEditorBeenDragged.value = true;
  }
}

// 拖拽编辑器结束
function stopDraggingEditor(): void {
  if (!isDraggingEditor.value) {
    return;
  }

  isDraggingEditor.value = false;
}

// 开始调整编辑器大小
function handleEditorResizePointerDown(event: PointerEvent): void {
  if (!canEdit.value) return;
  event.preventDefault();

  isResizingEditor.value = true;

  editorResizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: editorSize.value.width,
    height: editorSize.value.height,
  };
}

// 调整编辑器大小（响应全局 pointermove）
function updateEditorSize(event: PointerEvent): void {
  if (!isResizingEditor.value) return;

  const dx = event.clientX - editorResizeStart.value.x;
  const dy = event.clientY - editorResizeStart.value.y;

  // 最小尺寸限制，尽量与 UI 风格一致
  const MIN_WIDTH = 260;
  const MIN_HEIGHT = 160;

  const requestedWidth = Math.round((editorResizeStart.value.width as number) + dx);
  const requestedHeight = Math.round((editorResizeStart.value.height as number) + dy);

  const maxWidth = Math.max(200, window.innerWidth - editorPosition.value.x - 12);
  const maxHeight = Math.max(120, window.innerHeight - editorPosition.value.y - 12);

  editorSize.value.width = Math.min(Math.max(MIN_WIDTH, requestedWidth), maxWidth);
  editorSize.value.height = Math.min(Math.max(MIN_HEIGHT, requestedHeight), maxHeight);
}

// 结束调整大小
function stopResizingEditor(): void {
  if (!isResizingEditor.value) return;

  isResizingEditor.value = false;

  // 确保浮窗仍在视口内
  clampEditorWithinViewport();
}

// 双击把手：恢复默认大小（仅大小，不移动位置）
function resetEditorSize(): void {
  editorSize.value = { ...DEFAULT_EDITOR_SIZE };

  // 确保仍在视口内
  clampEditorWithinViewport();

  // 结束可能的调整状态
  isResizingEditor.value = false;
}

// 移动编辑器到默认位置
function moveEditorToDefault(): void {
  editorPosition.value = { ...DEFAULT_EDITOR_POSITION };

  editorSize.value = { ...DEFAULT_EDITOR_SIZE };

  clampEditorWithinViewport();

  hasEditorBeenDragged.value = false;
}

// 保证浮窗在视口内
function clampEditorWithinViewport(): void {
  const maxX = Math.max(12, window.innerWidth - editorSize.value.width - 12);

  const maxY = Math.max(12, window.innerHeight - editorSize.value.height - 12);

  editorPosition.value = {
    x: Math.min(Math.max(12, editorPosition.value.x), maxX),
    y: Math.min(Math.max(12, editorPosition.value.y), maxY),
  };
}

// 移动编辑器到面板下方
function moveEditorNearPanel(force = false): void {
  if (hasEditorBeenDragged.value && !force) {
    return;
  }

  const panel = panelRef.value;

  if (!panel) {
    moveEditorToDefault();

    return;
  }

  const panelRect = panel.getBoundingClientRect();

  const rawWidth = panelRect.width * 0.9;

  const rawHeight = panelRect.height * 0.5;

  const clampedWidth = Math.min(Math.max(260, rawWidth), window.innerWidth - 32);

  const clampedHeight = Math.min(Math.max(220, rawHeight), window.innerHeight - 48);

  const left = panelRect.left + panelRect.width / 2 - clampedWidth / 2;

  const bottomAlignedTop = panelRect.bottom - clampedHeight;

  const safeTop = Math.min(bottomAlignedTop, window.innerHeight - clampedHeight - 16);

  editorSize.value = {
    width: clampedWidth,
    height: clampedHeight,
  };

  editorPosition.value = {
    x: Math.max(16, left),
    y: Math.max(16, safeTop),
  };

  clampEditorWithinViewport();

  clampEditorWithinViewport();
}

// 打开快捷键悬浮窗
function openShortcutHelp(): void {
  isShortcutHelpVisible.value = true;

  nextTick(() => {
    shortcutHelpRef.value?.focus();
  });
}

// 关闭快捷键悬浮窗
function closeShortcutHelp(): void {
  isShortcutHelpVisible.value = false;
}

// 处理快捷键悬浮窗键盘事件
function handleShortcutHelpKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }

  event.preventDefault();

  closeShortcutHelp();
}

// keyup 监听：用于更新按键跟踪集合
function handleGlobalKeyup(event: KeyboardEvent): void {
  _pressedKeys.delete(event.key.toLowerCase());
}

// 处理全局快捷键
function handleGlobalShortcuts(event: KeyboardEvent): void {
  // 记录按键状态
  _pressedKeys.add(event.key.toLowerCase());

  if (event.repeat) {
    return;
  }

  // 全局：在校对模式下支持将翻译文本复制到校对框的快捷键
  // - `Ctrl+T`: 将当前聚焦 source 的 translationText 复制到 proofText（不会确认校对）
  // - `Ctrl+Alt+T`: 将当前页所有 source 的 translationText 复制到对应的 proofText（不会确认校对）
  if (event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 't') {
    // Ctrl+A+T -> 复制当前页所有（检测 A 是否也被按下）
    if (_pressedKeys.has('a')) {
      if (!canEdit.value || !isProofMode.value) return;

      event.preventDefault();

      // 批量复制：遍历当前页 sources
      let count = 0;

      for (const s of sources.value) {
        const translation = (s.translationText || '').trim();

        if (!translation) continue;

        s.proofText = translation;

        const translationId = s.selectedTranslationId || s.myTranslationId;

        if (translationId && translation !== (s.serverProofText ?? '')) {
          pendingProofreadUpdates.set(translationId, translation);
        }

        count += 1;
      }

      // 如果 editor 当前打开且对应 source 在页面中，更新 editor 副本
      if (editorSource.value) {
        const matching = sources.value.find(s => s.id === editorSource.value?.id);
        if (matching) {
          editorSource.value.proofText = matching.proofText;
          // 如果当前编辑的 proof 文本也需要同步显示
          editorProofText.value = matching.proofText ?? '';
        }
      }

      // 安排合并提交
      if (pendingFlushTimeout !== null) {
        window.clearTimeout(pendingFlushTimeout);
      }

      pendingFlushTimeout = window.setTimeout(() => {
        void flushPendingUpdates();
        pendingFlushTimeout = null;
      }, FLUSH_DELAY);

      showToast(`已复制 ${count} 条翻译到校对框（未确认校对）`);

      return;
    }

    // Ctrl+T 单个 source（确保不是 Ctrl+A+T）
    if (!_pressedKeys.has('a') && !event.shiftKey && !event.metaKey) {
      if (!canEdit.value || !isProofMode.value) return;

      // 需要有聚焦的 source
      const src = editorSource.value ?? selectedSource.value ?? null;

      if (!src) return;

      event.preventDefault();

      const translation = (src.translationText || '').trim();

      if (!translation) {
        showToast('当前 source 没有翻译文本可复制', 'error');
        return;
      }

      // 更新 editor 与本地 source 的 proof 文本
      src.proofText = translation;
      if (editorSource.value && editorSource.value.id === src.id) {
        editorSource.value.proofText = translation;
        editorProofText.value = translation;
      }

      const translationId = src.selectedTranslationId || src.myTranslationId;

      if (translationId && translation !== (src.serverProofText ?? '')) {
        pendingProofreadUpdates.set(translationId, translation);

        if (pendingFlushTimeout !== null) {
          window.clearTimeout(pendingFlushTimeout);
        }

        pendingFlushTimeout = window.setTimeout(() => {
          void flushPendingUpdates();
          pendingFlushTimeout = null;
        }, FLUSH_DELAY);
      }

      showToast('已将翻译文本复制到校对框（未确认校对）');

      return;
    }
  }

  // Detect Ctrl + A + Enter: confirm proof for all sources on current page
  if (event.key === 'Enter' && event.ctrlKey && _pressedKeys.has('a')) {
    if (!canEdit.value || !isProofMode.value) return;

    event.preventDefault();

    // 验证是否存在没有翻译文本的 source
    const hasMissing = sources.value.some(s => {
      const translation = (s.serverTranslationText || s.translationText || '').trim();
      return translation.length === 0;
    });

    if (hasMissing) {
      showToast('有无翻译的源，整体确认校对失败', 'error');
      return;
    }

    // 批量确认：对每个 source 调用 updateTranslation({ selected: true })
    const tasks: Promise<void>[] = [];

    for (const s of sources.value) {
      const target = resolveProofTarget(s);

      if (!target) {
        showToast('有无翻译的源，整体确认校对失败', 'error');
        return;
      }

      tasks.push(
        (async () => {
          try {
            const res = await updateTranslation({ translationId: target.id, selected: true });
            const rec = toTranslationRecord(res, target.isMine);
            applyRecordToSource(s, rec);
          } catch (err) {
            console.error('确认校对失败', err);
          }
        })()
      );
    }

    void Promise.all(tasks).then(() => {
      persistPageSources(currentPageIndex.value);
      showToast('已确认当前页所有标记为校对状态');
    });

    return;
  }

  if (event.key === 'Tab') {
    if (sources.value.length === 0) {
      return;
    }

    event.preventDefault();

    if (!activeSourceId.value) {
      showEditor.value = true;
      activeSourceId.value = event.shiftKey
        ? sources.value[sources.value.length - 1].id
        : sources.value[0].id;

      return;
    }

    const currentIndex = sources.value.findIndex(item => item.id === activeSourceId.value);

    if (currentIndex < 0) {
      showEditor.value = true;
      activeSourceId.value = event.shiftKey
        ? sources.value[sources.value.length - 1].id
        : sources.value[0].id;

      return;
    }

    const direction = event.shiftKey ? -1 : 1;

    const nextIndex = (currentIndex + direction + sources.value.length) % sources.value.length;

    showEditor.value = true;
    activeSourceId.value = sources.value[nextIndex].id;

    return;
  }

  if (event.ctrlKey && !event.metaKey && !event.altKey) {
    const key = event.key.toLowerCase();

    if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
      event.preventDefault();

      const step = KEYBOARD_PAN_STEP / zoom.value;

      if (key === 'arrowup') {
        handleKeyboardPan(0, step);

        return;
      }

      if (key === 'arrowdown') {
        handleKeyboardPan(0, -step);

        return;
      }

      if (key === 'arrowleft') {
        handleKeyboardPan(step, 0);

        return;
      }

      handleKeyboardPan(-step, 0);

      return;
    }

    if (event.key === '+' || event.key === '=' || key === 'add') {
      event.preventDefault();

      handleKeyboardZoom(1);

      return;
    }

    if (event.key === '-' || event.key === '_' || key === 'subtract') {
      event.preventDefault();

      handleKeyboardZoom(-1);

      return;
    }

    if (key === 'p') {
      if (!canEdit.value) return;
      event.preventDefault();
      handleToggleMode();
      return;
    }

    if (key === 'f') {
      if (!canEdit.value) return;
      event.preventDefault();
      handleToggleAutoRelocate();
      return;
    }

    if (key === 'l') {
      if (!canEdit.value) return;
      event.preventDefault();
      handleTogglePanel();
      return;
    }

    if (key === 'd') {
      event.preventDefault();

      handleNextPage();

      return;
    }

    if (key === 'u') {
      event.preventDefault();

      handlePreviousPage();

      return;
    }

    if (event.key === '`') {
      event.preventDefault();

      if (showEditor.value) {
        // 如果 editor 已显示，则关闭
        showEditor.value = false;
        activeSourceId.value = null;
      } else if (sources.value.length > 0) {
        // 如果 editor 未显示且有 source，则打开并选中第一个
        showEditor.value = true;
        activeSourceId.value = sources.value[0].id;
      }

      return;
    }
  }
}

// 切换标记类别（只读模式下禁止）
async function toggleSourceCategory(): Promise<void> {
  if (!canEdit.value) return;
  if (!selectedSource.value) {
    return;
  }

  const oldCategory = selectedSource.value.category;
  const newCategory = oldCategory === 'inside' ? 'outside' : 'inside';
  const newPositionType = newCategory === 'inside' ? 1 : 2;

  try {
    await updateSource({
      sourceId: selectedSource.value.id,
      positionType: newPositionType,
    });

    selectedSource.value.category = newCategory;
    if (editorSource.value && editorSource.value.id === selectedSource.value.id) {
      editorSource.value.category = newCategory;
    }
    showToast(`已切换为${newCategory === 'inside' ? '框内' : '框外'}标记`);
  } catch (error) {
    console.error('切换标记类别失败', error);
    showToast('切换标记类别失败', 'error');
  }
}

// 切换校对状态
// 切换校对状态（只读模式下禁止）
async function toggleProofStatus(): Promise<void> {
  if (!canEdit.value) return;
  const source = selectedSource.value;

  if (!source) {
    return;
  }

  if (isSubmittingProof.value) {
    return;
  }

  const targetRecord = resolveProofTarget(source);

  if (!targetRecord) {
    showToast('当前标记没有翻译稿可供校对', 'error');

    return;
  }

  const isActiveProof =
    source.status === 'proofed' && source.selectedTranslationId === targetRecord.id;

  // 只将用户明确填写的校对内容作为 proofreadContent 发送
  const explicitProof = editorProofText.value.trim();

  // translationText 仅用于验证：如果没有任何翻译稿（既无服务端也无编辑器内文本），则拒绝确认校对
  const serverTranslation = targetRecord.content || '';
  const editorTranslation = editorTranslationText.value.trim();
  const hasTranslation = serverTranslation.trim().length > 0 || editorTranslation.length > 0;

  const proofDirty = source.proofText !== source.serverProofText;

  if (!isActiveProof && !hasTranslation) {
    showToast('当前标记没有翻译稿可供校对', 'error');

    return;
  }

  isSubmittingProof.value = true;

  try {
    if (isActiveProof && !proofDirty) {
      const result = await updateTranslation({
        translationId: targetRecord.id,
        selected: false,
        proofreadContent: '',
      });

      const record = toTranslationRecord(result, targetRecord.isMine);

      applyRecordToSource(source, record);

      showToast('已取消校对状态');
    } else {
      const payload: { translationId: string; selected: true; proofreadContent?: string } = {
        translationId: targetRecord.id,
        selected: true,
      };

      // 仅当用户在校对框填写了内容时才发送 proofreadContent；不应把 translationText 当作校对内容发送
      if (explicitProof.length > 0) {
        payload.proofreadContent = explicitProof;
      }

      const result = await updateTranslation(payload);

      const record = toTranslationRecord(result, targetRecord.isMine);

      applyRecordToSource(source, record);

      showToast('校对已提交');
    }

    persistPageSources(currentPageIndex.value);
  } catch (error) {
    console.error('提交校对失败', error);
    showToast('提交校对失败', 'error');
  } finally {
    isSubmittingProof.value = false;
  }
}

// 校对模式快捷键（只读模式下禁止）
function handleProofShortcut(event: KeyboardEvent): void {
  if (!canEdit.value) return;
  if (!isProofMode.value) {
    return;
  }

  if (event.key !== 'Enter' || !event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
    return;
  }

  event.preventDefault();

  void toggleProofStatus();
}

// 关闭悬浮窗
function handleCloseEditor(): void {
  showEditor.value = false;
  activeSourceId.value = null;
}

// 返回项目详情
async function handleBackToProject(): Promise<void> {
  // 退出前强制提交所有待更新内容
  await flushPendingUpdates();

  emit('back');
}

// 切换上一页
function handlePreviousPage(): void {
  if (currentPageIndex.value <= 0) {
    return;
  }

  currentPageIndex.value -= 1;

  emit('update:pageIndex', currentPageIndex.value);
}

// 切换下一页
function handleNextPage(): void {
  const total = projectPage.value?.pageCount ?? 0;

  if (total === 0 || currentPageIndex.value >= total - 1) {
    return;
  }

  currentPageIndex.value += 1;

  emit('update:pageIndex', currentPageIndex.value);
}

function handleJumpToPage(): void {
  const total = projectPage.value?.pageCount ?? 0;

  if (total <= 0) {
    pageInputValue.value = currentPageIndex.value + 1;

    return;
  }

  const requested = Number(pageInputValue.value);

  if (!Number.isFinite(requested)) {
    pageInputValue.value = currentPageIndex.value + 1;

    return;
  }

  const clamped = Math.min(Math.max(1, Math.round(requested)), total);

  pageInputValue.value = clamped;

  if (clamped - 1 === currentPageIndex.value) {
    return;
  }

  currentPageIndex.value = clamped - 1;

  emit('update:pageIndex', currentPageIndex.value);
}

onMounted(() => {
  // 只读模式初始化：强制折叠面板并清空选中
  if (!canEdit.value) {
    isPanelCollapsed.value = true;
    hasPanelOverride.value = true;
    activeSourceId.value = null;
  }
  window.addEventListener('pointermove', updateDraggingSourcePosition);

  window.addEventListener('pointermove', updateEditorPosition);

  // 监听编辑器调整大小
  window.addEventListener('pointermove', updateEditorSize);

  window.addEventListener('pointerup', stopDraggingSource);

  window.addEventListener('pointerup', stopDraggingEditor);

  window.addEventListener('pointerup', stopResizingEditor);

  window.addEventListener('pointercancel', stopDraggingSource);

  window.addEventListener('pointercancel', stopDraggingEditor);

  window.addEventListener('pointercancel', stopResizingEditor);

  window.addEventListener('keydown', handleGlobalShortcuts, true);
  window.addEventListener('keyup', handleGlobalKeyup, true);

  window.addEventListener('resize', handleWindowResize);

  nextTick(syncPanelHeightWithBoard);

  nextTick(updateWorkspaceHeight);

  if (typeof ResizeObserver !== 'undefined') {
    boardResizeObserver = new ResizeObserver(() => {
      syncPanelHeightWithBoard();

      updateWorkspaceHeight();
    });

    nextTick(() => {
      if (boardRef.value) {
        boardResizeObserver?.observe(boardRef.value);
      }
    });
  }
});

onBeforeUnmount(() => {
  // 退出前强制提交所有待更新内容
  void flushPendingUpdates();

  // 清除节流提交timeout
  if (pendingFlushTimeout !== null) {
    clearTimeout(pendingFlushTimeout);
    pendingFlushTimeout = null;
  }

  window.removeEventListener('pointermove', updateDraggingSourcePosition);

  window.removeEventListener('pointermove', updateEditorPosition);
  // 移除编辑器调整大小监听
  window.removeEventListener('pointermove', updateEditorSize);

  window.removeEventListener('pointerup', stopDraggingSource);

  window.removeEventListener('pointerup', stopDraggingEditor);
  window.removeEventListener('pointerup', stopResizingEditor);

  window.removeEventListener('pointercancel', stopDraggingSource);

  window.removeEventListener('pointercancel', stopDraggingEditor);
  window.removeEventListener('pointercancel', stopResizingEditor);

  window.removeEventListener('keydown', handleGlobalShortcuts, true);
  window.removeEventListener('keyup', handleGlobalKeyup, true);

  window.removeEventListener('resize', handleWindowResize);

  if (boardResizeObserver) {
    boardResizeObserver.disconnect();

    boardResizeObserver = null;
  }

  currentImageObjectUrl.value = null;

  // 全局 toast 不需要在此清理
});
</script>

<template>
  <section class="translator">
    <header class="translator__header">
      <div class="translator__title-group">
        <h1 class="translator__title">{{ projectPage?.title ?? '加载中' }}</h1>
      </div>
      <div class="translator__actions">
        <button
          type="button"
          class="translator__refresh-button"
          title="刷新图片（绕过缓存）"
          @click="forceReloadImage"
        >
          <svg
            class="translator__refresh-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
          <span class="sr-only">刷新图片（绕过缓存）</span>
        </button>
        <div class="translator__zoom-indicator">{{ Math.round(zoom * 100) }}%</div>
        <form class="translator__page-jump" @submit.prevent="handleJumpToPage">
          <input
            class="page-jump__input"
            type="number"
            min="1"
            :max="projectPage?.pageCount ?? 1"
            v-model.number="pageInputValue"
            :disabled="!projectPage"
            aria-label="跳转页码"
          />
          <span class="page-jump__divider">/ {{ projectPage?.pageCount ?? '-' }}</span>
          <button type="submit" class="page-jump__button" :disabled="!projectPage">跳转</button>
        </form>
      </div>
    </header>
    <div class="translator__body">
      <aside class="toolbox">
        <button type="button" class="toolbox__button" title="返回项目" @click="handleBackToProject">
          <span class="sr-only">返回项目</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5L4 12H7V20H11V15H13V20H17V12H20L12 5Z" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbox__button"
          title="上一页"
          @click="handlePreviousPage"
          :disabled="currentPageIndex <= 0"
        >
          <span class="sr-only">上一页</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 6L8.5 12L14.5 18" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbox__button"
          title="下一页"
          @click="handleNextPage"
          :disabled="projectPage ? currentPageIndex >= projectPage.pageCount - 1 : true"
        >
          <span class="sr-only">下一页</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 6L15.5 12L9.5 18" />
          </svg>
        </button>
        <button
          type="button"
          class="toolbox__button"
          :title="isPanelCollapsed ? '展开源列表' : '收起源列表'"
          @click="handleTogglePanel"
          :aria-pressed="!isPanelCollapsed"
          v-if="canEdit"
        >
          <span class="sr-only">{{ isPanelCollapsed ? '展开源列表' : '收起源列表' }}</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              :d="isPanelCollapsed ? 'M7 8H17M7 12H17M7 16H17' : 'M8 9H16M8 12H16M8 15H16'"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="toolbox__button"
          :class="{ 'toolbox__button--active': isAutoRelocateEnabled }"
          :title="isAutoRelocateEnabled ? '关闭自动重定位' : '开启自动重定位'"
          @click="handleToggleAutoRelocate"
          :aria-pressed="isAutoRelocateEnabled"
          v-if="canEdit"
        >
          <span class="sr-only">{{
            isAutoRelocateEnabled ? '关闭自动重定位' : '开启自动重定位'
          }}</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M12 4V6.4M12 17.6V20M6.4 12H4M20 12H17.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="toolbox__button"
          :class="{ 'toolbox__button--active': isProofMode }"
          :title="isProofMode ? '切换为翻译模式' : '切换为校对模式'"
          @click="handleToggleMode"
          :aria-pressed="isProofMode"
          v-if="canEdit"
        >
          <span class="sr-only">{{ isProofMode ? '切换为翻译模式' : '切换为校对模式' }}</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 12.5L10 16.5L18 8.5M11 4H7A3 3 0 0 0 4 7V17A3 3 0 0 0 7 20H17A3 3 0 0 0 20 17V13"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button type="button" class="toolbox__button" title="快捷键指南" @click="openShortcutHelp">
          <span class="sr-only">快捷键指南</span>
          <svg class="toolbox__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3C7.58 3 4 6.58 4 11C4 15.42 7.58 19 12 19C16.42 19 20 15.42 20 11C20 6.58 16.42 3 12 3Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M10.8 9.2C10.8 8.32 11.52 7.6 12.4 7.6C13.28 7.6 14 8.32 14 9.2C14 10.08 13.48 10.48 13.08 10.76C12.48 11.18 12.2 11.48 12.2 12.2V12.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 15.2H12.01"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </aside>
      <div class="translator__workspace" :style="workspaceStyle" ref="workspaceRef">
        <div
          class="board"
          :class="boardGridClass"
          ref="boardRef"
          @wheel="handleCanvasWheel"
          @pointerdown="handleCanvasPointerDown"
          @pointermove="handleCanvasPointerMove"
          @pointerup="handleCanvasPointerUp"
          @pointercancel="handleCanvasPointerCancel"
          @contextmenu.prevent
        >
          <!-- 校对模式左上角简洁计数徽章：m/n (已校对数量 / 总标记数量) -->
          <div v-if="isProofMode" class="board__proof-indicator" aria-hidden="true">
            {{ sources.filter(item => item.status === 'proofed').length }}/{{ sources.length }}
          </div>
          <div v-if="isLoading" class="board__loading">
            <LoadingCircle />
          </div>
          <div class="board__frame" ref="imageWrapperRef" :style="{ transform: boardTransform }">
            <img
              v-if="projectPage && !isLoading"
              :src="projectPage.imageUrl"
              alt="漫画页"
              class="board__image"
              draggable="false"
              @load="handleBoardContentLoaded"
              @error="handleImageLoadError"
            />
            <template v-if="showMarkers && canEdit && !isLoading">
              <button
                v-for="item in sources"
                :key="item.id"
                type="button"
                class="marker"
                :class="{
                  'marker--active': item.id === activeSourceId,
                  'marker--outside': item.category === 'outside',
                  'marker--inside': item.category === 'inside',
                }"
                :data-source-id="item.id"
                :style="{
                  left: `${item.position.x * 100}%`,
                  top: `${item.position.y * 100}%`,
                  transform: markerTransform,
                }"
                :aria-label="`${sourceLabelMap.get(item.id)?.number ?? ''} ${sourceLabelMap.get(item.id)?.suffix ?? ''}`"
                @pointerdown="event => handleSourcePointerDown(event, item.id)"
                @click.stop="handleSelectSource(item.id)"
                @contextmenu.prevent.stop="handleRemoveSource(item.id)"
              >
                <!-- SVG倒三角形：底边在上，尖端在下 -->
                <svg
                  class="marker__triangle"
                  viewBox="0 0 30 27"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon class="marker__fill" points="15,27 0,0 30,0" />
                  <polygon
                    class="marker__stroke"
                    points="15,27 0,0 30,0"
                    fill="none"
                    stroke-width="2"
                  />
                </svg>
                <span class="marker__label">{{ sourceLabelMap.get(item.id)?.number ?? '' }}</span>
                <span
                  v-if="isSourceProofed(item)"
                  class="marker__proof-badge"
                  :title="getProofBadgeTitle(item)"
                  aria-hidden="true"
                >
                  ✓
                </span>
              </button>
            </template>
            <div
              v-if="isProofMode && editorSource"
              class="marker-overlay"
              :style="proofOverlayStyle"
            >
              <div class="marker-overlay__content">
                {{ getMarkerOverlayText(editorSource) }}
              </div>
            </div>
          </div>
        </div>
        <aside
          class="panel"
          :class="{ 'panel--collapsed': isPanelCollapsed }"
          ref="panelRef"
          :style="panelStyle"
        >
          <ul v-if="!isPanelCollapsed && canEdit" class="panel__list">
            <li
              v-for="item in sources"
              :key="item.id"
              class="panel__item"
              :class="{
                'panel__item--active': item.id === activeSourceId,
                'panel__item--proofed': item.status === 'proofed',
                'panel__item--translated': item.status === 'translated',
              }"
              @click="handleSelectSource(item.id)"
            >
              <div class="panel__item-top">
                <span
                  >【{{ sourceLabelMap.get(item.id)?.number ?? '' }}】
                  {{ sourceLabelMap.get(item.id)?.suffix ?? '' }}</span
                >
                <span
                  class="panel__status-dot"
                  :class="{
                    'panel__status-dot--empty': item.status === 'empty',
                    'panel__status-dot--translated': item.status === 'translated',
                    'panel__status-dot--proofed': item.status === 'proofed',
                  }"
                  aria-hidden="true"
                ></span>
              </div>
              <p class="panel__item-text">
                {{ item.proofText || item.translationText || '〈empty〉' }}
              </p>
            </li>
          </ul>
        </aside>
      </div>
    </div>
    <div
      v-if="
        showEditor &&
        sources.length > 0 &&
        editorSource &&
        canEdit &&
        (!isProofMode || props.isProofreader || !props.hasPoprako)
      "
      class="editor"
      :style="{
        left: `${editorPosition.x}px`,
        top: `${editorPosition.y}px`,
        width: `${editorSize.width}px`,
        maxHeight: `${editorSize.height}px`,
      }"
    >
      <header class="editor__header" @pointerdown="handleEditorPointerDown">
        <div class="editor__title">
          <span class="editor__label">
            【{{ selectedSourceLabelInfo?.number }}】
            <button
              type="button"
              class="editor__category-toggle"
              :class="
                selectedSourceLabelInfo?.suffix === '框内'
                  ? 'editor__category-toggle--inside'
                  : 'editor__category-toggle--outside'
              "
              @click="toggleSourceCategory"
            >
              {{ selectedSourceLabelInfo?.suffix }}
            </button>
          </span>
          <span class="editor__mode">{{ isProofMode ? '校对模式' : '翻译模式' }}</span>
        </div>
        <button
          type="button"
          class="editor__close"
          title="关闭浮窗"
          @click.stop="handleCloseEditor"
          @pointerdown.stop
        >
          <span class="sr-only">关闭浮窗</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 8L16 16M16 8L8 16" />
          </svg>
        </button>
      </header>
      <div class="editor__body" :class="{ 'editor__body--proof-mode': isProofMode }">
        <div class="editor__symbols">
          <button
            v-for="symbol in SPECIAL_SYMBOLS"
            :key="symbol"
            class="editor__symbol"
            @click="copySymbol(symbol)"
            :title="`复制 ${symbol}`"
          >
            {{ symbol }}
          </button>
        </div>
        <div v-if="!isProofMode" class="editor__field">
          <div class="editor__field-label">翻译稿</div>
          <textarea
            v-model="editorTranslationText"
            class="editor__textarea"
            placeholder="待翻译..."
            ref="translationTextareaRef"
            @input="handleTranslationInput"
          ></textarea>
        </div>
        <!-- <div v-if="isProofMode" class="editor__field editor__field--readonly">
          <div class="editor__field-label">翻译稿</div>
          <textarea
            :value="editorTranslationText"
            readonly
            class="editor__textarea editor__textarea--readonly"
          ></textarea>
        </div> -->
        <div v-if="isProofMode" class="editor__field editor__field--proof">
          <div class="editor__field-label">校对稿</div>
          <textarea
            v-model="editorProofText"
            class="editor__textarea editor__textarea--proof"
            placeholder="待校对..."
            ref="proofTextareaRef"
            @keydown="handleProofShortcut"
            @input="handleProofInput"
          ></textarea>
        </div>
      </div>
      <footer class="editor__footer">
        <div class="editor__footer-actions">
          <button
            v-if="isProofMode"
            type="button"
            class="editor__footer-button editor__footer-button--primary"
            @click="toggleProofStatus"
            :disabled="isSubmittingProof"
          >
            {{
              isSubmittingProof
                ? '提交中...'
                : editorSource.status === 'proofed'
                  ? '取消校对状态'
                  : '提交校对'
            }}
          </button>
        </div>
      </footer>
      <!-- 可拖拽的调整大小把手 -->
      <div
        class="editor__resize-handle"
        @pointerdown.stop="handleEditorResizePointerDown"
        @dblclick.stop="resetEditorSize"
        role="separator"
        aria-orientation="horizontal"
        title="调整大小，双击恢复默认大小"
      ></div>
    </div>
    <div
      v-if="isShortcutHelpVisible"
      class="shortcut-help-overlay"
      @click="closeShortcutHelp"
    ></div>
    <div
      v-if="isShortcutHelpVisible"
      class="shortcut-help"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-label="快捷键指南"
      ref="shortcutHelpRef"
      @keydown="handleShortcutHelpKeydown"
      @click.stop
    >
      <header class="shortcut-help__header">
        <h2 class="shortcut-help__title">快捷键指南</h2>
        <button type="button" class="shortcut-help__close" @click="closeShortcutHelp">
          <span class="sr-only">关闭快捷键悬浮窗</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 8L16 16M16 8L8 16" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <ul class="shortcut-help__list">
        <li v-for="item in SHORTCUT_HINTS" :key="item.combo" class="shortcut-help__item">
          <span class="shortcut-help__combo">{{ item.combo }}</span>
          <span class="shortcut-help__description">{{ item.description }}</span>
        </li>
      </ul>
    </div>
    <div v-if="confirmVisible" class="confirm-overlay" @click.self="confirmCancel">
      <div class="confirm-box" role="dialog" aria-modal="true">
        <div class="confirm-message">{{ confirmMessage }}</div>
        <div class="confirm-actions">
          <button
            type="button"
            class="confirm-button confirm-button--cancel"
            @click="confirmCancel"
          >
            取消
          </button>
          <button type="button" class="confirm-button confirm-button--ok" @click="confirmOk">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 全局 toast 在 App.vue 中挂载 -->
  </section>
</template>

<style scoped>
.translator {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: radial-gradient(circle at 18% 22%, #f6fbff 0%, #f1f6ff 45%, #ffffff 100%);
  color: #28384c;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.translator__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 40px 16px;
}

.translator__actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.translator__title-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.translator__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(112, 182, 255, 0.2);
  color: #3d6696;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.translator__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1f2e43;
}

.translator__zoom-indicator {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(130, 190, 255, 0.18);
  color: #2f5a8f;
  font-size: 13px;
}

.translator__refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 8px;
  border-radius: 10px;
  border: 1px solid rgba(152, 186, 229, 0.45);
  background: rgba(241, 248, 255, 0.95);
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.translator__refresh-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(118, 184, 255, 0.14);
  border-color: rgba(112, 182, 255, 0.6);
}

.translator__refresh-icon {
  width: 16px;
  height: 16px;
  stroke: #2f5a8f;
  fill: none;
}

.translator__page-jump {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid rgba(170, 204, 245, 0.65);
  background: rgba(248, 252, 255, 0.92);
  padding: 4px 10px;
}

.page-jump__input {
  width: 56px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 13px;
  color: #2f3f56;
}

.page-jump__input:focus {
  outline: none;
}

.page-jump__divider {
  font-size: 12px;
  color: #5a6c86;
}

.page-jump__button {
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  background: rgba(200, 215, 230, 0.85);
  color: #123357;
  font-size: 12px;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.page-jump__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.page-jump__button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(118, 184, 255, 0.35);
}

.translator__body {
  flex: 1;
  display: flex;
  gap: 18px;
  padding: 0 36px 40px;
  align-items: stretch;
  min-height: 0;
}

.toolbox {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 36px rgba(129, 167, 215, 0.16);
  align-self: flex-start;
}

.toolbox__button {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(152, 186, 229, 0.45);
  background: rgba(241, 248, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease,
    border 0.18s ease;
}

.toolbox__button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(136, 190, 247, 0.28);
  border-color: rgba(112, 182, 255, 0.6);
}

.toolbox__button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.toolbox__button--active {
  border-color: rgba(118, 184, 255, 0.85);
  box-shadow: 0 12px 22px rgba(118, 184, 255, 0.26);
  background: rgba(228, 245, 255, 0.95);
}

.toolbox__icon {
  width: 18px;
  height: 18px;
  stroke: #3e5c88;
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.translator__workspace {
  flex: 1;
  display: flex;
  gap: 18px;
  align-items: stretch;
  min-height: 0;
  height: 100%;
}

.translator__workspace > * {
  height: 100%;
  min-height: 0;
}

.board {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 26px 60px rgba(118, 166, 219, 0.18);
  backdrop-filter: blur(10px);
  overflow: hidden;
  cursor: default;
  touch-action: none;
  min-height: 0;
  height: 100%;
}

.board__loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

/* 校对模式左上角计数徽章样式 */
.board__proof-indicator {
  position: absolute;
  left: 15px;
  top: 12px;
  z-index: 25;
  background: rgba(157, 9, 66, 0.08);
  color: #b04bd7;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(11, 99, 255, 0.12);
  box-shadow: 0 6px 18px rgba(12, 66, 160, 0.06);
  pointer-events: none;
}

.board__frame {
  position: relative;
  width: clamp(360px, 58vw, 680px);
  transform-origin: top left;
  transition: transform 0.08s ease;
}

.board__image {
  width: 100%;
  height: auto;
  display: block;
  /* show original image without rounded corners */
  box-shadow: 0 16px 32px rgba(113, 156, 212, 0.22);
  user-select: none;
}

.marker {
  position: absolute;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 倒三角尺寸 */
  width: 30px;
  height: 27px;
  /* 尖端在底部，以尖端为定位点 */
  transform-origin: 50% 100%;
  transition: transform 0.16s ease;
  min-width: 0;
  touch-action: none;
  overflow: visible;
}

.marker__triangle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 默认填充色（不应该显示，总是被inside/outside覆盖） */
.marker__fill {
  fill: rgba(220, 220, 220, 0.95);
}

/* 默认边框色 - 橙色 */
.marker__stroke {
  stroke: rgba(255, 140, 60, 0.95);
  stroke-width: 1;
}

.marker:hover,
.marker:focus-visible {
  outline: none;
}

.marker__label {
  color: #1a1a1a;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  pointer-events: none;
  /* 数字位于三角形高度30%处（从顶边向下） */
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.marker__proof-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(120deg, rgba(124, 205, 182, 0.95), rgba(146, 214, 222, 0.95));
  color: #14323d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  box-shadow: 0 6px 12px rgba(120, 160, 150, 0.12);
  z-index: 2;
}

/* inside: 粉色背景 + 深红边框 */
.marker--inside .marker__fill {
  fill: rgba(255, 182, 193, 0.95);
}

.marker--inside .marker__stroke {
  stroke: rgba(229, 179, 195, 0.95);
}

.marker--inside .marker__label {
  color: #4a1a30;
}

/* outside: 黄色背景 + 深黄边框 */
.marker--outside .marker__fill {
  fill: rgba(255, 249, 196, 0.95);
}

.marker--outside .marker__stroke {
  stroke: rgba(243, 225, 181, 0.95);
}

.marker--outside .marker__label {
  color: #5a4a1a;
}

/* active: 淡红色边框，宽度3px */
.marker--active .marker__stroke {
  stroke: rgba(100, 255, 183, 0.8);
  stroke-width: 3;
}

.marker-overlay {
  position: absolute;
  transform: translate(-50%, calc(-100% - 18px));
  pointer-events: none;
  max-width: 240px;
  width: max-content;
}

.marker-overlay__content {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(28, 40, 58, 0.72);
  color: #f5f8ff;
  font-size: 12px;
  line-height: 1.5;
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 24px rgba(30, 50, 76, 0.32);
  white-space: pre-line;
}

.panel {
  flex: 0 0 auto;
  padding: 18px 18px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 50px rgba(123, 168, 225, 0.18);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  transition:
    flex-basis 0.28s ease,
    max-width 0.28s ease,
    padding 0.28s ease;
}

.panel--collapsed {
  padding: 12px 8px;
  align-items: stretch;
  justify-content: flex-start;
  box-sizing: border-box;
}

.panel__list {
  margin: 0;
  padding: 8px 6px 4px 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.panel__item {
  flex: none;
  width: 100%;
  padding: 11px 13px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(204, 212, 225, 0.8);
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border 0.16s ease;
  box-sizing: border-box;
}

.panel__item--active {
  border-color: rgba(118, 184, 255, 0.85);
  box-shadow: 0 12px 26px rgba(150, 189, 246, 0.26);
  transform: translateY(-2px);
}

.panel__item--proofed {
  background: rgba(210, 244, 225, 0.95);
  border-color: rgba(147, 205, 173, 0.7);
}

.panel__item--translated {
  background: rgba(255, 234, 214, 0.95);
  border-color: rgba(250, 191, 143, 0.7);
}

.panel__item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #3a4d69;
  margin-bottom: 6px;
}

.panel__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(184, 194, 210, 0.8);
  box-shadow: 0 0 0 3px rgba(184, 194, 210, 0.18);
}

.panel__status-dot--empty {
  background: rgba(192, 200, 215, 0.85);
  box-shadow: 0 0 0 3px rgba(192, 200, 215, 0.2);
}

.panel__status-dot--translated {
  background: rgba(255, 174, 120, 0.85);
  box-shadow: 0 0 0 3px rgba(255, 174, 120, 0.18);
}

.panel__status-dot--proofed {
  background: rgba(122, 204, 159, 0.85);
  box-shadow: 0 0 0 3px rgba(122, 204, 159, 0.2);
}

.panel__item-text {
  margin: 0;
  font-size: 13px;
  color: #4b5e7a;
  line-height: 1.5;
  max-height: 3.4em;
  overflow: hidden;
}

.editor {
  position: fixed;
  width: auto;
  max-width: 520px;
  max-height: 80vh;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 22px 48px rgba(120, 162, 218, 0.26);
  border: 1px solid rgba(162, 192, 233, 0.4);
  backdrop-filter: blur(10px);
  z-index: 30;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  cursor: grab;
  background: rgba(248, 252, 255, 0.95);
  border-bottom: 1px solid rgba(190, 210, 238, 0.55);
}

.editor__title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor__label {
  font-weight: 600;
  font-size: 14px;
  color: #294061;
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor__category-toggle {
  border: 2px solid;
  background: none;
  color: #2f5a8f;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.16s ease;
}

.editor__category-toggle--inside {
  border-color: #ffb6c1; /* 浅粉色 */
}

.editor__category-toggle--outside {
  border-color: #ffff99; /* 浅黄色 */
}

.editor__category-toggle:hover {
  background: rgba(118, 184, 255, 0.2);
}

.editor__mode {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.3px;
  background: rgba(133, 182, 255, 0.18);
  color: #2a4f7a;
}

.editor__close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.16s ease;
}

.editor__close:hover {
  background: rgba(230, 240, 255, 0.8);
}

.editor__close svg {
  width: 16px;
  height: 16px;
  stroke: #3b5a80;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.editor__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  flex: 1;
  overflow: auto;
}

.editor__body--proof-mode {
  gap: 16px;
}

.editor__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor__symbols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(24px, 1fr));
  gap: 4px;
  margin-bottom: 10px;
}

.editor__symbol {
  border: none;
  background: rgba(236, 244, 255, 0.9);
  border-radius: 8px;
  padding: 6px;
  font-size: 16px;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    F background 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor__symbol:hover {
  transform: scale(1.2);
  background: rgba(200, 215, 230, 0.95);
}

.editor__field-label {
  font-size: 12px;
  color: #4a5f7d;
  font-weight: 600;
}

.editor__textarea {
  width: 100%;
  min-height: 43px;
  border: 1px solid rgba(188, 206, 233, 0.85);
  border-radius: 14px;
  padding: 11px;
  font-size: 13px;
  line-height: 1.6;
  color: #2a3b4f;
  background: rgba(246, 250, 255, 0.92);
  resize: none;
  transition:
    border 0.16s ease,
    box-shadow 0.16s ease;
  box-sizing: border-box;
}

.editor__textarea:focus {
  outline: none;
  border-color: rgba(118, 184, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(118, 184, 255, 0.18);
}

.editor__textarea--proof {
  min-height: 43px;
  background: rgba(244, 240, 255, 0.94);
}

.editor__field--readonly {
  opacity: 0.7;
}

.editor__textarea--readonly {
  background: rgba(240, 240, 240, 0.92);
  cursor: not-allowed;
}

.editor__footer {
  padding: 12px 14px 14px;
}

.editor__resize-handle {
  position: absolute;
  width: 18px;
  height: 18px;
  right: 10px;
  bottom: 10px;
  cursor: se-resize;
  border-radius: 4px;
  /* 视觉提示：使用半透明的斜线 */
  background:
    linear-gradient(135deg, rgba(80, 120, 160, 0.14) 20%, transparent 20%),
    linear-gradient(135deg, rgba(80, 120, 160, 0.12) 40%, transparent 40%);
  background-size:
    6px 6px,
    10px 10px;
  background-position:
    right bottom,
    right bottom;
  z-index: 40;
}

.editor__footer-actions {
  display: flex;
  gap: 10px;
}

.editor__footer-button {
  flex: 1;
  border-radius: 14px;
  padding: 10px 0;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.editor__footer-button--secondary {
  border-color: rgba(170, 204, 245, 0.75);
  background: rgba(236, 244, 255, 0.9);
  color: #325072;
}

.editor__footer-button--secondary:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 18px rgba(150, 190, 240, 0.25);
}

.editor__footer-button--primary {
  border: none;
  background: linear-gradient(120deg, rgba(124, 205, 182, 0.92), rgba(146, 214, 222, 0.9));
  color: #234060;
}

.editor__footer-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(130, 205, 182, 0.26);
}

.shortcut-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 46, 70, 0.28);
  backdrop-filter: blur(2px);
  z-index: 45;
}

.shortcut-help {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(440px, calc(100vw - 48px));
  max-height: min(420px, calc(100vh - 96px));
  padding: 22px 26px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 28px 56px rgba(104, 146, 204, 0.32);
  border: 1px solid rgba(160, 192, 236, 0.5);
  display: flex;
  flex-direction: column;
  gap: 18px;
  outline: none;
  z-index: 50;
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 30, 50, 0.32);
  z-index: 60;
}

.confirm-box {
  min-width: 320px;
  max-width: 92vw;
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 20px 40px rgba(30, 60, 100, 0.18);
  border: 1px solid rgba(150, 170, 200, 0.12);
}

.confirm-message {
  color: #223445;
  font-size: 14px;
  margin-bottom: 14px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.confirm-button {
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 13px;
}

.confirm-button--cancel {
  background: rgba(240, 246, 255, 0.95);
  color: #2f4b6f;
}

.confirm-button--ok {
  background: linear-gradient(120deg, rgba(250, 120, 120, 0.92), rgba(240, 100, 100, 0.92));
  color: #fff;
}

.shortcut-help__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shortcut-help__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #244163;
}

.shortcut-help__close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.16s ease;
  color: #3b5a80;
}

.shortcut-help__close:hover {
  background: rgba(229, 239, 255, 0.8);
}

.shortcut-help__close svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.shortcut-help__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.shortcut-help__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(242, 248, 255, 0.92);
  border: 1px solid rgba(186, 210, 244, 0.6);
}

.shortcut-help__combo {
  flex: none;
  min-width: 120px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(134, 188, 255, 0.22);
  color: #24507a;
  font-weight: 600;
  font-size: 13px;
  text-align: center;
}

.shortcut-help__description {
  flex: 1;
  font-size: 13px;
  color: #30455f;
  line-height: 1.5;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1280px) {
  .translator__body {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbox {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }

  .translator__workspace {
    display: flex;
    flex-direction: column;
  }

  .panel {
    width: 100%;
    height: auto;
  }

  .panel__list {
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
    gap: 10px;
    padding-right: 6px;
  }

  .panel__item {
    flex: 1 1 220px;
    width: auto;
  }
}
</style>
