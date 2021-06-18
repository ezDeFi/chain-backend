const express = require("express");
const cors = require("cors");
const stateRouter = require("./state");
const sfarmRouter = require("./sfarm");

const app = express();

app.use(cors());
app.use("/state/", stateRouter);
app.use("/sfarm/", sfarmRouter);

module.exports = app;