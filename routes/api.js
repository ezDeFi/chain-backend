const express = require("express");
const cors = require("cors");
const stateRouter = require("./state");
const swapxRouter = require("./swapx");

// const whitelist = ['https://swapx.launchzone.org', 'https://www.test-cors.org']
// const options = {
//     origin: function (origin, callback) {
//         console.error({origin})
//         if (!origin || whitelist.includes(origin)) {
//             callback(null, true)
//         } else {
//             callback(new Error('Not allowed by CORS'))
//         }
//     },
// }

const app = express();

app.use(cors());
app.use("/state/", stateRouter);
app.use("/swapx/", swapxRouter);

module.exports = app;