var express = require("express");
const SwapController = require("../controllers/SwapController");

var router = express.Router();

router.get("/find/:inputToken/:outputToken/:amountIn", SwapController.find);
router.get("/pair/:key?", SwapController.pair);

module.exports = router;