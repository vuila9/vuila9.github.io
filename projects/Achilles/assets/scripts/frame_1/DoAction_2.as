if(baramount == undefined)
{
   baramount = 0;
}
loadedamount = Math.round(_root.getBytesLoaded() / _root.getBytesTotal() * 100);
if(baramount < loadedamount)
{
   baramount++;
}
loadedtext = baramount + "%";
if(baramount >= 100)
{
   gotoAndStop("menu");
}
currUrl = _url.toLowerCase();
if(currUrl.indexOf("newgrounds.com") <= 0 && currUrl.indexOf("kongregate.com") <= 0 && currUrl.indexOf("gamegarage.co.uk") <= 0 && currUrl.indexOf("addictinggames.com") <= 0)
{
   strWindow = "";
}
else
{
   strWindow = "_blank";
}
