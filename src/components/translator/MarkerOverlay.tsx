import React from "react";
import "./MarkerOverlay.css";
import { Marker } from "./Marker";
import type { Unit } from "../../models/translator";
import type { TranslatorMode } from "./Translator";

type MarkerOverlayProps = {
  units: Unit[];
  imageRenderInfo: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
  };
  mode: TranslatorMode;
  selectedUnitId?: string | null;
  onUnitClick?: (unitId: string) => void;
  onUnitRemove?: (unitId: string) => void;
  // 实时移动回调（可选，用于预览）
  onUnitMove?: (unitId: string, x: number, y: number) => void;
  // 移动结束回调（用于持久化保存）
  onUnitMoveEnd?: (unitId: string, x: number, y: number) => void;
};

const MarkerOverlay: React.FC<MarkerOverlayProps> = (props) => {
  const {
    units,
    imageRenderInfo,
    mode,
    selectedUnitId,
    onUnitClick,
    onUnitRemove,
  } = props;

  // 安全包装父组件回调，避免在 HMR 或加载顺序异常时引用未定义的自由变量
  const onUnitMoveSafe = (unitId: string, x: number, y: number) => {
    if (typeof props.onUnitMove === "function") {
      props.onUnitMove(unitId, x, y);
    }
  };

  const onUnitMoveEndSafe = (unitId: string, x: number, y: number) => {
    if (typeof props.onUnitMoveEnd === "function") {
      props.onUnitMoveEnd(unitId, x, y);
    }
  };

  return (
    <div
      className="marker-overlay"
    >
      {units.map((unit) => (
        <Marker
          key={unit.id}
          unit={unit}
          imageRenderInfo={imageRenderInfo}
          mode={mode}
          isSelected={unit.id === selectedUnitId}
          onClick={() => onUnitClick?.(unit.id)}
          onRemove={() => onUnitRemove?.(unit.id)}
          onMoveStart={() => onUnitClick?.(unit.id)}
          onMove={(x, y) => onUnitMoveSafe(unit.id, x, y)}
          onMoveEnd={(x, y) => onUnitMoveEndSafe(unit.id, x, y)}
        />
      ))}
    </div>
  );
};

export default MarkerOverlay;
