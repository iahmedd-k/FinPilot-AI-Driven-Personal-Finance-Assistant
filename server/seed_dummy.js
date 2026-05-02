const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Goal = require("./models/Goal");
const CryptoAsset = require("./models/CryptoAsset");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Connection Error:", err);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  // Find the first user
  const user = await User.findOne();
  if (!user) {
    console.error("No users found in database. Please register a user first.");
    process.exit(1);
  }

  console.log(`Seeding data for user: ${user.email} (ID: ${user._id})`);

  // --- TRANSACTIONS ---
  console.log("Generating transactions...");
  const categories = ["Groceries", "Dining", "Transport", "Shopping", "Entertainment", "Utilities"];
  const merchants = ["Whole Foods", "Starbucks", "Uber", "Amazon", "Netflix", "PG&E", "Target", "Trader Joe's", "Lyft", "Spotify"];
  
  const transactions = [];
  // Last 60 days
  for (let i = 0; i < 50; i++) {
    const isIncome = Math.random() < 0.15; // 15% chance of income
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Random date in last 60 days

    if (isIncome) {
      transactions.push({
        userId: user._id,
        amount: Math.floor(Math.random() * 2000) + 1500,
        type: "income",
        category: "Salary",
        merchant: "Employer Inc.",
        date: date,
        reviewStatus: "reviewed"
      });
    } else {
      transactions.push({
        userId: user._id,
        amount: Math.floor(Math.random() * 150) + 10,
        type: "expense",
        category: categories[Math.floor(Math.random() * categories.length)],
        merchant: merchants[Math.floor(Math.random() * merchants.length)],
        date: date,
        reviewStatus: Math.random() > 0.5 ? "reviewed" : "needs_review"
      });
    }
  }

  // Add a recurring transaction
  transactions.push({
    userId: user._id,
    amount: 15.99,
    type: "expense",
    category: "Subscriptions",
    merchant: "Netflix",
    date: new Date(),
    isRecurring: true,
    reviewStatus: "reviewed"
  });

  await Transaction.insertMany(transactions);
  console.log(`Inserted ${transactions.length} transactions.`);

  // --- GOALS ---
  console.log("Generating goals...");
  const goals = [
    {
      userId: user._id,
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 4500,
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      category: "Savings",
      color: "#3b82f6",
      icon: "PiggyBank"
    },
    {
      userId: user._id,
      name: "Summer Vacation",
      targetAmount: 3000,
      currentAmount: 1200,
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      category: "Travel",
      color: "#10b981",
      icon: "Plane"
    },
    {
      userId: user._id,
      name: "New Laptop",
      targetAmount: 2000,
      currentAmount: 1800,
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      category: "Shopping",
      color: "#8b5cf6",
      icon: "ShoppingCart"
    }
  ];
  await Goal.insertMany(goals);
  console.log(`Inserted ${goals.length} goals.`);

  // --- CRYPTO ASSETS ---
  console.log("Generating crypto assets...");
  const cryptos = [
    {
      userId: user._id,
      coinId: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      amount: 0.15,
      totalCost: 6000
    },
    {
      userId: user._id,
      coinId: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      amount: 2.5,
      totalCost: 4500
    }
  ];
  await CryptoAsset.insertMany(cryptos);
  console.log(`Inserted ${cryptos.length} crypto assets.`);

  // --- UPDATE USER PORTFOLIO & BUDGET ---
  console.log("Updating user portfolio...");
  user.portfolio = {
    assets: [
      { name: "Checking Account", type: "cash", value: 4500 },
      { name: "Savings Account", type: "cash", value: 12500 },
      { name: "401k", type: "investment", value: 45000 }
    ],
    liabilities: [
      { name: "Credit Card", type: "debt", value: 1200 },
      { name: "Auto Loan", type: "debt", value: 14500 }
    ]
  };
  
  user.budget = {
    monthlyLimit: 3000,
    categories: [
      { name: "Dining", limit: 400 },
      { name: "Groceries", limit: 600 },
      { name: "Shopping", limit: 300 }
    ]
  };

  await user.save();
  console.log("Updated user portfolio and budget.");

  console.log("✅ Seeding Complete!");
  process.exit(0);
};

seedData();
