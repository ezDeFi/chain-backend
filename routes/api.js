const express = require("express");
const cors = require("cors");
const stateRouter = require("./state");
const swapxRouter = require("./swapx");

const app = express();

app.use(cors());
app.use("/state/", stateRouter);
app.use("/swapx/", swapxRouter);

module.exports = app;