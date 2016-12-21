"use strict";
let home = require('./handlers/home.js');

module.exports = function(app) {
	app.get('/', home.get);
	app.post('/', home.post);
};
