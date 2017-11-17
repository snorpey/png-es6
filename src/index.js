import PNG from './png.js';
import { loadPNG, toImageData } from './util.js';

export function fromURL ( url ) {
	return loadPNG( url );
}

export function fromImageData ( imageData ) {
	return new Promise ( ( resolve, reject ) => {
		try {
			resolve( new PNG( imageData.data || imageData ) );
		} catch ( err ) {
			reject( err );
		}
	} );
}

export { toImageData };