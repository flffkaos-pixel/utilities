// Cross-linking banner for flffkaos-pixel sites
(function() {
  var s = document.createElement('link');
  s.rel = 'stylesheet';
  s.href = 'https://freeutilities.pages.dev/crosslinks.css';
  document.head.appendChild(s);

  var d = document.createElement('div');
  d.id = 'opencode-crosslinks';
  d.innerHTML = '<div style="max-width:1200px;margin:0 auto;padding:12px 16px;font-size:13px">' +
    '<strong style="margin-right:8px">🔗 내 다른 사이트:</strong>' +
    '<span id="opencode-links"></span>' +
    '</div>';
  d.style.cssText = 'background:#f5f5f5;border-top:1px solid #e0e0e0;font-family:sans-serif;text-align:center;width:100%';

  fetch('https://freeutilities.pages.dev/crosslinks.json')
    .then(function(r) { return r.json(); })
    .then(function(sites) {
      var html = '';
      sites.forEach(function(site, i) {
        if (site.url !== window.location.origin + '/') {
          html += '<a href="' + site.url + '" style="color:#333;text-decoration:none;margin:0 6px;white-space:nowrap" title="' + site.desc + '">' + site.name + '</a>';
          if (i < sites.length - 1) html += '<span style="color:#ccc;margin:0 2px">|</span>';
        }
      });
      document.getElementById('opencode-links').innerHTML = html;
    })
    .catch(function() {});
})();
