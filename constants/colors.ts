const palette = {
  ink: "#1A1A2E",
  deepNavy: "#16213E",
  slate: "#0F3460",
  accent: "#E94560",
  accentSoft: "#FF6B6B",
  warmWhite: "#F8F0E3",
  cream: "#FFF8EE",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1A2E",
  textSecondary: "#5A6178",
  textMuted: "#9CA3AF",
  border: "#E8E0D4",
  borderLight: "#F0EBE3",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#EF4444",
  skip: "#94A3B8",
};

export default {
  light: {
    ...palette,
    text: palette.textPrimary,
    background: palette.cream,
    tint: palette.accent,
    tabIconDefault: palette.textMuted,
    tabIconSelected: palette.accent,
  },
};
