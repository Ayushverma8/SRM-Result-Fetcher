"use strict";
let bodyParser = require('body-parser');
let express = require('express');
let handlebars = require('express-handlebars');
let http = require('http');
let session = require('express-session');
let uuid = require('uuid');

let app = express();

app.engine('.hbs', handlebars({extname: '.hbs'}));
app.set('view engine', '.hbs');

app.set('port', process.env.PORT || 60000);

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    genid: uuid.v4,
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true
}));

require('./routes.js')(app);

app.use(function(req, res){
    res.status(404);
    res.render('404');
});

app.use(function(err, req, res, next){
		console.log(err);
    res.status(500);
    res.render('500');
});

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express started on http://localhost:' + app.get('port') + ';');
});
