# 💰 FinPilot — AI-Driven Personal Finance Assistant

> Your intelligent co-pilot for smarter financial decisions.

FinPilot is a full-stack, AI-powered personal finance assistant designed to help users take control of their money. It combines a modern web interface with a robust backend to deliver personalized financial insights, expense tracking, and intelligent recommendations — all in one place.

🚀 **Live Demo:** https://fin-pilot-ai-driven-personal-financ-two.vercel.app/

---

## ✨ Features

- 🤖 **AI-Powered Insights** — Get smart, personalized financial advice and recommendations driven by AI
- 📊 **Expense Tracking** — Log and categorize your spending with ease
- 💡 **Budget Recommendations** — Receive actionable suggestions to optimize your budget
- 📈 **Financial Analytics** — Visualize your income and spending patterns through interactive charts
- 🔐 **Secure Authentication** — User accounts with protected routes and session management
- 📱 **Responsive UI** — Clean, modern interface that works across all devices

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, JavaScript, CSS |
| **Backend** | Node.js, Express.js |
| **AI Integration** | OpenAI / LLM API |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```
FinPilot-AI-Driven-Personal-Finance-Assistant/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── server/          # Node.js/Express backend
│   ├── routes/
│   ├── controllers/
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v18+`
- npm or yarn
- An OpenAI API key (or compatible LLM provider)

### 1. Clone the Repository

```bash
git clone https://github.com/iahmedd-k/FinPilot-AI-Driven-Personal-Finance-Assistant.git
cd FinPilot-AI-Driven-Personal-Finance-Assistant
```

### 2. Set Up the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Start the server:

```bash
npm run dev
```

### 3. Set Up the Client

```bash
cd ../client
npm install
```

Create a `.env` file in the `client/` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm start
```

The app will be available at `http://localhost:3000`.

---

## 🌐 Deployment

This project is deployed on **Vercel**. To deploy your own instance:

1. Fork this repository
2. Connect your fork to(https://fin-pilot-ai-driven-personal-financ-two.vercel.app/)
3. Set the environment variables in the Vercel dashboard
4. Deploy!

---




## 👤 Author

**iahmedd-k**  
GitHub: [@iahmedd-k](https://github.com/iahmedd-k)

---

> ⭐ If you find this project useful, consider giving it a star on GitHub!
