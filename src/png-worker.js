import PNG from './png.js';
import { loadPNG } from './util.js';

self.addEventListener( 'message', event => {
	let data = event.data;

	const id = data.id;

	if ( data.type === 'fromURL' && data.message ) {
		fromURL( data.message )
			.then( png => {
				png.pixels = png.decodePixels();
				png.decodedPalette = png.decodePalette();
				
				if ( png.animation ) {
					png.decodeFrames().forEach( ( decodedFrame, index ) => {
						png.animation.frames[index].decoded = decodedFrame;
					} );
				}

				sendMessage( 'fromUrl', png, id );
			}, err => {
				sendMessage( 'error', err.message || err, id );
			} );
	}

	if ( data.type === 'fromImageData' && data.message ) {
		fromImageData( data.message )
			.then( png => {
				sendMessage( 'fromImageData', png, id );
			}, err => {
				sendMessage( 'error', err.message || err, id );
			} );
	}
} );

function sendMessage ( type, message, id ) {
	const msg = { type, message, id, time: Date.now() };
	self.postMessage( msg );
}

function fromURL ( url ) {
	return loadPNG( url );
}

function fromImageData ( imageData ) {
	return new Promise ( ( resolve, reject ) => {
		try {
			resolve( new PNG( imageData.data || imageData ) );
		} catch ( err ) {
			reject( err );
		}
	} );
}
