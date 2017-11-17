import { FlateStream } from './zlib.js';
import { error } from './util.js';

/*
# @license
#
# MIT LICENSE
# Copyright (c) 2011 Devon Govett, 2017 Georg Fischer <hi@snorpey.com>
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of this 
# software and associated documentation files (the "Software"), to deal in the Software 
# without restriction, including without limitation the rights to use, copy, modify, merge, 
# publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
# to whom the Software is furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all copies or 
# substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

export default class PNG {
	constructor ( data ) {
		this.data = data;
		this.pos = 8;
		this.palette = [ ];
		this.imgData = [ ];
		this.transparency = { };
		this.animation = null;
		this.text = { };
		
		let frame = null;

		while ( true ) {
			let chunkSize = this.readUInt32();

			const section = ( ( function () {
				let i, _i;
				const _results = [ ];

				for ( i = _i = 0; _i < 4; i = ++_i ) {
					_results.push( String.fromCharCode( this.data[this.pos++] ) );
				}

				return _results;
			} ).call( this ) ).join( '' );

			switch ( section ) {
				case 'IHDR':
					this.width = this.readUInt32();
					this.height = this.readUInt32();
					this.bits = this.data[this.pos++];
					this.colorType = this.data[this.pos++];
					this.compressionMethod = this.data[this.pos++];
					this.filterMethod = this.data[this.pos++];
					this.interlaceMethod = this.data[this.pos++];
					break;
				
				case 'acTL':
					this.animation = {
						numFrames: this.readUInt32(),
						numPlays: this.readUInt32() || Infinity,
						frames: [ ]
					};
					break;
				
				case 'PLTE':
					this.palette = this.read( chunkSize );
					break;
				
				case 'fcTL':
					if ( frame ) {
						this.animation.frames.push( frame );
					}

					this.pos += 4;
					
					frame = {
						width: this.readUInt32(),
						height: this.readUInt32(),
						xOffset: this.readUInt32(),
						yOffset: this.readUInt32()
					};

					const delayNum = this.readUInt16();
					const delayDen = this.readUInt16() || 100;
					
					frame.delay = 1000 * delayNum / delayDen;
					frame.disposeOp = this.data[this.pos++];
					frame.blendOp = this.data[this.pos++];
					frame.data = [ ];
					break;

				case 'IDAT':
				
				case 'fdAT':
					if ( section === 'fdAT' ) {
						this.pos += 4;
						chunkSize -= 4;
					}

					// const?
					data = ( frame != null ? frame.data : void 0 ) || this.imgData;

					let i, _i;
					
					for ( i = _i = 0; 0 <= chunkSize ? _i < chunkSize : _i > chunkSize; i = 0 <= chunkSize ? ++_i : --_i ) {
						data.push( this.data[this.pos++] );
					}
					
					break;

				case 'tRNS':
					this.transparency = { };

					switch ( this.colorType ) {
						case 3:
							this.transparency.indexed = this.read( chunkSize );
							const short = 255 - this.transparency.indexed.length;
							
							if ( short > 0 ) {
								let i, _j;

								for ( i = _j = 0; 0 <= short ? _j < short : _j > short; i = 0 <= short ? ++_j : --_j ) {
									this.transparency.indexed.push( 255 );
								}
							}
							break;

						case 0:
							this.transparency.grayscale = this.read( chunkSize )[0];
							break;
						
						case 2:
							this.transparency.rgb = this.read( chunkSize );
					}

					break;

				case 'tEXt':
					const text = this.read( chunkSize );
					const index = text.indexOf( 0 );
					const key = String.fromCharCode.apply( String, text.slice( 0, index ) );
					this.text[key] = String.fromCharCode.apply( String, text.slice( index + 1 ) );
					
					break;
				
				case 'IEND':
					if ( frame ) {
						this.animation.frames.push( frame );
					}

					this.colors = ( function() {
						switch ( this.colorType ) {
							case 0:
							case 3:
							case 4:
								return 1;
							case 2:
							case 6:
								return 3;
						}
					} ).call( this );

					this.hasAlphaChannel = this.colorType === 4 || this.colorType === 6;
					
					const colors = this.colors + ( this.hasAlphaChannel ? 1 : 0 );
					
					this.pixelBitlength = this.bits * colors;
					
					this.colorSpace = ( function () {
						switch ( this.colors ) {
							case 1:
								return 'DeviceGray';
							
							case 3:
								return 'DeviceRGB';
						}
					} ).call( this );
					
					this.imgData = new Uint8Array( this.imgData );
					
					return;
				default:
					this.pos += chunkSize;
			}

			this.pos += 4;
			
			if ( this.pos > this.data.length ) {
				error( 'Incomplete or corrupt PNG file' );
			}
		}

		return;
	}

	read ( bytes ) {
		let i, _i;
		const _results = [ ];
		
		for ( i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i ) {
			_results.push( this.data[this.pos++] );
		}

		return _results;
	}

	readUInt32 () {
		const b1 = this.data[this.pos++] << 24;
		const b2 = this.data[this.pos++] << 16;
		const b3 = this.data[this.pos++] << 8;
		const b4 = this.data[this.pos++];
		
		return b1 | b2 | b3 | b4;
	}

	readUInt16 () {
		const b1 = this.data[this.pos++] << 8;
		const b2 = this.data[this.pos++];
		return b1 | b2;
	}

	decodePixels ( data ) {
		if ( data == null ) {
			data = this.imgData;
		}
		
		if ( data.length === 0 ) {
			return new Uint8Array(0);
		}
		
		const stream = new FlateStream( data );
		data = stream.getBytes();
		
		const pixelBytes = this.pixelBitlength / 8;
		const scanlineLength = pixelBytes * this.width;
		const pixels = new Uint8Array( scanlineLength * this.height );
		const length = data.length;
		
		let row = 0;
		let pos = 0;
		let c = 0;
		let i = 0;
		let _i = 0;
		let _j = 0;
		let _k = 0;
		let _l = 0;
		let _m = 0;


		let byte;
		let col;
		let left;
		let paeth;
		let upper;
		let upperLeft;

		while ( pos < length ) {
			switch ( data[pos++] ) {
				case 0:
					for ( i = _i = 0; _i < scanlineLength; i = _i += 1 ) {
						pixels[c++] = data[pos++];
					}

					break;

				case 1:
					for ( i = _j = 0; _j < scanlineLength; i = _j += 1 ) {
						byte = data[pos++];
						left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
						pixels[c++] = ( byte + left ) % 256;
					}

					break;

				case 2:
					for ( i = _k = 0; _k < scanlineLength; i = _k += 1 ) {
						byte = data[pos++];
						col = ( i - ( i % pixelBytes ) ) / pixelBytes;
						upper = row && pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];
						pixels[c++] = ( upper + byte ) % 256;
					}

					break;

				case 3:
					for ( i = _l = 0; _l < scanlineLength; i = _l += 1 ) {
						byte = data[pos++];
						col = ( i - ( i % pixelBytes ) ) / pixelBytes;
						left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
						upper = row && pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];
						pixels[c++] = ( byte + Math.floor( ( left + upper ) / 2 ) ) % 256;
					}
					break;

				case 4:
					for ( i = _m = 0; _m < scanlineLength; i = _m += 1 ) {
						byte = data[pos++];
						col = ( i - ( i % pixelBytes ) ) / pixelBytes;
						left = i < pixelBytes ? 0 : pixels[c - pixelBytes];

						if ( row === 0 ) {
							upper = upperLeft = 0;
						} else {
							upper = pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];
							upperLeft = col && pixels[( row - 1 ) * scanlineLength + ( col - 1 ) * pixelBytes + ( i % pixelBytes )];
						}

						const p = left + upper - upperLeft;
						const pa = Math.abs(p - left);
						const pb = Math.abs(p - upper);
						const pc = Math.abs(p - upperLeft);
						
						if ( pa <= pb && pa <= pc ) {
							paeth = left;
						} else if ( pb <= pc ) {
							paeth = upper;
						} else {
							paeth = upperLeft;
						}

						pixels[c++] = (byte + paeth) % 256;
					}

					break;
				default:
					error( 'Invalid filter algorithm: ' + data[pos - 1] );
			}

			row++;
		}

		return pixels;
	}

	decodePalette () {
		const palette = this.palette;
		const transparency = this.transparency.indexed || [ ];
		const result = new Uint8Array( ( transparency.length || 0 ) + palette.length );
		const length = palette.length;
		
		let pos = 0;
		let c = 0;
		let i, _i, _ref, _ref1;
		
		for ( i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3 ) {
			result[pos++] = palette[i];
			result[pos++] = palette[i + 1];
			result[pos++] = palette[i + 2];
			result[pos++] = ( _ref1 = transparency[c++] ) != null ? _ref1 : 255;
		}

		return result;
	}

	decodeFrames () {
		if ( this.animation) {
			const frameCount = this.animation.frames.length;

			const decodedFrames = [ ];

			for ( let i = 0; i < frameCount; ++i ) {
				const frame = this.animation.frames[i];
				decodedFrames[i] = this.decodePixels( new Uint8Array( frame.data ) );
			}
			
			return decodedFrames;
		}
	}
}
