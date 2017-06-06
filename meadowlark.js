var express = require('express');
var fortune = require('./lib/fortune.js');
var app = express();
var bodyParser = require('body-parser')
var formidable = require('formidable');
var credentials = require('./credentials.js');
var cookieParser = require('cookie-parser')
var session = require('express-session')
var http =require('http');

// switch(app.get('env')){
//   case 'development':
//   // compact, colorful dev logging
//     app.use(require('morgan')('dev'));
//     break;
//   case 'production':
//   // module 'express-logger' supports daily log rotation
//     app.use(require('express-logger')({
//       path: __dirname + '/log/requests.log'
//      })
//     );
//     break;
// }
//app.use(cookieParser(credentials.secret));  !! session doesn't require this module anymore
app.use(session({
  cookie: {},
  secret: credentials.cookieSecret,
  resave: false,
  saveUninitialized: true
}))
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

app.use(function(req,res,next){
  var cluster = require('cluster');
  if(cluster.isWorker)
    console.log('Worker %d received request',  cluster.worker.id);
});

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

app.get('/', function(req, res) {
	res.render('home');
});


app.get('/about', function(req,res){
	res.render('about', {
		fortune: fortune.getFortune(),
		pageTestScript: '/qa/tests-about.js'
	} );
});
app.get('/tours/hood-river', function(req, res){
	res.render('tours/hood-river');
});
app.get('/tours/oregon-coast', function(req, res){
	res.render('tours/oregon-coast');
});
app.get('/tours/request-group-rate', function(req, res){
	res.render('tours/request-group-rate');
});

app.get('/newsletter', function(req, res){

  res.render('newsletter', { csrf: 'CSRF token goes here' });
});


app.post('/process', function(req, res){
  if(req.xhr || req.accepts('json,html')==='json'){
    res.send({ success: true });
  } else {
    res.redirect(303, '/thank-you');
  }
});

app.get('/contest/vacation-photo',function(req,res){
  var now = new Date();
  res.render('contest/vacation-photo',{
    year: now.getFullYear(),month: now.getMonth()
  });
});

app.post('/contest/vacation-photo/:year/:month', function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303, '/error');

    console.log('received fields:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    res.redirect(303, '/thank-you');
  });
});

app.get('/fail', function(req, res){
  throw new Error('Nope!');
});


app.get('/jquery-test', function(req, res){
	res.render('jquery-test');
});
app.get('/nursery-rhyme', function(req, res){
	res.render('nursery-rhyme');
});
app.get('/data/nursery-rhyme', function(req, res){
	res.json({
		animal: 'squirrel',
		bodyPart: 'tail',
		adjective: 'bushy',
		noun: 'heck',
	});
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

function startServer() {

  http.createServer().listen(app.get('port'), function(){
    console.log( 'Express started in ' + app.get('env') +
                  ' mode on http://localhost:' + app.get('port') +
                  '; press Ctrl-C to terminate.' );
  });
}

if(require.main === module){
// application run directly; start app server
  console.log('main');
  startServer();
} else {
// application imported as a module via "require": export function
// to create server
  module.exports = startServer;
}
// app.listen(app.get('port'), function(){
//   console.log( 'Express started in ' + app.get('env').toUpperCase() +
// ' mode on http://localhost:' + app.get('port') +
// '; press Ctrl-C to terminate.' );
// });
