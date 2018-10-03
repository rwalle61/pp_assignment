// =============dependencies============
var express         = require('express');
var app             = express();
var router          = express.Router();
var morgan          = require('morgan');
var cors            = require('cors');
var fs              = require('fs');
var bodyParser      = require('body-parser');
var cookieParser    = require('cookie-parser');
var port            = (process.env.PORT || 8090);


// =============configuration============
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/static', express.static(__dirname));


// ============Routes============
require('./routes.js')(app, router, fs, cookieParser);

// =============Start server============
app.listen(port);
console.log('API is running on port ' + port);
