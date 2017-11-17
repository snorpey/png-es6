png-es6
===

[![Greenkeeper badge](https://badges.greenkeeper.io/snorpey/png-es6.svg)](https://greenkeeper.io/)

installation
---

* [png.min.js](https://raw.githubusercontent.com/snorpey/png-es6/master/dist/png.min.js) 15kb, (6kb gzipped)
* [png-with-worker.min.js](https://raw.githubusercontent.com/snorpey/png-es6/master/dist/png-with-worker.min.js) 20kb, (7kb gzipped)
* [png.es6.min.js](https://raw.githubusercontent.com/snorpey/png-es6/master/dist/png.es6.min.js) 15kb, (5kb gzipped)
* [png-es6-master.zip](https://github.com/snorpey/png-es6/archive/master.zip)

`npm install png-es6`

see the [dist](dist) folder for more versions.

what is it?
---

a png decoder in javascript for use in the browser and in web workers.

the main focus for this module are a small file size and web worker support.

for node, you can use [png-js](https://www.npmjs.com/package/png-js) instead. there exist [plenty](https://www.npmjs.com/search?q=png+decode) of other, more feature rich png decoders.

examples
---
you can find more examples for using this library in the browser as well as in web workers in the [examples](examples) folder of this repository.

how to use it
---

this library can be used in web browsers directly as well as in web workers (with limited functionality).

it supports loading as an AMD module, as a CommonJS module or a global variable.

a simple example

```javascript
<script src="png-browser-with.js"></script>
<script>
var canvas = document.getElementsByTagName('canvas')[0];
	
png.fromURL( 'images/djay.png' )
	.then( pngData => {
		png.renderToCanvas( pngData, canvas, true );
	} );
```

as you can see, there are __two__ calls happening:

1. first, an image is loaded and parsed
2. the the image is rendered to the canvas element

for an explanation of all available methods and parameters, check out the [reference](#reference) section below.

all input methods are asynchronous and are using promises for flow control.

promises are not yet supported by all browsers. however, this library does __not__ include a polyfill for promises or web workers, so you may have to include them separately.

reference
===

pngData
---

the parser returns the data in the following format:

```javascript
{
	animation: { // for non-animated pngs, this is null
		currentFrameIndex: 17,
		currentPlayCount: 2,
		frames: [
			{
				blendOp: 0,
				data: Array [120, 156, 237, 189, …],
				decoded: Uint8Array [0, 0, 0, …],
				delay: 40,
				disposeOp: 1,
				height: 120,
				image: HTMLImageElement
				width: 166,
				xOffset: 0
				yOffset: 0
			}
		],
		numFrames: 21,
		numPlays: Infinity,
	},
	bits: 8,
	colorSpace: "DeviceRGB",
	colorType: 6,
	colors: 3,
	compressionMethod: 0,
	data: Uint8Array [137, 80, 78, …],
	decodedPalette: Uint8Array [ ],
	filterMethod: 0,
	hasAlphaChannel: true,
	height: 120,
	imgData: Uint8Array [ ],
	interlaceMethod: 0,
	palette: Array [ ],
	pixelBitlength: 32,
	pixels: Uint8Array [ ],
	pos: 288309,
	text: {
		Software: "Adobe ImageReady"
	},
	transparency: { },
	width: 166
}
```

fromURL
---

``fromURL `` can take the URL of a PNG image as parameter. it returns a promise that resolves a `pngData` object

example:

```javascript
import { fromURL } from 'png-es6';

fromURL( 'my-png.png' )
	.then( pngData => {
		console.log( 'PNG loaded and parsed', pngData );
	} );

```

fromData
---

``fromData `` can take an Uint8Array

example:

```javascript
import { fromData } from 'png-es6';

// load a png and convert it into an ArrayBuffer
fetch( 'my-png.png' )
	.then( res => res.arrayBuffer() )
	.then( arrayBuffer => new Uint8Array( arrayBuffer ) )
	.then( data => fromData )
	.then( pngData => {
		console.log( 'PNG parsed', pngData );
	} );
```

toImageData
---

`toImageData` takes a `pngData` object and converts it into an `ImageData` object.

`ImageData` is not available in web workers, so in web workers the method returns an object instead: `{ width: 100, height: 100, data: UInt8Array [ ] }`

example:

renderToCanvas
---

`renderToCanvas` takes `pngData` object and a canvas element and draws the png data on the canvas.

optional arguments:

* `resizeCanvas` _boolean_: resize canvas to fit pngData (default: _false_)
* `preventAnimation` _boolean_: prevent animation on canvas for APNGs (default: _false_)

by default, if the image is an animated png, it starts playing the animation.

example:

```javascript
var canvas = document.getElementsByTagName('canvas')[0];
	
png.fromURL( 'images/djay.png' )
	.then( pngData => {
		png.renderToCanvas( pngData, canvas, true );
	} );
```

this method is not available in web workers.


renderToContext
---

`renderToContext ` takes a `pngData` object and a CanvasContext2D Object and draws the image on the context.

example:

```javascript
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext( '2d' );
	
png.fromURL( 'images/djay.png' )
	.then( pngData => {
		png.renderToContext( pngData, ctx, true );
	} );
```

this method is not available in web workers.

animateOnContext
---

`animateOnContext ` takes a CanvasContext2D Object and a `pngData` object and draws the image on the context.

if the image is an animated png, it plays the animation by default.

example:

```javascript
var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext( '2d' );
	
png.fromURL( 'images/djay.png' )
	.then( pngData => {
		png.renderToContext( pngData, ctx, true );
	} );
```

this method is not available in web workers.

missing something?
---

found a bug? missing a feature? are you using this library in an interesting project? take a look at the [issues](../../issues), open a pull request and let me know.

most importantly
---
thank you for taking a look at this repo. have a great day :)