function __com_mochibot__(swfid, mc, lv, trk)
{
   var x;
   var g;
   var s;
   var fv;
   var sb;
   var u;
   var res;
   var mb;
   var mbc;
   mb = "__mochibot__";
   mbc = "mochibot.com";
   g = !_global ? _level0._root : _global;
   if(g[mb + swfid])
   {
      return g[mb + swfid];
   }
   s = System.security;
   x = mc._root.getSWFVersion;
   fv = !x ? (!_global ? 5 : 6) : mc.getSWFVersion();
   if(!s)
   {
      s = {};
   }
   sb = s.sandboxType;
   if(sb == "localWithFile")
   {
      return null;
   }
   x = s.allowDomain;
   if(x)
   {
      s.allowDomain(mbc);
   }
   x = s.allowInsecureDomain;
   if(x)
   {
      s.allowInsecureDomain(mbc);
   }
   u = "http://" + mbc + "/my/core.swf?mv=7&fv=" + fv + "&v=" + escape(getVersion()) + "&swfid=" + escape(swfid) + "&l=" + lv + "&f=" + mc + (!sb ? "" : "&sb=" + sb) + (!trk ? "" : "&t=1");
   lv = fv <= 6 ? (!g[mb + "level"] ? lv : g[mb + "level"] + 1) : mc.getNextHighestDepth();
   g[mb + "level"] = lv;
   if(fv == 5)
   {
      res = "_level" + lv;
      if(!eval(res))
      {
         loadMovieNum(u,lv);
      }
   }
   else
   {
      res = mc.createEmptyMovieClip(mb + swfid,lv);
      res.loadMovie(u);
   }
   return res;
}
__com_mochibot__("87604af8",this,10301,true);
