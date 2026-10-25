// Writes every font in Illustrator's font menu to illustrator-fonts.tsv beside this script.
#target illustrator
(function () {
  var here = File($.fileName).parent;
  var f = new File(here.fsName + "/illustrator-fonts.tsv");
  f.encoding = "UTF-8"; f.open("w");
  f.writeln("family\tstyle\tpostscript_name");
  var n = app.textFonts.length;
  for (var i = 0; i < n; i++) {
    var t = app.textFonts[i];
    f.writeln(t.family + "\t" + t.style + "\t" + t.name);
  }
  f.close();
  alert("Exported " + n + " fonts to\n" + f.fsName);
})();
