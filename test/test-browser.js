

describe( 'png', () => {
	it( 'should be an object', () => {
		expect( png ).to.be.an( 'object' );
		expect( png.fromImageData ).to.be.a( 'function' );
		expect( png.fromURL ).to.be.a( 'function' );
		expect( png.renderToCanvas ).to.be.a( 'function' );
		expect( png.renderToContext ).to.be.a( 'function' );
		expect( png.toImageData ).to.be.a( 'function' );
	} );

	it( 'should be able to fetch and parse an RGB PNG', done => {		
		let failed = false;

		png.fromURL( 'http://localhost:9876/base/images/djay.png' )
			.then( pngData => {
				expect( pngData ).to.be.an( 'object' );
				expect( pngData.width ).to.be.a( 'number' );
				expect( pngData.height ).to.be.a( 'number' );
				expect( pngData.width ).to.equal( 512 );
				expect( pngData.height ).to.equal( 512 );
				expect( pngData.colors ).to.equal( 3 );
				expect( pngData.hasAlphaChannel ).to.be.true;
				expect( pngData.colorSpace ).to.equal( 'DeviceRGB' );
				expect( pngData.bits ).to.equal( 8 );
				done();
			}, err => {
				expect( err ).to.not.be.an( 'error' );
				done( err );
			} );
	} );

	it( 'should be able to fetch and parse an indexed PNG', done => {
		let failed = false;

		png.fromURL( 'http://localhost:9876/base/images/djay-indexed.png' )
			.then( pngData => {
				expect( pngData ).to.be.an( 'object' );
				expect( pngData.width ).to.be.a( 'number' );
				expect( pngData.height ).to.be.a( 'number' );
				expect( pngData.width ).to.equal( 512 );
				expect( pngData.height ).to.equal( 512 );
				expect( pngData.colors ).to.equal( 1 );
				expect( pngData.colorType ).to.equal( 3 );
				expect( pngData.hasAlphaChannel ).to.be.false;
				expect( pngData.bits ).to.equal( 8 );
				expect( pngData.palette ).to.be.an.instanceof( Array );
				expect( pngData.palette ).to.have.lengthOf( 768 );
				done();
			}, err => {
				expect( err ).to.not.be.an( 'error' );
				done( err );
			} );
	} );

	it( 'should be able to fetch and parse an indexed PNG', done => {
		let failed = false;

		png.fromURL( 'http://localhost:9876/base/images/chompy.png' )
			.then( pngData => {
				expect( pngData ).to.be.an( 'object' );
				expect( pngData.width ).to.be.a( 'number' );
				expect( pngData.height ).to.be.a( 'number' );
				expect( pngData.width ).to.equal( 166 );
				expect( pngData.height ).to.equal( 120 );
				expect( pngData.colors ).to.equal( 3 );
				expect( pngData.colorType ).to.equal( 6 );
				expect( pngData.hasAlphaChannel ).to.be.true;
				expect( pngData.bits ).to.equal( 8 );
				expect( pngData.palette ).to.be.an.instanceof( Array );
				expect( pngData.palette ).to.have.lengthOf( 0 );
				expect( pngData.pixelBitlength ).to.equal( 32 );
				expect( pngData.animation ).to.be.an( 'object' );
				expect( pngData.animation.frames ).to.be.an.instanceof( Array );
				expect( pngData.animation.frames ).to.have.lengthOf( 21 );
				done();
			}, err => {
				expect( err ).to.not.be.an( 'error' );
				done( err );
			} );
	} );
} );
