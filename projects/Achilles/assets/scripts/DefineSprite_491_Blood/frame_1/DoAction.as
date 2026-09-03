gotoAndStop(random(5) + 1);
this.onEnterFrame = function()
{
   if(_Y >= _root.groundlevel)
   {
      _yscale = 50;
      _xscale = 150;
      if(_X - _parent.Player._x < -400)
      {
         removeMovieClip(this);
      }
   }
   else
   {
      _Y = _Y - upspeed;
      _X = _X + sidespeed;
      upspeed--;
   }
};
