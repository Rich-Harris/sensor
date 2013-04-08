(function ( s ) {

	'use strict';

	s.define( 'tap', function ( el, sensor, fire ) {
		var threshold, interval;

		threshold = 5; // px
		interval = 200; // ms

		el.addEventListener( 'mousedown', function ( event ) {
			var startX, startY, mouseup, mousemove, teardown;

			startX = event.offsetX;
			startY = event.offsetY;

			mouseup = function ( event ) {
				fire( event.offsetX, event.offsetY, event );
				teardown();
			};

			mousemove = function ( event ) {
				if ( Math.abs( event.offsetX - startX ) > threshold || Math.abs( event.offsetY - startY ) > threshold ) {
					teardown();
				}
			};

			teardown = function () {
				el.removeEventListener( 'mouseup', mouseup );
				el.removeEventListener( 'mousemove', mousemove );
			};

			el.addEventListener( 'mouseup', mouseup );
			el.addEventListener( 'mousemove', mousemove );

			setTimeout( teardown, interval );
		});

		el.addEventListener( 'touchstart', function ( event ) {
			var startX, startY, mouseup, mousemove, teardown, touch, finger;

			touch = event.changedTouches[0];
			finger = touch.identifier;

			startX = touch.offsetX;
			startY = touch.offsetY;

			touchend = function ( event ) {
				var touch;

				touch = event.changedTouches[0];
				if ( touch.identifier !== finger ) {
					return;
				}

				fire( touch.offsetX, touch.offsetY, event );
				teardown();
			};

			touchmove = function ( event ) {
				var touch;

				touch = event.changedTouches[0];
				if ( touch.identifier !== finger ) {
					return;
				}

				if ( Math.abs( touch.offsetX - startX ) > threshold || Math.abs( touch.offsetY - startY ) > threshold ) {
					teardown();
				}
			};

			teardown = function () {
				el.removeEventListener( 'touchend', touchend );
				el.removeEventListener( 'touchcancel', teardown );
				el.removeEventListener( 'touchmove', touchmove );
			};

			el.addEventListener( 'touchend', touchend );
			el.addEventListener( 'touchcancel', teardown );
			el.addEventListener( 'touchmove', touchmove );

			setTimeout( teardown, interval );
		});
	});

}( sensor ));