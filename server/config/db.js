const mongoose = require("mongoose");
const dns = require("dns");

const connectWithUri = async (uri) => {
  return mongoose.connect(uri, {
    dbName: "finpilot",
  });
};

const connectDB = async () => {
  try {
    const conn = await connectWithUri(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err);
    });

  } catch (err) {
    const isSrvRefused =
      String(err?.message || "").includes("querySrv ECONNREFUSED") &&
      String(process.env.MONGO_URI || "").startsWith("mongodb+srv://");

    if (isSrvRefused) {
      try {
        const dnsServers = (process.env.MONGO_DNS_SERVERS || "8.8.8.8,1.1.1.1")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (dnsServers.length) {
          dns.setServers(dnsServers);
        }

        const conn = await connectWithUri(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected (DNS fallback): ${conn.connection.host}`);
        return;
      } catch (retryErr) {
        console.error("❌ MongoDB connection failed after DNS fallback:", retryErr.message);
        process.exit(1);
      }
    }

    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;