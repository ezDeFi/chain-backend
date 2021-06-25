const express = require("express");
const stateRouter = require("./state");
const swapRouter = require("./swap");

const app = express();

app.use("/state/", stateRouter);
app.use("/swap/", swapRouter);

module.exports = app;