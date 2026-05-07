const { Router } = require("express");
const config = require("../config");

const router = Router();

// GET /api/map-url - URL de BlueMap configurada
router.get("/", (req, res) => {
  res.json({ url: config.BLUEMAP_URL });
});

module.exports = router;
