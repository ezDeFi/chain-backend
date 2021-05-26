var express = require("express");
const FarmController = require("../controllers/FarmController");

var router = express.Router();

router.get("/queryConfig/:node?", FarmController.queryConfig);
router.get("/query/:address", FarmController.query);
router.get("/withdraw/:address/:token/:amount", FarmController.withdraw);

module.exports = router;