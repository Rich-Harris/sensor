var sensor, proto, definitions, patched, matches, classPattern, cachedPatterns, proxy, getElFromString;

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
	sensor.listeners = {};
	sensor.boundEvents = {};

	el.__sensor = sensor;

	return sensor;
};

proto = {
	on: function ( eventName, childSelector, handler ) {

		var self = this, listeners, listener, cancelled, map, key, index;

		// allow multiple listeners to be attached in one go
		if ( typeof eventName === 'object' ) {
			map = eventName;
			listeners = [];

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

					listener = {
						eventName: eventName,
						childSelector: childSelector,
						handler: handler
					};

					this._addListener( listener );
				}
			}

			return {
				cancel: function () {
					if ( !cancelled ) {
						while ( listeners.length ) {
							self.off( listeners.pop() );
						}
						cancelled = true;
					}
				}
			};
		}

		// there may not be a child selector involved
		if ( !handler ) {
			handler = childSelector;
			childSelector = null;
		}

		listener = {
			eventName: eventName,
			childSelector: childSelector,
			handler: handler
		};

		this._addListener( listener );

		return {
			cancel: function () {
				if ( !cancelled ) {
					self.off( listener );
					cancelled = true;
				}
			}
		};
	},

	off: function ( eventName, childSelector, handler ) {
		var self = this, listeners, listener, index, teardown, name;

		teardown = function ( eventName ) {
			delete self.listeners[ eventName ];

			self.boundEvents[ eventName ].teardown();
			delete self.boundEvents[ eventName ];
		};

		// no arguments supplied - remove all listeners for all event types
		if ( !arguments.length ) {
			for ( name in this.boundEvents ) {
				if ( this.boundEvents.hasOwnProperty( name ) ) {
					teardown( name );
				}
			}

			return;
		}

		// one argument supplied - could be a listener (via listener.cancel) or
		// an event name
		if ( arguments.length === 1 ) {
			if ( typeof eventName === 'object' ) {
				listener = eventName;
				eventName = listener.eventName;

				listeners = this.listeners[ eventName ];

				if ( !listeners ) {
					return;
				}

				index = listeners.indexOf( listener );

				if ( index === -1 ) {
					return;
				}

				listeners.splice( index, 1 );

				if ( !listeners.length ) {
					teardown( eventName );
				}

				return;
			}

			// otherwise it's a string, i.e. an event name
			teardown( eventName );
			return;
		}

		// two arguments supplied
		if ( arguments.length === 2 ) {
			// no child selector supplied
			if ( typeof childSelector === 'function' ) {
				handler = childSelector;
				childSelector = null;
			}

			// no handler supplied, which means we're removing all listeners applying
			// to this event name and child selector
			else {
				listeners = this.listeners[ eventName ];

				if ( listeners ) {
					this.listeners[ eventName ] = listeners.filter( function ( listener ) {
						return listener.childSelector !== childSelector;
					});

					if ( !this.listeners[ eventName ].length ) {
						teardown( eventName );
					}
				}

				return;
			}
		}

		// we have an event name, a child selector (possibly null), and a handler
		if ( this.listeners[ eventName ] ) {

			if ( childSelector ) {
				this.listeners[ eventName ] = this.listeners[ eventName ].filter( function ( listener ) {
					return listener.childSelector !== childSelector || listener.handler !== handler;
				});
			}

			else {
				this.listeners[ eventName ] = this.listeners[ eventName ].filter( function ( listener ) {
					return listener.childSelector  || listener.handler !== handler;
				});
			}

			if ( !this.listeners[ eventName ].length ) {
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

	_addListener: function ( listener ) {
		var eventName = listener.eventName;

		if ( !this.listeners[ eventName ] ) {
			this.listeners[ eventName ] = [];
		}

		this.listeners[ eventName ].push( listener );
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
				var listeners, listener, i, el, match;

				// clone listeners, so any listeners bound by the handler don't
				// get called until it's their turn (e.g. doubletap)
				listeners = self.listeners[ eventName ].slice();

				for ( i=0; i<listeners.length; i+=1 ) {
					listener = listeners[i];

					if ( listener.childSelector ) {
						el = this;

						if ( el === self.el ) {
							continue; // not a child of self.el
						}

						while ( !match && el !== self.el ) {
							if ( matches( el, listener.childSelector ) ) {
								match = el;
							}

							el = el.parentNode;
						}

						if ( match ) {
							listener.handler.apply( match, arguments );
						}

					} else {
						listener.handler.apply( self.el, arguments );
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
	var definition = function ( el, elSensor, fire ) {
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

