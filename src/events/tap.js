// tap event

(function ( sensor ) {

	'use strict';

	var sWindow = sensor( window );

	sensor.define( 'tap', function ( el, elSensor, fire ) {
		var threshold, interval, mouseListener, touchListener;

		threshold = 5; // px
		interval = 200; // ms

		mouseListener = elSensor.on( 'mousedown', function ( downEvent ) {
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

		touchListener = elSensor.on( 'touchstart', function ( event ) {
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

