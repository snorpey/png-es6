/* @license

Extracted from pdf.js
https://github.com/andreasgal/pdf.js

Copyright (c) 2011 Mozilla Foundation

Contributors: Andreas Gal <gal@mozilla.com>
              Chris G Jones <cjones@mozilla.com>
              Shaon Barman <shaon.barman@gmail.com>
              Vivien Nicolas <21@vingtetun.org>
              Justin D'Arcangelo <justindarc@gmail.com>
              Yury Delendik

Modified and adapted in 2017 by Georg Fischer <hi@snorpey.com>

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE. */

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
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.png = {}));
}(this, (function (exports) { 'use strict';

	function loadPNG ( url ) {
		return fetchData ( url )
			.then( function (data) {
				return new PNG( data );
			} );
	}
	function fetchData ( url ) {
		return fetch( url )
			.then( function (res) { return res.arrayBuffer(); } )
			.then( function (arrayBuffer) { return new Uint8Array( arrayBuffer ); } );
	}
	function toImageData ( png ) {
		return {
			width: png.width,
			height: png.height,
			data: png.decodePixels()
		};
	}
	function error ( e ) {
		throw new Error( e );
	}

	/**/
	var DecodeStream = function DecodeStream () {
		this.pos = 0;
		this.bufferLength = 0;
		this.eof = false;
		this.buffer = null;
	};
	DecodeStream.prototype.ensureBuffer = function ensureBuffer ( requested ) {
		var buffer = this.buffer;
		var current = buffer ? buffer.byteLength : 0;
		if ( requested < current ) {
			return buffer;
		}
		var size = 512;
		while ( size < requested ) {
			size <<= 1;
		}
		var buffer2 = new Uint8Array( size );
		for ( var i = 0; i < current; ++i ) {
			buffer2[i] = buffer[i];
		}
		return this.buffer = buffer2;
	};
	DecodeStream.prototype.getBytes = function getBytes ( length ) {
		var pos = this.pos;
		var end;
		if ( length ) {
			this.ensureBuffer( pos + length );
			end = pos + length;
			while ( ! this.eof && this.bufferLength < end ) {
				this.readBlock();
			}
			var bufEnd = this.bufferLength;
			if ( end > bufEnd ) {
				end = bufEnd;
			}
		} else {
			while ( ! this.eof ) {
				this.readBlock();
			}
			end = this.bufferLength;
		}
		this.pos = end;
		return this.buffer.subarray( pos, end );
	};
	var codeLenCodeMap = new Uint32Array( [
		16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
	] );
	var lengthDecode = new Uint32Array( [
		0x00003, 0x00004, 0x00005, 0x00006, 0x00007, 0x00008, 0x00009, 0x0000a,
		0x1000b, 0x1000d, 0x1000f, 0x10011, 0x20013, 0x20017, 0x2001b, 0x2001f,
		0x30023, 0x3002b, 0x30033, 0x3003b, 0x40043, 0x40053, 0x40063, 0x40073,
		0x50083, 0x500a3, 0x500c3, 0x500e3, 0x00102, 0x00102, 0x00102
	] );
	var distDecode = new Uint32Array( [
		0x00001, 0x00002, 0x00003, 0x00004, 0x10005, 0x10007, 0x20009, 0x2000d,
		0x30011, 0x30019, 0x40021, 0x40031, 0x50041, 0x50061, 0x60081, 0x600c1,
		0x70101, 0x70181, 0x80201, 0x80301, 0x90401, 0x90601, 0xa0801, 0xa0c01,
		0xb1001, 0xb1801, 0xc2001, 0xc3001, 0xd4001, 0xd6001
	] );
	var fixedLitCodeTab = [ new Uint32Array( [
		0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c0,
		0x70108, 0x80060, 0x80020, 0x900a0, 0x80000, 0x80080, 0x80040, 0x900e0,
		0x70104, 0x80058, 0x80018, 0x90090, 0x70114, 0x80078, 0x80038, 0x900d0,
		0x7010c, 0x80068, 0x80028, 0x900b0, 0x80008, 0x80088, 0x80048, 0x900f0,
		0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c8,
		0x7010a, 0x80064, 0x80024, 0x900a8, 0x80004, 0x80084, 0x80044, 0x900e8,
		0x70106, 0x8005c, 0x8001c, 0x90098, 0x70116, 0x8007c, 0x8003c, 0x900d8,
		0x7010e, 0x8006c, 0x8002c, 0x900b8, 0x8000c, 0x8008c, 0x8004c, 0x900f8,
		0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c4,
		0x70109, 0x80062, 0x80022, 0x900a4, 0x80002, 0x80082, 0x80042, 0x900e4,
		0x70105, 0x8005a, 0x8001a, 0x90094, 0x70115, 0x8007a, 0x8003a, 0x900d4,
		0x7010d, 0x8006a, 0x8002a, 0x900b4, 0x8000a, 0x8008a, 0x8004a, 0x900f4,
		0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cc,
		0x7010b, 0x80066, 0x80026, 0x900ac, 0x80006, 0x80086, 0x80046, 0x900ec,
		0x70107, 0x8005e, 0x8001e, 0x9009c, 0x70117, 0x8007e, 0x8003e, 0x900dc,
		0x7010f, 0x8006e, 0x8002e, 0x900bc, 0x8000e, 0x8008e, 0x8004e, 0x900fc,
		0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c2,
		0x70108, 0x80061, 0x80021, 0x900a2, 0x80001, 0x80081, 0x80041, 0x900e2,
		0x70104, 0x80059, 0x80019, 0x90092, 0x70114, 0x80079, 0x80039, 0x900d2,
		0x7010c, 0x80069, 0x80029, 0x900b2, 0x80009, 0x80089, 0x80049, 0x900f2,
		0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900ca,
		0x7010a, 0x80065, 0x80025, 0x900aa, 0x80005, 0x80085, 0x80045, 0x900ea,
		0x70106, 0x8005d, 0x8001d, 0x9009a, 0x70116, 0x8007d, 0x8003d, 0x900da,
		0x7010e, 0x8006d, 0x8002d, 0x900ba, 0x8000d, 0x8008d, 0x8004d, 0x900fa,
		0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c6,
		0x70109, 0x80063, 0x80023, 0x900a6, 0x80003, 0x80083, 0x80043, 0x900e6,
		0x70105, 0x8005b, 0x8001b, 0x90096, 0x70115, 0x8007b, 0x8003b, 0x900d6,
		0x7010d, 0x8006b, 0x8002b, 0x900b6, 0x8000b, 0x8008b, 0x8004b, 0x900f6,
		0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900ce,
		0x7010b, 0x80067, 0x80027, 0x900ae, 0x80007, 0x80087, 0x80047, 0x900ee,
		0x70107, 0x8005f, 0x8001f, 0x9009e, 0x70117, 0x8007f, 0x8003f, 0x900de,
		0x7010f, 0x8006f, 0x8002f, 0x900be, 0x8000f, 0x8008f, 0x8004f, 0x900fe,
		0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c1,
		0x70108, 0x80060, 0x80020, 0x900a1, 0x80000, 0x80080, 0x80040, 0x900e1,
		0x70104, 0x80058, 0x80018, 0x90091, 0x70114, 0x80078, 0x80038, 0x900d1,
		0x7010c, 0x80068, 0x80028, 0x900b1, 0x80008, 0x80088, 0x80048, 0x900f1,
		0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c9,
		0x7010a, 0x80064, 0x80024, 0x900a9, 0x80004, 0x80084, 0x80044, 0x900e9,
		0x70106, 0x8005c, 0x8001c, 0x90099, 0x70116, 0x8007c, 0x8003c, 0x900d9,
		0x7010e, 0x8006c, 0x8002c, 0x900b9, 0x8000c, 0x8008c, 0x8004c, 0x900f9,
		0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c5,
		0x70109, 0x80062, 0x80022, 0x900a5, 0x80002, 0x80082, 0x80042, 0x900e5,
		0x70105, 0x8005a, 0x8001a, 0x90095, 0x70115, 0x8007a, 0x8003a, 0x900d5,
		0x7010d, 0x8006a, 0x8002a, 0x900b5, 0x8000a, 0x8008a, 0x8004a, 0x900f5,
		0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cd,
		0x7010b, 0x80066, 0x80026, 0x900ad, 0x80006, 0x80086, 0x80046, 0x900ed,
		0x70107, 0x8005e, 0x8001e, 0x9009d, 0x70117, 0x8007e, 0x8003e, 0x900dd,
		0x7010f, 0x8006e, 0x8002e, 0x900bd, 0x8000e, 0x8008e, 0x8004e, 0x900fd,
		0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c3,
		0x70108, 0x80061, 0x80021, 0x900a3, 0x80001, 0x80081, 0x80041, 0x900e3,
		0x70104, 0x80059, 0x80019, 0x90093, 0x70114, 0x80079, 0x80039, 0x900d3,
		0x7010c, 0x80069, 0x80029, 0x900b3, 0x80009, 0x80089, 0x80049, 0x900f3,
		0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900cb,
		0x7010a, 0x80065, 0x80025, 0x900ab, 0x80005, 0x80085, 0x80045, 0x900eb,
		0x70106, 0x8005d, 0x8001d, 0x9009b, 0x70116, 0x8007d, 0x8003d, 0x900db,
		0x7010e, 0x8006d, 0x8002d, 0x900bb, 0x8000d, 0x8008d, 0x8004d, 0x900fb,
		0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c7,
		0x70109, 0x80063, 0x80023, 0x900a7, 0x80003, 0x80083, 0x80043, 0x900e7,
		0x70105, 0x8005b, 0x8001b, 0x90097, 0x70115, 0x8007b, 0x8003b, 0x900d7,
		0x7010d, 0x8006b, 0x8002b, 0x900b7, 0x8000b, 0x8008b, 0x8004b, 0x900f7,
		0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900cf,
		0x7010b, 0x80067, 0x80027, 0x900af, 0x80007, 0x80087, 0x80047, 0x900ef,
		0x70107, 0x8005f, 0x8001f, 0x9009f, 0x70117, 0x8007f, 0x8003f, 0x900df,
		0x7010f, 0x8006f, 0x8002f, 0x900bf, 0x8000f, 0x8008f, 0x8004f, 0x900ff
	] ), 9 ];
	var fixedDistCodeTab = [ new Uint32Array( [
		0x50000, 0x50010, 0x50008, 0x50018, 0x50004, 0x50014, 0x5000c, 0x5001c,
		0x50002, 0x50012, 0x5000a, 0x5001a, 0x50006, 0x50016, 0x5000e, 0x00000,
		0x50001, 0x50011, 0x50009, 0x50019, 0x50005, 0x50015, 0x5000d, 0x5001d,
		0x50003, 0x50013, 0x5000b, 0x5001b, 0x50007, 0x50017, 0x5000f, 0x00000
	] ), 5];
	var FlateStream = (function (DecodeStream) {
		function FlateStream ( bytes ) {
			DecodeStream.call(this);
			var bytesPos = 0;
			var cmf = bytes[bytesPos++];
			var flg = bytes[bytesPos++];
			if ( cmf == -1 || flg == -1 ){
				error('Invalid header in flate stream');
			}
			if ( ( cmf & 0x0f ) != 0x08 ) {
				error('Unknown compression method in flate stream');
			}
			if ( ( ( ( cmf << 8 ) + flg ) % 31 ) != 0 ) {
				error('Bad FCHECK in flate stream');
			}
			if ( flg & 0x20 ) {
				error('FDICT bit set in flate stream');
			}
			this.pos = 0;
			this.bufferLength = 0;
			this.eof = false;
			this.buffer = null;
			this.bytes = bytes;
			this.bytesPos = bytesPos;
			this.codeSize = 0;
			this.codeBuf = 0;
		}
		if ( DecodeStream ) FlateStream.__proto__ = DecodeStream;
		FlateStream.prototype = Object.create( DecodeStream && DecodeStream.prototype );
		FlateStream.prototype.constructor = FlateStream;
		FlateStream.prototype.getBits = function getBits ( bits ) {
			var codeSize = this.codeSize;
			var codeBuf = this.codeBuf;
			var bytesPos = this.bytesPos;
			var bytes = this.bytes;
			var b;
			while ( codeSize < bits ) {
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad encoding in flate stream' );
				}
				codeBuf |= b << codeSize;
				codeSize += 8;
			}
			b = codeBuf & ( ( 1 << bits ) - 1 );
			this.codeBuf = codeBuf >> bits;
			this.codeSize = codeSize -= bits;
			this.bytesPos = bytesPos;
			return b;
		};
		FlateStream.prototype.getCode = function getCode ( table ) {
			var codes = table[0];
			var maxLen = table[1];
			var bytes = this.bytes;
			var codeSize = this.codeSize;
			var codeBuf = this.codeBuf;
			var bytesPos = this.bytesPos;
			while ( codeSize < maxLen ) {
				var b = (void 0);
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad encoding in flate stream' );
				}
				codeBuf |= ( b << codeSize );
				codeSize += 8;
			}
			var codeIndex = codeBuf & ( ( 1 << maxLen ) - 1 );
			var code = codes[codeIndex];
			var codeLen = code >> 16;
			var codeVal = code & 0xffff;
			if ( codeSize == 0 || codeSize < codeLen || codeLen == 0 ) {
				error( 'Bad encoding in flate stream' );
			}
			this.codeBuf = ( codeBuf >> codeLen );
			this.codeSize = ( codeSize - codeLen );
			this.bytesPos = bytesPos;
			return codeVal;
		};
		FlateStream.prototype.generateHuffmanTable = function generateHuffmanTable ( lengths ) {
			var n = lengths.length;
			var maxLen = 0;
			for ( var i$1 = 0; i$1 < n; ++i$1 ) {
				if ( lengths[i$1] > maxLen ) {
					maxLen = lengths[i$1];
				}
			}
			var size = 1 << maxLen;
			var codes = new Uint32Array( size );
			for (
				var len = 1, code = 0, skip = 2;
				len <= maxLen;
				++len, code <<= 1, skip <<= 1
			) {
				for ( var val = 0; val < n; ++val ) {
					if ( lengths[val] == len ) {
						var code2 = 0;
						var t = code;
						for ( var i = 0; i < len; ++i ) {
							code2 = ( code2 << 1 ) | ( t & 1 );
							t >>= 1;
						}
						for ( var i = code2; i < size; i += skip ) {
							codes[i] = ( len << 16 ) | val;
						}
						++code;
					}
				}
			}
			return [ codes, maxLen ];
		};
		FlateStream.prototype.readBlock = function readBlock () {
			var i = 0;
			function repeat ( stream, array, len, offset, what ) {
				var repeat = stream.getBits( len ) + offset;
				while ( repeat-- > 0 ) {
					array[i++] = what;
				}
			}
			var hdr = this.getBits( 3 );
			if ( hdr & 1 ) {
				this.eof = true;
			}
			hdr >>= 1;
			if ( hdr == 0 ) {
				var bytes = this.bytes;
				var bytesPos = this.bytesPos;
				var b;
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad block header in flate stream' );
				}
				var blockLen = b;
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad block header in flate stream' );
				}
				blockLen |= ( b << 8 );
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad block header in flate stream' );
				}
				var check = b;
				if ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
					error( 'Bad block header in flate stream' );
				}
				check |= ( b << 8 );
				if ( check != ( ~blockLen & 0xffff ) ) {
					error( 'Bad uncompressed block length in flate stream' );
				}
				this.codeBuf = 0;
				this.codeSize = 0;
				var bufferLength = this.bufferLength;
				var buffer$1 = this.ensureBuffer( bufferLength + blockLen );
				var end = bufferLength + blockLen;
				this.bufferLength = end;
				for ( var n = bufferLength; n < end; ++n ) {
					if (typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {
						this.eof = true;
						break;
					}
					buffer$1[n] = b;
				}
				this.bytesPos = bytesPos;
				return;
			}
			var litCodeTable;
			var distCodeTable;
			if ( hdr == 1 ) {
				litCodeTable = fixedLitCodeTab;
				distCodeTable = fixedDistCodeTab;
			} else if ( hdr == 2 ) {
				var numLitCodes = this.getBits( 5 ) + 257;
				var numDistCodes = this.getBits( 5 ) + 1;
				var numCodeLenCodes = this.getBits( 4 ) + 4;
				var codeLenCodeLengths = Array( codeLenCodeMap.length );
				i = 0;
				while ( i < numCodeLenCodes ){
					codeLenCodeLengths[codeLenCodeMap[i++]] = this.getBits( 3 );
				}
				var codeLenCodeTab = this.generateHuffmanTable( codeLenCodeLengths );
				var len = 0;
				var codes = numLitCodes + numDistCodes;
				var codeLengths = new Array( codes );
				i = 0;
				while ( i < codes ) {
					var code = this.getCode( codeLenCodeTab );
					if ( code == 16 ) {
						repeat( this, codeLengths, 2, 3, len );
					} else if ( code == 17 ) {
						repeat( this, codeLengths, 3, 3, len = 0 );
					} else if ( code == 18 ) {
						repeat( this, codeLengths, 7, 11, len = 0 );
					} else {
						codeLengths[i++] = len = code;
					}
				}
				litCodeTable = this.generateHuffmanTable( codeLengths.slice( 0, numLitCodes ) );
				distCodeTable = this.generateHuffmanTable( codeLengths.slice( numLitCodes, codes ) );
			} else {
				error( 'Unknown block type in flate stream' );
			}
			var buffer = this.buffer;
			var limit = buffer ? buffer.length : 0;
			var pos = this.bufferLength;
			while ( true ) {
				var code1 = this.getCode( litCodeTable );
				if ( code1 < 256 ) {
					if ( pos + 1 >= limit ) {
						buffer = this.ensureBuffer( pos + 1 );
						limit = buffer.length;
					}
					buffer[pos++] = code1;
					continue;
				}
				if ( code1 == 256 ) {
					this.bufferLength = pos;
					return;
				}
				code1 -= 257;
				code1 = lengthDecode[code1];
				var code2 = code1 >> 16;
				if ( code2 > 0 ) {
					code2 = this.getBits( code2 );
				}
				var len$1 = ( code1 & 0xffff ) + code2;
				code1 = this.getCode( distCodeTable );
				code1 = distDecode[code1];
				code2 = code1 >> 16;
				if ( code2 > 0 ) {
					code2 = this.getBits( code2 );
				}
				var dist = ( code1 & 0xffff ) + code2;
				if ( pos + len$1 >= limit ) {
					buffer = this.ensureBuffer( pos + len$1 );
					limit = buffer.length;
				}
				for ( var k = 0; k < len$1; ++k, ++pos ) {
					buffer[pos] = buffer[pos - dist];
				}
			}
		};
		return FlateStream;
	}(DecodeStream));

	/**/
	var PNG = function PNG ( data ) {
		this.data = data;
		this.pos = 8;
		this.palette = [ ];
		this.imgData = [ ];
		this.transparency = { };
		this.animation = null;
		this.text = { };
		var frame = null;
		while ( true ) {
			var chunkSize = this.readUInt32();
			var section = ( ( function () {
				var _i;
				var _results = [ ];
				for ( _i = 0; _i < 4; ++_i ) {
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
					var delayNum = this.readUInt16();
					var delayDen = this.readUInt16() || 100;
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
					data = ( frame != null ? frame.data : void 0 ) || this.imgData;
					var _i = (void 0);
					for ( _i = 0; 0 <= chunkSize ? _i < chunkSize : _i > chunkSize; 0 <= chunkSize ? ++_i : --_i ) {
						data.push( this.data[this.pos++] );
					}
					break;
				case 'tRNS':
					this.transparency = { };
					switch ( this.colorType ) {
						case 3:
							this.transparency.indexed = this.read( chunkSize );
							var short = 255 - this.transparency.indexed.length;
							if ( short > 0 ) {
								var _j = (void 0);
								for ( _j = 0; 0 <= short ? _j < short : _j > short; 0 <= short ? ++_j : --_j ) {
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
					var text = this.read( chunkSize );
					var index = text.indexOf( 0 );
					var key = String.fromCharCode.apply( String, text.slice( 0, index ) );
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
					var colors = this.colors + ( this.hasAlphaChannel ? 1 : 0 );
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
	};
	PNG.prototype.read = function read ( bytes ) {
		var _i;
		var _results = [ ];
		for ( _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; 0 <= bytes ? ++_i : --_i ) {
			_results.push( this.data[this.pos++] );
		}
		return _results;
	};
	PNG.prototype.readUInt32 = function readUInt32 () {
		var b1 = this.data[this.pos++] << 24;
		var b2 = this.data[this.pos++] << 16;
		var b3 = this.data[this.pos++] << 8;
		var b4 = this.data[this.pos++];
		return b1 | b2 | b3 | b4;
	};
	PNG.prototype.readUInt16 = function readUInt16 () {
		var b1 = this.data[this.pos++] << 8;
		var b2 = this.data[this.pos++];
		return b1 | b2;
	};
	PNG.prototype.decodePixels = function decodePixels ( data ) {
		if ( data == null ) {
			data = this.imgData;
		}
		if ( data.length === 0 ) {
			return new Uint8Array(0);
		}
		var stream = new FlateStream( data );
		data = stream.getBytes();
		var pixelBytes = this.pixelBitlength / 8;
		var scanlineLength = pixelBytes * this.width;
		var pixels = new Uint8Array( scanlineLength * this.height );
		var length = data.length;
		var row = 0;
		var pos = 0;
		var c = 0;
		var i = 0;
		var _i = 0;
		var _j = 0;
		var _k = 0;
		var _l = 0;
		var _m = 0;
		var byte;
		var col;
		var left;
		var paeth;
		var upper;
		var upperLeft;
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
						var p = left + upper - upperLeft;
						var pa = Math.abs(p - left);
						var pb = Math.abs(p - upper);
						var pc = Math.abs(p - upperLeft);
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
	};
	PNG.prototype.decodePalette = function decodePalette () {
		var palette = this.palette;
		var transparency = this.transparency.indexed || [ ];
		var result = new Uint8Array( ( transparency.length || 0 ) + palette.length );
		palette.length;
		var pos = 0;
		var c = 0;
		var i, _i, _ref, _ref1;
		for ( i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3 ) {
			result[pos++] = palette[i];
			result[pos++] = palette[i + 1];
			result[pos++] = palette[i + 2];
			result[pos++] = ( _ref1 = transparency[c++] ) != null ? _ref1 : 255;
		}
		return result;
	};
	PNG.prototype.decodeFrames = function decodeFrames () {
		if ( this.animation) {
			var frameCount = this.animation.frames.length;
			var decodedFrames = [ ];
			for ( var i = 0; i < frameCount; ++i ) {
				var frame = this.animation.frames[i];
				decodedFrames[i] = this.decodePixels( new Uint8Array( frame.data ) );
			}
			return decodedFrames;
		}
	};

	function fromURL ( url ) {
		return loadPNG( url );
	}
	function fromImageData ( imageData ) {
		return new Promise ( function ( resolve, reject ) {
			try {
				resolve( new PNG( imageData.data || imageData ) );
			} catch ( err ) {
				reject( err );
			}
		} );
	}

	exports.fromImageData = fromImageData;
	exports.fromURL = fromURL;
	exports.toImageData = toImageData;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
