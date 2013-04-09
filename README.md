sensor.js - DOM events that don't suck
======================================

tl:dr;
------

* cleaner, more efficient API for event binding
* use as `sensor(element).on('click', handler)`, or use `sensor.patch()` so you can do `element.on('click', handler)`
* first-class custom events - ever wanted `element.on( 'swipeleft', nextSlide );`? Extensible so you can redefine events so they behave the way your app needs
* cross-browser, cross-paradigm (mouse, touch, pointer)


The problem
-----------

The DOM has been described as the API that only a mother could love. Consider the humble click event:

```js
el = document.getElementById( 'myButton' );
el.addEventListener( 'click', handler = function () {
  alert( 'button clicked!' );
});

// later...
el.removeEventListener( 'click', handler );
```

Yack. So much code for such a simple task! And if you want to implement [event delegation](http://davidwalsh.name/event-delegate), you're looking at a whole lot more. At this point you're probably thinking '[just use jQuery!](http://justusejquery.com/)'. Fine, except:

* Not everyone wants to use a library that's 90kb minified just to gloss over the DOM's ugliness
* The `click` event is broken anyway!


What do you mean, 'the click event is broken'?
----------------------------------------------

Try this - open a new tab, go to `about:blank`, open the console, paste in `window.addEventListener('click', function(){alert('clicked')});`.

Then click. Hopefully the alert box popped up. Fine. Now try this - hold the mouse button down for a few seconds, and release it. Or this - hold the mouse down, waggle it about, move it from one side of the window to the other (in Firefox you can even leave the window) and back again, then release.

Did the alert box show?

In all probability, yes, it did. Now I don't know about you, but my interpretation of the word 'click' clearly differs from the [W3C's](http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-MouseEvent) (actually, they define it as 'a mousedown and mouseup over the same screen location', which merely begs the question of what qualifies as a 'screen location' - the whole thing?).

It gets worse - if your site is viewed on a touch screen, your click handlers will fire 300 milliseconds after the `touchstart`, `touchend` sequence has finished. That's lousy UX.

And it's not just `click`. The events the DOM gives us are indispensable, but too crude for the needs of many modern webapps.


The solution
------------

**sensor.js** eases the pain in four ways. **Firstly**, it provides a nice API, which will look familiar to jQuery users:

```js
// simple example
button = sensor( 'myButton' ); // or you could pass in an element, or a CSS selector
button.on( 'tap', handler = function () {
  alert( 'button tapped!' );
});

button.once( 'mouseover', function () {
  alert( 'moused over! you won\'t see me again, because we used button.once()' );
});

// later...
button.off( 'tap', handler );


// or, you could do this instead - store a reference to the listener...
listener = sensor( 'myButton' ).on( 'tap', handler );

// ...then cancel it later when you need to
listener.cancel();
```

**Secondly**, it can patch `Node.prototype` and `Window.prototype` so that you don't need to call `sensor( element )`:

```js
sensor.patch();

window.on( 'resize', resizeHandler );
document.getElementById( 'myButton' ).on( 'tap', handler );
```

(This kind of 'monkey patching' is controversial, obviously - use it at your own discretion! But let me tell you - it's goddamn *liberating*.)

**Thirdly**, it allows simple *event delegation*, allowing you to efficiently target multiple elements (including ones that don't yet exist):

```html
<ul id='people'>
  <li>Alice</li>
  <li>Bob</li>
  <li>Charles</li>
</ul>
```

```js
people = document.getElementById( 'people' );
handler = function () {
  var person = this.innerText; // `this` is the child element that matches the child selector
  alert( 'selected ' + person );
};

// traditional event delegation - use a CSS selector
people.on( 'tap', 'li', handler );

// alternative - use an array or array-like object (such as a NodeList)
listItems = people.querySelectorAll( 'li' ); // or people.getElementsByTagName( 'li' )

people.on( 'tap', listItems, handler )

// second alternative - use a function as the child selector
filter = function ( el ) {
  return el.tagName === 'LI';
};

people.on( 'tap', filter, handler );
```

**Fourthly**, it allows you to define custom events using `sensor.define( eventName, eventDefinition )`. **sensor.js** comes bundled with a number of default custom events, but you can easily add more if your app uses unique gestures, for example. (At some point I'll document how... for the time being you'll have to make do with the notes in the API section below or reverse engineer the existing examples!)


API
---

###sensor()
Equivalent to `sensor( window )`.

###sensor( window )
Returns a new sensor instance on `window`, or returns the existing one.

###sensor( *element* )
Returns a new sensor instance on *element*, or returns the existing one.

###sensor( *selector* )
Returns a new sensor instance, or returns the existing one. *selector* is a CSS selector or an ID (CSS selectors, other than ID selectors such as `#myButton`, require `document.querySelector`. If you're targeting IE8 and below, bring your own polyfill).

###sensor.patch()
Patches `Node.prototype` and `Window.prototype` so you can treat `window` and any DOM elements as though they were sensor instances

###sensor.define( *eventName*, *eventDefinition* )
Defines a custom event. Thereafter, you can do e.g. `listener = element.on( 'myCustomEvent', doSomething )`. Event definitions take three arguments: `el`, `elSensor`, `fire`:

* `el` - the element the event is bound to
* `elSensor` - the element's sensor instance
* `fire` - the function that should be called when the event is to be triggered. It should be called with the original event's target as context (to facilitate event delegation), but can have any signature (though it is wise to pass along any relevant `Event` objects). It must return an object with a `teardown` property, which is used to cancel any listeners (e.g. to underlying `mousedown` or `touchstart` events) it depended on.


Instance methods
----------------

For brevity, the following assumes that `sensor.patch()` has been used. If you're not that way inclined, for *element* read *sensor instance*:


###element.on( *eventName*, *handler* )
Triggers *handler* when *element* is the subject of an *eventName* event. Within *handler*, `this` is *element*, and the arguments are as per the event definition (for standard events such as `mousedown` there is one argument - the original DOM event - in other words, you write your handlers the same way as if you were doing `element.addEventListener( eventName, handler )` or `$( element ).on( eventName, handler )`).

Returns a *listener*, which is an object with a `cancel` method for cancelling the listener.

###element.on( *eventName*, *childSelector*, *handler* )
Triggers *handler* when a descendant of *element* matching *childSelector* is the subject of an *eventName* event. *childSelector* can take one of three forms:

* CSS selector string (tag name selectors, such as `'li'`, and class name selectors, such as `'.item'`, will work everywhere. More complicated selectors depend on the presence of `element.matches( selector )` or a prefixed equivalent - if you're targeting IE8 and below you will need to bring your own polyfill ([here's one you could use](https://github.com/termi/CSS_selector_engine))
* Array or array-like object (such as a NodeList) containing the targeted elements
* Filter function, which receives an element as its sole argument and returns a truthy value if the element is a match, a falsy value otherwise

Returns a *listener*, as above.

###element.on( map )
Binds multiple event handlers. The following syntaxes are all valid:

```js
element.on({
  click: function () {
    alert( 'clicked element' );
  },
  'click .item': function () {
    alert( 'clicked a descendant of element with class "item"' );
  },
  click: {
    childSelector: element.querySelectorAll( '.button' ),
    handler: function () {
      alert( 'clicked a descendant of element with class "button"' );
    }
  }
});
```

Returns a listener as above, with the distinction that it will cancel all event listeners in one go.


###element.off()

Removes all event listeners from *element* (except ones that were added via another means, such as `element.addEventListener( ... )` or `$( element ).on( ... )`).

###element.off( *eventName* )

Removes all event listeners of type *eventName* from *element*

###element.off( *eventName*, *handler* )

Removes all *eventName* listeners from *element* where the handler was *handler*, and there was no child selector.

###element.off( *eventName*, *childSelector*, *handler* )

Removes all *eventName* listeners from *element* that targeted *childSelector* and where the handler was *handler*.


###element.once( *eventName*, *handler* )
Triggers *handler* when *element* is the subject of an *eventName* event, then cancels itself so it will be called once at most. Returns a *listener*.

###element.once( *eventName*, *childSelector*, *handler* )
As above, *mutatis mutandis*.



To-do
-----

Loads of stuff: Tests, complete cross-browser support, more custom events, more inline comments in the code, better documentation, and so on. If you'd like to pitch in please do! Issues and pull requests are very welcome.


Contact
-------

I'm [@rich_harris](http://twitter.com/rich_harris).


License
-------

Copyright 2013 Rich Harris. Released under the MIT License.