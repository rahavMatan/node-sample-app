var express = require('express');
var app = express();
var fortune = require('./lib/fortune.js');

var bodyParser = require('body-parser')
var formidable = require('formidable');
var credentials = require('./credentials.js');
var cookieParser = require('cookie-parser')
var session = require('express-session')
var fs = require('fs');
var mongoose = require('mongoose');
var Vacation = require('./models/vacation.js');
var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');
var MongoDBStore = require('connect-mongodb-session')(session);

var opts = {
  server: {
    socketOptions: { keepAlive: 1 }
  },
  auth:{
    username:credentials.mongo.development.username,
    password:credentials.mongo.development.password
  }
};
//mongoose.Promise = global.Promise;
mongoose.connect(credentials.mongo.development.connectionString, opts,function(err){
  console.log(err || " \n connected to DB");
});

var store = new MongoDBStore(
    {
      uri: credentials.mongo.development.connectionString,
      collection: 'mySessions'
    }
);
app.use(require('express-session')({
      secret: 'This is a secret',
      store: store,
      resave: true,
      saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// set up handlebars view engine
var handlebars = require('express-handlebars').create({
    defaultLayout:'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));


require('./routes.js')(app);

// set 'showTests' context property if the querystring contains test=1
app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' &&
		req.query.test === '1';
	next();
});

// mocked weather data
function getWeatherData(){
    return {
        locations: [
            {
                name: 'Portland',
                forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
                weather: 'Overcast',
                temp: '54.1 F (12.3 C)',
            },
            {
                name: 'Bend',
                forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
                weather: 'Partly Cloudy',
                temp: '55.0 F (12.8 C)',
            },
            {
                name: 'Manzanita',
                forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
                weather: 'Light Rain',
                temp: '55.0 F (12.8 C)',
            },
        ],
    };
}

// middleware to add weather data to context
app.use(function(req, res, next){
	if(!res.locals.partials) res.locals.partials = {};
 	res.locals.partials.weatherContext = getWeatherData();
 	next();
});



// 404 catch-all handler (middleware)
app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
  console.log( 'Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate. \n' );
});
