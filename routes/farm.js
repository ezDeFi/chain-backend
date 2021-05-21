var express = require("express");
const FarmController = require("../controllers/FarmController");

var router = express.Router();

router.get("/query/:address", FarmController.query);
router.get("/withdraw/:address/:token/:amount", FarmController.withdraw);

// router.get("/", FarmController.bookList);
// router.get("/:id", FarmController.bookDetail);
// router.post("/", FarmController.bookStore);
// router.put("/:id", FarmController.bookUpdate);
// router.delete("/:id", FarmController.bookDelete);

module.exports = router;