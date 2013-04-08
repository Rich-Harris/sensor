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