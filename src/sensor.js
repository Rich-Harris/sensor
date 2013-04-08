var sensor, proto, patched;

sensor = function ( el ) {
	var sensor;

	if ( el.__sensor ) {
		return el.__sensor;
	}

	sensor = Object.create( proto );

	sensor.el = el;
	sensor.handlers = {};
	sensor.boundEvents = {};

	el.__sensor = sensor;

	return sensor;
};

proto = {
	on: function ( eventName, handler ) {

		var self = this, handlers, definition;

		definition = sensor.events[ eventName ];

		if ( !definition ) {
			throw 'Event "' + eventName + '" has not been defined';
		}

		if ( !this.handlers[ eventName ] ) {
			this.handlers[ eventName ] = [];
		}

		this.handlers[ eventName ].push( handler );

		console.log( this.boundEvents );

		if ( !this.boundEvents[ eventName ] ) {

			this.boundEvents[ eventName ] = true;

			console.log( 'applying %s definition', eventName );

			// apply definition
			this.boundEvents[ eventName ] = definition.call( null, this.el, this, function () {
				var handlers, i;

				// clone handlers, so any listeners bound by the handler don't
				// get called until it's their turn (e.g. doubletap)
				handlers = self.handlers[ eventName ].slice();

				for ( i=0; i<handlers.length; i+=1 ) {
					handlers[i].apply( self, arguments );
				}
			});
		}

		return {
			cancel: function () {
				self.off( eventName, handler );
			}
		};
	},

	off: function ( eventName, handler ) {
		var handlers, index;

		handlers = this.handlers[ eventName ];

		if ( !handlers ) {
			return;
		}

		index = handlers.indexOf( handler );

		if ( index !== -1 ) {
			handlers.splice( index, 1 );
		}

		if ( !handlers.length ) {
			delete this.handlers[ eventName ];

			this.boundEvents[ eventName ].cancel();
			delete this.boundEvents[ eventName ];
		}
	}
};

sensor.events = {};

sensor.define = function ( name, definition ) {
	sensor.events[ name ] = definition;
};

sensor.patch = function () {
	if ( patched ) {
		return;
	}

	Node.prototype.on = function () {
		this.__sensor = sensor( this );
		this.__sensor.on.apply( this.__sensor, arguments );
	};

	Node.prototype.off = function () {
		this.__sensor = sensor( this );
		this.__sensor.off.apply( this.__sensor, arguments );
	};

	patched = true;
};