import "./ProgressBar.css";

type ProgressItem = {
  color: string;
  length: number;
};

type ProgressBarProps = {
  items: ProgressItem[];
  height?: number;
};

export default function ProgressBar({ items, height = 12 }: ProgressBarProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-outer" style={{ height: `${height}px` }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="progress-inner"
            style={{
              width: `${item.length}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}
