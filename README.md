# 💰 FinPilot AI — Your Advanced Personal Finance Co-Pilot

FinPilot AI is a comprehensive, full-stack financial management platform that leverages AI to provide deep insights into your spending, wealth, and future financial health. It is designed to bridge the gap between simple expense tracking and professional-grade financial planning.

---

## 🚀 MVP Scope & Functional Requirements

This project fulfills the following core MVP requirements as requested:

### 1. Authentication & Security
- **Feature**: Secure Register/Login system.
- **Implementation**: JWT (JSON Web Tokens) with access + refresh token rotation.
- **Security**: Secure HTTP-only cookies, password hashing, and strict rate limiting on auth endpoints (20 attempts/15 min).
- **Location**: `server/controllers/auth.controller.js`, `server/app.js`.

### 2. Transaction Module
- **Feature**: Add, edit, delete transactions.
- **AI Categorization**: Automatically classifies merchants (e.g., "Starbucks" → "Dining").
- **Filtering**: Filter by category, date, and search terms.
- **CSV Import**: Basic import functionality to migrate data.
- **Location**: `client/src/pages/Transactions.jsx`, `server/services/ai/categorizeTransaction.js`.

### 3. Dashboard Analytics
- **Visuals**: Income vs. Expense line charts, Category pie charts, and Spending Calendar.
- **Key Metrics**: Prominent display of Total Monthly Income, Total Expense, and Savings Rate.
- **Location**: `client/src/pages/Dashboard.jsx`, `client/src/components/dashboard/tabs/spending/OverviewTab.jsx`.

### 4. AI Intelligence (The "Pilot" in FinPilot)
- **AI Advisor**: A context-aware chatbot that answers questions like "Can I afford a MacBook?" or "Why is my savings low?".
- **Cash Flow Forecast**: Predicts future balances based on historical trends.
- **Financial Health Score**: An AI-driven score that evaluates your financial stability.
- **Location**: `server/services/ai/`, `client/src/components/dashboard/AIAdvisorSidebar.jsx`.

---

## 📈 Core Financial Formulas

To ensure transparency and accuracy, FinPilot uses the following logic for its calculations:

### 1. Savings Rate (%)
Evaluates how much of your monthly income you are retaining after expenses.
> **Formula**: `((Monthly Income - Monthly Expenses) / Monthly Income) * 100`
> *Note: Capped at 100%, defaults to 0% if income is 0.*

### 2. AI Financial Score (0–100)
A weighted composite score based on five key pillars:
- **30% Savings Rate (p1)**: Reward for higher retention.
- **20% Spending Consistency (p2)**: Measured via Coefficient of Variation (CV) of monthly expenses. Lower volatility = Higher score.
- **20% Budget Discipline (p3)**: Adherence to set monthly budgets or discretionary spending limits.
- **15% Goal Progress (p4)**: Average progress across all active financial goals.
- **15% Income Stability (p5)**: Percentage of months in the last year with positive income.

### 3. Net Worth
Calculates your absolute wealth by combining liquid cash savings with asset values.
> **Formula**: `Cumulative Historical Savings (Income - Expenses) + Current Total Value of Assets (Portfolio)`

### 4. Cash Flow Forecast
Predicts future net balance by analyzing the growth rate of income and the burn rate of expenses.
> **Logic**: Uses a moving average of the last 6 months to project the next 12 months, accounting for recurring patterns detected in your transaction history.

---

## 🤖 AI Engine Configuration

### OpenAI vs. Groq
The project is architected to be **OpenAI-compatible**. However, by default, it is configured to use the **Groq API** (using Llama-3 models). 
- **Reasoning**: Groq provides ultra-low latency responses and a free tier suitable for development and MVP testing.
- **Switching to OpenAI**: Simply change the `BASE_URL` and `MODEL_NAME` in `server/services/ai/chatService.js` and update your `.env` key.

### AI Testing Context
If using automated AI tools for testing, the context is injected into the prompt via:
- Monthly income/expense breakdown.
- Current savings rate.
- Active goals and their progress.
- Recent high-value transactions.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React.js with Vanilla CSS Design Tokens (Sleek, Glassmorphic UI).
- **Backend**: Node.js & Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **State Management**: React Context API & TanStack Query (v5).
- **Charts**: Recharts.
- **Icons**: Lucide-React.

---

## 📁 Key File Map for Developers

| Component/Feature | File Path |
|:--- |:--- |
| **Global State** | `client/src/context/DashboardContext.jsx` |
| **API Interceptors** | `client/src/services/api.js` |
| **Dashboard Shell** | `client/src/pages/Dashboard.jsx` |
| **AI Score Logic** | `server/services/ai/financialScoreService.js` |
| **Auto-Categorizer** | `server/services/ai/categorizeTransaction.js` |
| **Forecast Engine** | `server/services/ai/forecastService.js` |
| **Rate Limiter** | `server/app.js` (Middleware) |

---

## 🚀 Getting Started

1. **Clone & Install**:
   ```bash
   # Server
   cd server && npm install
   # Client
   cd client && npm install
   ```

2. **Environment Setup**:
   Create `.env` in the `server/` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_key
   
   # Email Configuration (for password reset)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=FinPilot AI <your_email@gmail.com>
   CLIENT_URL=http://localhost:5173
   ```

### Email Configuration for Password Reset

FinPilot uses **Nodemailer** to send password reset emails. When a user requests a password reset:

1. A new temporary password is generated
2. The user's password is updated in the database
3. An email containing the new password is sent to the user

**For Development/Testing:**
- Use Gmail with an App Password (enable 2FA first, then generate an app password)
- Or use any SMTP service (SendGrid, Mailgun, etc.)

**Environment Variables:**
- `EMAIL_HOST`: SMTP server hostname
- `EMAIL_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `EMAIL_USER`: Your email username
- `EMAIL_PASS`: Your email password or app password
- `EMAIL_FROM`: Display name and email for sent emails
- `CLIENT_URL`: Your frontend URL (for any future reset links)

**Note:** Currently sends a new password directly. For production, consider implementing token-based reset links instead.
   ```bash
   # Server
   npm run dev
   # Client
   npm run dev
   ```

---

## 👤 Credits & Author
*Focus: Security, Performance (<400ms latency), and AI-driven Financial Literacy.*
