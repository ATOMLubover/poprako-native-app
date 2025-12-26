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
};

const MarkerOverlay: React.FC<MarkerOverlayProps> = ({
  units,
  imageRenderInfo,
  mode,
  selectedUnitId,
  onUnitClick,
  onUnitRemove,
}) => {
  return (
    <div
      className="marker-overlay"
      style={{
        pointerEvents: "none",
      }}
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
        />
      ))}
    </div>
  );
};

export default MarkerOverlay;
