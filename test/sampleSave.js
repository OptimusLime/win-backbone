module.exports = sampleSave;

function sampleSave(backbone)
{
	var self = this;

	self.winFunction = "save";
	self.log = backbone.getLogger(self);

	var fullEventName = function(partialName)
	{
		return self.winFunction + ":" + partialName;
	}

	var batchSave = function(artifacts, done)
	{
		self.log('Saving artifacts: ', artifacts);
		done("sample finish saving stuff: " + artifacts);
	}
	var getArtifacts = function(arrWID, done)
	{
		//go on and get our artifacts (either here, or through a request)
		self.log('getting artifacts: ', arrWID)

		//maybe we save all parental objects
		done("artifacts fetched now");
	}

	function mirrorCallback()
	{
		self.log("Mirror o args: ", arguments);
		//pull off first argument
		var shouldError = [].shift.call(arguments);

		//pop the last arguemnt -- the callback
		var finished = arguments[arguments.length-1];

		//then apply liberally popping off
		[].pop.call(arguments);

		if(shouldError)
		{
			[].splice.call(arguments, 0, 0, new Error("error"));
		}
		else
		{
			//push in no error!
			[].splice.call(arguments, 0, 0, undefined);
		}

		self.log("mirror callback made: ".cyan, arguments);

		finished.apply(self, arguments);
	}
	//we are evolution
	//these are the various callbacks we accept as events
	self.eventCallbacks = function()
	{
		var callbacks = {};

		//add callbacks to the object-- these are the functions called when the full event is emitted
		callbacks[fullEventName("manyArgumentCallback")] = function() { 
			//this time don't cause an eerror -- just mirror
			[].splice.call(arguments, 0, 0, false);
			mirrorCallback.apply(self, arguments)
		};
		callbacks[fullEventName("errorCallback")] =  function() { 
			//this time cause an error
			[].splice.call(arguments, 0, 0, true);
			mirrorCallback.apply(self, arguments)
		};
		callbacks[fullEventName("batchSave")] = batchSave;
		callbacks[fullEventName("getArtifacts")] = getArtifacts;

		//send back our callbacks
		return callbacks;
	}

	self.requiredEvents = function()
	{
		//don't require any outside modules
		return [];
	}

	self.initialize = function(done)
	{
		process.nextTick(function()
		{
			done();
		})
	}

	return self;
}
