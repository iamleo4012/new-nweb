const fs = require("fs");
const t = fs.readFileSync("public/wishlist.html", "utf8");
// Extract the script block and validate it parses (no syntax errors)
const scriptStart = t.indexOf("<script>\n    /* ===== Cart Store");
const scriptEnd = t.indexOf("</script>", scriptStart);
const js = t.slice(scriptStart + "<script>".length, scriptEnd);
try {
  new Function(js);
  console.log("SCRIPT PARSES OK (no syntax errors)");
} catch (e) {
  console.log("SYNTAX ERROR:", e.message);
}
// Confirm single removeItem + both call sites
console.log("removeItem definitions:", (t.match(/function removeItem\(/g) || []).length);
console.log("desktop X call:", /onclick="event\.stopPropagation\(\);removeItem\\(/.test(t));
console.log("mobile heart call:", /removeItem\(rmv\.getAttribute/.test(t));
