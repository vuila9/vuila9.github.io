this.onEnterFrame = function()
{
   if(Math.abs(_X - _parent.Player._x) > 500)
   {
      removeMovieClip(this);
   }
   _root.gravity(this);
   if(_Y >= 0)
   {
      if(_parent.Player.ducking == true)
      {
         if(Math.abs(_X - _parent.Player._x) < 75 && _parent.Player.spear != true)
         {
            _parent.Player.spear = true;
            _parent.Player.gotoAndPlay(1);
            removeMovieClip(this);
         }
      }
   }
   else
   {
      if(upspeed == undefined)
      {
         upspeed = random(10);
         sidespeed = random(10) - random(10);
      }
      _Y = _Y - upspeed;
      _X = _X + sidespeed;
      upspeed--;
      _root.gravity(this);
   }
};
