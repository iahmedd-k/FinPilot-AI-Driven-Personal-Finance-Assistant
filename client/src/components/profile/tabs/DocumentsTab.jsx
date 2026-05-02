import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { BG, BORDER, Card, CardHeader, MUTED, SUB, TEXT, WHITE } from "../shared";

const FINPILOT_DOCS = [
  { label: "Terms of Service", href: "/docs/terms" },
  { label: "Privacy Policy", href: "/docs/privacy" },
  { label: "Disclaimers", href: "/docs/disclaimers" },
  { label: "Cookie Policy", href: "/docs/cookies" },
];

const ACCOUNT_DOCS = [
  { label: "User Agreement", href: "/docs/user-agreement" },
  { label: "Data Processing Agreement", href: "/docs/dpa" },
  { label: "Acceptable Use Policy", href: "/docs/aup" },
  { label: "Refund Policy", href: "/docs/refunds" },
  { label: "Security Policy", href: "/docs/security" },
  { label: "AI Usage Policy", href: "/docs/ai-policy" },
  { label: "Financial Data Disclaimer", href: "/docs/financial-disclaimer" },
  { label: "Subscription Agreement", href: "/docs/subscription" },
];

function DocGroup({ label, docs }) {
  return (
    <Card>
      <CardHeader label={label} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {docs.map((doc, index) => {
          const isLeft = index % 2 === 0;
          const isLastRow = index >= docs.length - 2;

          return (
            <Link
              key={doc.label}
              to={doc.href}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", textDecoration: "none", background: WHITE, borderRight: isLeft && index + 1 < docs.length ? `1px solid ${BORDER}` : "none", borderBottom: isLastRow ? "none" : `1px solid ${BORDER}`, transition: "background 0.12s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BG;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = WHITE;
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: BG, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={15} style={{ color: SUB }} />
              </div>
              <span style={{ fontSize: 13.5, color: TEXT, flex: 1 }}>{doc.label}</span>
              <ChevronRight size={14} style={{ color: MUTED }} />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

export default function DocumentsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <DocGroup label="FinPilot Docs" docs={FINPILOT_DOCS} />
      <DocGroup label="Account Policies" docs={ACCOUNT_DOCS} />
    </div>
  );
}
