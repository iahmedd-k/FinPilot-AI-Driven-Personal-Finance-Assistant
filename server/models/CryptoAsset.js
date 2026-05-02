const mongoose = require("mongoose");

const cryptoAssetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  assetType: {
    type: String,
    enum: ["crypto", "equity", "cash", "vehicle", "property", "private_equity", "insurance", "valuables", "pension", "debt", "other"],
    default: "crypto",
  },

  // ── Non-crypto fields ────────────────────────────────
  name:        { type: String, trim: true },
  buyingPrice: { type: Number, min: 0 },
  currentValue: { type: Number, min: 0 },
  ticker:      { type: String, trim: true, uppercase: true },
  currentPrice: { type: Number, min: 0 },

  // ── Crypto-only fields ───────────────────────────────
  coin:     { type: String, trim: true },
  symbol:   { type: String, trim: true, uppercase: true },
  quantity: { type: Number, min: 0 },
  buyPrice: { type: Number, min: 0 },
  buyDate:  { type: Date },

  // ── Shared ───────────────────────────────────────────
  notes: { type: String, trim: true, default: "" },

}, { timestamps: true });

module.exports = mongoose.model("CryptoAsset", cryptoAssetSchema);
