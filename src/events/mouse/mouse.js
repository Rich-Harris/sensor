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