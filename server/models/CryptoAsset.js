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
  companyType: { type: String, enum: ["public", "private"], default: "private" },
  fairMarketValue: { type: Number, min: 0, default: 0 },
  grantType: { type: String, enum: ["ISO", "RSU", "NSO", "SHARE"], default: "SHARE" },
  grantId: { type: String, trim: true, default: "" },
  exercised: { type: Number, min: 0, default: 0 },
  earlyExercisable: { type: Boolean, default: false },
  vestingSchedule: { type: String, trim: true, default: "immediate" },
  hasVestingSchedule: { type: Boolean, default: true },
  includeInNetWorth: { type: Boolean, default: true },

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
