var main = require('./handlers/main.js'),
    contest = require('./handlers/contest.js'),
    vacation = require('./handlers/vacation.js'),
    samples = require('./handlers/sample.js'),
    cart = require('./handlers/cart.js');

module.exports = function(app){
  //main routes
  app.get('/', main.home);
  app.get('/about', main.about);
  app.get('/newsletter', main.newsletter);
  //contest routes
  app.get('/contest/vacation-photo', contest.vacationPhoto);
	app.post('/contest/vacation-photo/:year/:month', contest.vacationPhotoProcessPost);
  //vaction routes
  app.get('/vacations', vacation.list);
  app.get('/vacation/:vacation', vacation.detail);
	app.get('/notify-me-when-in-season', vacation.notifyWhenInSeason);
	app.post('/notify-me-when-in-season', vacation.notifyWhenInSeasonProcessPost);

  app.get('/set-currency/:currency', cart.setCurrency);

  // testing/sample routes
	app.get('/jquery-test', samples.jqueryTest);
	app.get('/nursery-rhyme', samples.nurseryRhyme);
	app.get('/data/nursery-rhyme', samples.nurseryRhymeData);
	app.get('/epic-fail', samples.epicFail);

}
