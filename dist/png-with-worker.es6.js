/* @license
https://github.com/lydell/resolve-url/blob/master/resolve-url.js
Copyright 2014 Simon Lydell
X11 ("MIT") Licensed. (See LICENSE.) */

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

/**/
function resolveUrl(             ) {
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
function copyPNGToImageData ( png, imageData, pixels ) {
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

const pngWorker = new Worker( URL.createObjectURL(new Blob(["function loadPNG ( url ) {\n\treturn fetchData ( url )\n\t\t.then( data => {\n\t\t\treturn new PNG( data );\n\t\t} );\n}\nfunction fetchData ( url ) {\n\treturn fetch( url )\n\t\t.then( res => res.arrayBuffer() )\n\t\t.then( arrayBuffer => new Uint8Array( arrayBuffer ) );\n}\n\nfunction error ( e ) {\n\tthrow new Error( e );\n}\n\n/**/\nclass DecodeStream {\n\tconstructor () {\n\t\tthis.pos = 0;\n\t\tthis.bufferLength = 0;\n\t\tthis.eof = false;\n\t\tthis.buffer = null;\n\t}\n\tensureBuffer ( requested ) {\n\t\tconst buffer = this.buffer;\n\t\tconst current = buffer ? buffer.byteLength : 0;\n\t\tif ( requested < current ) {\n\t\t\treturn buffer;\n\t\t}\n\t\tlet size = 512;\n\t\twhile ( size < requested ) {\n\t\t\tsize <<= 1;\n\t\t}\n\t\tconst buffer2 = new Uint8Array( size );\n\t\tfor ( let i = 0; i < current; ++i ) {\n\t\t\tbuffer2[i] = buffer[i];\n\t\t}\n\t\treturn this.buffer = buffer2;\n\t}\n\tgetBytes ( length ) {\n\t\tconst pos = this.pos;\n\t\tlet end;\n\t\tif ( length ) {\n\t\t\tthis.ensureBuffer( pos + length );\n\t\t\tend = pos + length;\n\t\t\twhile ( ! this.eof && this.bufferLength < end ) {\n\t\t\t\tthis.readBlock();\n\t\t\t}\n\t\t\tconst bufEnd = this.bufferLength;\n\t\t\tif ( end > bufEnd ) {\n\t\t\t\tend = bufEnd;\n\t\t\t}\n\t\t} else {\n\t\t\twhile ( ! this.eof ) {\n\t\t\t\tthis.readBlock();\n\t\t\t}\n\t\t\tend = this.bufferLength;\n\t\t}\n\t\tthis.pos = end;\n\t\treturn this.buffer.subarray( pos, end );\n\t}\n}\nconst codeLenCodeMap = new Uint32Array( [\n\t16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15\n] );\nconst lengthDecode = new Uint32Array( [\n\t0x00003, 0x00004, 0x00005, 0x00006, 0x00007, 0x00008, 0x00009, 0x0000a,\n\t0x1000b, 0x1000d, 0x1000f, 0x10011, 0x20013, 0x20017, 0x2001b, 0x2001f,\n\t0x30023, 0x3002b, 0x30033, 0x3003b, 0x40043, 0x40053, 0x40063, 0x40073,\n\t0x50083, 0x500a3, 0x500c3, 0x500e3, 0x00102, 0x00102, 0x00102\n] );\nconst distDecode = new Uint32Array( [\n\t0x00001, 0x00002, 0x00003, 0x00004, 0x10005, 0x10007, 0x20009, 0x2000d,\n\t0x30011, 0x30019, 0x40021, 0x40031, 0x50041, 0x50061, 0x60081, 0x600c1,\n\t0x70101, 0x70181, 0x80201, 0x80301, 0x90401, 0x90601, 0xa0801, 0xa0c01,\n\t0xb1001, 0xb1801, 0xc2001, 0xc3001, 0xd4001, 0xd6001\n] );\nconst fixedLitCodeTab = [ new Uint32Array( [\n\t0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c0,\n\t0x70108, 0x80060, 0x80020, 0x900a0, 0x80000, 0x80080, 0x80040, 0x900e0,\n\t0x70104, 0x80058, 0x80018, 0x90090, 0x70114, 0x80078, 0x80038, 0x900d0,\n\t0x7010c, 0x80068, 0x80028, 0x900b0, 0x80008, 0x80088, 0x80048, 0x900f0,\n\t0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c8,\n\t0x7010a, 0x80064, 0x80024, 0x900a8, 0x80004, 0x80084, 0x80044, 0x900e8,\n\t0x70106, 0x8005c, 0x8001c, 0x90098, 0x70116, 0x8007c, 0x8003c, 0x900d8,\n\t0x7010e, 0x8006c, 0x8002c, 0x900b8, 0x8000c, 0x8008c, 0x8004c, 0x900f8,\n\t0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c4,\n\t0x70109, 0x80062, 0x80022, 0x900a4, 0x80002, 0x80082, 0x80042, 0x900e4,\n\t0x70105, 0x8005a, 0x8001a, 0x90094, 0x70115, 0x8007a, 0x8003a, 0x900d4,\n\t0x7010d, 0x8006a, 0x8002a, 0x900b4, 0x8000a, 0x8008a, 0x8004a, 0x900f4,\n\t0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cc,\n\t0x7010b, 0x80066, 0x80026, 0x900ac, 0x80006, 0x80086, 0x80046, 0x900ec,\n\t0x70107, 0x8005e, 0x8001e, 0x9009c, 0x70117, 0x8007e, 0x8003e, 0x900dc,\n\t0x7010f, 0x8006e, 0x8002e, 0x900bc, 0x8000e, 0x8008e, 0x8004e, 0x900fc,\n\t0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c2,\n\t0x70108, 0x80061, 0x80021, 0x900a2, 0x80001, 0x80081, 0x80041, 0x900e2,\n\t0x70104, 0x80059, 0x80019, 0x90092, 0x70114, 0x80079, 0x80039, 0x900d2,\n\t0x7010c, 0x80069, 0x80029, 0x900b2, 0x80009, 0x80089, 0x80049, 0x900f2,\n\t0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900ca,\n\t0x7010a, 0x80065, 0x80025, 0x900aa, 0x80005, 0x80085, 0x80045, 0x900ea,\n\t0x70106, 0x8005d, 0x8001d, 0x9009a, 0x70116, 0x8007d, 0x8003d, 0x900da,\n\t0x7010e, 0x8006d, 0x8002d, 0x900ba, 0x8000d, 0x8008d, 0x8004d, 0x900fa,\n\t0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c6,\n\t0x70109, 0x80063, 0x80023, 0x900a6, 0x80003, 0x80083, 0x80043, 0x900e6,\n\t0x70105, 0x8005b, 0x8001b, 0x90096, 0x70115, 0x8007b, 0x8003b, 0x900d6,\n\t0x7010d, 0x8006b, 0x8002b, 0x900b6, 0x8000b, 0x8008b, 0x8004b, 0x900f6,\n\t0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900ce,\n\t0x7010b, 0x80067, 0x80027, 0x900ae, 0x80007, 0x80087, 0x80047, 0x900ee,\n\t0x70107, 0x8005f, 0x8001f, 0x9009e, 0x70117, 0x8007f, 0x8003f, 0x900de,\n\t0x7010f, 0x8006f, 0x8002f, 0x900be, 0x8000f, 0x8008f, 0x8004f, 0x900fe,\n\t0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c1,\n\t0x70108, 0x80060, 0x80020, 0x900a1, 0x80000, 0x80080, 0x80040, 0x900e1,\n\t0x70104, 0x80058, 0x80018, 0x90091, 0x70114, 0x80078, 0x80038, 0x900d1,\n\t0x7010c, 0x80068, 0x80028, 0x900b1, 0x80008, 0x80088, 0x80048, 0x900f1,\n\t0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c9,\n\t0x7010a, 0x80064, 0x80024, 0x900a9, 0x80004, 0x80084, 0x80044, 0x900e9,\n\t0x70106, 0x8005c, 0x8001c, 0x90099, 0x70116, 0x8007c, 0x8003c, 0x900d9,\n\t0x7010e, 0x8006c, 0x8002c, 0x900b9, 0x8000c, 0x8008c, 0x8004c, 0x900f9,\n\t0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c5,\n\t0x70109, 0x80062, 0x80022, 0x900a5, 0x80002, 0x80082, 0x80042, 0x900e5,\n\t0x70105, 0x8005a, 0x8001a, 0x90095, 0x70115, 0x8007a, 0x8003a, 0x900d5,\n\t0x7010d, 0x8006a, 0x8002a, 0x900b5, 0x8000a, 0x8008a, 0x8004a, 0x900f5,\n\t0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cd,\n\t0x7010b, 0x80066, 0x80026, 0x900ad, 0x80006, 0x80086, 0x80046, 0x900ed,\n\t0x70107, 0x8005e, 0x8001e, 0x9009d, 0x70117, 0x8007e, 0x8003e, 0x900dd,\n\t0x7010f, 0x8006e, 0x8002e, 0x900bd, 0x8000e, 0x8008e, 0x8004e, 0x900fd,\n\t0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c3,\n\t0x70108, 0x80061, 0x80021, 0x900a3, 0x80001, 0x80081, 0x80041, 0x900e3,\n\t0x70104, 0x80059, 0x80019, 0x90093, 0x70114, 0x80079, 0x80039, 0x900d3,\n\t0x7010c, 0x80069, 0x80029, 0x900b3, 0x80009, 0x80089, 0x80049, 0x900f3,\n\t0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900cb,\n\t0x7010a, 0x80065, 0x80025, 0x900ab, 0x80005, 0x80085, 0x80045, 0x900eb,\n\t0x70106, 0x8005d, 0x8001d, 0x9009b, 0x70116, 0x8007d, 0x8003d, 0x900db,\n\t0x7010e, 0x8006d, 0x8002d, 0x900bb, 0x8000d, 0x8008d, 0x8004d, 0x900fb,\n\t0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c7,\n\t0x70109, 0x80063, 0x80023, 0x900a7, 0x80003, 0x80083, 0x80043, 0x900e7,\n\t0x70105, 0x8005b, 0x8001b, 0x90097, 0x70115, 0x8007b, 0x8003b, 0x900d7,\n\t0x7010d, 0x8006b, 0x8002b, 0x900b7, 0x8000b, 0x8008b, 0x8004b, 0x900f7,\n\t0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900cf,\n\t0x7010b, 0x80067, 0x80027, 0x900af, 0x80007, 0x80087, 0x80047, 0x900ef,\n\t0x70107, 0x8005f, 0x8001f, 0x9009f, 0x70117, 0x8007f, 0x8003f, 0x900df,\n\t0x7010f, 0x8006f, 0x8002f, 0x900bf, 0x8000f, 0x8008f, 0x8004f, 0x900ff\n] ), 9 ];\nconst fixedDistCodeTab = [ new Uint32Array( [\n\t0x50000, 0x50010, 0x50008, 0x50018, 0x50004, 0x50014, 0x5000c, 0x5001c,\n\t0x50002, 0x50012, 0x5000a, 0x5001a, 0x50006, 0x50016, 0x5000e, 0x00000,\n\t0x50001, 0x50011, 0x50009, 0x50019, 0x50005, 0x50015, 0x5000d, 0x5001d,\n\t0x50003, 0x50013, 0x5000b, 0x5001b, 0x50007, 0x50017, 0x5000f, 0x00000\n] ), 5];\nclass FlateStream extends DecodeStream {\n\tconstructor ( bytes ) {\n\t\tsuper();\n\t\tlet bytesPos = 0;\n\t\tconst cmf = bytes[bytesPos++];\n\t\tconst flg = bytes[bytesPos++];\n\t\tif ( cmf == -1 || flg == -1 ){\n\t\t\terror('Invalid header in flate stream');\n\t\t}\n\t\tif ( ( cmf & 0x0f ) != 0x08 ) {\n\t\t\terror('Unknown compression method in flate stream');\n\t\t}\n\t\tif ( ( ( ( cmf << 8 ) + flg ) % 31 ) != 0 ) {\n\t\t\terror('Bad FCHECK in flate stream');\n\t\t}\n\t\tif ( flg & 0x20 ) {\n\t\t\terror('FDICT bit set in flate stream');\n\t\t}\n\t\tthis.pos = 0;\n\t\tthis.bufferLength = 0;\n\t\tthis.eof = false;\n\t\tthis.buffer = null;\n\t\tthis.bytes = bytes;\n\t\tthis.bytesPos = bytesPos;\n\t\tthis.codeSize = 0;\n\t\tthis.codeBuf = 0;\n\t}\n\tgetBits ( bits ) {\n\t\tlet codeSize = this.codeSize;\n\t\tlet codeBuf = this.codeBuf;\n\t\tlet bytesPos = this.bytesPos;\n\t\tconst bytes = this.bytes;\n\t\tlet b;\n\t\twhile ( codeSize < bits ) {\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad encoding in flate stream' );\n\t\t\t}\n\t\t\tcodeBuf |= b << codeSize;\n\t\t\tcodeSize += 8;\n\t\t}\n\t\tb = codeBuf & ( ( 1 << bits ) - 1 );\n\t\tthis.codeBuf = codeBuf >> bits;\n\t\tthis.codeSize = codeSize -= bits;\n\t\tthis.bytesPos = bytesPos;\n\t\treturn b;\n\t}\n\tgetCode ( table ) {\n\t\tconst codes = table[0];\n\t\tconst maxLen = table[1];\n\t\tconst bytes = this.bytes;\n\t\tlet codeSize = this.codeSize;\n\t\tlet codeBuf = this.codeBuf;\n\t\tlet bytesPos = this.bytesPos;\n\t\twhile ( codeSize < maxLen ) {\n\t\t\tlet b;\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad encoding in flate stream' );\n\t\t\t}\n\t\t\tcodeBuf |= ( b << codeSize );\n\t\t\tcodeSize += 8;\n\t\t}\n\t\tconst codeIndex = codeBuf & ( ( 1 << maxLen ) - 1 );\n\t\tconst code = codes[codeIndex];\n\t\tconst codeLen = code >> 16;\n\t\tconst codeVal = code & 0xffff;\n\t\tif ( codeSize == 0 || codeSize < codeLen || codeLen == 0 ) {\n\t\t\terror( 'Bad encoding in flate stream' );\n\t\t}\n\t\tthis.codeBuf = ( codeBuf >> codeLen );\n\t\tthis.codeSize = ( codeSize - codeLen );\n\t\tthis.bytesPos = bytesPos;\n\t\treturn codeVal;\n\t}\n\tgenerateHuffmanTable ( lengths ) {\n\t\tconst n = lengths.length;\n\t\tlet maxLen = 0;\n\t\tfor ( let i = 0; i < n; ++i ) {\n\t\t\tif ( lengths[i] > maxLen ) {\n\t\t\t\tmaxLen = lengths[i];\n\t\t\t}\n\t\t}\n\t\tconst size = 1 << maxLen;\n\t\tconst codes = new Uint32Array( size );\n\t\tfor (\n\t\t\tlet len = 1, code = 0, skip = 2;\n\t\t\tlen <= maxLen;\n\t\t\t++len, code <<= 1, skip <<= 1\n\t\t) {\n\t\t\tfor ( let val = 0; val < n; ++val ) {\n\t\t\t\tif ( lengths[val] == len ) {\n\t\t\t\t\tlet code2 = 0;\n\t\t\t\t\tlet t = code;\n\t\t\t\t\tfor ( var i = 0; i < len; ++i ) {\n\t\t\t\t\t\tcode2 = ( code2 << 1 ) | ( t & 1 );\n\t\t\t\t\t\tt >>= 1;\n\t\t\t\t\t}\n\t\t\t\t\tfor ( var i = code2; i < size; i += skip ) {\n\t\t\t\t\t\tcodes[i] = ( len << 16 ) | val;\n\t\t\t\t\t}\n\t\t\t\t\t++code;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\treturn [ codes, maxLen ];\n\t}\n\treadBlock () {\n\t\tlet i = 0;\n\t\tfunction repeat ( stream, array, len, offset, what ) {\n\t\t\tlet repeat = stream.getBits( len ) + offset;\n\t\t\twhile ( repeat-- > 0 ) {\n\t\t\t\tarray[i++] = what;\n\t\t\t}\n\t\t}\n\t\tlet hdr = this.getBits( 3 );\n\t\tif ( hdr & 1 ) {\n\t\t\tthis.eof = true;\n\t\t}\n\t\thdr >>= 1;\n\t\tif ( hdr == 0 ) {\n\t\t\tconst bytes = this.bytes;\n\t\t\tlet bytesPos = this.bytesPos;\n\t\t\tlet b;\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad block header in flate stream' );\n\t\t\t}\n\t\t\tlet blockLen = b;\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad block header in flate stream' );\n\t\t\t}\n\t\t\tblockLen |= ( b << 8 );\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad block header in flate stream' );\n\t\t\t}\n\t\t\tlet check = b;\n\t\t\tif ( typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\terror( 'Bad block header in flate stream' );\n\t\t\t}\n\t\t\tcheck |= ( b << 8 );\n\t\t\tif ( check != ( ~blockLen & 0xffff ) ) {\n\t\t\t\terror( 'Bad uncompressed block length in flate stream' );\n\t\t\t}\n\t\t\tthis.codeBuf = 0;\n\t\t\tthis.codeSize = 0;\n\t\t\tconst bufferLength = this.bufferLength;\n\t\t\tconst buffer = this.ensureBuffer( bufferLength + blockLen );\n\t\t\tconst end = bufferLength + blockLen;\n\t\t\tthis.bufferLength = end;\n\t\t\tfor ( let n = bufferLength; n < end; ++n ) {\n\t\t\t\tif (typeof ( b = bytes[bytesPos++] ) == 'undefined' ) {\n\t\t\t\t\tthis.eof = true;\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t\tbuffer[n] = b;\n\t\t\t}\n\t\t\tthis.bytesPos = bytesPos;\n\t\t\treturn;\n\t\t}\n\t\tlet litCodeTable;\n\t\tlet distCodeTable;\n\t\tif ( hdr == 1 ) {\n\t\t\tlitCodeTable = fixedLitCodeTab;\n\t\t\tdistCodeTable = fixedDistCodeTab;\n\t\t} else if ( hdr == 2 ) {\n\t\t\tconst numLitCodes = this.getBits( 5 ) + 257;\n\t\t\tconst numDistCodes = this.getBits( 5 ) + 1;\n\t\t\tconst numCodeLenCodes = this.getBits( 4 ) + 4;\n\t\t\tconst codeLenCodeLengths = Array( codeLenCodeMap.length );\n\t\t\ti = 0;\n\t\t\twhile ( i < numCodeLenCodes ){\n\t\t\t\tcodeLenCodeLengths[codeLenCodeMap[i++]] = this.getBits( 3 );\n\t\t\t}\n\t\t\tconst codeLenCodeTab = this.generateHuffmanTable( codeLenCodeLengths );\n\t\t\tlet len = 0;\n\t\t\tconst codes = numLitCodes + numDistCodes;\n\t\t\tconst codeLengths = new Array( codes );\n\t\t\ti = 0;\n\t\t\twhile ( i < codes ) {\n\t\t\t\tlet code = this.getCode( codeLenCodeTab );\n\t\t\t\tif ( code == 16 ) {\n\t\t\t\t\trepeat( this, codeLengths, 2, 3, len );\n\t\t\t\t} else if ( code == 17 ) {\n\t\t\t\t\trepeat( this, codeLengths, 3, 3, len = 0 );\n\t\t\t\t} else if ( code == 18 ) {\n\t\t\t\t\trepeat( this, codeLengths, 7, 11, len = 0 );\n\t\t\t\t} else {\n\t\t\t\t\tcodeLengths[i++] = len = code;\n\t\t\t\t}\n\t\t\t}\n\t\t\tlitCodeTable = this.generateHuffmanTable( codeLengths.slice( 0, numLitCodes ) );\n\t\t\tdistCodeTable = this.generateHuffmanTable( codeLengths.slice( numLitCodes, codes ) );\n\t\t} else {\n\t\t\terror( 'Unknown block type in flate stream' );\n\t\t}\n\t\tlet buffer = this.buffer;\n\t\tlet limit = buffer ? buffer.length : 0;\n\t\tlet pos = this.bufferLength;\n\t\twhile ( true ) {\n\t\t\tlet code1 = this.getCode( litCodeTable );\n\t\t\tif ( code1 < 256 ) {\n\t\t\t\tif ( pos + 1 >= limit ) {\n\t\t\t\t\tbuffer = this.ensureBuffer( pos + 1 );\n\t\t\t\t\tlimit = buffer.length;\n\t\t\t\t}\n\t\t\t\tbuffer[pos++] = code1;\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\tif ( code1 == 256 ) {\n\t\t\t\tthis.bufferLength = pos;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tcode1 -= 257;\n\t\t\tcode1 = lengthDecode[code1];\n\t\t\tlet code2 = code1 >> 16;\n\t\t\tif ( code2 > 0 ) {\n\t\t\t\tcode2 = this.getBits( code2 );\n\t\t\t}\n\t\t\tconst len = ( code1 & 0xffff ) + code2;\n\t\t\tcode1 = this.getCode( distCodeTable );\n\t\t\tcode1 = distDecode[code1];\n\t\t\tcode2 = code1 >> 16;\n\t\t\tif ( code2 > 0 ) {\n\t\t\t\tcode2 = this.getBits( code2 );\n\t\t\t}\n\t\t\tconst dist = ( code1 & 0xffff ) + code2;\n\t\t\tif ( pos + len >= limit ) {\n\t\t\t\tbuffer = this.ensureBuffer( pos + len );\n\t\t\t\tlimit = buffer.length;\n\t\t\t}\n\t\t\tfor ( let k = 0; k < len; ++k, ++pos ) {\n\t\t\t\tbuffer[pos] = buffer[pos - dist];\n\t\t\t}\n\t\t}\n\t}\n}\n\n/**/\nclass PNG {\n\tconstructor ( data ) {\n\t\tthis.data = data;\n\t\tthis.pos = 8;\n\t\tthis.palette = [ ];\n\t\tthis.imgData = [ ];\n\t\tthis.transparency = { };\n\t\tthis.animation = null;\n\t\tthis.text = { };\n\t\tlet frame = null;\n\t\twhile ( true ) {\n\t\t\tlet chunkSize = this.readUInt32();\n\t\t\tconst section = ( ( function () {\n\t\t\t\tlet i, _i;\n\t\t\t\tconst _results = [ ];\n\t\t\t\tfor ( i = _i = 0; _i < 4; i = ++_i ) {\n\t\t\t\t\t_results.push( String.fromCharCode( this.data[this.pos++] ) );\n\t\t\t\t}\n\t\t\t\treturn _results;\n\t\t\t} ).call( this ) ).join( '' );\n\t\t\tswitch ( section ) {\n\t\t\t\tcase 'IHDR':\n\t\t\t\t\tthis.width = this.readUInt32();\n\t\t\t\t\tthis.height = this.readUInt32();\n\t\t\t\t\tthis.bits = this.data[this.pos++];\n\t\t\t\t\tthis.colorType = this.data[this.pos++];\n\t\t\t\t\tthis.compressionMethod = this.data[this.pos++];\n\t\t\t\t\tthis.filterMethod = this.data[this.pos++];\n\t\t\t\t\tthis.interlaceMethod = this.data[this.pos++];\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'acTL':\n\t\t\t\t\tthis.animation = {\n\t\t\t\t\t\tnumFrames: this.readUInt32(),\n\t\t\t\t\t\tnumPlays: this.readUInt32() || Infinity,\n\t\t\t\t\t\tframes: [ ]\n\t\t\t\t\t};\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'PLTE':\n\t\t\t\t\tthis.palette = this.read( chunkSize );\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'fcTL':\n\t\t\t\t\tif ( frame ) {\n\t\t\t\t\t\tthis.animation.frames.push( frame );\n\t\t\t\t\t}\n\t\t\t\t\tthis.pos += 4;\n\t\t\t\t\tframe = {\n\t\t\t\t\t\twidth: this.readUInt32(),\n\t\t\t\t\t\theight: this.readUInt32(),\n\t\t\t\t\t\txOffset: this.readUInt32(),\n\t\t\t\t\t\tyOffset: this.readUInt32()\n\t\t\t\t\t};\n\t\t\t\t\tconst delayNum = this.readUInt16();\n\t\t\t\t\tconst delayDen = this.readUInt16() || 100;\n\t\t\t\t\tframe.delay = 1000 * delayNum / delayDen;\n\t\t\t\t\tframe.disposeOp = this.data[this.pos++];\n\t\t\t\t\tframe.blendOp = this.data[this.pos++];\n\t\t\t\t\tframe.data = [ ];\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'IDAT':\n\t\t\t\tcase 'fdAT':\n\t\t\t\t\tif ( section === 'fdAT' ) {\n\t\t\t\t\t\tthis.pos += 4;\n\t\t\t\t\t\tchunkSize -= 4;\n\t\t\t\t\t}\n\t\t\t\t\tdata = ( frame != null ? frame.data : void 0 ) || this.imgData;\n\t\t\t\t\tlet i, _i;\n\t\t\t\t\tfor ( i = _i = 0; 0 <= chunkSize ? _i < chunkSize : _i > chunkSize; i = 0 <= chunkSize ? ++_i : --_i ) {\n\t\t\t\t\t\tdata.push( this.data[this.pos++] );\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'tRNS':\n\t\t\t\t\tthis.transparency = { };\n\t\t\t\t\tswitch ( this.colorType ) {\n\t\t\t\t\t\tcase 3:\n\t\t\t\t\t\t\tthis.transparency.indexed = this.read( chunkSize );\n\t\t\t\t\t\t\tconst short = 255 - this.transparency.indexed.length;\n\t\t\t\t\t\t\tif ( short > 0 ) {\n\t\t\t\t\t\t\t\tlet i, _j;\n\t\t\t\t\t\t\t\tfor ( i = _j = 0; 0 <= short ? _j < short : _j > short; i = 0 <= short ? ++_j : --_j ) {\n\t\t\t\t\t\t\t\t\tthis.transparency.indexed.push( 255 );\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 0:\n\t\t\t\t\t\t\tthis.transparency.grayscale = this.read( chunkSize )[0];\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 2:\n\t\t\t\t\t\t\tthis.transparency.rgb = this.read( chunkSize );\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'tEXt':\n\t\t\t\t\tconst text = this.read( chunkSize );\n\t\t\t\t\tconst index = text.indexOf( 0 );\n\t\t\t\t\tconst key = String.fromCharCode.apply( String, text.slice( 0, index ) );\n\t\t\t\t\tthis.text[key] = String.fromCharCode.apply( String, text.slice( index + 1 ) );\n\t\t\t\t\tbreak;\n\t\t\t\tcase 'IEND':\n\t\t\t\t\tif ( frame ) {\n\t\t\t\t\t\tthis.animation.frames.push( frame );\n\t\t\t\t\t}\n\t\t\t\t\tthis.colors = ( function() {\n\t\t\t\t\t\tswitch ( this.colorType ) {\n\t\t\t\t\t\t\tcase 0:\n\t\t\t\t\t\t\tcase 3:\n\t\t\t\t\t\t\tcase 4:\n\t\t\t\t\t\t\t\treturn 1;\n\t\t\t\t\t\t\tcase 2:\n\t\t\t\t\t\t\tcase 6:\n\t\t\t\t\t\t\t\treturn 3;\n\t\t\t\t\t\t}\n\t\t\t\t\t} ).call( this );\n\t\t\t\t\tthis.hasAlphaChannel = this.colorType === 4 || this.colorType === 6;\n\t\t\t\t\tconst colors = this.colors + ( this.hasAlphaChannel ? 1 : 0 );\n\t\t\t\t\tthis.pixelBitlength = this.bits * colors;\n\t\t\t\t\tthis.colorSpace = ( function () {\n\t\t\t\t\t\tswitch ( this.colors ) {\n\t\t\t\t\t\t\tcase 1:\n\t\t\t\t\t\t\t\treturn 'DeviceGray';\n\t\t\t\t\t\t\tcase 3:\n\t\t\t\t\t\t\t\treturn 'DeviceRGB';\n\t\t\t\t\t\t}\n\t\t\t\t\t} ).call( this );\n\t\t\t\t\tthis.imgData = new Uint8Array( this.imgData );\n\t\t\t\t\treturn;\n\t\t\t\tdefault:\n\t\t\t\t\tthis.pos += chunkSize;\n\t\t\t}\n\t\t\tthis.pos += 4;\n\t\t\tif ( this.pos > this.data.length ) {\n\t\t\t\terror( 'Incomplete or corrupt PNG file' );\n\t\t\t}\n\t\t}\n\t\treturn;\n\t}\n\tread ( bytes ) {\n\t\tlet i, _i;\n\t\tconst _results = [ ];\n\t\tfor ( i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i ) {\n\t\t\t_results.push( this.data[this.pos++] );\n\t\t}\n\t\treturn _results;\n\t}\n\treadUInt32 () {\n\t\tconst b1 = this.data[this.pos++] << 24;\n\t\tconst b2 = this.data[this.pos++] << 16;\n\t\tconst b3 = this.data[this.pos++] << 8;\n\t\tconst b4 = this.data[this.pos++];\n\t\treturn b1 | b2 | b3 | b4;\n\t}\n\treadUInt16 () {\n\t\tconst b1 = this.data[this.pos++] << 8;\n\t\tconst b2 = this.data[this.pos++];\n\t\treturn b1 | b2;\n\t}\n\tdecodePixels ( data ) {\n\t\tif ( data == null ) {\n\t\t\tdata = this.imgData;\n\t\t}\n\t\tif ( data.length === 0 ) {\n\t\t\treturn new Uint8Array(0);\n\t\t}\n\t\tconst stream = new FlateStream( data );\n\t\tdata = stream.getBytes();\n\t\tconst pixelBytes = this.pixelBitlength / 8;\n\t\tconst scanlineLength = pixelBytes * this.width;\n\t\tconst pixels = new Uint8Array( scanlineLength * this.height );\n\t\tconst length = data.length;\n\t\tlet row = 0;\n\t\tlet pos = 0;\n\t\tlet c = 0;\n\t\tlet i = 0;\n\t\tlet _i = 0;\n\t\tlet _j = 0;\n\t\tlet _k = 0;\n\t\tlet _l = 0;\n\t\tlet _m = 0;\n\t\tlet byte;\n\t\tlet col;\n\t\tlet left;\n\t\tlet paeth;\n\t\tlet upper;\n\t\tlet upperLeft;\n\t\twhile ( pos < length ) {\n\t\t\tswitch ( data[pos++] ) {\n\t\t\t\tcase 0:\n\t\t\t\t\tfor ( i = _i = 0; _i < scanlineLength; i = _i += 1 ) {\n\t\t\t\t\t\tpixels[c++] = data[pos++];\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 1:\n\t\t\t\t\tfor ( i = _j = 0; _j < scanlineLength; i = _j += 1 ) {\n\t\t\t\t\t\tbyte = data[pos++];\n\t\t\t\t\t\tleft = i < pixelBytes ? 0 : pixels[c - pixelBytes];\n\t\t\t\t\t\tpixels[c++] = ( byte + left ) % 256;\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 2:\n\t\t\t\t\tfor ( i = _k = 0; _k < scanlineLength; i = _k += 1 ) {\n\t\t\t\t\t\tbyte = data[pos++];\n\t\t\t\t\t\tcol = ( i - ( i % pixelBytes ) ) / pixelBytes;\n\t\t\t\t\t\tupper = row && pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];\n\t\t\t\t\t\tpixels[c++] = ( upper + byte ) % 256;\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 3:\n\t\t\t\t\tfor ( i = _l = 0; _l < scanlineLength; i = _l += 1 ) {\n\t\t\t\t\t\tbyte = data[pos++];\n\t\t\t\t\t\tcol = ( i - ( i % pixelBytes ) ) / pixelBytes;\n\t\t\t\t\t\tleft = i < pixelBytes ? 0 : pixels[c - pixelBytes];\n\t\t\t\t\t\tupper = row && pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];\n\t\t\t\t\t\tpixels[c++] = ( byte + Math.floor( ( left + upper ) / 2 ) ) % 256;\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tcase 4:\n\t\t\t\t\tfor ( i = _m = 0; _m < scanlineLength; i = _m += 1 ) {\n\t\t\t\t\t\tbyte = data[pos++];\n\t\t\t\t\t\tcol = ( i - ( i % pixelBytes ) ) / pixelBytes;\n\t\t\t\t\t\tleft = i < pixelBytes ? 0 : pixels[c - pixelBytes];\n\t\t\t\t\t\tif ( row === 0 ) {\n\t\t\t\t\t\t\tupper = upperLeft = 0;\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tupper = pixels[( row - 1 ) * scanlineLength + col * pixelBytes + ( i % pixelBytes )];\n\t\t\t\t\t\t\tupperLeft = col && pixels[( row - 1 ) * scanlineLength + ( col - 1 ) * pixelBytes + ( i % pixelBytes )];\n\t\t\t\t\t\t}\n\t\t\t\t\t\tconst p = left + upper - upperLeft;\n\t\t\t\t\t\tconst pa = Math.abs(p - left);\n\t\t\t\t\t\tconst pb = Math.abs(p - upper);\n\t\t\t\t\t\tconst pc = Math.abs(p - upperLeft);\n\t\t\t\t\t\tif ( pa <= pb && pa <= pc ) {\n\t\t\t\t\t\t\tpaeth = left;\n\t\t\t\t\t\t} else if ( pb <= pc ) {\n\t\t\t\t\t\t\tpaeth = upper;\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tpaeth = upperLeft;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tpixels[c++] = (byte + paeth) % 256;\n\t\t\t\t\t}\n\t\t\t\t\tbreak;\n\t\t\t\tdefault:\n\t\t\t\t\terror( 'Invalid filter algorithm: ' + data[pos - 1] );\n\t\t\t}\n\t\t\trow++;\n\t\t}\n\t\treturn pixels;\n\t}\n\tdecodePalette () {\n\t\tconst palette = this.palette;\n\t\tconst transparency = this.transparency.indexed || [ ];\n\t\tconst result = new Uint8Array( ( transparency.length || 0 ) + palette.length );\n\t\tlet pos = 0;\n\t\tlet c = 0;\n\t\tlet i, _i, _ref, _ref1;\n\t\tfor ( i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3 ) {\n\t\t\tresult[pos++] = palette[i];\n\t\t\tresult[pos++] = palette[i + 1];\n\t\t\tresult[pos++] = palette[i + 2];\n\t\t\tresult[pos++] = ( _ref1 = transparency[c++] ) != null ? _ref1 : 255;\n\t\t}\n\t\treturn result;\n\t}\n\tdecodeFrames () {\n\t\tif ( this.animation) {\n\t\t\tconst frameCount = this.animation.frames.length;\n\t\t\tconst decodedFrames = [ ];\n\t\t\tfor ( let i = 0; i < frameCount; ++i ) {\n\t\t\t\tconst frame = this.animation.frames[i];\n\t\t\t\tdecodedFrames[i] = this.decodePixels( new Uint8Array( frame.data ) );\n\t\t\t}\n\t\t\treturn decodedFrames;\n\t\t}\n\t}\n}\n\nself.addEventListener( 'message', event => {\n\tlet data = event.data;\n\tconst id = data.id;\n\tif ( data.type === 'fromURL' && data.message ) {\n\t\tfromURL( data.message )\n\t\t\t.then( png => {\n\t\t\t\tpng.pixels = png.decodePixels();\n\t\t\t\tpng.decodedPalette = png.decodePalette();\n\t\t\t\tif ( png.animation ) {\n\t\t\t\t\tpng.decodeFrames().forEach( ( decodedFrame, index ) => {\n\t\t\t\t\t\tpng.animation.frames[index].decoded = decodedFrame;\n\t\t\t\t\t} );\n\t\t\t\t}\n\t\t\t\tsendMessage( 'fromUrl', png, id );\n\t\t\t}, err => {\n\t\t\t\tsendMessage( 'error', err.message || err, id );\n\t\t\t} );\n\t}\n\tif ( data.type === 'fromImageData' && data.message ) {\n\t\tfromImageData( data.message )\n\t\t\t.then( png => {\n\t\t\t\tsendMessage( 'fromImageData', png, id );\n\t\t\t}, err => {\n\t\t\t\tsendMessage( 'error', err.message || err, id );\n\t\t\t} );\n\t}\n} );\nfunction sendMessage ( type, message, id ) {\n\tconst msg = { type, message, id, time: Date.now() };\n\tself.postMessage( msg );\n}\nfunction fromURL ( url ) {\n\treturn loadPNG( url );\n}\nfunction fromImageData ( imageData ) {\n\treturn new Promise ( ( resolve, reject ) => {\n\t\ttry {\n\t\t\tresolve( new PNG( imageData.data || imageData ) );\n\t\t} catch ( err ) {\n\t\t\treject( err );\n\t\t}\n\t} );\n}\n"],{type:'0'})) );
function fromURL ( url ) {
	return sendMessage( 'fromURL', resolveUrl( url ) );
}
function fromImageData ( imageData ) {
	return sendMessage( 'fromImageData', imageData );
}
function sendMessage ( type, message ) {
	return new Promise ( ( resolve, reject ) => {
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
function toImageData ( pngData, ctx = null ) {
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
function renderToCanvas ( pngData, canvas, resizeCanvas = false, preventAnimation = false ) {
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
function renderToContext ( pngData, ctx, x = 0, y = 0 ) {
	const imageData = toImageData( pngData, ctx );
	return ctx.putImageData( imageData, x, y );
}
function animateOnContext ( pngData, canvas, ctx ) {
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
const APNG_DISPOSE_OP_BACKGROUND = 1;
const APNG_DISPOSE_OP_PREVIOUS = 2;
const APNG_BLEND_OP_SOURCE = 0;
function renderAnimationFrame ( pngData, ctx, frameIndex ) {
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

export { fromURL, fromImageData, toImageData, renderToCanvas, renderToContext, animateOnContext, renderAnimationFrame };
