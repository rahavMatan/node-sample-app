exports.setCurrency = function(req,res){
    req.session.currency = req.params.currency;
    return res.redirect(303, '/vacations');
};
