/* @license
 * https://github.com/lydell/resolve-url/blob/master/resolve-url.js
 * Copyright 2014 Simon Lydell
 * X11 ("MIT") Licensed. (See LICENSE.)
 */
export function resolveUrl(/* ...urls */) {
	var numUrls = arguments.length;

	if (numUrls === 0) {
		throw new Error( "resolveUrl requires at least one argument; got none." );
	}

	var base = document.createElement( 'base' );
	base.href = arguments[0];

	if ( numUrls === 1 ) {
		return base.href;
	}

	var headEl = document.getElementsByTagName( 'head' )[0];
	headEl.insertBefore( base, headEl.firstChild );

	var aEl = document.createElement( 'a' );
	var resolved;

	for ( var index = 1; index < numUrls; index++ ) {
		aEl.href = arguments[index];
		resolved = aEl.href;
		base.href = resolved;
	}

	headEl.removeChild( base );

	return resolved;
}

export function copyPNGToImageData ( png, imageData, pixels ) {
	pixels = pixels || png.pixels || png.decodePixels();

	let alpha = png.hasAlphaChannel;
	let colors = png.colors;
	let palette = null;

	if ( png.palette.length ) {
		palette = png.decodedPalette || png.decodePalette();
		colors = 4;
		alpha = true;
	}

	const data = imageData.data || imageData;
	const length = data.length;
	const input = palette || pixels;
	
	let i = 0;
	let j = 0;
	let k = 0;
	let v = 0;

	if ( colors === 1 ) {
		while ( i < length ) {
			k = palette ? pixels[i / 4] * 4 : j;
			v = input[k++];
			data[i++] = v;
			data[i++] = v;
			data[i++] = v;
			data[i++] = alpha ? input[k++] : 255;
			j = k;
		}
	} else {
		while ( i < length ) {
			k = palette ? pixels[i / 4] * 4 : j;
			data[i++] = input[k++];
			data[i++] = input[k++];
			data[i++] = input[k++];
			data[i++] = alpha ? input[k++] : 255;
			j = k;
		}
	}

	return imageData;
}
