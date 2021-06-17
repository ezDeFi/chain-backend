var express = require("express");
var stateRouter = require("./state");

var app = express();

app.use("/state/", stateRouter);

module.exports = app;