const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const cryptoController = require("../controllers/crypto.controller");

router.use(protect);


router.post("/", cryptoController.addCryptoAsset);
router.get("/", cryptoController.getCryptoAssets);
router.patch("/:id", cryptoController.updateCryptoAsset);
router.put("/:id", cryptoController.updateCryptoAsset);
router.delete("/:id", cryptoController.deleteCryptoAsset);

module.exports = router;
