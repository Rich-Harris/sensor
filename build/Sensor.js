// Sensor v0.1.0
// Copyright (2013) Rich Harris
// Released under the MIT License

// https://github.com/science-gamed/Sensor

(function ( global ) {

var sensor, proto, definitions, patched, matches, classPattern, cachedPatterns, proxy;

sensor = function ( el ) {
	var sensor;

	if ( !el ) {
		el = window;
	}

	if ( typeof el === 'string' ) {
		el = getElFromString( el );

		if ( !el ) {
			throw new Error( 'Could not find specified element' );
		}
	}

	if ( el.__sensor ) {
		return el.__sensor;
	}

	if ( !( el instanceof Node ) && !( el instanceof Window ) ) {
		throw new Error( 'Object must be a DOM node, or the window object' );
	}

	sensor = Object.create( proto );

	sensor.el = el;
	sensor.packages = {};
	sensor.boundEvents = {};

	el.__sensor = sensor;

	return sensor;
};

proto = {
	on: function ( eventName, childSelector, handler ) {

		var self = this, packages, package, definition, cancelled, map, key, index;

		// allow multiple listeners to be attached in one go
		if ( typeof eventName === 'object' ) {
			map = eventName;
			packages = [];

			for ( key in map ) {
				if ( map.hasOwnProperty( key ) ) {
					if ( typeof map[ key ] === 'function' ) {
						handler = map[ key ];

						if ( ( index = key.indexOf( ' ' ) ) !== -1 ) {
							eventName = key.substr( 0, index );
							childSelector = key.substring( index + 1 );
						}

						else {
							eventName = key;
							childSelector = null;
						}
					}


					else if ( typeof map[ key ] === 'object' ) {
						eventName = key;
						childSelector = map[ key ].childSelector;
						handler = map[ key ].handler;
					}

					package = {
						eventName: eventName,
						childSelector: childSelector,
						handler: handler
					};

					this._addPackage( package );
				}
			}

			return {
				cancel: function () {
					if ( !cancelled ) {
						while ( packages.length ) {
							self.off( packages.pop() );
						}
						cancelled = true;
					}
				}
			};
		}

		// there may not be a child selector involved
		if ( arguments.length === 2 ) {
			handler = childSelector;
			childSelector = null;
		}

		package = {
			eventName: eventName,
			childSelector: childSelector,
			handler: handler
		};

		this._addPackage( package );

		return {
			cancel: function () {
				if ( !cancelled ) {
					self.off( package );
					cancelled = true;
				}
			}
		};
	},

	off: function ( eventName, childSelector, handler ) {
		var self = this, packages, package, packagesToRemove, index, teardown;

		teardown = function ( eventName ) {
			delete self.packages[ eventName ];

			self.boundEvents[ eventName ].teardown();
			delete self.boundEvents[ eventName ];
		};

		// no arguments supplied - remove all packages for all event types
		if ( !arguments.length ) {
			for ( eventName in this.boundEvents ) {
				if ( this.boundEvents.hasOwnProperty( eventName ) ) {
					teardown( eventName );
				}
			}

			return;
		}

		// one argument supplied - could be a package (via listener.cancel) or
		// an event name
		if ( arguments.length === 1 ) {
			if ( typeof eventName === 'object' ) {
				package = eventName;
				eventName = package.eventName;

				packages = this.packages[ eventName ];

				if ( !packages ) {
					return;
				}

				index = packages.indexOf( package );

				if ( index === -1 ) {
					return;
				}

				packages.splice( index, 1 );

				if ( !packages.length ) {
					teardown( eventName );
				}

				return;
			}

			else {
				teardown( eventName );
				return;
			}
		}

		// two arguments supplied
		if ( arguments.length === 2 ) {
			// no child selector supplied
			if ( typeof childSelector === 'function' ) {
				handler = childSelector;
				childSelector = null;
			}

			// no handler supplied, which means we're removing all packages applying
			// to this event name and child selector
			else {
				packages = this.packages[ eventName ];

				if ( packages ) {
					this.packages[ eventName ] = packages.filter( function ( package ) {
						return package.childSelector !== childSelector;
					});

					if ( !this.packages[ eventName ].length ) {
						teardown( eventName );
					}
				}

				return;
			}
		}

		// we have an event name, a child selector (possibly null), and a handler
		if ( this.packages[ eventName ] ) {

			if ( childSelector ) {
				this.packages[ eventName ] = this.packages[ eventName ].filter( function ( package ) {
					return package.childSelector !== childSelector || package.handler !== handler;
				});
			}

			else {
				this.packages[ eventName ] = this.packages[ eventName ].filter( function ( package ) {
					return package.childSelector  || package.handler !== handler;
				});
			}

			if ( !this.packages[ eventName ].length ) {
				teardown( eventName );
			}

			return;
		}
	},

	once: function ( eventName, childSelector, handler ) {
		var suicidalListener;

		if ( arguments.length === 2 ) {
			handler = childSelector;
			childSelector = null;
		}

		suicidalListener = this.on( eventName, childSelector, function () {
			handler.apply( this, arguments );
			suicidalListener.cancel();
		});

		return suicidalListener;
	},

	_addPackage: function ( package ) {
		var eventName = package.eventName;

		if ( !this.packages[ eventName ] ) {
			this.packages[ eventName ] = [];
		}

		this.packages[ eventName ].push( package );
		this._bindEvent( eventName );
	},

	_bindEvent: function ( eventName ) {
		var self = this, definition;

		definition = definitions[ eventName ];

		if ( !definition ) {
			// assume this is a standard event - we need to proxy it
			definition = proxy( eventName );
		}

		if ( !this.boundEvents[ eventName ] ) {

			// block any children from binding before we've finished
			this.boundEvents[ eventName ] = true;

			// apply definition
			this.boundEvents[ eventName ] = definition.call( null, this.el, this, function () {
				var packages, package, i, el, match;

				// clone packages, so any listeners bound by the handler don't
				// get called until it's their turn (e.g. doubletap)

				//packages = self.packages[ eventName ].slice();
				packages = self.packages[ eventName ].slice();

				for ( i=0; i<packages.length; i+=1 ) {
					package = packages[i];

					if ( package.childSelector ) {
						el = this;

						if ( el === self.el ) {
							continue; // not a child of self.el
						}

						while ( !match && el !== self.el ) {
							if ( matches( el, package.childSelector ) ) {
								match = el;
							}

							el = el.parentNode;
						}

						if ( match ) {
							package.handler.apply( match, arguments );
						}

					} else {
						package.handler.apply( self.el, arguments );
					}
				}
			});
		}
	}
};

definitions = {};

// define custom events
sensor.define = function ( name, definition ) {
	definitions[ name ] = definition;
};

// matching
(function ( ElementPrototype ) {
	ElementPrototype.matches = ElementPrototype.matches || ElementPrototype.matchesSelector || 
	ElementPrototype.mozMatches    || ElementPrototype.mozMatchesSelector ||
	ElementPrototype.msMatches     || ElementPrototype.msMatchesSelector  ||
	ElementPrototype.oMatches      || ElementPrototype.oMatchesSelector   ||
	ElementPrototype.webkitMatches || ElementPrototype.webkitMatchesSelector;
}( Element.prototype ));

sensor.patch = function () {
	if ( patched ) {
		return;
	}

	[ Node.prototype, Window.prototype ].forEach( function ( proto ) {
		proto.on = function () {
			this.__sensor = sensor( this );
			this.__sensor.on.apply( this.__sensor, arguments );
		};

		proto.off = function () {
			this.__sensor = sensor( this );
			this.__sensor.off.apply( this.__sensor, arguments );
		};
	});

	patched = true;
};

classPattern = /^\.([^ ]+)$/;

matches = function ( el, childSelector ) {

	var classMatch, pattern;

	// CSS selectors - use el.matches if available
	if ( typeof childSelector === 'string' ) {
		if ( el.matches ) {
			return el.matches( childSelector );
		}

		// you need to bring your own el.matches polyfill - but we'll make
		// an exception for tag names...
		else if ( el.tagName.toLowerCase() === childSelector.toLowerCase() ) {
			return true;
		}

		// ...and class names
		else if ( classMatch = classPattern.exec( childSelector ) ) {
			pattern = cachedPatterns[ childSelector ] || (function () {
				return ( cachedPatterns[ childSelector ] = new RegExp( '\\s*' + childSelector + '\\s*' ) );
			}());

			return el.className.test( pattern );
		}

		throw ( 'This browser does not support matches (aka matchesSelector) - either polyfill it (see e.g. https://github.com/termi/CSS_selector_engine) or only use class names, element arrays, or functions as child selectors' );
	}

	if ( typeof childSelector === 'function' ) {
		return childSelector( el );
	}

	if ( childSelector.length ) {
		i = childSelector.length;
		while ( i-- ) {
			if ( childSelector[i] === el ) {
				return true;
			}
		}

		return false;
	}

	throw 'Illegal child selector';
};


getElFromString = function ( str ) {
	var el;

	if ( document.querySelector ) {
		if ( el = document.querySelector( str ) ) {
			return el;
		}
	}

	if ( str.charAt( 0 ) === '#' ) {
		if ( el = document.getElementById( str.substring( 1 ) ) ) {
			return el;
		}
	}

	return document.getElementById( str );
};


proxy = function ( eventName ) {
	var definition = function ( el, sensor, fire ) {
		var handler = function ( event ) {
			fire.call( event.target, event );
		};

		el.addEventListener( eventName, handler );

		return {
			teardown: function () {
				el.removeEventListener( eventName, handler );
			}
		};
	};

	sensor.define( eventName, definition );

	return definition;
};
(function ( s ) {

	'use strict';

	s.define( 'doubletap', function ( el, sensor, fire ) {

		var threshold, interval, listener;

		threshold = 5; // px
		interval = 500; // ms

		listener = sensor.on( 'tap', function ( x1, y1 ) {
			var secondTapListener = sensor.on( 'tap', function ( x2, y2, event ) {
				var dx = Math.abs( x1 - x2 ), dy = Math.abs( y1 - y2 );

				if ( dx <= threshold && dy <= threshold ) {
					fire( x2, y2, event );
				}
			});

			setTimeout( secondTapListener.cancel, interval );
		});

		return {
			teardown: listener.cancel
		};
	});

}( sensor ));
(function ( s ) {

	'use strict';

	// TODO touch equivalents

	s.define( 'pullstart', function ( el, sensor, fire ) {
		var listener = sensor.on( 'mousedown', function ( event ) {
			var x, y;

			x = event.offsetX;
			y = event.offsetY;

			sensor.pull = {
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

		return {
			teardown: listener.cancel
		};
	});


	s.define( 'pull', function ( el, sensor, fire ) {
		var listener = sensor.on( 'pullstart', function ( startX, startY ) {
			var mousemove, moveListener, endListener;

			sensor.once( 'mouseup', function () {
				moveListener.cancel();
			});

			mousemove = function ( event ) {
				var x, y;

				x = event.offsetX;
				y = event.offsetY;

				fire.call( el, x - sensor.pull.last.x, y - sensor.pull.last.y );
				sensor.pull.last.x = x;
				sensor.pull.last.y = y;
			};

			moveListener = sensor.on( 'mousemove', mousemove );
		});

		return {
			teardown: listener.cancel
		};
	});



	s.define( 'pullend', function ( el, sensor, fire ) {
		var listener = sensor.on( 'pullstart', function ( x, y, event ) {
			mouseupListener = sensor.once( 'mouseup', function ( x, y, event ) {
				fire.call( el, x, y );
			});
		});

		return {
			teardown: listener.cancel
		};
	});

}( sensor ));
(function ( s ) {

	'use strict';

	var sWindow = s( window );

	s.define( 'tap', function ( el, sensor, fire ) {
		var threshold, interval, mouseListener, touchListener;

		threshold = 5; // px
		interval = 200; // ms

		mouseListener = sensor.on( 'mousedown', function ( downEvent ) {
			var mousemove, mouseup, teardown, cancelled, startX, startY;

			startX = downEvent.clientX;
			startY = downEvent.clientY;

			teardown = function () {
				if ( cancelled ) {
					return;
				}

				mouseup.cancel();
				mousemove.cancel();

				cancelled = true;
			};

			mouseup = sWindow.on( 'mouseup', function ( upEvent ) {
				fire.call( downEvent.target, downEvent.offsetX, downEvent.offsetY, upEvent );
				teardown();
			});

			mousemove = sWindow.on( 'mousemove', function ( event ) {
				var x = event.clientX, y = event.clientY;

				if ( Math.abs( x - startX ) > threshold || Math.abs( y - startY ) > threshold ) {
					teardown();
				}
			});

			setTimeout( teardown, interval );
		});

		touchListener = sensor.on( 'touchstart', function ( event ) {
			var touch, finger, target, startX, startY, touchstart, touchmove, touchend, touchcancel, teardown, cancelled;

			if ( event.touches.length !== 1 ) {
				return;
			}

			touch = event.touches[0];
			finger = touch.identifier;
			target = touch.target;

			startX = touch.clientX;
			startY = touch.clientY;

			teardown = function () {
				if ( cancelled ) {
					return;
				}

				touchstart.cancel();
				touchend.cancel();
				touchmove.cancel();
				touchcancel.cancel();

				cancelled = true;
			};

			// if another finger touches before tap has completed, abort
			touchstart = sWindow.on( 'touchstart', teardown );

			touchend = sWindow.on( 'touchend', function ( upEvent ) {
				fire.call( target, touch.offsetX, touch.offsetY, upEvent );
				teardown();
			});

			touchmove = sWindow.on( 'touchmove', function ( event ) {
				var touch, x, y;

				touch = event.touches[0];

				x = touch.clientX;
				y = touch.clientY;

				if ( Math.abs( x - startX ) > threshold || Math.abs( y - startY ) > threshold ) {
					teardown();
				}
			});

			setTimeout( teardown, interval );
		});

		return {
			teardown: function () {
				mouseListener.cancel();
				touchListener.cancel();
			}
		};
	});

}( sensor ));

if ( typeof global.module !== "undefined" && global.module.exports ) { global.module.exports = sensor; }
else if ( typeof global.define !== "undefined" && global.define.amd ) { global.define( function () { return sensor; }); }
else { global.sensor = sensor; }

}( this ));