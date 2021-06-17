    var express = require("express");
const StateController = require("../controllers/StateController");

var router = express.Router();

router.get("/query/:key?", StateController.query);

module.exports = router;
