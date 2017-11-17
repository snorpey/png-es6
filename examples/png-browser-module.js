import { fromURL, renderToCanvas } from '../dist/png-with-worker.es6.js';
const canvas = document.getElementsByTagName('canvas')[0];
const select = document.getElementsByTagName('select')[0];

fromURL( 'images/djay.png' )
	.then( pngData => {
		console.log( 'pngData:', pngData );
		renderToCanvas( pngData, canvas, true );
	} );
	
	
select.onchange = function () {
	canvas.width = canvas.height = 0;
	
	fromURL('images/' + select.options[select.selectedIndex].value)
		.then( pngData => {
			console.log( 'pngData:', pngData );
			renderToCanvas( pngData, canvas, true );
		} );
};