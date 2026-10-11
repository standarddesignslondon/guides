// PrintLook - the texture library: distress maps made from Simon's own texture collection (_TEXTURES_FOR_CLAUDE).
// Each map (textures/<id>.bin) is 8-bit, 255 = the texture's marks (where ink fails), with a 257-entry table of quantiles
// so that an amount can be turned into a threshold. texelUm is the size of one texel on paper, worked out from the source
// scan's pixel count and an assumed scan resolution (1200 dpi for the large scans, 300 dpi for the small ones): an estimate.
const TEXTURES = [
{
"id": "roller_blotchy",
"label": "Foam roller, blotchy",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "roller_patchy",
"label": "Foam roller, patchy",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "roller_fine",
"label": "Foam roller, fine",
"cat": "Rollers and brushes",
"dir": 1,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "roller_speckled",
"label": "Roller, speckled",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 228.0,
"w": 1162,
"h": 1600,
"polarity": "light",
"src": [
15272,
21020
],
"dpiAssumed": 1200
},
{
"id": "brush_streaky",
"label": "Brush, streaky",
"cat": "Rollers and brushes",
"dir": 1,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "brush_dry",
"label": "Brush, dry",
"cat": "Rollers and brushes",
"dir": 1,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "sponge_open",
"label": "Sponge, open",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "light",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "sponge_heavy",
"label": "Sponge, heavy",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 151.5,
"w": 1168,
"h": 1600,
"polarity": "light",
"src": [
10200,
13968
],
"dpiAssumed": 1200
},
{
"id": "block_worn",
"label": "Worn block",
"cat": "Rollers and brushes",
"dir": 0,
"texelUm": 184.3,
"w": 1052,
"h": 1600,
"polarity": "light",
"src": [
3270,
4976
],
"dpiAssumed": 300
},
{
"id": "wood_grain_fine",
"label": "Wood grain, fine",
"cat": "Wood",
"dir": 1,
"texelUm": 153.7,
"w": 1120,
"h": 1600,
"polarity": "dark",
"src": [
9921,
14173
],
"dpiAssumed": 1200
},
{
"id": "wood_grain_bold",
"label": "Wood grain, bold",
"cat": "Wood",
"dir": 1,
"texelUm": 153.7,
"w": 1120,
"h": 1600,
"polarity": "light",
"src": [
9921,
14173
],
"dpiAssumed": 1200
},
{
"id": "woodtype_a",
"label": "Wood type, light wear",
"cat": "Wood",
"dir": 0,
"texelUm": 92.8,
"w": 1600,
"h": 1508,
"polarity": "dark",
"src": [
3508,
4961
],
"dpiAssumed": 300
},
{
"id": "woodtype_b",
"label": "Wood type, worn",
"cat": "Wood",
"dir": 0,
"texelUm": 92.8,
"w": 1600,
"h": 1508,
"polarity": "dark",
"src": [
3508,
4961
],
"dpiAssumed": 300
},
{
"id": "woodtype_c",
"label": "Wood type, battered",
"cat": "Wood",
"dir": 0,
"texelUm": 92.8,
"w": 1600,
"h": 1508,
"polarity": "dark",
"src": [
3508,
4961
],
"dpiAssumed": 300
},
{
"id": "chipboard",
"label": "Chipboard pits",
"cat": "Specks and grit",
"dir": 0,
"texelUm": 130.2,
"w": 1280,
"h": 1600,
"polarity": "dark",
"src": [
9601,
12000
],
"dpiAssumed": 1200
},
{
"id": "grit_mixed",
"label": "Grit, mixed",
"cat": "Specks and grit",
"dir": 0,
"texelUm": 144.7,
"w": 1156,
"h": 1600,
"polarity": "dark",
"src": [
9637,
13340
],
"dpiAssumed": 1200
},
{
"id": "concrete_pits",
"label": "Concrete pits",
"cat": "Specks and grit",
"dir": 0,
"texelUm": 130.2,
"w": 1600,
"h": 1200,
"polarity": "dark",
"src": [
12000,
9000
],
"dpiAssumed": 1200
},
{
"id": "halftone_grit",
"label": "Halftone grit",
"cat": "Specks and grit",
"dir": 0,
"texelUm": 152.0,
"w": 1118,
"h": 1600,
"polarity": "dark",
"src": [
9792,
14010
],
"dpiAssumed": 1200
},
{
"id": "copy_toner",
"label": "Photocopy, toner specks",
"cat": "Photocopy",
"dir": 0,
"texelUm": 143.7,
"w": 1236,
"h": 1600,
"polarity": "dark",
"src": [
10236,
13248
],
"dpiAssumed": 1200
},
{
"id": "copy_dropout",
"label": "Photocopy, dropout",
"cat": "Photocopy",
"dir": 0,
"texelUm": 139.3,
"w": 1237,
"h": 1600,
"polarity": "light",
"src": [
9922,
12840
],
"dpiAssumed": 1200
},
{
"id": "copy_streaks",
"label": "Photocopy, streaks",
"cat": "Photocopy",
"dir": 1,
"texelUm": 140.2,
"w": 1237,
"h": 1600,
"polarity": "dark",
"src": [
9987,
12924
],
"dpiAssumed": 1200
},
{
"id": "copy_grain",
"label": "Photocopy, grain",
"cat": "Photocopy",
"dir": 0,
"texelUm": 143.2,
"w": 1236,
"h": 1600,
"polarity": "dark",
"src": [
10200,
13200
],
"dpiAssumed": 1200
},
{
"id": "scratches",
"label": "Scratches",
"cat": "Age and damage",
"dir": 0,
"texelUm": 133.6,
"w": 1247,
"h": 1600,
"polarity": "dark",
"src": [
9600,
12316
],
"dpiAssumed": 1200
},
{
"id": "cracked",
"label": "Cracked ink",
"cat": "Age and damage",
"dir": 0,
"texelUm": 153.7,
"w": 1120,
"h": 1600,
"polarity": "dark",
"src": [
9921,
14173
],
"dpiAssumed": 1200
},
{
"id": "flaking",
"label": "Flaking",
"cat": "Age and damage",
"dir": 0,
"texelUm": 153.7,
"w": 1120,
"h": 1600,
"polarity": "dark",
"src": [
9921,
14173
],
"dpiAssumed": 1200
},
{
"id": "scrapes",
"label": "Scrapes",
"cat": "Age and damage",
"dir": 0,
"texelUm": 173.6,
"w": 1600,
"h": 1200,
"polarity": "dark",
"src": [
4000,
3000
],
"dpiAssumed": 300
}
];
// Read one textures/<id>.bin (an ArrayBuffer or Uint8Array) into { w, h, dir, q (257 quantiles), data, texelUm }.
function parseBin(buf, id) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (u8.length < 266 || u8[0] !== 80 || u8[1] !== 76 || u8[2] !== 84 || u8[3] !== 49) throw new Error("not a PrintLook texture" + (id ? " (" + id + ")" : ""));
    const w = u8[4] | (u8[5] << 8), h = u8[6] | (u8[7] << 8), dir = u8[8];
    if (u8.length < 266 + w * h) throw new Error("texture file is short" + (id ? " (" + id + ")" : ""));
    const meta = TEXTURES.find(t => t.id === id) || {};
    return { id, w, h, dir, q: u8.slice(9, 266), data: u8.subarray(266, 266 + w * h), texelUm: meta.texelUm || 150, label: meta.label || id };
}
const byId = (id) => TEXTURES.find(t => t.id === id) || null;
module.exports = { TEXTURES, parseBin, byId };
