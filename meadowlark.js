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
  console.log(err || "connected to DB");
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

var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath){
  console.log("saving");
}

app.post('/contest/vacation-photo/:year/:month', function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303, '/error');
    if(err) {
      res.session.flash = {
        type: 'danger',
        intro: 'Oops!',
        message: 'There was an error processing your submission. ' +
        'Pelase try again.',
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    var photo = files.photo;
    var dir = 'C:/node-app/data' + '/' + Date.now();  // !!renameSync will fail if the file is on a diffrent partition / Drive !!
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    console.log(photo.path);
    fs.renameSync(photo.path, path);
    saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
    req.session.flash = {
      type: 'success',
      intro: 'Good luck!',
      message: 'You have been entered into the contest.'
    };
    return res.redirect(303, '/contest/vacation-photo/entries');
  });
});
function convertFromUSD(value, currency){
  switch(currency){
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    case 'BTC': return value * 0.0023707918444761;
    default: return NaN;
  }
}
app.get('/set-currency/:currency', function(req,res){
  //console.log(req.params.currency);
  req.session.currency = req.params.currency;
  console.log(req.session.currency);
  return res.redirect(303, '/vacations');
});

app.get('/vacations', function(req, res){
  //console.log(req.session.currency);

  Vacation.find({ available: true }, function(err, vacations){
    var currency = req.session.currency || 'USD';
    var context = {
      currency: currency,
      vacations: vacations.map(function(vacation){
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          inSeason: vacation.inSeason,
          price: convertFromUSD(vacation.priceInCents/100, currency),
          qty: vacation.qty,
        }
      })
   };
    switch(currency){
      case 'USD': context.currencyUSD = 'selected'; break;
      case 'GBP': context.currencyGBP = 'selected'; break;
      case 'BTC': context.currencyBTC = 'selected'; break;
    }
  res.render('vacations', context);
  });
});



app.get('/notify-me-when-in-season', function(req, res){
  res.render('notify-me-when-in-season', { sku: req.query.sku });
});

app.post('/notify-me-when-in-season', function(req, res){
  VacationInSeasonListener.update(
    { email: req.body.email },
    { $push: { skus: req.body.sku } },
    { upsert: true },
    function(err){
      if(err) {
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Ooops!',
          message: 'There was an error processing your request.',
        };
        return res.redirect(303, '/vacations');
      }
      console.log("no error");
      req.session.flash = {
        type: 'success',
        intro: 'Thank you!',
        message: 'You will be notified when this vacation is in season.'
      };
      return res.redirect(303, '/vacations');
    }
  );
});

app.get('/jquery-test', function(req, res){
	res.render('jquery-test');
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
