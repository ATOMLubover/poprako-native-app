import { X } from "lucide-react";
import { useToast } from "../NotificationToast";
import "./SpecialSymbolCard.css";
import { SYMBOL_SECTIONS } from "../../models/specialSymbols";

type SpecialSymbolCardProps = {
  visible: boolean;
  onClose: () => void;
};

export const SpecialSymbolCard: React.FC<SpecialSymbolCardProps> = ({ visible, onClose }) => {
  const { showToast } = useToast();

  if (!visible) {
    return null;
  }

  const copySymbol = async (symbol: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(symbol);
        showToast("success", `已复制 ${symbol}`);
        return;
      }

      throw new Error("Clipboard API not available");
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = symbol;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      if (err instanceof Error) {
        console.error("Copy fallback triggered", err);
      }

      showToast("success", `已复制 ${symbol}`);
    }
  };

  return (
    <div className="special-symbol-card-overlay" onClick={onClose}>
      <div className="special-symbol-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="card-title">特殊符号</h3>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="card-content">
          {SYMBOL_SECTIONS.map((section) => (
            <div key={section.title} className="symbol-section-compact">
              <div className="section-header-compact">
                <span className="section-title-compact">{section.title}</span>
              </div>

              <div className="symbol-grid-compact">
                {section.symbols.map((symbol) => (
                  <button
                    key={`${section.title}-${symbol}`}
                    type="button"
                    className="symbol-item-compact"
                    onClick={() => copySymbol(symbol)}
                  >
                    <span className="symbol-char-compact">{symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
