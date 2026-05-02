import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ChevronDown } from "lucide-react";
import { useState } from "react";
import Logo from "../components/common/Logo";
import { ROUTES } from "../constants/routes";

const DOCS = {
  terms: {
    title: "Terms of Service",
    summary: "Placeholder terms describing how customers can use FinPilot AI and what responsibilities apply to both sides.",
    sections: [
      {
        heading: "Using the service",
        body: "This demo document explains that FinPilot AI is provided for personal finance organization, budgeting support, and educational insights. Access to the platform may be limited, updated, or suspended as the product evolves.",
      },
      {
        heading: "Accounts and access",
        body: "Customers are responsible for keeping their login details secure, providing accurate account information, and using the product lawfully. Shared or abusive use may result in account restrictions.",
      },
      {
        heading: "Service limitations",
        body: "The current content on this page is placeholder text for a future legal document. FinPilot AI does not guarantee uninterrupted access, and features may change over time while the product is being improved.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary: "Placeholder privacy text explaining how account, transaction, and profile information may be handled.",
    sections: [
      {
        heading: "Information collected",
        body: "FinPilot AI may collect profile information, budgeting inputs, transaction data, and product usage activity so the service can personalize dashboards and financial insights.",
      },
      {
        heading: "How data is used",
        body: "Information may be used to provide analytics, improve recommendations, support account security, and maintain overall platform performance. Sensitive handling rules should be expanded in the final policy.",
      },
      {
        heading: "Customer controls",
        body: "Customers should be able to review, update, or request deletion of eligible account data through profile settings or support channels. This is placeholder policy text and should be replaced with the final approved wording.",
      },
    ],
  },
  disclaimers: {
    title: "Disclaimers",
    summary: "Placeholder disclaimers for AI guidance, forecasts, and educational finance content.",
    sections: [
      {
        heading: "Not financial advice",
        body: "FinPilot AI provides informational insights only. It is not a licensed financial advisor, tax professional, or legal service, and customers should use professional judgment before making major financial decisions.",
      },
      {
        heading: "Estimates and forecasts",
        body: "Projected savings, spending patterns, and AI-generated suggestions are examples based on available account data and assumptions. Real-world results can differ significantly.",
      },
      {
        heading: "Third-party information",
        body: "Linked account data and external information sources may contain delays or inaccuracies. FinPilot AI should not be relied on as the sole source of truth for regulated or high-stakes decisions.",
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    summary: "Placeholder cookie policy covering essential, analytics, and preference cookies.",
    sections: [
      {
        heading: "Why cookies are used",
        body: "Cookies and similar technologies can help keep users signed in, remember preferences, and improve product performance through analytics and reliability monitoring.",
      },
      {
        heading: "Cookie categories",
        body: "A final policy may distinguish between essential cookies, performance cookies, and preference cookies. Each category should explain its purpose and how long it remains active.",
      },
      {
        heading: "Managing preferences",
        body: "Customers should be able to manage cookie settings through browser controls or platform preferences where available. This page currently contains demonstration content only.",
      },
    ],
  },
  "user-agreement": {
    title: "User Agreement",
    summary: "Placeholder agreement for customer responsibilities, acceptable use, and account conduct.",
    sections: [
      {
        heading: "Customer responsibilities",
        body: "Users agree to provide accurate information, use the product in good faith, and avoid fraudulent, harmful, or abusive activity while accessing their account.",
      },
      {
        heading: "Platform expectations",
        body: "FinPilot AI may update, refine, or remove features, and may investigate misuse that affects security, billing, performance, or customer trust.",
      },
      {
        heading: "Agreement status",
        body: "This is placeholder copy standing in for a finalized customer agreement. Final legal language should be reviewed before production release.",
      },
    ],
  },
  dpa: {
    title: "Data Processing Agreement",
    summary: "Placeholder data processing terms for account and finance data handled through the platform.",
    sections: [
      {
        heading: "Processing scope",
        body: "The platform may process account, transaction, and profile data only for the purpose of delivering requested services and maintaining service quality.",
      },
      {
        heading: "Security expectations",
        body: "Reasonable administrative, technical, and organizational safeguards should protect personal data from unauthorized access, misuse, or disclosure.",
      },
      {
        heading: "Retention and deletion",
        body: "The final document should clearly define retention timelines, deletion workflows, and subprocessors where applicable. This is placeholder content for now.",
      },
    ],
  },
  aup: {
    title: "Acceptable Use Policy",
    summary: "Placeholder policy for prohibited behavior and misuse of the product.",
    sections: [
      {
        heading: "Prohibited activity",
        body: "Customers must not use FinPilot AI for unlawful conduct, fraud, abuse, scraping, credential attacks, or attempts to interfere with product availability or security.",
      },
      {
        heading: "AI misuse",
        body: "Automated abuse, manipulative prompt activity, and attempts to generate harmful or deceptive content through the platform may lead to restrictions or account review.",
      },
      {
        heading: "Enforcement",
        body: "The service may suspend access, remove content, or investigate abuse reports when usage appears to violate platform rules or create risk for other customers.",
      },
    ],
  },
  refunds: {
    title: "Refund Policy",
    summary: "Placeholder billing and refund guidance for subscriptions and plan changes.",
    sections: [
      {
        heading: "Subscription billing",
        body: "Paid plans may renew automatically unless canceled before the next billing cycle. Any final billing policy should explain charges, renewal timing, and cancellation windows.",
      },
      {
        heading: "Refund review",
        body: "Refunds may be considered for duplicate charges, technical billing errors, or other qualifying issues after review. Eligibility rules should be finalized before launch.",
      },
      {
        heading: "Support process",
        body: "Customers should contact support with billing details and the reason for the request. This placeholder page exists so the documents section has a working destination today.",
      },
    ],
  },
  security: {
    title: "Security Policy",
    summary: "Placeholder security overview for account protection, encryption, and operational safeguards.",
    sections: [
      {
        heading: "Account protection",
        body: "Security controls may include password protections, session handling, access limits, monitoring, and account recovery flows designed to reduce unauthorized access risk.",
      },
      {
        heading: "Data handling safeguards",
        body: "Sensitive data should be protected in transit and at rest where applicable, with internal access limited according to role, need, and operational safeguards.",
      },
      {
        heading: "Incident response",
        body: "The final policy should define internal review, escalation, and customer communication procedures for security incidents. Current text is placeholder content.",
      },
    ],
  },
  "ai-policy": {
    title: "AI Usage Policy",
    summary: "Placeholder guidance for responsible use of FinPilot AI features.",
    sections: [
      {
        heading: "Purpose of AI features",
        body: "AI features are intended to summarize spending, suggest budgeting ideas, and explain finance patterns in plain language based on the information available to the product.",
      },
      {
        heading: "Human review recommended",
        body: "Customers should review outputs carefully, especially before acting on recommendations that affect savings goals, debt decisions, subscriptions, or linked financial accounts.",
      },
      {
        heading: "Output limitations",
        body: "AI outputs may be incomplete, approximate, or based on imperfect data. This placeholder policy should later define clear reliability, safety, and review expectations.",
      },
    ],
  },
  "financial-disclaimer": {
    title: "Financial Data Disclaimer",
    summary: "Placeholder notice describing the limitations of synced and user-entered financial data.",
    sections: [
      {
        heading: "Data accuracy",
        body: "Dashboard figures depend on the information available from linked sources and manual entries. Missing categories, timing delays, or sync issues can change reported totals.",
      },
      {
        heading: "Use at your own discretion",
        body: "Customers should independently verify important balances, obligations, and account activity before relying on summaries for taxes, legal matters, or investment decisions.",
      },
      {
        heading: "Demonstration content",
        body: "This page currently contains placeholder language so the profile documents area can point to a real document page while final legal copy is still pending.",
      },
    ],
  },
  subscription: {
    title: "Subscription Agreement",
    summary: "Placeholder terms covering paid plan access, renewals, and plan benefits.",
    sections: [
      {
        heading: "Plan access",
        body: "Subscription plans may unlock additional analytics, exports, AI usage allowances, or forecasting features. Specific benefits should be listed in the final agreement.",
      },
      {
        heading: "Renewal and cancellation",
        body: "Subscriptions may renew on a recurring basis until canceled according to the billing rules in effect at the time of purchase.",
      },
      {
        heading: "Agreement status",
        body: "This is placeholder agreement text only. Replace it with the finalized subscription language before relying on it for customer-facing legal use.",
      },
    ],
  },
};

function AccordionItem({ heading, body }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-gray-600"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span
          className="text-[0.97rem] font-semibold text-gray-900"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", letterSpacing: "-0.01em" }}
        >
          {heading}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <div
        style={{
          maxHeight: open ? "400px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <p
          className="pb-5 text-[0.94rem] leading-7 text-gray-500"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const { slug } = useParams();
  const doc = DOCS[slug];

  /* ── 404 state ── */
  if (!doc) {
    return (
      <div className="min-h-screen bg-white px-4 py-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 flex items-center justify-between">
            <Logo size="md" dark />
            <Link
              to={ROUTES.PROFILEPAGE}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 no-underline transition hover:text-gray-800"
            >
              <ArrowLeft size={15} />
              Back
            </Link>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 px-8 py-14 text-center">
            <FileText size={24} className="mx-auto text-gray-300" />
            <h1 className="mt-4 text-xl font-semibold text-gray-800">Document not found</h1>
            <p className="mt-2 text-sm text-gray-400">This document link does not exist yet.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main page ── */
  return (
    <div className="min-h-screen bg-white px-4 py-10 text-gray-900" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div className="mx-auto max-w-2xl">

        {/* Top nav */}
        <div className="mb-12 flex items-center justify-between">
          <Logo size="md" dark />
          <Link
            to={ROUTES.PROFILEPAGE}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 no-underline transition hover:text-gray-700"
          >
            <ArrowLeft size={15} />
            Back to profile
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div
            className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400"
          >
            <FileText size={12} />
            FinPilot AI · Legal
          </div>

          <h1
            className="text-[2rem] font-bold leading-tight tracking-[-0.03em] text-gray-900 md:text-[2.4rem]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {doc.title}
          </h1>

          <p className="mt-4 text-[0.95rem] leading-7 text-gray-500">
            {doc.summary}
          </p>

          {/* Meta row */}
          <div className="mt-6 flex items-center gap-4 text-[0.8rem] text-gray-300">
            <span>Last updated: placeholder</span>
            <span>·</span>
            <span>{doc.sections.length} sections</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-2 h-px bg-gray-100" />

        {/* FAQ accordion */}
        <div>
          {doc.sections.map((section) => (
            <AccordionItem key={section.heading} heading={section.heading} body={section.body} />
          ))}
        </div>

        {/* Placeholder notice */}
        <div className="mt-10 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-[0.83rem] leading-6 text-amber-700">
          <strong className="font-semibold">Note:</strong> This is placeholder document content. Replace with final approved legal or policy text before production release.
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-[0.78rem] text-gray-300">
          © {new Date().getFullYear()} FinPilot AI · All rights reserved
        </p>

      </div>
    </div>
  );
}