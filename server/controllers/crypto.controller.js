const CryptoAsset = require("../models/CryptoAsset");
const axios = require("axios");
const { getFxRate } = require("../services/currencyConversionService");

// ── In-memory price cache ────────────────────────────────
const priceCache = { data: {}, timestamp: 0 };
const CACHE_TTL  = 5 * 60 * 1000;
const COINGECKO_PUBLIC_API_KEY = "CG-FUFY2SsHBq25vAzUrR36RtBY";
const VALID_TYPES = ["crypto", "equity", "cash", "vehicle", "property", "private_equity", "insurance", "valuables", "pension", "debt", "other"];

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const toNumber = (value) => Number(value);

const buildEquityPayload = (body, fallback = {}) => {
  const quantity = hasValue(body.quantity) ? toNumber(body.quantity) : (fallback.quantity ?? 0);
  const buyPrice = hasValue(body.buyPrice) ? toNumber(body.buyPrice) : (fallback.buyPrice ?? 0);
  const manualCurrentPrice = hasValue(body.currentPrice) ? toNumber(body.currentPrice) : undefined;
  const manualCurrentValue = hasValue(body.currentValue) ? toNumber(body.currentValue) : undefined;
  const buyingPrice = quantity * buyPrice;
  const currentValue = manualCurrentValue ?? (manualCurrentPrice !== undefined ? manualCurrentPrice * quantity : (fallback.currentValue ?? buyingPrice));
  const currentPrice = manualCurrentPrice ?? (quantity > 0 ? currentValue / quantity : 0);

  return {
    assetType: "equity",
    name: hasValue(body.name) ? String(body.name).trim() : fallback.name,
    ticker: hasValue(body.ticker) ? String(body.ticker).trim().toUpperCase() : fallback.ticker,
    quantity,
    buyPrice,
    buyDate: body.buyDate || fallback.buyDate || new Date(),
    buyingPrice,
    currentPrice,
    currentValue,
    notes: body.notes !== undefined ? body.notes : (fallback.notes || ""),
  };
};

const enrichStandardAsset = (asset) => {
  const currentValue = asset.currentValue ?? asset.buyingPrice ?? 0;
  const totalCost = asset.buyingPrice ?? 0;
  const gainLoss = currentValue - totalCost;
  const quantity = asset.quantity ?? null;
  const currentPrice = asset.assetType === "equity"
    ? (asset.currentPrice ?? (quantity ? currentValue / quantity : null))
    : null;

  return {
    ...asset.toObject(),
    currentPrice,
    currentValue,
    gainLoss,
    totalCost,
  };
};

const fetchPrices = async (ids) => {
  const { data } = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { "x-cg-demo-api-key": COINGECKO_PUBLIC_API_KEY }, timeout: 10000 }
  );
  return data;
};

// ── POST / ───────────────────────────────────────────────
exports.addCryptoAsset = async (req, res, next) => {
  try {
    console.log("[addAsset] body:", JSON.stringify(req.body));
    const assetType = (req.body.assetType || "crypto").toString().trim();

    if (!VALID_TYPES.includes(assetType)) {
      return res.status(400).json({ success: false, message: `Invalid assetType: ${assetType}` });
    }

    let asset;

    if (assetType === "crypto") {
      const { coin, symbol, quantity, buyPrice, buyDate, notes } = req.body;
      if (!coin || !symbol || !quantity || !buyPrice) {
        return res.status(400).json({ success: false, message: "coin, symbol, quantity and buyPrice are required for crypto" });
      }
      asset = await CryptoAsset.create({
        userId: req.user._id,
        assetType: "crypto",
        coin: String(coin).trim().toLowerCase(),
        symbol: String(symbol).trim().toUpperCase(),
        quantity: Number(quantity),
        buyPrice: Number(buyPrice),
        buyDate: buyDate || new Date(),
        notes: notes || "",
      });
    } else if (assetType === "equity") {
      const { name, ticker, quantity, buyPrice } = req.body;
      if (!name || !ticker || !hasValue(quantity) || !hasValue(buyPrice)) {
        return res.status(400).json({ success: false, message: "name, ticker, quantity and buyPrice are required for equity" });
      }
      asset = await CryptoAsset.create({
        userId: req.user._id,
        ...buildEquityPayload(req.body),
      });
    } else {
      const { name, buyingPrice, notes } = req.body;
      if (!name || !hasValue(buyingPrice)) {
        return res.status(400).json({ success: false, message: "name and buyingPrice are required for this asset type" });
      }
      asset = await CryptoAsset.create({
        userId: req.user._id,
        assetType,
        name: String(name).trim(),
        buyingPrice: toNumber(buyingPrice),
        currentValue: hasValue(req.body.currentValue) ? toNumber(req.body.currentValue) : toNumber(buyingPrice),
        notes: notes || "",
      });
    }

    console.log("[addAsset] created:", asset._id, assetType);
    res.status(201).json({ success: true, asset });
  } catch (err) {
    console.error("[addAsset] ERROR:", err.message);
    if (err.errors) {
      const messages = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ success: false, message: messages });
    }
    next(err);
  }
};

// ── GET / ────────────────────────────────────────────────
exports.getCryptoAssets = async (req, res, next) => {
  try {
    const assets = await CryptoAsset.find({ userId: req.user._id });
    if (!assets.length) return res.json({ success: true, assets: [] });

    const preferredCurrency = String(req.user?.preferredCurrency || "USD").toUpperCase();
    let usdToPreferredRate = 1;
    if (preferredCurrency !== "USD") {
      try {
        usdToPreferredRate = await getFxRate("USD", preferredCurrency);
      } catch (fxErr) {
        console.warn("[getCryptoAssets] FX conversion failed, falling back to USD:", fxErr.message);
      }
    }

    const cryptoAssets    = assets.filter(a => a.assetType === "crypto");
    const nonCryptoAssets = assets.filter(a => a.assetType !== "crypto");

    const enrichedNonCrypto = nonCryptoAssets.map(enrichStandardAsset);

    let enrichedCrypto = [];
    if (cryptoAssets.length > 0) {
      let priceData = {};
      const now = Date.now();
      if (priceCache.timestamp && (now - priceCache.timestamp) < CACHE_TTL) {
        priceData = priceCache.data;
      } else {
        try {
          const ids = [...new Set(cryptoAssets.map(a => a.coin.toLowerCase()))].join(",");
          priceData = await fetchPrices(ids);
          priceCache.data = priceData;
          priceCache.timestamp = now;
        } catch (e) {
          console.warn("[getCryptoAssets] CoinGecko failed:", e.message);
          priceData = priceCache.data || {};
        }
      }
      enrichedCrypto = cryptoAssets.map(a => {
        const priceUsd = priceData[a.coin.toLowerCase()]?.usd || null;
        const price = priceUsd != null ? priceUsd * usdToPreferredRate : null;
        const currentValue = price != null ? price * a.quantity : null;
        const totalCost = a.buyPrice * a.quantity;
        const gainLoss = price != null ? (price - a.buyPrice) * a.quantity : null;
        return { ...a.toObject(), currentPrice: price, currentValue, gainLoss, totalCost };
      });
    }

    res.json({ success: true, assets: [...enrichedCrypto, ...enrichedNonCrypto] });
  } catch (err) {
    console.error("[getCryptoAssets] ERROR:", err.message);
    next(err);
  }
};

// ── PATCH/PUT /:id ───────────────────────────────────────
exports.updateCryptoAsset = async (req, res, next) => {
  try {
    const existing = await CryptoAsset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Asset not found" });

    let updateFields;
    if (existing.assetType === "crypto") {
      const { coin, symbol, quantity, buyPrice, buyDate, notes } = req.body;
      updateFields = {
        coin:     coin     ? String(coin).trim().toLowerCase()   : existing.coin,
        symbol:   symbol   ? String(symbol).trim().toUpperCase() : existing.symbol,
        quantity: hasValue(quantity) ? toNumber(quantity) : existing.quantity,
        buyPrice: hasValue(buyPrice) ? toNumber(buyPrice) : existing.buyPrice,
        buyDate:  buyDate  || existing.buyDate,
        notes:    notes !== undefined ? notes : existing.notes,
      };
    } else if (existing.assetType === "equity") {
      updateFields = buildEquityPayload(req.body, existing);
    } else {
      const { name, buyingPrice, currentValue, notes } = req.body;
      updateFields = {
        name:         name         ? String(name).trim()    : existing.name,
        buyingPrice:  hasValue(buyingPrice) ? toNumber(buyingPrice) : existing.buyingPrice,
        currentValue: currentValue !== undefined ? toNumber(currentValue) : existing.currentValue,
        notes:        notes !== undefined ? notes : existing.notes,
      };
    }

    const updated = await CryptoAsset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true }
    );
    res.json({ success: true, asset: updated });
  } catch (err) {
    console.error("[updateCryptoAsset] ERROR:", err.message);
    next(err);
  }
};

// ── DELETE /:id ──────────────────────────────────────────
exports.deleteCryptoAsset = async (req, res, next) => {
  try {
    const asset = await CryptoAsset.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("[deleteCryptoAsset] ERROR:", err.message);
    next(err);
  }
};
