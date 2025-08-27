export function buildInjected(opts: {
  aggressiveDomHooking: boolean;
  echoAllRequestsFromJS: boolean;
}) {
  const {aggressiveDomHooking, echoAllRequestsFromJS} = opts;
  return `
(function(){
  var ECHO_ALL = ${echoAllRequestsFromJS ? 'true' : 'false'};

  // Post is a no-op because we are relying on native shouldInterceptRequest for request logging.
  function post(kind, url){
    try{ /* intentionally left blank */ }catch(e){}
  }

  function isMediaLike(url){
    try{ url = String(url || ''); }catch(e){ return false; }
    return /(\.m3u8(\?.*)?$)|(\.mp4(\?.*)?$)|(\.webm(\?.*)?$)|(\.mpd(\?.*)?$)|(\.ts(\?.*)?$)/i.test(url);
  }

  function hookVideoEl(v){
    if (!v || v.__rn_hooked) return; v.__rn_hooked = true;
    function emit(){
      try {
        var src = v.currentSrc || v.src;
        if (src && (isMediaLike(src) || ECHO_ALL)) post('video', src);
      } catch(e){}
    }
    emit();
    v.addEventListener('loadedmetadata', emit, { passive: true });
    v.addEventListener('loadstart', emit, { passive: true });
    var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (desc && desc.set) {
      try {
        Object.defineProperty(v, 'src', {
          set: function(val){ try{ post('video', val); }catch(e){} return desc.set.call(this, val); },
          get: function(){ return desc.get.call(this); }
        });
      } catch(e) {}
    }
  }

  function scanDoc(doc){
    try{
      var vids = doc.getElementsByTagName('video');
      for (var i=0;i<vids.length;i++) hookVideoEl(vids[i]);
      var sources = doc.getElementsByTagName('source');
      for (var k=0;k<sources.length;k++){
        try{ var p = sources[k].parentElement; if (p && p.tagName==='VIDEO') hookVideoEl(p); }catch(e){}
      }
    }catch(e){}
  }

  function hookIframes(){
    try{
      var ifr = document.getElementsByTagName('iframe');
      for (var i=0;i<ifr.length;i++){
        var f = ifr[i];
        try{ scanDoc(f.contentDocument); }catch(e){}
        try{ f.addEventListener('load', function(){ try{ scanDoc(this.contentDocument); }catch(e){} }, { passive: true }); }catch(e){}
      }
    }catch(e){}
  }

  scanDoc(document);
  hookIframes();

  ${
    aggressiveDomHooking
      ? `
  try{
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var nodes = muts[i].addedNodes;
        for (var j=0;j<nodes.length;j++){
          var n = nodes[j];
          try{
            if (n.tagName === 'VIDEO') hookVideoEl(n);
            if (n.tagName === 'SOURCE' && n.parentElement && n.parentElement.tagName==='VIDEO') hookVideoEl(n.parentElement);
            if (n.tagName === 'IFRAME' && n.contentDocument) scanDoc(n.contentDocument);
            if (n.querySelectorAll){
              var vs = n.querySelectorAll('video'); for (var x=0;x<vs.length;x++) hookVideoEl(vs[x]);
              var ss = n.querySelectorAll('source'); for (var s=0;s<ss.length;s++){ try{ var pe = ss[s].parentElement; if (pe && pe.tagName==='VIDEO') hookVideoEl(pe);}catch(e){} }
              var fs = n.querySelectorAll('iframe'); for (var y=0;y<fs.length;y++) try{ scanDoc(fs[y].contentDocument); }catch(e){}
            }
          }catch(e){}
        }
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }catch(e){}
  `
      : ''
  }
})();
true;`;
}
