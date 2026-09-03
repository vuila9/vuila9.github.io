upspeed = 10 + random(10);
sidespeed = random(10) - random(10);
spin = random(30) + random(30);
bounces = 0;
this.onEnterFrame = function()
{
   if(Math.abs(_X - _parent.Player._x) > 400)
   {
      removeMovieClip(this);
   }
   if(_Y >= _root.groundlevel && upspeed < 0)
   {
      if(bounces < 2)
      {
         upspeed = Math.abs(upspeed) / 2.5;
         spin /= 1.5;
         bounces++;
         _root.blood(4,this,0);
      }
   }
   else
   {
      _Y = _Y - upspeed;
      _X = _X + sidespeed;
      upspeed--;
      _rotation = _rotation + spin;
      _root.blood(1,this,0);
   }
};
