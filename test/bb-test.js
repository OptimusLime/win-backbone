

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
	console.log('Events requied inside module: ', wFun);
	console.log(requiredEvents[wFun]);
}


