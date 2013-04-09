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