(function() {
  var origin = window.location.origin.replace(/\/+$/, '');
  var currentPage = window.location.href.replace(/\/+$/, '');

  fetch('https://freeutilities.pages.dev/crosslinks.json')
    .then(function(r) { return r.json(); })
    .then(function(sites) {
      var myGroup = null;
      for (var i = 0; i < sites.length; i++) {
        var u = sites[i].url.replace(/\/+$/, '');
        if (u === origin || u === currentPage) {
          myGroup = sites[i].group;
          break;
        }
      }
      if (!myGroup) return;

      var links = sites.filter(function(site) {
        var u = site.url.replace(/\/+$/, '');
        return site.group === myGroup && u !== origin && u !== currentPage;
      });
      if (links.length === 0) return;

      var s = document.createElement('link');
      s.rel = 'stylesheet';
      s.href = 'https://freeutilities.pages.dev/crosslinks.css';
      document.head.appendChild(s);

      var d = document.createElement('div');
      d.id = 'opencode-crosslinks';
      d.innerHTML = '<div style="max-width:1200px;margin:0 auto;padding:12px 16px;font-size:13px">' +
        '<strong style="margin-right:8px">🔗 함께 보면 좋은 사이트:</strong>' +
        '<span id="opencode-links"></span></div>';
      d.style.cssText = 'background:#f5f5f5;border-top:1px solid #e0e0e0;font-family:sans-serif;text-align:center;width:100%';
      document.body.appendChild(d);

      var html = links.map(function(site) {
        return '<a href="' + site.url + '" style="color:#333;text-decoration:none;margin:0 6px;white-space:nowrap" title="' + site.desc + '">' + site.name + '</a>';
      }).join('<span style="color:#ccc;margin:0 2px">|</span>');
      document.getElementById('opencode-links').innerHTML = html;
    })
    .catch(function() {});
})();
