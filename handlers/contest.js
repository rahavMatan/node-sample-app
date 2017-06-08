var path = require('path'),
	fs = require('fs'),
	formidable = require('formidable');

var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);
function saveContestEntry(contestName, email, year, month, photoPath){
  console.log("mock-saving an image..");
}

exports.vacationPhoto = function(req, res){
	var now = new Date();
	res.render('contest/vacation-photo', { year: now.getFullYear(), month: now.getMonth() });
};

exports.vacationPhotoProcessPost = function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) {
            req.session.flash = {
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
        fs.renameSync(photo.path, dir + '/' + photo.name);
        saveContestEntry('vacation-photo', fields.email,
            req.params.year, req.params.month, path);
        req.session.flash = {
            type: 'success',
            intro: 'Good luck!',
            message: 'You have been entered into the contest.',
        };
        return res.redirect(303, '/contest/vacation-photo/entries');
    });
};
