
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


	//we need to have all calls on record
	var callerEvents = {};
	var requiredEvents = {};

	var moduleObjects = {};

	var parseEventName = function(fullEvent)
	{
		var splitEvent = fullEvent.split(':');

		//if there is no ":", then this is improperly formatted
		if(splitEvent.length <= 1)
			throw new Error("Improper event name format, winFunction:eventName, instead looks like: ", fullEvent);

		return {winFunction: splitEvent[0], eventName: splitEvent[1]}
	}

	self.loadModules = function(inputNameOrObject)
	{
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

			var locationOrName = jsonModules[key];
			if(locationOrName.indexOf('/') != -1)
			{
				//locations relative to the home directory of the app
				moduleObjects[key] = require(homeDirectory + locationOrName);
			}
			else
				moduleObjects[key] = require(locationOrName);

			//if it's a function, we create a new object
			if(typeof moduleObjects[key] != "function")
				throw new Error("WIN Modules need to be functions for creating objects (that accept win backbone as first argument)")
			
			//create the object passing the backbone
			moduleObjects[key] = new moduleObjects[key](self);


			mCount++;
		}

		self.moduleCount = mCount;

		//now we register our winFunctions for these modules
		for(var key in moduleObjects)
		{
			var wFun = moduleObjects[key].winFunction;
			if(!wFun || wFun == "" || typeof wFun != "string")
			{
				console.log('Module does not implement winFunction properly-- must be non-empty string unlike: ', wFun);
				throw new Error("Improper win function");
			}
			if(callerEvents[wFun])
			{
				console.log('Duplicate win functionality in modules -- can only have 1 ', wFun);
				throw new Error("Duplicate win module functionality");
			}

			callerEvents[wFun] = {};
			requiredEvents[wFun] = {};
		}

		//now we register our callback functions for all the events
		for(var key in moduleObjects)
		{
			var mod = moduleObjects[key];

			if(!mod.eventCallbacks)
			{
				throw new Error("No callback function inside module: ", mod.winFunction, " full module: ", mod);
			}

			//grab the event callbacks
			var mCallbacks = mod.eventCallbacks();

			for(var fullEventName in mCallbacks)
			{
				//
				if(typeof fullEventName != "string")
				{
					throw new Error("Event callback keys must be strings: ", fullEventName);
				}

				var cb = mCallbacks[fullEventName];
				if(!cb || typeof cb != "function")
				{
					throw new Error("Event callback must be non-null function: ", cb);
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
				throw new Error("Required events function not written in module: ", fun);
			}

			var reqs = mod.requiredEvents();

			if(!reqs)
			{
				throw new Error("requiredEvents must return non-null array full of required events.");
			}

			//make sure we have all these events
			for(var i=0; i < reqs.length; i++)
			{
				if(!self.hasListeners(reqs[i]))
					throw new Error("Missing a required listener: ", reqs[i]);

				var parsed = parseEventName(reqs[i]);

				var required = requiredEvents[parsed.winFunction][parsed.eventName];

				if(!required)
				{
					required = {requiredBy: []};
					requiredEvents[parsed.winFunction][parsed.eventName] = required;
				}
				//lets keep track of who needs what. 
				required.requiredBy.push(mod.winFunction);
			}	
		}
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

	var innerEmit = self.emit;
	self.emit = function()
	{
		//there are more than two 
		console.log('Emit: ', arguments);

		var caller = shift.apply(arguments);
		var eventName = arguments[0];

		//now we check if this caller declared intentions 
		if(!verifyEmit(caller, eventName))
		{
			throw new Error("Caller: ", caller, " didn't declare event: ", eventName);
		}

		//otherwise, normal emit will work! We've already peeled off the "caller", so it's just the event + arguments being passed
		innerEmit.apply(self, arguments);

	}

	self.verifyEmit = function(caller, eventName)
	{
		//did this caller register for this event?

		return true;
	}

	return self;
}



