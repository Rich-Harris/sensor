// doubletap event

(function ( sensor ) {

	'use strict';

	sensor.define( 'doubletap', function ( el, elSensor, fire ) {

		var threshold, interval, listener;

		threshold = 5; // px
		interval = 500; // ms

		listener = elSensor.on( 'tap', function ( x1, y1 ) {
			var secondTapListener = elSensor.on( 'tap', function ( x2, y2, event ) {
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

