import { copyPNGToImageData, resolveUrl } from './browser-util.js';

const pngWorker = new Worker( './png-worker.js' );

export function fromURL ( url ) {
	return sendMessage( 'fromURL', resolveUrl( url ) );
}

export function fromImageData ( imageData ) {
	return sendMessage( 'fromImageData', imageData );
}

function sendMessage ( type, message ) {
	const workerStartDate = Date.now();

	return new Promise ( ( resolve, reject ) => {
		// UNIQUE JOB ID
		const id = ~~( Date.now() * Math.random() * 10000 );

		function handleResponse ( event ) {
			const data = event.data;

			if ( data && data.id === id ) {
				pngWorker.removeEventListener( 'message', handleResponse );

				if ( data.type === 'error' ) {
					reject( data.message );
				} else {
					resolve( data.message );
				}
			}
		}

		pngWorker.addEventListener( 'message', handleResponse );
		pngWorker.postMessage( { type, message, id, time: Date.now() } );
	} );
}

export function toImageData ( pngData, ctx = null ) {
	if ( ! ctx ) {
		const canvas = document.createElement( 'canvas' );
		canvas.width = pngData.width;
		canvas.height = pngData.height;
		
		ctx = canvas.getContext( '2d' );
	}

	const emptyImageData = ctx.createImageData( pngData.width, pngData.height );
	const imageData = copyPNGToImageData( pngData, emptyImageData );
	
	return imageData;
}

export function renderToCanvas ( pngData, canvas, resizeCanvas = false, preventAnimation = false ) {
	const ctx = canvas.getContext( '2d' );

	stopAnimation( canvas );

	if ( resizeCanvas ) {
		canvas.width = pngData.width;
		canvas.height = pngData.height;
	}

	if ( pngData.animation && ! preventAnimation ) {
		animateOnContext( pngData, canvas, ctx );
	} else {
		return renderToContext( pngData, ctx );
	}
}

export function renderToContext ( pngData, ctx, x = 0, y = 0 ) {
	const imageData = toImageData( pngData, ctx );
			
	return ctx.putImageData( imageData, x, y );
}

export function animateOnContext ( pngData, canvas, ctx ) {
	if ( pngData.animation ) {
		pngData.animation.currentFrameIndex = 0;
		pngData.animation.currentPlayCount = 0;

		return loadFrames( pngData )
			.then( () => {
				animateToNextFrame( pngData, canvas, ctx );
			} );
	} else {
		throw new Error( "Cannot animate png: no animation data available" );
	}
}

function animateToNextFrame ( pngData, canvas, ctx ) {
	let canPlay = true;

	if ( pngData.animation.currentFrameIndex < pngData.animation.frames.length - 1 ) {
		pngData.animation.currentFrameIndex++;
	} else {
		pngData.animation.currentPlayCount++;

		if ( pngData.animation.currentPlayCount >= pngData.animation.numPlays ) {
			canPlay = false;
		} else {
			pngData.animation.currentFrameIndex = 0;
		}
	}

	if ( canPlay ) {
		const delay = pngData.animation.frames[pngData.animation.currentFrameIndex].delay || 1000 / 60;
		renderAnimationFrame( pngData, ctx, pngData.animation.currentFrameIndex );

		canvas.timeoutId = setTimeout( function () {
			animateToNextFrame( pngData, canvas, ctx );
		}, delay );
	} else {
		stopAnimation( canvas );
	}
}

function stopAnimation ( canvas ) {
	clearTimeout( canvas.timeoutId );
}

function loadFrames ( pngData ) {
	const tmpCanvas = document.createElement( 'canvas' );
	const tmpCtx = tmpCanvas.getContext( '2d' );

	const loading = [ ];

	for ( let i = 0; i < pngData.animation.frames.length; ++i ) {
		loading[i] = loadFrame( pngData, i, tmpCanvas, tmpCtx );
	}

	return Promise.all( loading )
		.then( loadedImages => {
			loadedImages.forEach( ( image, frameIndex ) => {
				pngData.animation.frames[frameIndex].image = image;
			} );

			return pngData;
		} );
}

function loadFrame ( pngData, frameIndex, tmpCanvas, tmpCtx ) {
	return new Promise( ( resolve, reject ) => {
		const image = new Image();
		image.addEventListener( 'load', () => {
			resolve( image );
		} );

		image.addEventListener( 'error', reject );

		const frameData = pngData.animation.frames[frameIndex].decoded;
		const emptyImageData = tmpCtx.createImageData( pngData.width, pngData.height );
		const imageData = copyPNGToImageData( pngData, emptyImageData, frameData );

		tmpCtx.width = pngData.width;
		tmpCtx.height = pngData.height;

		tmpCtx.clearRect( 0, 0, pngData.width, pngData.height );
		tmpCtx.putImageData( imageData, 0, 0 );
		
		image.src = tmpCanvas.toDataURL();
	} );
}

const APNG_DISPOSE_OP_NONE = 0;
const APNG_DISPOSE_OP_BACKGROUND = 1;
const APNG_DISPOSE_OP_PREVIOUS = 2;
const APNG_BLEND_OP_SOURCE = 0;
const APNG_BLEND_OP_OVER = 1;

export function renderAnimationFrame ( pngData, ctx, frameIndex ) {
	const frames = pngData.animation.frames;
	const frame = frames[frameIndex];
	const prevFrameIndex = frameIndex === 0 ? frames.length - 1 : frameIndex - 1;
	const prev = frames[prevFrameIndex];

	if ( frameIndex === 0 ) {
		ctx.clearRect( 0, 0, pngData.width, pngData.height );
	}

	if ( prev.disposeOp != null && prev.disposeOp === APNG_DISPOSE_OP_BACKGROUND ) {
		ctx.clearRect( prev.xOffset, prev.yOffset, prev.width, prev.height );
	} else if ( prev.disposeOp != null && prev.disposeOp === APNG_DISPOSE_OP_PREVIOUS ) {
		ctx.putImageData( prev.imageData, prev.xOffset, prev.yOffset );
	}

	if ( ( prev != null ? prev.disposeOp : void 0 ) === APNG_DISPOSE_OP_BACKGROUND ) {
		ctx.clearRect( prev.xOffset, prev.yOffset, prev.width, prev.height );
	} else if ( ( prev != null ? prev.disposeOp : void 0 ) === APNG_DISPOSE_OP_PREVIOUS ) {
		ctx.putImageData( prev.imageData, prev.xOffset, prev.yOffset );
	}

	if ( frame.blendOp === APNG_BLEND_OP_SOURCE ) {
		ctx.clearRect( frame.xOffset, frame.yOffset, frame.width, frame.height );
	}

	return ctx.drawImage( frame.image, frame.xOffset, frame.yOffset );
}

