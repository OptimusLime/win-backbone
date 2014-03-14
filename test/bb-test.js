

var winBB = require('../');

//lets create some sample modules

var sampleJSON = 
{
	"evo" : "./sampleEvo.js",
	"save" : "./sampleSave.js" 
};
var path =require('path');

// var homePath = path.resolve(__dirname, "..");
var backbone = new winBB(__dirname + "/");

//now load in our module file
backbone.loadModules(sampleJSON);

var callerEvents = backbone.registeredEvents();
var requiredEvents = backbone.moduleRequirements();

console.log('All registered functions: ', callerEvents);
// console.log('Required Functions/Events: ', requiredEvents);
for(var wFun in requiredEvents)
{
	console.log('Events required by: ', wFun);
	console.log(requiredEvents[wFun]);
}

backbone.emit('evolution', 'save:batchSave', ["stuffywuffy"], function()
{
	console.log('Batch save test returned: ', arguments);
});

console.log('Test invalid callback');
// backbone.emit('save:batchSave', ["stuffywuffy"], function()
// {
// 	console.log('invalid callback');
// });
backbone.emit('someone', 'evolution:createIndividual', 0, function()
{
	console.log('invalid callback');
});