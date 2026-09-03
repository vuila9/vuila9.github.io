this.onEnterFrame = function()
{
   if(Math.abs(_X - _parent.Player._x) > 400)
   {
      removeMovieClip(this);
   }
   if(_Y < 0)
   {
      if(spin == true)
      {
         if(upspeed == undefined)
         {
            upspeed = random(10);
            sidespeed = random(10) - random(10);
            spinspeed = random(100) - random(100);
         }
         _rotation = _rotation + spinspeed;
         _Y = _Y - upspeed;
         _X = _X + sidespeed;
         upspeed--;
         _root.gravity(this);
      }
      else
      {
         if(_xscale > 0)
         {
            speed = 50;
         }
         else
         {
            speed = -50;
         }
         _X = _X + speed;
         if(this.hitTest(_parent.Player) && (_parent.Player.invunrabilitytimer == undefined || _parent.Player.invunrabilitytimer <= 0))
         {
            if(_parent.Player.ducking == false)
            {
               _parent.Player.health -= 2 + random(3);
               if(_parent.Player.health <= 0)
               {
                  _parent.Player.gotoAndPlay("die1");
               }
               _parent.Player.gotoAndPlay("MIDDLEhit");
               _root.combatsound("slice3");
               _root.red.gotoAndPlay(2);
               removeMovieClip(this);
            }
            else
            {
               spin = true;
               _root.combatsound("block" + (random(2) + 1));
            }
         }
      }
   }
};
