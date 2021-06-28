const express = require("express");
const stateRouter = require("./state");
const swapxRouter = require("./swapx");

const app = express();

app.use("/state/", stateRouter);
app.use("/swapx/", swapxRouter);

module.exports = app;