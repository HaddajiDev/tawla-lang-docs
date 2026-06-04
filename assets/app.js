// Tawla docs — interactivity: theme, mobile nav, scrollspy, search, code copy,
// and a small Tawla syntax highlighter.
(function () {
  "use strict";

  /* ---------------- Theme ---------------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("tawla-theme"); } catch (e) {}
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    root.setAttribute("data-theme", "light");
  } else {
    root.setAttribute("data-theme", "dark");
  }
  var themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("tawla-theme", next); } catch (e) {}
    });
  }

  /* ---------------- Mobile nav ---------------- */
  var menuBtn = document.getElementById("menu-btn");
  var scrim = document.querySelector(".scrim");
  function closeNav() { document.body.classList.remove("nav-open"); }
  if (menuBtn) menuBtn.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  if (scrim) scrim.addEventListener("click", closeNav);
  document.querySelectorAll(".sidebar a").forEach(function (a) {
    a.addEventListener("click", closeNav);
  });

  /* ---------------- Syntax highlighting ---------------- */
  var KEYWORDS = new Set([
    "class", "interface", "abstract", "new", "this", "super", "import", "return",
    "if", "else", "while", "for", "var", "public", "protected", "private", "extends"
  ]);
  var TYPES = new Set(["int", "float", "double", "bool", "string", "void"]);
  var CONST = new Set(["true", "false", "null"]);

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightTwl(src) {
    var out = "";
    var re = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\s\w])/g;
    var m;
    while ((m = re.exec(src)) !== null) {
      if (m[1] !== undefined) {                       // comment
        out += '<span class="tok-comment">' + esc(m[1]) + "</span>";
      } else if (m[2] !== undefined) {                // string
        out += '<span class="tok-string">' + esc(m[2]) + "</span>";
      } else if (m[3] !== undefined) {                // number
        out += '<span class="tok-number">' + esc(m[3]) + "</span>";
      } else if (m[4] !== undefined) {                // identifier
        var word = m[4];
        var rest = src.slice(re.lastIndex);
        if (KEYWORDS.has(word)) {
          out += '<span class="tok-keyword">' + esc(word) + "</span>";
        } else if (TYPES.has(word) || CONST.has(word)) {
          out += '<span class="tok-type">' + esc(word) + "</span>";
        } else if (/^\s*\(/.test(rest)) {             // call: name(
          out += '<span class="tok-fn">' + esc(word) + "</span>";
        } else if (/^[A-Z]/.test(word)) {             // Capitalized => class/type name
          out += '<span class="tok-type">' + esc(word) + "</span>";
        } else {
          out += esc(word);
        }
      } else if (m[5] !== undefined) {                // whitespace
        out += m[5];
      } else {                                        // punctuation
        out += '<span class="tok-punct">' + esc(m[6]) + "</span>";
      }
    }
    return out;
  }

  document.querySelectorAll("pre code.twl").forEach(function (code) {
    code.innerHTML = highlightTwl(code.textContent);
  });

  // shell blocks: highlight the leading $ prompt
  document.querySelectorAll("pre code.shell").forEach(function (code) {
    var html = code.textContent.split("\n").map(function (line) {
      return line.replace(/^(\s*)(\$)(\s)/, '$1<span class="prompt">$2</span>$3');
    }).join("\n");
    code.innerHTML = html;
  });

  /* ---------------- Copy buttons ---------------- */
  document.querySelectorAll(".code").forEach(function (block) {
    var btn = block.querySelector(".copy-btn");
    var code = block.querySelector("pre code");
    if (!btn || !code) return;
    btn.addEventListener("click", function () {
      var text = code.textContent;
      var done = function () {
        btn.classList.add("copied");
        var label = btn.querySelector(".copy-label");
        var prev = label ? label.textContent : "";
        if (label) label.textContent = "Copied";
        setTimeout(function () { btn.classList.remove("copied"); if (label) label.textContent = prev; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });

  /* ---------------- Scrollspy ---------------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".sidebar a[href^='#']"));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href").slice(1) === id); });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      });
      // pick the topmost visible section
      var best = null, bestTop = Infinity;
      visible.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var top = el.getBoundingClientRect().top;
        if (top < bestTop) { bestTop = top; best = id; }
      });
      if (best) setActive(best);
    }, { rootMargin: "-70px 0px -70% 0px", threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- Search filter ---------------- */
  var search = document.getElementById("search");
  if (search) {
    var groups = Array.prototype.slice.call(document.querySelectorAll(".nav-group"));
    var noResults = document.querySelector(".no-results");
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var anyVisible = false;
      groups.forEach(function (group) {
        var groupHas = false;
        group.querySelectorAll("a").forEach(function (a) {
          var match = !q || a.textContent.toLowerCase().indexOf(q) !== -1;
          a.classList.toggle("hidden-search", !match);
          if (match) { groupHas = true; anyVisible = true; }
        });
        group.style.display = groupHas ? "" : "none";
      });
      if (noResults) noResults.style.display = anyVisible ? "none" : "block";
    });
    // "/" focuses search
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== search &&
          !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); search.focus();
      }
    });
  }
})();
