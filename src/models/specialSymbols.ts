export type SymbolSection = {
  title: string;
  symbols: string[];
};

export const SYMBOL_SECTIONS: SymbolSection[] = [
  {
    title: "星形与爱心",
    symbols: ["★", "☆", "❤", "♡", "❈", "✿", "❀"],
  },
  {
    title: "状态与标记",
    symbols: ["✔", "✘", "●", "○", "✕"],
  },
  {
    title: "音乐符号",
    symbols: ["♩", "♪", "♫", "♬", "♯", "♭", "♮"],
  },
  {
    title: "引号（成对）",
    symbols: ["『』", "「」", "【】", "〈〉"],
  },
  {
    title: "其他",
    symbols: ["©", "®", "♂", "♀", "♁", "▶", "◀", "§"],
  },
];
