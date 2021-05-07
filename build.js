var { readFile, writeFile } = require( 'fs' );
var { rollup } = require( 'rollup' );
var buble = require( '@rollup/plugin-buble' );
var UglifyJS = require( 'uglify-js' );
var UglifyES = require( 'uglify-es' );
var cleanup = require( 'rollup-plugin-cleanup' );
var extract = require( 'extract-comments' );

var program = require( 'commander' );
var version = require('./package.json').version;

program
	.version( version )
	.option('-b, --browser', 'generate browser version (node is default)' )
	.option('-e, --es6', 'export es6 code' )
	.option('-m, --minify', 'minify output' )
	.option('-u, --umd', 'export UMD Bundle (optional for es6 builds)' )
	.parse( process.argv );

var env = program.browser ? 'worker' : 'vanilla';
var useWorker = env === 'worker';

var es5Build = ! program.es6;
var minifyBuild = !! program.minify;
var bundleUMD = !! program.umd;

var globalPath = 'src/';
var buildPath = 'dist/';
var minifyExtension = 'min';
var es6Extension = 'es6';
var umdExtension = 'umd';

var moduleName = 'png';
var fileName = 'png';
var mainFilePath = useWorker ? 'browser.js' : 'index.js';

const licenseComments = [ ];

console.log( 'building with options: env:', env, 'es6:', ! es5Build, 'minify:', minifyBuild, 'umd', bundleUMD );

createES6Bundle( globalPath + mainFilePath )
	.then( fileContent => {
		console.log( 'build complete. file saved to ' + buildPath + getOutputFileName( mainFilePath ) );
	} );

function createES6Bundle ( filePath ) {
	const format = ( es5Build || bundleUMD ) ? 'umd' : 'es';

	return processES6File( filePath, format, moduleName )
		.then( fileContent => {
			return processFileContent( fileContent );
		} )
		.then( fileContent => {
			if ( licenseComments.length ) {
				fileContent = licenseComments
					.map( comment => '/* ' + comment.value + ' */' )
					.join( '\n\n' ) + '\n\n' + fileContent;
			}

			return saveFile( buildPath + getOutputFileName( mainFilePath ), fileContent );
		} );
}

function processES6File ( filePath, format = 'es', moduleName ) {
	const rollupPlugins = [ ];
	
	// es5 output
	if ( es5Build ) { rollupPlugins.push( buble() ); }

	// remove comments
	rollupPlugins.push( cleanup() );
	
	const rollupOptions = {
		input: filePath,
		plugins: rollupPlugins
	};

	return rollup( rollupOptions )
		.then( bundle => {
			const bundleOpts = { format };

			if ( moduleName ) {
				bundleOpts.name = moduleName;
			}

			return bundle
				.generate( bundleOpts )
				.then( bundleData => {
					return bundleData.output[0].code;
				} );
		}, err => {
			console.log( err );
		} );
}

function processFileContent ( fileContent ) {
	return replaceImportedScripts ( fileContent )
		.then( extractLicenseComments )
		.then( fileContent => {
			return useWorker ? workersToBlobURL( fileContent ) : workersToWorkerFunction( fileContent );
		} )
		.then( fileContent => {
			if ( minifyBuild ) {
				return compressFileContent( fileContent );
			} else {
				return fileContent;
			}
		} );
}

function loadFile ( filePath ) {
	return new Promise( function ( resolve, reject ) {
		readFile( filePath, 'utf8', ( err, data ) => {
			if ( err ) {
				reject( err );
			} else {
				resolve( data );
			}
		} );
	} );
}

function saveFile ( filePath, fileContent ) {
	return new Promise( function ( resolve, reject ) {
		writeFile( filePath, fileContent, 'utf8', ( err, res ) => {
			if ( err ) {
				reject( err );
			} else {
				resolve( fileContent );
			}
		} );
	} );
}

function compressFileContent ( fileContent ) {
	let res;

	if ( es5Build ) {
		res = UglifyJS.minify( fileContent );
	} else {
		res = UglifyES.minify( fileContent );
	}

	if ( res.error ) {
		console.log( res.error );
	}
	
	return res.code;
}

function replaceImportedScripts ( fileContent ) {
	let scriptPaths = getImportedScriptPaths( fileContent );

	let loadScripts = scriptPaths.map( ( scriptPath ) => {
		return loadFile( globalPath + scriptPath );
	} );

	return Promise.all( loadScripts )
		.then( ( scriptContents, scriptIndex ) => {
			return scriptContents.reduce( ( fileContent, scriptContent, scriptContentIndex ) => {
				return replaceImportedScript ( fileContent, scriptPaths[scriptContentIndex], scriptContent );
			}, fileContent );
	} );
}

function workersToBlobURL ( fileContent ) {
	const workerPaths = getWorkerPaths( fileContent );

	return Promise.all( workerPaths.map( workerPath => {
		const adjustedWorkerPath = workerPath.indexOf( globalPath ) === 0 ? workerPath : globalPath + workerPath;
		
		return processES6File( adjustedWorkerPath );
	} ) )
	.then( workerContents => {

		return workerContents
			.map( extractLicenseComments )
			.map( fileToBlobURL );
	} )
	.then( blobURLs => {
		return blobURLs.reduce( ( fileContent, blobUrl, workerIndex ) => {
			const sanitizedScriptPath = sanitizePathForRegEx( workerPaths[workerIndex] );
			const pattern = "[\'\"]" + sanitizedScriptPath + '[\'\"]';
			const regex = new RegExp( pattern, 'mig' );

			return fileContent.replace( regex, blobUrl );
		}, fileContent );
	} );
}

function workersToWorkerFunction ( fileContent ) {
	const workerPaths = getWorkerPaths( fileContent );

	return Promise.all( workerPaths.map( ( workerPath ) => {
		const adjustedWorkerPath = workerPath.indexOf( globalPath ) === 0 ? workerPath : globalPath + workerPath;
		
		return processES6File( adjustedWorkerPath );
	} ) )
	.then( ( workerContents ) => {
		return workerContents.map( fileToWorkerFunction );
	} )
	.then( ( workerFunctionStrings ) => {
		return workerFunctionStrings.reduce( ( fileContent, workerFunctionString, workerIndex ) => {
			const sanitizedScriptPath = sanitizePathForRegEx( workerPaths[workerIndex] );
			const pattern = "[\'\"]" + sanitizedScriptPath + '[\'\"]';
			const regex = new RegExp( pattern, 'mig' );

			return fileContent.replace( regex, workerFunctionString );
		}, fileContent );
	} );
}

function fileToBlobURL ( fileContent, type = 'text/javascript' ) {
	if ( minifyBuild ) {
		fileContent = compressFileContent( fileContent );
	}
	
	const fileContentStr = JSON.stringify( fileContent );

	return "URL.createObjectURL(new Blob([" + fileContentStr + "],{type:'" + type + "'}))";
}

function extractLicenseComments ( fileContent ) {
	// https://github.com/aMarCruz/rollup-plugin-cleanup/blob/master/src/parse-options.js
	const licenseRegex = /(?:@license|@preserve|@cc_on)\b/;

	// extract file contents out of worker code and move them to beginning of file
	const comments = extract( fileContent )
		.filter( comment => licenseRegex.test( comment.value ) );

	comments.forEach( comment => {
		fileContent = fileContent.replace( comment.raw, '' );

		licenseComments.push( comment );
	} );

	return fileContent;
}

function fileToWorkerFunction ( fileContent ) {
	if ( minifyBuild ) {
		fileContent = compressFileContent( fileContent );
	}

	return "function(){\n" + fileContent + "\n}";
}

function getWorkerPaths ( fileContent ) {
	const result = [ ];
	const regex = /new Worker\s?\(\s?([\"\'][a-zA-Z0-9\/.+=-]+)[\"\']\s?\)/g;

	let matches;

	// generated by http://regex101.com/
	while  ( ( matches = regex.exec( fileContent ) ) !== null ) {
		if ( matches.index === regex.lastIndex ) { regex.lastIndex++; }
		
		// The result can be accessed through the `m`-variable.
		matches.forEach( ( match, groupIndex ) => {
			if ( groupIndex === 1 ) { result.push( match ); }
		} );
	}

	return result.map( path => {
		return path.replace( /[\'\"]/g, '' );
	});
}

function getImportedScriptPaths ( fileContent ) {
	const result = [ ];
	const regex = /importScripts\([\"\'\s]+([a-zA-Z0-9\/\_\-]*\.js)[\"\'\s]+\)/mig;
	
	let matches;

	while  ( ( matches = regex.exec( fileContent ) ) !== null ) {
		if ( matches.index === regex.lastIndex ) { regex.lastIndex++; }
		
		matches.forEach( ( match, groupIndex ) => { 
			if ( groupIndex === 1 ) { result.push( match ); }
		} );
	}

	return result;
}

function replaceImportedScript ( fileContent, scriptPath, scriptContent ) {
	const sanitizedScriptPath = sanitizePathForRegEx( scriptPath );
	const pattern = 'importScripts.*' + sanitizedScriptPath +  '*.*\;';
	const regex = new RegExp( pattern, 'mig' );

	return fileContent.replace( regex, scriptContent );
}

function sanitizePathForRegEx ( path ) {
	return path
		.replace( /\//g, '\\/' )
		.replace( /\-/g, '\\-' )
		.replace( /\(/g, '\\(' )
		.replace( /\"/g, '\\"' )
		.replace( /\./g, '\\.' );
}

function getOutputFileName ( filePath ) {
	let fileNameParts = [ fileName ];
	let fileExtension = [ 'js' ];

	if ( useWorker ) {
		fileNameParts.push( 'with-worker' );
	}

	if ( minifyBuild && minifyExtension && minifyExtension.length ) {
		fileExtension.unshift( minifyExtension );
	}

	if ( ! es5Build && es6Extension && es6Extension.length ) {
		fileExtension.unshift( es6Extension );
	}

	if ( bundleUMD && ! es5Build && umdExtension && umdExtension.length ) {
		fileExtension.unshift( umdExtension );
	}

	return fileNameParts.join( '-' ) + '.' + fileExtension.join( '.' );
}