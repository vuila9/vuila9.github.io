this.onEnterFrame = function()
{
   _visible = _parent.lostlimb != "head";
};
if(_parent == _root.Player || _parent.type == undefined && _parent.losthead != true)
{
   gotoAndStop(1);
}
else
{
   gotoAndStop(_root.level + 1);
}
