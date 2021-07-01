const express = require("express");
const cors = require("cors");
const stateRouter = require("./state");

const app = express();

app.use(cors());
app.use("/state/", stateRouter);

module.exports = app;