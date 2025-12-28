import React from "react";

type VerticalAdaptiveListProps = {
  items: Array<{
    id: string;
    height: number;
    content: React.ReactNode;
  }>;
  gap: number;
  debug?: boolean;
  currentPage: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
};

const VerticalAdaptiveList: React.FC<VerticalAdaptiveListProps> = ({
  items,
  gap,
  debug = false,
  currentPage,
  onPrevPage,
  onNextPage,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
      {debug && <div>Current Page: {currentPage}</div>}

      {onPrevPage && (
        <button onClick={onPrevPage} disabled={!onPrevPage}>
          Previous Page
        </button>
      )}

      {items.map((item) => (
        <div key={item.id} style={{ height: item.height }}>
          {item.content}
        </div>
      ))}

      {onNextPage && (
        <button onClick={onNextPage} disabled={!onNextPage}>
          Next Page
        </button>
      )}
    </div>
  );
};

export default VerticalAdaptiveList;