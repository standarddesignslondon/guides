// Writes every font in Photoshop's font menu to photoshop-fonts.tsv beside this script.
#target photoshop
(function () {
  var here = File($.fileName).parent;
  var f = new File(here.fsName + "/photoshop-fonts.tsv");
  f.encoding = "UTF-8"; f.open("w");
  f.writeln("family\tstyle\tpostscript_name");
  var n = app.fonts.length;
  for (var i = 0; i < n; i++) {
    var t = app.fonts[i];
    f.writeln(t.family + "\t" + t.style + "\t" + t.postScriptName);
  }
  f.close();
  alert("Exported " + n + " fonts to\n" + f.fsName);
})();
