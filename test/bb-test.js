var winBB = require('../');
// var colors = require("colors");
//lets create some sample modules
var sample = require("./sampleEvo");

// var homePath = path.resolve(__dirname, "..");
var backbone = new winBB(__dirname + "/");
var log = backbone.getLogger({winFunction:"mocha"});
backbone.logLevel = log.testing;
var path =require('path');

var sampleModule = new sample(backbone);

var sampleJSON = 
{
	"evo" : sampleModule,
	"save" : "./sampleSave.js" 
};

//now load in our module file
backbone.loadModules(sampleJSON);

var backEmitter = backbone.getEmitter(sampleModule)

var callerEvents = backbone.registeredEvents();
var requiredEvents = backbone.moduleRequirements();


log('All registered functions: ', callerEvents);
// log('Required Functions/Events: ', requiredEvents);
for(var wFun in requiredEvents)
{
	log('Events required by: ', wFun);
	log(requiredEvents[wFun]);
}


describe('Testing win-backbone',function(){
	before(function(done)
	{
		backbone.initializeModules(function()
    	{
    		log("Finished Module Init");
 			done();
    	});
	})
	it('Should emit without issue',function(done){

		backEmitter.emit('save:batchSave', ["stuffywuffy"], function()
		{
			log('Batch save test returned: ', arguments);
			done();
		});
    });

    it('Should emit error due to lack of event permission',function(done){

		log('Test invalid callback');

		try
		{
			backEmitter('evolution:createIndividual', 0, function()
			{
				log('invalid callback');
			});

			done("Should have thrown an error in individual");
		}
		catch(e)
		{	
			done();
		}

    });
});





