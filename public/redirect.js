(function() {
  var p = window.location.pathname;
  var s = window.location.search || '';
  var host = window.location.hostname;
  
  // Suporte a subdiretório no GitHub Pages (ex: /painel-megatv/)
  if (host.includes('github.io')) {
    var match = p.match(/^\/([^\/]+)(.*)$/);
    if (match) {
      var repo = match[1];
      var rest = match[2] ? match[2].replace(/^\/+/, '') : '';
      if (rest && rest !== 'index.html') {
        window.location.replace('/' + repo + '/#/' + rest + s);
      }
      return;
    }
  }

  // Suporte a domínio próprio na raiz (ex: painel.megatv.lol)
  if (p && p !== '/' && p !== '/index.html') {
    var clean = p.replace(/^\/+/, '');
    window.location.replace('/#/' + clean + s);
  }
})();
