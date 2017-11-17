import PNG from './png.js';

export function loadPNG ( url ) {
	return fetchData ( url )
		.then( data => {
			return new PNG( data );
		} );
}

export function fetchData ( url ) {
	return fetch( url )
		.then( res => res.arrayBuffer() )
		.then( arrayBuffer => new Uint8Array( arrayBuffer ) );
}

export function toImageData ( png ) {
	return {
		width: png.width,
		height: png.height,
		data: png.decodePixels()
	};
}

export function error ( e ) {
	throw new Error( e );
}