import { StyleTokens, ToneProfileId } from "./types";

export const STYLE_TOKENS: Record<ToneProfileId, StyleTokens> = {
  friendly: {
    colorPrimary: "#e8734a",
    colorSecondary: "#fff4ec",
    colorAccent: "#2f8f6e",
    colorBackground: "#fffaf5",
    colorSurface: "#ffffff",
    colorText: "#2b2320",
    colorMuted: "#7a6c63",
    fontHeading: "var(--font-quicksand), sans-serif",
    fontBody: "var(--font-nunito), sans-serif",
    radius: "1.25rem",
    density: "cozy",
    motion: "subtle",
  },
  "no-nonsense": {
    colorPrimary: "#111318",
    colorSecondary: "#f4f4f5",
    colorAccent: "#d62828",
    colorBackground: "#ffffff",
    colorSurface: "#ffffff",
    colorText: "#111318",
    colorMuted: "#52525b",
    fontHeading: "var(--font-archivo), sans-serif",
    fontBody: "var(--font-inter), sans-serif",
    radius: "0.25rem",
    density: "compact",
    motion: "none",
  },
  premium: {
    colorPrimary: "#101828",
    colorSecondary: "#f5f0e6",
    colorAccent: "#b08d57",
    colorBackground: "#faf8f4",
    colorSurface: "#ffffff",
    colorText: "#151b26",
    colorMuted: "#5c6474",
    fontHeading: "var(--font-playfair), serif",
    fontBody: "var(--font-inter), sans-serif",
    radius: "0.5rem",
    density: "spacious",
    motion: "none",
  },
  approachable: {
    colorPrimary: "#2f7ea3",
    colorSecondary: "#eaf5f9",
    colorAccent: "#f2b134",
    colorBackground: "#f7fbfd",
    colorSurface: "#ffffff",
    colorText: "#1f2b33",
    colorMuted: "#5c7280",
    fontHeading: "var(--font-baloo), sans-serif",
    fontBody: "var(--font-mulish), sans-serif",
    radius: "1rem",
    density: "cozy",
    motion: "subtle",
  },
};

// Multiple color palettes per tone so different businesses sharing a tone
// don't all render in the exact same colors. Font/radius/density/motion —
// the load-bearing parts of a tone's "personality" — stay fixed; only the
// palette varies. Index 0 of each array matches STYLE_TOKENS above.
export const PALETTE_VARIANTS: Record<ToneProfileId, StyleTokens[]> = {
  friendly: [
    STYLE_TOKENS.friendly,
    {
      ...STYLE_TOKENS.friendly,
      colorPrimary: "#e85d75",
      colorSecondary: "#fff0f3",
      colorAccent: "#f2a71b",
      colorBackground: "#fffaf7",
    },
    {
      ...STYLE_TOKENS.friendly,
      colorPrimary: "#c1502e",
      colorSecondary: "#fbeee4",
      colorAccent: "#3f7d5c",
      colorBackground: "#fffaf2",
    },
  ],
  "no-nonsense": [
    STYLE_TOKENS["no-nonsense"],
    {
      ...STYLE_TOKENS["no-nonsense"],
      colorPrimary: "#0f1b2d",
      colorSecondary: "#eef1f4",
      colorAccent: "#f0a202",
    },
    {
      ...STYLE_TOKENS["no-nonsense"],
      colorPrimary: "#22252a",
      colorSecondary: "#f0f0f0",
      colorAccent: "#0f9b8e",
    },
  ],
  premium: [
    STYLE_TOKENS.premium,
    {
      ...STYLE_TOKENS.premium,
      colorPrimary: "#10312b",
      colorSecondary: "#f3f1e7",
    },
    {
      ...STYLE_TOKENS.premium,
      colorPrimary: "#4a1620",
      colorSecondary: "#f7f0ee",
      colorAccent: "#a67c3d",
    },
  ],
  approachable: [
    STYLE_TOKENS.approachable,
    {
      ...STYLE_TOKENS.approachable,
      colorPrimary: "#2a8f82",
      colorSecondary: "#e8f6f3",
      colorAccent: "#ef7b5d",
    },
    {
      ...STYLE_TOKENS.approachable,
      colorPrimary: "#6d5ba6",
      colorSecondary: "#f1edf9",
      colorAccent: "#a8c94a",
    },
  ],
};
