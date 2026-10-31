export interface LanguageMark {
  symbol: string;
  color: string;
}

const LANGUAGES: Record<string, LanguageMark> = {
  TypeScript: { symbol: "TS", color: "#5B9BD5" },
  JavaScript: { symbol: "JS", color: "#E8D45A" },
  Python: { symbol: "Py", color: "#6FA8DC" },
  Rust: { symbol: "Rs", color: "#D9925B" },
  Go: { symbol: "Go", color: "#73D7FF" },
  Java: { symbol: "Jv", color: "#D98B5B" },
  Kotlin: { symbol: "Kt", color: "#A97BFF" },
  Swift: { symbol: "Sw", color: "#F08A5B" },
  C: { symbol: "C", color: "#A8B4C4" },
  "C++": { symbol: "C+", color: "#E0709B" },
  "C#": { symbol: "C#", color: "#7FBF7F" },
  Ruby: { symbol: "Rb", color: "#D0605E" },
  PHP: { symbol: "Ph", color: "#8C93C8" },
  Shell: { symbol: "Sh", color: "#88C57F" },
  HTML: { symbol: "Ht", color: "#E37B5B" },
  CSS: { symbol: "Cs", color: "#9A7BC9" },
  Vue: { symbol: "Vu", color: "#55D6A0" },
  Dart: { symbol: "Da", color: "#5BC4D9" },
  Lua: { symbol: "Lu", color: "#7C8FE0" },
  Zig: { symbol: "Zg", color: "#E8B45A" },
  "Jupyter Notebook": { symbol: "Nb", color: "#E89A5A" },
};

const UNKNOWN: LanguageMark = { symbol: "?", color: "#8A8FA3" };

export function languageMark(language: string | null): LanguageMark {
  if (!language) return UNKNOWN;
  return (
    LANGUAGES[language] ?? {
      symbol: language.slice(0, 2),
      color: UNKNOWN.color,
    }
  );
}
