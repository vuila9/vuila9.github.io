if(_root.getBytesLoaded() == _root.getBytesTotal())
{
   gotoAndStop(3);
}
else
{
   loadedtext = Math.round(_root.getBytesLoaded() / _root.getBytesTotal() * 100) + "% Loaded";
}
