importScripts( '../dist/png.js' );

self.addEventListener( 'message', function ( event ) {
	if ( event.data ) {
		png.fromURL( event.data )
			.then( function ( pngData ) {
				console.log( 'Fetched and parsed PNG data in worker:', pngData );
				self.postMessage( {
					width: pngData.width,
					height: pngData.height,
					data: pngData.decodePixels(),
					colors: pngData.colors
				} );
			} );
	}
} );