var express = require("express");
const SFarmController = require("../controllers/SFarmController");

var router = express.Router();

router.get("/state/:key?", SFarmController.state);
router.get("/queryConfig/:node?", SFarmController.queryConfig);
router.get("/query/:address", SFarmController.query);
router.get("/farmerExec/:tx", SFarmController.farmerExec)
router.get("/withdraw/:token/:amount/:from?", SFarmController.withdraw);

module.exports = router;