var winBB = require('../');
var should = require("should");
//lets create some sample modules
var sample = require("./sampleEvo");
var path =require('path');
var colors =require('colors');
var util =require('util');

var	backbone = new winBB(__dirname + "/");

var saveMod = require('./sampleSave')(backbone);

var traverse = require('traverse');

backLog = backbone.getLogger({winFunction:"mocha"});
backbone.logLevel = backbone.testing;
backLog.logLevel = backLog.testing;


var backLog, evoEmitter,backEmitter, rModules, sampleJSON;

var wFunToModule;


var mochaModule = {
	winFunction : "mocha",
	requiredEvents : function(){
		return [
		"save:batchSave",
		"save:manyArgumentCallback",
		"save:errorCallback"
		];
	}
	// ,eventCallbacks : function(){return {}}
}

// var homePath = path.resolve(__dirname, "..");

describe('Testing win-backbone',function(){

	before(function(done)
	{
		var evoModule = new sample(backbone);

		//modules functions yo
		rModules = [evoModule.winFunction, saveMod.winFunction, mochaModule.winFunction];
		wFunToModule = {};

		//not necessarily the real modules
		wFunToModule[evoModule.winFunction] = evoModule;
		wFunToModule[saveMod.winFunction] = saveMod;
		wFunToModule[mochaModule.winFunction] = mochaModule;

		sampleJSON = 
		{
			"evo" : evoModule,
			"save" : "./sampleSave.js",
			"mocha" : mochaModule
		};

		//now load in our module file
		backbone.loadModules(sampleJSON);

		// backbone.mute("backbone");
		backbone.muteLogger(backLog);
		// backbone.mute("evo");
		// backbone.mute("save");
		// backbone.mute("mocha");


		evoEmitter = backbone.getEmitter(evoModule);
		backEmitter = backbone.getEmitter(mochaModule);

		backbone.initializeModules(function()
    	{
    		backLog("Finished Module Init");

 			done();
    	});

	})

	it('should have proper modules and events',function(done)
	{
		//backwards compat, but more consistent with getters
		var callerEvents = backbone.getRegisteredEvents();
		var requiredEvents = backbone.getModuleRequirements();

		backLog('All req functions: '.green, requiredEvents);
		backLog('All callback functions: '.green, callerEvents);
		// backLog("Bckbone:", backbone.getModuleCount);
		// backLog("bb mod:".red, backbone.getModuleCount());

		//check modules -- shoud have enough
		backbone.getModuleCount().should.equal(rModules.length);

		var allModules = backbone.getModules();

		for(var key in sampleJSON)
		{
			//these are the module names -- check they have been loaded
			//make sure it exists in the modules we retrieved
			should.exist(allModules[key]);
		}

		//now make sure all the required events are correct
		for(var wFun in wFunToModule)
		{
			//what do we require?
			var mod = wFunToModule[wFun];

			if(!mod.requiredEvents)
				continue;

			var actualRequired = mod.requiredEvents();

			//shouldn't exist if we don't have any required events
			if(!actualRequired.length)
			{
				should.not.exist(requiredEvents[wFun]);
				continue;
			}

			//grab the inner version 
			var bModRequired = requiredEvents[wFun];

			should.exist(bModRequired);


			var all = {};
			for(var i=0; i < actualRequired.length; i++)
			{
				var split = actualRequired[i].split(':');
				var n = split[0];

				if(!all[n])
					all[n] = {};

				all[n][split[1]] = actualRequired[i];
			}

			backLog("Bb required: ".yellow, bModRequired);
			backLog('Test req functions: '.magenta, actualRequired);
			backLog("Checking req against: ".magenta, all);

			//catch all the required
			for(var mReqFunc in all)
			{
				var actual = all[mReqFunc];
				var gen = bModRequired[mReqFunc];

				backLog("inner test: ".magenta, actual)
				backLog("inner backbone: ".yellow, gen)

				//exists, and has same nubmer of keys
				should.exist(gen);
				
				Object.keys(actual).length.should.equal(Object.keys(gen).length);

				for(var k in actual)
					actual[k].should.equal(gen[k]);
			}
		}

		//lets squish callbacks to do this quicker
		var squishCallbackNames = [];
		traverse(callerEvents).forEach(function(node)
		{
			if(this.isLeaf)
				squishCallbackNames.push(this.node);
		});

		var squishActual = [];
		for(var modFunc in wFunToModule)
		{
			//now lets pull all callbacks
			var mod = wFunToModule[modFunc];
			if(!mod.eventCallbacks)
				continue;

			//get callbacks
			var cbs = mod.eventCallbacks();

			//if you don't have cbs dont add please
			if(Object.keys(cbs).length)
				squishActual = squishActual.concat(Object.keys(cbs));
		}
		var noDups = {};
		traverse(squishActual).forEach(function(){
			if(this.isLeaf)
			{
				//no more you
				if(noDups[this.node])
					this.remove();

				noDups[this.node] = true;
			}
		});
		backLog("Test calbacks : ".magenta, squishActual);
		backLog("Registered callbacks :".yellow, squishCallbackNames);

		squishActual.length.should.equal(squishCallbackNames.length);
		squishActual.sort();
		squishCallbackNames.sort();

		squishActual.join(',').should.equal(squishCallbackNames.join(','));

		//all done with registered stuff
		done();

	});

	it('Should emit from eveolution module without issue',function(done){

		//call from "inside" another module 
		evoEmitter.emit('save:batchSave', ["stuffywuffy"], function()
		{
			backLog('Batch save test returned: ', arguments);
			done();
		});
    });

	it('Should used q callback to return function call', function(done){


		//shoudl call qfunction
		var incomingArgs = ["stuffywuffy"];

		var eMessage = "error";

		backLog("Making many arg callback: ".magenta, incomingArgs);

		backEmitter.qCall('save:manyArgumentCallback', incomingArgs[0])
			.then(function(repeat)
			{	
				backLog("Many call return: ".yellow, repeat);
				//this is a single return call 
				incomingArgs[0].should.equal(repeat);

				incomingArgs.push("new arg");

				return backEmitter.qCall('save:manyArgumentCallback', incomingArgs[0], incomingArgs[1])
			})
			.then(function(multi)
			{
				incomingArgs[0].should.equal(multi[0]);
				incomingArgs[1].should.equal(multi[1]);
				return backEmitter.qCall('save:errorCallback', incomingArgs[0]);
			})
			.fail(function(err)
			{
				backLog("Err: ", err);
				//should catch this error -- if it isn't the error we purposefully threw, it will also cause an error here too
				err.message.should.equal(eMessage);

				//survied the test
				backLog("Finised Q flow function tests");
			})
			.done(function()
			{
				backLog("it's finally over");
				done();
			})

	})

    it('Should emit error due to lack of event permission',function(done){

		backLog('Test invalid callback');

		try
		{
			evoEmitter('evolution:createIndividual', 0, function()
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

   it('Should make multiple requests at the same time through backbone',function(done){

   		//this represents how many concurrent requests to make
   		var maCount = 2 + Math.floor(Math.random()*10);

   		var mirrorArgs = {}, advancedQuery = [];

   		//making a random number of concurrent requests! Systematically create arguments for testing
   		for(var i=0; i < maCount; i++){
   		 	
   		 	var aQuery = ["save:manyArgumentCallback"];

   		 	//1 - 6 args
   			var addArgs = 1 + Math.floor(Math.random()*4);

   			var mArg = [];
   			for(var a=0; a < addArgs; a++)
   			{
   				var theArg = "argument-" + a;
   				//addditional arguments
   				aQuery.push(theArg);
   				mArg.push(theArg);
   			}

   			//we save the arguments we should be mirrored for this callback
   			mirrorArgs[i] = mArg;

   			//add the query
   			advancedQuery.push(aQuery);
   		}

   		backLog("Advanced query: ".rainbow, advancedQuery);

   		var failIndex = Math.floor(Math.random()*advancedQuery.length);

   		//really it works? 
		backEmitter.qConcurrent(advancedQuery)
			.then(function(allResults)
			{	
				backLog("Many concurrent call return: ".yellow, allResults);

				//this is a single return call 
				for(var i=0; i < allResults.length; i++)
				{
					var result = allResults[i];
					var mirArgs = mirrorArgs[i];

					backLog("Desired: ".magenta, mirArgs)
					backLog("Resulting: ".yellow, result)

					//if we only sent a single argument, it gets mirrored directly (no array stuff)
					if(mirArgs.length == 1)
						mirArgs[0].should.equal(result);
					else
					{
						//otherwise, we have multiples
						//we make the arg
						mirArgs.length.should.equal(result.length);

						//loop through results
						for(var l=0; l < mirArgs; l++)
						{
							mirArgs[l].should.equal(result[l]);
						}
					}
				}

				//replace a calback with a certified fail!
				//don't need any arguments
				advancedQuery[failIndex] = ["save:errorCallback"];

				return backEmitter.qConcurrent(advancedQuery, {endOnError: true});
			})
			.then(function()
			{
				//this shouldn't be reached 
				done(new Error("Error was never called"));

			}, function(err)
			{
				backLog("Honk town!!!!".rainbow);

				//we have an error, but only length 1 -- endOnError is advanced stuff
				err.length.should.equal(1);
				"error".should.equal(err[0].message);

				//do the same thing, but wihtout end on error
				return backEmitter.qConcurrent(advancedQuery);
			})
			.then(function()
			{
				//this shouldn't be reached 
				done(new Error("Error was never called"));

			}, function(err)
			{
				//somebody should have failed!
				for(var i=0; i < err.length; i++)
				{
					if(i != failIndex)
						should.not.exist(err[i]);
					else{
						should.exist(err[i]);
						"error".should.equal(err[i].message);
					}
				}
				//survied the test
				backLog("Finised Q concurrent flow function tests");
			})
			.done(function()
			{
				backLog("it's finally multiply over");
				done();
			})

    });


});





