/**
 * Modern Fintech Design System
 * Inspired by Linear, Apple, Notion, and contemporary fintech apps
 * 
 * Design Principles:
 * - Clean, premium, minimal aesthetic
 * - Soft warm neutral palette
 * - Extremely subtle borders and shadows
 * - Spacious layout with strong visual hierarchy
 * - Excellent dark/light mode support
 */

export const FINTECH_COLORS = {
  // ─── Core Palette (Light Mode) ─────────────────
  LIGHT: {
    // Backgrounds
    background: {
      primary: "#F5F4F2",    // Main app background - warm neutral
      secondary: "#FAFAF8",  // Secondary pages
      card: "#FFFFFF",       // Cards, components, widgets
      subtle: "#F9F8F6",     // Subtle backgrounds
      overlay: "rgba(17, 17, 17, 0.25)",
    },
    
    // Text
    text: {
      primary: "#111111",    // Main text
      secondary: "#6B7280",  // Secondary text
      muted: "#9CA3AF",      // Muted labels
      inverse: "#FFFFFF",
      disabled: "#D1D5DB",
    },
    
    // Borders & Dividers
    border: {
      default: "#E7E5E4",    // Default borders/dividers
      subtle: "#F0EEEB",     // Subtle dividers
      strong: "#D4D2D0",     // Strong borders
    },
    
    // Accent & Brand
    accent: {
      primary: "#7C6CF2",    // Primary accent - purple
      hover: "#8E80FF",      // Hover state
      active: "#6B59DB",     // Active state
      light: "rgba(124, 108, 242, 0.12)", // Light accent background
    },
    
    // Semantic Colors
    status: {
      success: "#10B981",
      successLight: "rgba(16, 185, 129, 0.12)",
      warning: "#F59E0B",
      warningLight: "rgba(245, 158, 11, 0.12)",
      error: "#EF4444",
      errorLight: "rgba(239, 68, 68, 0.12)",
      info: "#3B82F6",
      infoLight: "rgba(59, 130, 246, 0.12)",
    },
    
    // Shadows (Minimal & Subtle)
    shadow: {
      xs: "0 1px 2px rgba(17, 17, 17, 0.05)",
      sm: "0 2px 4px rgba(17, 17, 17, 0.08)",
      md: "0 4px 8px rgba(17, 17, 17, 0.1)",
      lg: "0 10px 24px rgba(17, 17, 17, 0.12)",
      xl: "0 20px 48px rgba(17, 17, 17, 0.15)",
    },
  },
  
  // ─── Core Palette (Dark Mode) ─────────────────
  DARK: {
    // Backgrounds
    background: {
      primary: "#0F0E0C",     // Main app background
      secondary: "#1A1917",   // Secondary pages
      card: "#151411",        // Cards, components
      subtle: "#1F1D1A",      // Subtle backgrounds
      overlay: "rgba(0, 0, 0, 0.5)",
    },
    
    // Text
    text: {
      primary: "#FFFFFF",     // Main text
      secondary: "#A6A5A2",   // Secondary text
      muted: "#7A7975",       // Muted labels
      inverse: "#111111",
      disabled: "#4A4945",
    },
    
    // Borders & Dividers
    border: {
      default: "#2A2925",     // Default borders
      subtle: "#1F1D1A",      // Subtle dividers
      strong: "#3A3935",      // Strong borders
    },
    
    // Accent & Brand
    accent: {
      primary: "#9D8CF9",     // Lighter purple for dark mode
      hover: "#AFA3FF",
      active: "#8B78E8",
      light: "rgba(157, 140, 249, 0.15)",
    },
    
    // Semantic Colors
    status: {
      success: "#34D399",
      successLight: "rgba(52, 211, 153, 0.15)",
      warning: "#FBBF24",
      warningLight: "rgba(251, 191, 36, 0.15)",
      error: "#F87171",
      errorLight: "rgba(248, 113, 113, 0.15)",
      info: "#60A5FA",
      infoLight: "rgba(96, 165, 250, 0.15)",
    },
    
    // Shadows (Subtle in dark mode)
    shadow: {
      xs: "0 1px 2px rgba(0, 0, 0, 0.3)",
      sm: "0 2px 4px rgba(0, 0, 0, 0.4)",
      md: "0 4px 8px rgba(0, 0, 0, 0.5)",
      lg: "0 10px 24px rgba(0, 0, 0, 0.6)",
      xl: "0 20px 48px rgba(0, 0, 0, 0.7)",
    },
  },
};

// ─── Spacing Scale ──────────────────────────────
export const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
};

// ─── Typography Scale ──────────────────────────
export const TYPOGRAPHY = {
  // Display (Large headings)
  display: {
    large: { fontSize: "48px", fontWeight: 700, lineHeight: 1.1 },
    medium: { fontSize: "36px", fontWeight: 700, lineHeight: 1.2 },
    small: { fontSize: "28px", fontWeight: 600, lineHeight: 1.2 },
  },
  
  // Heading
  heading: {
    large: { fontSize: "24px", fontWeight: 700, lineHeight: 1.3 },
    medium: { fontSize: "20px", fontWeight: 600, lineHeight: 1.3 },
    small: { fontSize: "16px", fontWeight: 600, lineHeight: 1.4 },
  },
  
  // Body
  body: {
    large: { fontSize: "16px", fontWeight: 400, lineHeight: 1.5 },
    medium: { fontSize: "14px", fontWeight: 400, lineHeight: 1.5 },
    small: { fontSize: "13px", fontWeight: 400, lineHeight: 1.5 },
  },
  
  // Label
  label: {
    large: { fontSize: "13px", fontWeight: 600, lineHeight: 1.4 },
    medium: { fontSize: "12px", fontWeight: 600, lineHeight: 1.4 },
    small: { fontSize: "11px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "0.5px" },
  },
};

// ─── Border Radius ────────────────────────────
export const BORDER_RADIUS = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "24px",
  full: "9999px",
};

// ─── Transitions ──────────────────────────────
export const TRANSITIONS = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
};

// ─── Component Presets ────────────────────────
export const COMPONENT_PRESETS = {
  button: {
    primary: {
      light: {
        background: "#7C6CF2",
        color: "#FFFFFF",
        hover: "#8E80FF",
        active: "#6B59DB",
        border: "none",
      },
      dark: {
        background: "#9D8CF9",
        color: "#111111",
        hover: "#AFA3FF",
        active: "#8B78E8",
        border: "none",
      },
    },
    secondary: {
      light: {
        background: "#F5F4F2",
        color: "#111111",
        hover: "#E7E5E4",
        border: "1px solid #E7E5E4",
      },
      dark: {
        background: "#1F1D1A",
        color: "#FFFFFF",
        hover: "#2A2925",
        border: "1px solid #2A2925",
      },
    },
  },
  
  card: {
    light: {
      background: "#FFFFFF",
      border: "1px solid #E7E5E4",
      shadow: "0 2px 4px rgba(17, 17, 17, 0.08)",
    },
    dark: {
      background: "#151411",
      border: "1px solid #2A2925",
      shadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
    },
  },
  
  input: {
    light: {
      background: "#F9F8F6",
      border: "1px solid #E7E5E4",
      color: "#111111",
      placeholder: "#9CA3AF",
      focus: {
        borderColor: "#7C6CF2",
        shadow: "0 0 0 3px rgba(124, 108, 242, 0.1)",
      },
    },
    dark: {
      background: "#1F1D1A",
      border: "1px solid #2A2925",
      color: "#FFFFFF",
      placeholder: "#7A7975",
      focus: {
        borderColor: "#9D8CF9",
        shadow: "0 0 0 3px rgba(157, 140, 249, 0.15)",
      },
    },
  },
};

export default FINTECH_COLORS;
