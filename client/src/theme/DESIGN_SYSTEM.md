# FinPilot Modern Fintech Design System

## Overview

A premium, minimal fintech-style dashboard UI inspired by Linear, Apple, Notion, and contemporary fintech applications. The design system features a warm neutral palette with excellent support for both light and dark themes.

## Design Principles

✨ **Clean & Premium** - Minimal, uncluttered interfaces with strong visual hierarchy
🎨 **Soft Warm Neutral Palette** - Inviting, accessible color system
🌓 **Theme-Aware** - Seamless light/dark mode support
📐 **Spacious Layout** - Generous whitespace and breathing room
🔤 **Clear Typography** - Optimal readability on all devices
✨ **Subtle Details** - Minimal borders, refined shadows, smooth transitions

## Color System

### Light Theme (Default)

```
Background:
  Primary:    #F5F4F2  (Main app background)
  Secondary:  #FAFAF8  (Secondary pages)
  Card:       #FFFFFF  (Cards, widgets)
  Subtle:     #F9F8F6  (Subtle backgrounds)

Text:
  Primary:    #111111  (Main text)
  Secondary:  #6B7280  (Secondary text)
  Muted:      #9CA3AF  (Muted labels)

Borders:
  Default:    #E7E5E4  (Primary borders)
  Subtle:     #F0EEEB  (Subtle dividers)
  Strong:     #D4D2D0  (Strong borders)

Accent:
  Primary:    #7C6CF2  (Premium purple)
  Hover:      #8E80FF
  Active:     #6B59DB
```

### Dark Theme

```
Background:
  Primary:    #0F0E0C
  Secondary:  #1A1917
  Card:       #151411
  Subtle:     #1F1D1A

Text:
  Primary:    #FFFFFF
  Secondary:  #A6A5A2
  Muted:      #7A7975

Borders:
  Default:    #2A2925
  Subtle:     #1F1D1A
  Strong:     #3A3935

Accent:
  Primary:    #9D8CF9  (Lighter for dark mode)
  Hover:      #AFA3FF
  Active:     #8B78E8
```

## CSS Custom Properties

All colors and spacing are available as CSS variables for consistent theming:

```css
/* Colors */
--bg-primary, --bg-secondary, --bg-card, --bg-subtle
--text-primary, --text-secondary, --text-muted
--border-default, --border-subtle, --border-strong
--accent, --accent-hover, --accent-active
--success, --warning, --error, --info

/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-2xl: 32px
--spacing-3xl: 48px

/* Border Radius */
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--radius-xl: 18px
--radius-2xl: 24px

/* Shadows */
--shadow-xs, --shadow-sm, --shadow-card, --shadow-elevated, --shadow-xl

/* Typography */
--font-size-xs: 11px
--font-size-sm: 13px
--font-size-base: 16px
--font-size-lg: 20px
--font-size-xl: 24px
--font-size-2xl: 28px
--font-size-3xl: 36px

/* Transitions */
--transition-fast: 150ms
--transition-normal: 200ms
--transition-slow: 300ms
```

## Component Classes

Ready-to-use fintech component classes:

### Cards
```html
<div class="fintech-card">
  <!-- Card content -->
</div>

<div class="fintech-card elevated">
  <!-- Elevated card with stronger shadow -->
</div>
```

### Buttons
```html
<!-- Primary Button -->
<button class="fintech-btn fintech-btn-primary">
  Save Changes
</button>

<!-- Secondary Button -->
<button class="fintech-btn fintech-btn-secondary">
  Cancel
</button>

<!-- Ghost Button -->
<button class="fintech-btn fintech-btn-ghost">
  Learn More
</button>
```

### Forms
```html
<input type="text" class="fintech-input" placeholder="Enter text">
<select class="fintech-select">
  <option>Option 1</option>
</select>
<textarea class="fintech-textarea"></textarea>
```

### Badges
```html
<span class="fintech-badge">Active</span>
<span class="fintech-badge success">Success</span>
<span class="fintech-badge warning">Warning</span>
<span class="fintech-badge error">Error</span>
```

### Typography
```html
<h1 class="fintech-h1">Large Heading</h1>
<h2 class="fintech-h2">Medium Heading</h2>
<h3 class="fintech-h3">Small Heading</h3>

<p class="fintech-text-primary">Primary text</p>
<p class="fintech-text-secondary">Secondary text</p>
<p class="fintech-text-muted">Muted text</p>
<p class="fintech-text-accent">Accent text</p>
```

### Labels
```html
<label class="fintech-label">Account Type</label>
```

### Dividers
```html
<div class="fintech-divider"></div>
<div class="fintech-divider vertical"></div>
```

### Grids
```html
<div class="fintech-grid cols-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

<!-- Responsive: 4 cols → 2 cols → 1 col -->
<div class="fintech-grid cols-4">
  <!-- Auto-responsive -->
</div>
```

## JavaScript Configuration

Import the design system in JavaScript:

```javascript
import FINTECH_COLORS from '@/theme/fintech.config.js';

// Access colors programmatically
const accentColor = FINTECH_COLORS.LIGHT.accent.primary; // #7C6CF2
const darkBg = FINTECH_COLORS.DARK.background.primary;   // #0F0E0C
```

## Dark Mode Implementation

Toggle dark theme using `data-theme` attribute:

```javascript
// Enable dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Disable dark mode
document.documentElement.removeAttribute('data-theme');

// Check current theme
const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
```

## Usage Examples

### Dashboard Card
```html
<div class="fintech-card">
  <label class="fintech-label">Net Worth</label>
  <h2 class="fintech-h2">$2,456,789.00</h2>
  <p class="fintech-text-secondary">+12.5% from last month</p>
</div>
```

### Form Section
```html
<form>
  <label class="fintech-label">Email Address</label>
  <input type="email" class="fintech-input" placeholder="you@example.com">
  
  <label class="fintech-label" style="margin-top: 16px;">Account Type</label>
  <select class="fintech-select">
    <option>Personal</option>
    <option>Business</option>
  </select>
  
  <div style="margin-top: 24px; display: flex; gap: 12px;">
    <button class="fintech-btn fintech-btn-primary">Save</button>
    <button class="fintech-btn fintech-btn-secondary">Cancel</button>
  </div>
</form>
```

### Status Indicators
```html
<div style="display: flex; gap: 8px;">
  <span class="fintech-badge success">Active</span>
  <span class="fintech-badge warning">Pending</span>
  <span class="fintech-badge error">Failed</span>
</div>
```

## Responsive Behavior

The design system includes responsive utilities:

```css
/* Mobile-first approach */
.fintech-hidden-mobile { display: none; }  /* Hidden on mobile */
.fintech-hidden-desktop { display: none; } /* Hidden on desktop */

/* Grid responsiveness */
cols-4 → 2 cols on tablet → 1 col on mobile
cols-3 → 2 cols on tablet → 1 col on mobile
cols-2 → 1 col on mobile
```

## Accessibility

- All colors meet WCAG AA contrast ratios on both light and dark backgrounds
- `fintech-sr-only` class for screen reader-only content
- Focus states with visible outline and shadow
- Semantic HTML structure
- Proper form labels and aria attributes

## Best Practices

1. **Use CSS Variables** - Always reference `--accent`, `--text-primary`, etc.
2. **Maintain Hierarchy** - Use appropriate heading levels and font sizes
3. **Respect Whitespace** - Use spacing utilities, don't remove natural breathing room
4. **Test Both Themes** - Verify components work in light and dark modes
5. **Accessible Colors** - All text meets minimum contrast ratios
6. **Consistent Transitions** - Use `--transition-fast/normal/slow` for consistency

## Migration Guide

If updating from previous design system:

```diff
- #4f86ff → #7C6CF2 (accent color)
- rgba-based colors → Fintech color tokens
- 16px-style cards → fintech-card class
- Custom buttons → fintech-btn-primary/secondary/ghost
- Display: none → fintech-hidden class
```

## Components Status

✅ **Ready to Use**
- Color system
- Typography scale
- Card styles
- Button styles
- Input/form styles
- Badge/label styles
- Grid layouts
- Spacing utilities

🔄 **In Progress**
- Dashboard widget library
- Chart styling (Recharts integration)
- Navigation components
- Modal/dialog styles
- Notification/toast styles

📋 **Planned**
- Data table styles
- Sidebar/navigation refinement
- Calendar/date picker styling
- Dropdown menus
- Tooltips

## Theme File Location

- **Config**: `client/src/theme/fintech.config.js`
- **Styles**: `client/src/index.css` (CSS variables + component classes)

---

**Design System Version**: 1.0.0  
**Last Updated**: May 8, 2026  
**Framework**: React + Tailwind CSS  
**Typography**: Inter (sans), Playfair Display (serif)
