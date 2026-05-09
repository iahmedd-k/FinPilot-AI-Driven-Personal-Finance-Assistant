require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Remove existing demo accounts if any
    await User.deleteMany({ email: { $in: ['free@demo.com', 'pro@demo.com'] } });

    const freeUser = new User({
      name: "Demo Free",
      email: "free@demo.com",
      passwordHash: "adminadmin",
      subscriptionTier: "free"
    });
    await freeUser.save();
    console.log("Created Free demo account (free@demo.com / adminadmin)");

    const proUser = new User({
      name: "Demo Pro",
      email: "pro@demo.com",
      passwordHash: "adminadmin",
      subscriptionTier: "pro"
    });
    await proUser.save();
    console.log("Created Pro demo account (pro@demo.com / adminadmin)");

  } catch (err) {
    console.error("Error creating demo accounts:", err);
  } finally {
    mongoose.connection.close();
  }
};

run();
