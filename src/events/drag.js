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