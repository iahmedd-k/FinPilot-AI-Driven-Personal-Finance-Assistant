/**
 * Modern Fintech Design System - Component Update Guide
 * 
 * This guide shows how to update existing dashboard components
 * to use the new modern fintech design system.
 */

// ─────────────────────────────────────────────────────────
// EXAMPLE 1: Converting a Dashboard Card Component
// ─────────────────────────────────────────────────────────

// BEFORE (Old design):
function OldDashboardCard() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.8)",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
    }}>
      <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.5)", textTransform: "uppercase" }}>
        Net Worth
      </div>
      <h2 style={{ fontSize: "32px", fontWeight: "700", color: "#1a1a1a" }}>
        $2,456,789
      </h2>
    </div>
  );
}

// AFTER (Modern fintech design):
function ModernDashboardCard() {
  return (
    <div className="fintech-card">
      <label className="fintech-label">Net Worth</label>
      <h2 className="fintech-h2">$2,456,789</h2>
      <p className="fintech-text-secondary">+12.5% from last month</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 2: Updating Button Components
// ─────────────────────────────────────────────────────────

// BEFORE:
function OldButton() {
  return (
    <button style={{
      background: "#4f86ff",
      color: "#ffffff",
      border: "none",
      padding: "12px 24px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer"
    }}>
      Save Changes
    </button>
  );
}

// AFTER:
function ModernButton() {
  return (
    <button className="fintech-btn fintech-btn-primary">
      Save Changes
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 3: Form Inputs with New Design
// ─────────────────────────────────────────────────────────

// BEFORE:
function OldForm() {
  return (
    <div>
      <input
        type="text"
        placeholder="Enter text..."
        style={{
          padding: "12px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          fontSize: "14px",
          width: "100%"
        }}
      />
    </div>
  );
}

// AFTER:
function ModernForm() {
  return (
    <div>
      <label className="fintech-label">Email Address</label>
      <input
        type="email"
        className="fintech-input"
        placeholder="you@example.com"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 4: Using CSS Variables in Inline Styles
// ─────────────────────────────────────────────────────────

function ComponentWithCSSVariables() {
  return (
    <div style={{
      background: "var(--bg-card)",
      color: "var(--text-primary)",
      border: `1px solid var(--border-default)`,
      borderRadius: "var(--radius-lg)",
      padding: "var(--spacing-lg)",
      boxShadow: "var(--shadow-card)"
    }}>
      <p style={{ color: "var(--text-secondary)" }}>
        Secondary text using CSS variables
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 5: Dashboard Layout with Fintech Classes
// ─────────────────────────────────────────────────────────

function ModernDashboard() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "var(--bg-card)",
        borderBottom: `1px solid var(--border-default)`,
        padding: "var(--spacing-lg)"
      }}>
        <h1 className="fintech-h1">Dashboard</h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: "var(--spacing-2xl)" }}>
        {/* Grid Layout */}
        <div className="fintech-grid cols-3">
          {/* Card 1 */}
          <div className="fintech-card">
            <label className="fintech-label">Total Assets</label>
            <h2 className="fintech-h2">$500,000</h2>
          </div>

          {/* Card 2 */}
          <div className="fintech-card">
            <label className="fintech-label">Monthly Income</label>
            <h2 className="fintech-h2">$8,450</h2>
          </div>

          {/* Card 3 */}
          <div className="fintech-card">
            <label className="fintech-label">Savings Rate</label>
            <h2 className="fintech-h2">42%</h2>
          </div>
        </div>

        {/* Divider */}
        <div className="fintech-divider"></div>

        {/* Form Section */}
        <div className="fintech-card" style={{ maxWidth: "500px" }}>
          <h3 className="fintech-h3" style={{ marginBottom: "var(--spacing-lg)" }}>
            Add Transaction
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
            <div>
              <label className="fintech-label">Description</label>
              <input
                type="text"
                className="fintech-input"
                placeholder="Coffee at local cafe"
              />
            </div>

            <div>
              <label className="fintech-label">Amount</label>
              <input
                type="number"
                className="fintech-input"
                placeholder="0.00"
              />
            </div>

            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
              <button className="fintech-btn fintech-btn-primary">
                Add
              </button>
              <button className="fintech-btn fintech-btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 6: Status Indicators with Badges
// ─────────────────────────────────────────────────────────

function TransactionList() {
  const transactions = [
    { id: 1, description: "Salary", amount: 5000, status: "completed" },
    { id: 2, description: "Subscription", amount: 15, status: "pending" },
    { id: 3, description: "Refund", amount: -100, status: "failed" }
  ];

  return (
    <div className="fintech-card">
      <h3 className="fintech-h3" style={{ marginBottom: "var(--spacing-lg)" }}>
        Recent Transactions
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
        {transactions.map((tx) => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p className="fintech-text-primary">{tx.description}</p>
              <p className="fintech-text-secondary">${Math.abs(tx.amount)}</p>
            </div>
            <span className={`fintech-badge ${tx.status}`}>
              {tx.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 7: Dark Mode Aware Component
// ─────────────────────────────────────────────────────────

function ThemeAwareComponent() {
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";

  return (
    <div className="fintech-card">
      {/* All styles automatically adapt to light/dark theme via CSS variables */}
      <h2 className="fintech-h2">
        {isDarkMode ? "Dark Mode Enabled" : "Light Mode Enabled"}
      </h2>
      <p className="fintech-text-secondary">
        This component automatically adapts to the current theme.
      </p>
      <div style={{
        marginTop: "var(--spacing-lg)",
        padding: "var(--spacing-lg)",
        background: "var(--bg-subtle)",
        borderRadius: "var(--radius-md)"
      }}>
        <p className="fintech-text-muted">
          All colors use CSS variables for seamless theme support.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAMPLE 8: Complex Dashboard with Charts
// ─────────────────────────────────────────────────────────

function AdvancedDashboard() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", padding: "var(--spacing-2xl)" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--spacing-2xl)" }}>
        <h1 className="fintech-h1">Financial Overview</h1>
        <p className="fintech-text-secondary" style={{ marginTop: "var(--spacing-sm)" }}>
          Your complete financial snapshot in one place
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="fintech-grid cols-4" style={{ marginBottom: "var(--spacing-2xl)" }}>
        <div className="fintech-card">
          <label className="fintech-label">Net Worth</label>
          <h2 className="fintech-h2">$2.4M</h2>
          <span className="fintech-badge success">+12.5%</span>
        </div>

        <div className="fintech-card">
          <label className="fintech-label">Monthly Income</label>
          <h2 className="fintech-h2">$12.5K</h2>
          <span className="fintech-badge success">+3.2%</span>
        </div>

        <div className="fintech-card">
          <label className="fintech-label">Monthly Expense</label>
          <h2 className="fintech-h2">$4.8K</h2>
          <span className="fintech-badge warning">+5.1%</span>
        </div>

        <div className="fintech-card">
          <label className="fintech-label">Savings Rate</label>
          <h2 className="fintech-h2">61.6%</h2>
          <span className="fintech-badge success">Excellent</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="fintech-grid cols-2" style={{ marginBottom: "var(--spacing-2xl)" }}>
        <div className="fintech-card">
          <h3 className="fintech-h3" style={{ marginBottom: "var(--spacing-lg)" }}>
            Spending Trends
          </h3>
          {/* Chart component here */}
        </div>

        <div className="fintech-card">
          <h3 className="fintech-h3" style={{ marginBottom: "var(--spacing-lg)" }}>
            Portfolio Breakdown
          </h3>
          {/* Chart component here */}
        </div>
      </div>

      {/* Table Section */}
      <div className="fintech-card">
        <h3 className="fintech-h3" style={{ marginBottom: "var(--spacing-lg)" }}>
          Recent Transactions
        </h3>
        {/* Table component here */}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COLOR & STYLING CHEAT SHEET
// ─────────────────────────────────────────────────────────

const STYLING_REFERENCE = {
  // Colors
  colors: {
    primaryBg: "var(--bg-primary)",
    cardBg: "var(--bg-card)",
    primaryText: "var(--text-primary)",
    secondaryText: "var(--text-secondary)",
    accent: "var(--accent)",
    border: "var(--border-default)",
  },

  // Spacing
  spacing: {
    xs: "var(--spacing-xs)",
    sm: "var(--spacing-sm)",
    md: "var(--spacing-md)",
    lg: "var(--spacing-lg)",
    xl: "var(--spacing-xl)",
  },

  // Shadow
  shadow: {
    card: "var(--shadow-card)",
    elevated: "var(--shadow-elevated)",
  },

  // Border Radius
  radius: {
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
  }
};

// ─────────────────────────────────────────────────────────
// MIGRATION CHECKLIST
// ─────────────────────────────────────────────────────────

/*
□ Update color values:
  - #4f86ff → --accent (#7C6CF2)
  - Hard-coded grays → --text-secondary, --text-muted
  - #ffffff → var(--bg-card)
  
□ Replace component styles with classes:
  - Custom card styles → .fintech-card
  - Custom buttons → .fintech-btn-primary/secondary/ghost
  - Custom inputs → .fintech-input
  - Custom labels → .fintech-label
  
□ Update typography:
  - Inline h1/h2/h3 → .fintech-h1/.fintech-h2/.fintech-h3
  - Text color classes → .fintech-text-primary/secondary/muted

□ Convert padding/margin to variables:
  - 16px → var(--spacing-lg)
  - 24px → var(--spacing-xl)
  - 12px → var(--spacing-md)

□ Test both light and dark themes:
  - Toggle data-theme="dark"
  - Verify text contrast in both modes
  - Check graph/chart visibility

□ Update shadows:
  - Box shadows → var(--shadow-card), var(--shadow-elevated)

□ Refactor grids:
  - Custom grid → className="fintech-grid cols-3"

□ Test responsive behavior:
  - Desktop, tablet, mobile views
  - Check grid col breakpoints
*/

export default {
  OldDashboardCard,
  ModernDashboardCard,
  ModernButton,
  ModernForm,
  ComponentWithCSSVariables,
  ModernDashboard,
  TransactionList,
  ThemeAwareComponent,
  AdvancedDashboard,
  STYLING_REFERENCE
};
