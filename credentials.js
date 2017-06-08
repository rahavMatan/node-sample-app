module.exports = {
  cookieSecret: 'your cookie secret goes here',
  mongo: {
	development: {
		username:'matan',
		password:'rehab123',
	    connectionString: 'mongodb://matan:rehab123@ds111882.mlab.com:11882/node-sample-app',
	},
	production: {
	 connectionString: 'your_production_connection_string',
	},
  },
};
