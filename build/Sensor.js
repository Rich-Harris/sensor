// Sensor v0.1.0
// Copyright (2013) Rich Harris
// Released under the MIT License

// https://github.com/science-gamed/Sensor

(function ( global ) {

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

		console.log( eventName, handlers.slice() );

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
(function ( s ) {

	'use strict';

	s.define( 'doubletap', function ( el, sensor, fire ) {

		var threshold, interval, firstTapListener;

		threshold = 5; // px
		interval = 500; // ms

		sensor.on( 'tap', function ( x1, y1 ) {
			var secondTapListener = sensor.on( 'tap', function ( x2, y2, event ) {
				var dx = Math.abs( x1 - x2 ), dy = Math.abs( y1 - y2 );

				if ( dx <= threshold && dy <= threshold ) {
					fire( x2, y2, event );
				}
			});

			setTimeout( secondTapListener.cancel, interval );
		});
	});

}( sensor ));
(function ( s ) {

	'use strict';

	// TODO touch equivalents

	s.define( 'dragstart', function ( el, sensor, fire ) {
		return sensor.on( 'mousedown', function ( x, y, event ) {
			sensor.drag = {
				start: {
					x: x,
					y: y
				},
				last: {
					x: x,
					y: y
				}
			};

			fire( x, y, event );
		});
	});


	s.define( 'dragmove', function ( el, sensor, fire ) {
		return sensor.on( 'dragstart', function ( startX, startY ) {
			var mousemove, moveListener, endListener;

			endListener = sensor.on( 'dragend', function () {
				moveListener.cancel();
				endListener.cancel();
			});

			mousemove = function ( x, y, event ) {
				fire ( x - this.drag.last.x, y - this.drag.last.y );
				this.drag.last.x = x;
				this.drag.last.y = y;
			};

			moveListener = sensor.on( 'mousemove', mousemove );
		});
	});



	s.define( 'dragend', function ( el, sensor, fire ) {
		return sensor.on( 'dragstart', function ( x, y, event ) {
			var listener = sensor.on( 'mouseup', function ( x, y, event ) {
				fire( x, y );
				
				delete sensor.drag;
				listener.cancel();
			});
		});
	});

}( sensor ));
(function ( s ) {

	'use strict';

	s.define( 'mousedown', function ( el, sensor, fire ) {
		var mousedown = function ( event ) {
			fire ( event.offsetX, event.offsetY, event );
		};

		el.addEventListener( 'mousedown', mousedown );

		return {
			cancel: function () {
				el.removeEventListener( 'mousedown', mousedown );
			}
		};
	});

	s.define( 'mouseup', function ( el, sensor, fire ) {
		var mouseup = function ( event ) {
			fire ( event.offsetX, event.offsetY, event );
		};

		el.addEventListener( 'mouseup', mouseup );

		return {
			cancel: function () {
				el.removeEventListener( 'mouseup', mouseup );
			}
		};
	});

	s.define( 'mousemove', function ( el, sensor, fire ) {
		var mousemove = function ( event ) {
			fire ( event.offsetX, event.offsetY, event );
		};

		el.addEventListener( 'mousemove', mousemove );

		return {
			cancel: function () {
				el.removeEventListener( 'mousemove', mousemove );
			}
		};
	});

}( sensor ));
(function ( s ) {

	'use strict';

	s.define( 'tap', function ( el, sensor, fire ) {
		var threshold, interval;

		threshold = 5; // px
		interval = 200; // ms

		el.addEventListener( 'mousedown', function ( event ) {
			var startX, startY, mouseup, mousemove, teardown;

			startX = event.offsetX;
			startY = event.offsetY;

			mouseup = function ( event ) {
				fire( event.offsetX, event.offsetY, event );
				teardown();
			};

			mousemove = function ( event ) {
				if ( Math.abs( event.offsetX - startX ) > threshold || Math.abs( event.offsetY - startY ) > threshold ) {
					teardown();
				}
			};

			teardown = function () {
				el.removeEventListener( 'mouseup', mouseup );
				el.removeEventListener( 'mousemove', mousemove );
			};

			el.addEventListener( 'mouseup', mouseup );
			el.addEventListener( 'mousemove', mousemove );

			setTimeout( teardown, interval );
		});

		el.addEventListener( 'touchstart', function ( event ) {
			var startX, startY, mouseup, mousemove, teardown, touch, finger;

			touch = event.changedTouches[0];
			finger = touch.identifier;

			startX = touch.offsetX;
			startY = touch.offsetY;

			touchend = function ( event ) {
				var touch;

				touch = event.changedTouches[0];
				if ( touch.identifier !== finger ) {
					return;
				}

				fire( touch.offsetX, touch.offsetY, event );
				teardown();
			};

			touchmove = function ( event ) {
				var touch;

				touch = event.changedTouches[0];
				if ( touch.identifier !== finger ) {
					return;
				}

				if ( Math.abs( touch.offsetX - startX ) > threshold || Math.abs( touch.offsetY - startY ) > threshold ) {
					teardown();
				}
			};

			teardown = function () {
				el.removeEventListener( 'touchend', touchend );
				el.removeEventListener( 'touchcancel', teardown );
				el.removeEventListener( 'touchmove', touchmove );
			};

			el.addEventListener( 'touchend', touchend );
			el.addEventListener( 'touchcancel', teardown );
			el.addEventListener( 'touchmove', touchmove );

			setTimeout( teardown, interval );
		});
	});

}( sensor ));

if ( typeof global.module !== "undefined" && global.module.exports ) { global.module.exports = sensor; }
else if ( typeof global.define !== "undefined" && global.define.amd ) { global.define( function () { return sensor; }); }
else { global.sensor = sensor; }

}( this ));