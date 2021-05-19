const jwt = require("express-jwt");
const secret = process.env.JWT_SECRET;

const authenticate = jwt({
	credentialsRequired: false,
	secret: secret
});

module.exports = authenticate;