
//Control all the win module! Need emitter for basic usage. 
var Emitter = require('component-emitter');
//

module.exports = winBB;

function winBB(homeDirectory)
{
	//
	var self = this;

	//we're an emitter! but we also mean extra business, so we override some calls later
	Emitter(self);

	//pull the inner versions, we'll overwrite self versions later
	var innerEmit = self.emit;
	var innerHasListeners = self.hasListeners;


	//cache the shift function
	var shift = [].shift;

	self.log = function()
	{
		throw new Error("Backbone doesn't use log directly anymore. Call backbone.getLogger(moduleObject) instead. ");
	}
	self.log.logLevel = function()
	{
		throw new Error("Backbone doesn't use log.loglevel anymore. Call backbone.logLevel directly instead. ");
	}

	var prependText = function(winFunction)
	{
		return !winFunction ? "" :  "    [" + winFunction + "]: ";
	}

	self.logLevel = 1;
	self.warning = 0;
	self.normal = 1;
	self.verbose = 2;
	self.testing = 3;

	//backbone handles the most basic logging for now, filtering by logLevel at the time
	//no stored history -- this will require a separate module
	//the practice of logging through the backbone should be standard though
	self.getLogger = function(moduleObject)
	{
		var winFunction = moduleObject.winFunction;
		var prepend = prependText(winFunction);

		if(process != undefined)//&& "".cyan != undefined)
		{
			prepend = '\x1B[36m' + prepend + '\x1B[39m';
		}

		var logFunction = function()
		{
			var logCategory;
			if(typeof arguments[0] == "number")
			{
				logCategory = [].shift.call(arguments);
			}
			else //otherwise, assume it's just a verbose message by default -- why would you log otherwise?
				logCategory = logFunction.verbose;

			if(!logCategory)
				throw new Error("Log category must be defined.");

			[].splice.call(arguments, 0,0, prepend)

			//needs to be lower than both our individual level, and our global level -- can't flood the log as any module
			if(logCategory <= logFunction.logLevel && logCategory <= self.logLevel)
				console.log.apply(console, arguments);
		}

		logFunction.log = logFunction;
		logFunction.logLevel = self.logLevel;
		logFunction.warning = self.warning;
		logFunction.normal = self.normal;
		logFunction.verbose = self.verbose;
		logFunction.testing = self.testing;

		return logFunction;
	}

	var internalLog = self.getLogger({});


	//we need to have all calls on record
	var callerEvents = {};
	var requiredEvents = {};
	var optionalEvents = {};
	var moduleObjects = {};

	var parseEventName = function(fullEvent)
	{
		var splitEvent = fullEvent.split(':');

		//if there is no ":", then this is improperly formatted
		if(splitEvent.length <= 1)
			throw new Error("Improper event name format, winFunction:eventName, instead looks like: " + fullEvent);

		return {winFunction: splitEvent[0], eventName: splitEvent[1]}
	}

	self.loadModules = function(inputNameOrObject, configurations)
	{
		configurations = configurations || {};
		//we have sent in a full object, or just a reference for a text file to load
		var jsonModules = inputNameOrObject;
		if(typeof inputNameOrObject == "string")
		{
			var fs = require('fs');
			var fBuffer = fs.readFileSync(inputNameOrObject);
			jsonModules = JSON.parse(fBuffer);
		}

		//otherwise, json modules is the json module information
		var mCount = 0;
		for(var key in jsonModules)
		{
			//perhaps there is some relative adjustments that need to be made for this to work?

			var locationNameOrObject = jsonModules[key];
			//if you're a function or object, we just leave you alone (the function will be instantiated at the end)
			//makes it easier to test things
			if(typeof locationNameOrObject == "object" || typeof locationNameOrObject == "function")
			{
				moduleObjects[key] = locationNameOrObject;
			}
			else if(locationNameOrObject.indexOf('/') != -1)
			{
				//locations relative to the home directory of the app
				moduleObjects[key] = require(homeDirectory + locationNameOrObject);
			}
			else
				moduleObjects[key] = require(locationNameOrObject);

			//if it's a function, we create a new object
			// if(typeof moduleObjects[key] != "function")
				// throw new Error("WIN Modules need to be functions for creating objects (that accept win backbone as first argument)")
			
			//create the object passing the backbone
			if(typeof moduleObjects[key] == "function")
				moduleObjects[key] = new moduleObjects[key](self, configurations[key]);


			mCount++;
		}

		self.moduleCount = mCount;

		//now we register our winFunctions for these modules
		for(var key in moduleObjects)
		{
			var wFun = moduleObjects[key].winFunction;
			if(!wFun || wFun == "" || typeof wFun != "string")
			{
				internalLog('Module does not implement winFunction properly-- must be non-empty string unlike: ' +  wFun);
				throw new Error("Improper win function");
			}
			if(callerEvents[wFun])
			{
				internalLog('Duplicate win functionality in modules -- can only have 1 ' +  wFun);
				throw new Error("Duplicate win module functionality");
			}

			callerEvents[wFun] = {};
			requiredEvents[wFun] = {};
			optionalEvents[wFun] = {};
		}

		//now we register our callback functions for all the events
		for(var key in moduleObjects)
		{
			var mod = moduleObjects[key];

			if(!mod.eventCallbacks)
			{
				throw new Error("No callback function inside module: " +  mod.winFunction +  " full module: " +  mod);
			}

			//grab the event callbacks
			var mCallbacks = mod.eventCallbacks();

			for(var fullEventName in mCallbacks)
			{
				//
				if(typeof fullEventName != "string")
				{
					throw new Error("Event callback keys must be strings: " +  fullEventName);
				}

				var cb = mCallbacks[fullEventName];
				if(!cb || typeof cb != "function")
				{
					throw new Error("Event callback must be non-null function: " +  cb);
				}

				//now we register inside of the backbone
				//we override what was there before
				self.off(fullEventName);
				
				//sole callback for this event -- always overwriting
				self.on(fullEventName, cb);

				//throws error for improper formatting
				var parsed = parseEventName(fullEventName);
				callerEvents[parsed.winFunction][parsed.eventName] = fullEventName;
			}
		}

		//now we grab all the required functionality for the mods
		for(var key in moduleObjects)
		{
			//call the mod for the events
			var mod = moduleObjects[key];

			//guaranteed to exist from callbacks above
			var fun = mod.winFunction;

			if(!mod.requiredEvents)
			{
				throw new Error("Required events function not written in module: " +  fun);
			}

			var reqs = mod.requiredEvents();

			if(!reqs)
			{
				throw new Error("requiredEvents must return non-null array full of required events.");
			}

			//make sure we have all these events
			for(var i=0; i < reqs.length; i++)
			{
				if(!self.moduleHasListeners(reqs[i]))
					throw new Error("Missing a required listener: " +  reqs[i]);

				var parsed = parseEventName(reqs[i]);

				//lets keep track of who needs what. 
				var required = requiredEvents[fun];

				if(!required[parsed.winFunction])
				{
					required[parsed.winFunction] = {};
				}

				if(!required[parsed.winFunction][parsed.eventName])
				{
					required[parsed.winFunction][parsed.eventName] = reqs[i];
				}

			}

			//of course any mod can make optional events
			//these are events that you can optionally call, but aren't necessarily satisfied by any module
			//you should check the backbone for listeners before making an optional call -- use at your own risk!
			if(mod.optionalEvents)
			{
				var opts = mod.optionalEvents();

				for(var i=0; i < opts.length; i++)
				{
					var parsed = parseEventName(opts[i]);

					//lets keep track of who needs what. 
					var optional = optionalEvents[fun];

					if(!optional[parsed.winFunction])
					{
						optional[parsed.winFunction] = {};
					}

					if(!optional[parsed.winFunction][parsed.eventName])
					{
						optional[parsed.winFunction][parsed.eventName] = opts[i];
					}
				}
			}

		}
	}

	//build a custom emitter for our module
	self.getEmitter = function(module)
	{
		if(!module.winFunction)
		{
			throw new Error("Can't generate module call function for module that doesn't have a winFunction!");
		}
		//emitter implicitly knows who is calling through closure
		var moduleFunction = module.winFunction;

		var emitter = function()
		{
			[].splice.call(arguments, 0, 0, moduleFunction);
			return self.moduleEmit.apply(self, arguments);
		}

		//pass the function through
		emitter.emit = emitter;

		//this makes it more convenient to check for listeners 
		//you don't need a backbone object AND an emitter. The emitter tells you both info 
		//-- while being aware of who is making requests
		emitter.hasListeners = function()
		{
			//has listeners is aware, so we can tap in and see who is checking for listeners 
			return self.moduleHasListeners.apply(self, arguments);
		}

		return emitter;
	}

	self.moduleRequirements = function()
	{
		return JSON.parse(JSON.stringify(requiredEvents));
	}
	self.registeredEvents = function()
	{	
		//return a deep copy so it can't be messed with
		return JSON.parse(JSON.stringify(callerEvents));
	}

	self.initializeModules = function(done)
	{	
		//call each module for initialization

		var totalCallbacks = self.moduleCount;

		var errors;

		//order of initialization might matter -- perhaps this is part of how objects are arranged in the json file?
		for(var key in moduleObjects)
		{
			var mod = moduleObjects[key];

			mod.initialize(function(err)
			{
				if(err)
				{
					//we encountered an error, we should send that back
					if(!errors)
						errors = [];
					errors.push(err);
				}

				//no matter what happens, we've finished a callback
				totalCallbacks--;

				if(totalCallbacks == 0)
				{
					//we've finished all the callbacks, we're done with initialization
					//send back errors if we have them
					done(errors);
				}
			});
		}
	}


	self.hasListeners = function()
	{
		throw new Error("Backbone doesn't pass listeners through itself any more, it uses the emitter.hasListeners. You must call backbone.getEmitter(moduleObject) to get an emitter.");
	}

	self.emit = function()
	{
		throw new Error("Backbone doesn't pass messages through emit any more. You must call backbone.getEmitter(moduleObject) -- passing the object.");
	}

	self.moduleHasListeners = function()
	{
		//pass request through module here!
		return innerHasListeners.apply(self, arguments);
	}

	self.moduleEmit = function()
	{
		//there are more than two 
		// internalLog('Emit: ', arguments);
		if(arguments.length < 2 || typeof arguments[0] != "string" || typeof arguments[1] != "string")
		{
			throw new Error("Cannot emit with less than two arguments, each of which must be strings: " + JSON.stringify(arguments));
		}
		//take the first argument from the array -- this is the caller
		var caller = shift.apply(arguments);
		//pull out the function and event name arguments to verify the callback
		var parsed = parseEventName(arguments[0]);
		var wFunction = parsed.winFunction;
		var eventName = parsed.eventName;

		internalLog("[" + caller + "]", "calling", "[" + parsed.winFunction + "]->" + eventName);

		//now we check if this caller declared intentions 
		if(!self.verifyEmit(caller, wFunction, eventName))
		{
			throw new Error("[" + caller + "] didn't require event [" + parsed.winFunction + "]->" + parsed.eventName);
		}

		//otherwise, normal emit will work! We've already peeled off the "caller", so it's just the event + arguments being passed
		innerEmit.apply(self, arguments);

	}

	self.verifyEmit = function(caller, winFunction, eventName)
	{
		//did this caller register for this event?
		if((!requiredEvents[caller] || !requiredEvents[caller][winFunction] || !requiredEvents[caller][winFunction][eventName])
			&& (!optionalEvents[caller] || !optionalEvents[caller][winFunction] || !optionalEvents[caller][winFunction][eventName]))
			return false;


		return true;
	}

	return self;
}



