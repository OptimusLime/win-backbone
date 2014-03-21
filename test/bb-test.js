

var winBB = require('../');

//lets create some sample modules
var sample = require("./sampleEvo");

// var homePath = path.resolve(__dirname, "..");
var backbone = new winBB(__dirname + "/");
backbone.log.logLevel = backbone.log.testing;
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

backbone.log('All registered functions: ', callerEvents);
// backbone.log('Required Functions/Events: ', requiredEvents);
for(var wFun in requiredEvents)
{
	backbone.log('Events required by: ', wFun);
	backbone.log(requiredEvents[wFun]);
}


describe('Testing win-backbone',function(){
	it('Should emit without issue',function(done){

		backEmitter.emit('save:batchSave', ["stuffywuffy"], function()
		{
			backbone.log('Batch save test returned: ', arguments);
			done();
		});
    });

    it('Should emit error due to lack of event permission',function(done){

		backbone.log('Test invalid callback');

		try
		{
			backEmitter('evolution:createIndividual', 0, function()
			{
				backbone.log('invalid callback');
			});

			done("Should have thrown an error in individual");
		}
		catch(e)
		{	
			done();
		}

    });
});





