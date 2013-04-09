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