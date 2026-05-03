const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finpilot');
const User = require('./models/User');

async function run() {
  const users = await User.find().lean();
  console.log("Users:", users.map(u => ({ email: u.email, tier: u.subscriptionTier })));
  process.exit(0);
}
run();
