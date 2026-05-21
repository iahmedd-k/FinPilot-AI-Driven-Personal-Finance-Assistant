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
  companyStructure: {
    type: String,
    enum: ["a_share", "hk_listed", "us_listed", "vie", "private"],
    default: "private",
  },
  fairMarketValue: { type: Number, min: 0, default: 0 },
  grantType: {
    type: String,
    enum: ["STOCK_OPTION", "RSU", "RESTRICTED_SHARE", "ESOP", "ISO", "NSO", "SHARE"],
    default: "STOCK_OPTION",
  },
  grantId: { type: String, trim: true, default: "" },
  fxRateAtGrant: { type: Number, min: 0, default: null },
  fxRateAtVest: { type: Number, min: 0, default: null },
  fxRateAtExercise: { type: Number, min: 0, default: null },
  vestedQuantity: { type: Number, min: 0, default: 0 },
  fmvAtExercise: { type: Number, min: 0, default: null },
  expirationDate: { type: Date, default: null },
  postTerminationWindow: { type: Number, min: 0, default: 90 },
  exercised: { type: Number, min: 0, default: 0 },
  earlyExercisable: { type: Boolean, default: false },
  vestingSchedule: { type: String, trim: true, default: "immediate" },
  vestingStartDate: { type: Date, default: null },
  cliffMonths: { type: Number, min: 0, default: 12 },
  hasVestingSchedule: { type: Boolean, default: true },
  safeFilingStatus: {
    type: String,
    enum: ["not_required", "pending", "filed", "expired"],
    default: "not_required",
  },
  safeFilingDeadline: { type: Date, default: null },
  lockupPeriod: { type: String, enum: ["none", "12", "24", "36", "custom"], default: "none" },
  lockupExpiry: { type: Date, default: null },
  iitPreferentialMethod: { type: Boolean, default: true },
  salePrice: { type: Number, min: 0, default: null },
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
