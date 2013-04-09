// pull events

(function ( sensor ) {

	'use strict';

	// TODO touch equivalents

	sensor.define( 'pullstart', function ( el, elSensor, fire ) {
		var listener = elSensor.on( 'mousedown', function ( event ) {
			var x, y;

			x = event.offsetX;
			y = event.offsetY;

			elSensor.pull = {
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


	sensor.define( 'pull', function ( el, elSensor, fire ) {
		var listener = elSensor.on( 'pullstart', function () {
			var moveListener;

			moveListener = elSensor.on( 'mousemove', function ( event ) {
				var x, y;

				x = event.offsetX;
				y = event.offsetY;

				fire.call( el, x - elSensor.pull.last.x, y - elSensor.pull.last.y );
				elSensor.pull.last.x = x;
				elSensor.pull.last.y = y;
			});

			elSensor.once( 'mouseup', moveListener.cancel );
		});

		return {
			teardown: listener.cancel
		};
	});



	sensor.define( 'pullend', function ( el, elSensor, fire ) {
		var listener = elSensor.on( 'pullstart', function () {
			elSensor.once( 'mouseup', function ( x, y, event ) {
				fire.call( el, x, y, event );
			});
		});

		return {
			teardown: listener.cancel
		};
	});

}( sensor ));