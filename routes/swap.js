var express = require("express");
const SwapController = require("../controllers/SwapController");

var router = express.Router();

router.get("/query/:key?", SwapController.query);

module.exports = router;