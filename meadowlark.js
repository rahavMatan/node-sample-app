var express = require('express');
var app = express();
var fortune = require('./lib/fortune.js');
var vhost = require('vhost');
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
      static: function(name) {
        //console.log(name);
        return require('./lib/static.js').map(name);
      },
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

app.use('/api', require('cors')());

require('./routes.js')(app);

var Attraction = require('./models/attraction.js');

var Rest = require('connect-rest')

var apiOptions = {
  context: '/api',
  domain: require('domain').create()
};
var rest = Rest.create( apiOptions )
app.use(rest.processRequest());

//app.use( vhost('api.*', rest.processRequest() ) );

rest.get('/attractions', function(req, content, cb){
    Attraction.find({ approved: true }, function(err, attractions){
        if(err) return cb({ error: 'Internal error.' });
        cb(null, attractions.map(function(a){
            return {
                name: a.name,
                description: a.description,
                location: a.location,
            };
        }));
    });
});

rest.post('/attraction', function(req, content, cb){
    var a = new Attraction({
        name: req.body.name,
        description: req.body.description,
        location: { lat: req.body.lat, lng: req.body.lng },
        history: {
            event: 'created',
            email: req.body.email,
            date: new Date(),
        },
        approved: false,
    });
    a.save(function(err, a){
        if(err) return cb({ error: 'Unable to add attraction.' });
        cb(null, { id: a._id });
    });
});

rest.get('/attraction/:id', function(req, content, cb){
    Attraction.findById(req.params.id, function(err, a){
        if(err) return cb({ error: 'Unable to retrieve attraction.' });
        cb(null, {
            name: a.name,
            description: a.description,
            location: a.location,
        });
    });
});
apiOptions.domain.on('error', function(err){
  console.log('API domain error.\n', err.stack);
  setTimeout(function(){
    console.log('Server shutting down after API domain error.');
    process.exit(1);
  }, 5000);
  server.close();
  var worker = require('cluster').worker;
  if(worker) worker.disconnect();
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
