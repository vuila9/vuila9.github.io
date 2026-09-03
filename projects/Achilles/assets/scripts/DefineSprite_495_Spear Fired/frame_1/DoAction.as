this.onEnterFrame = function()
{
   if(Math.abs(_X - _parent.Player._x) > 400)
   {
      removeMovieClip(this);
   }
   if(_Y >= 0)
   {
      if(_parent.Player.ducking == true)
      {
         if(Math.abs(_X - _parent.Player._x) < 75)
         {
            _parent.Player.spear = true;
            _parent.Player.gotoAndPlay(1);
            removeMovieClip(this);
         }
      }
   }
   if(_Y < 0)
   {
      if(spin == true)
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
         if(Firer == _parent.Player)
         {
            i = 1;
            while(i <= 30)
            {
               totest = _parent["enemy" + i];
               if(this.hitTest(totest) && totest != Firer && totest.dead != true)
               {
                  if(totest.ducking == false)
                  {
                     totest.health -= 20 + random(10);
                     if(totest.health <= 0)
                     {
                        _root.Kills = _root.Kills + 1;
                        totest.gotoAndPlay("speareye");
                     }
                     else
                     {
                        totest.gotoAndPlay("MIDDLEhit");
                     }
                     removeMovieClip(this);
                     _root.combatsound("slice3");
                  }
                  else
                  {
                     _root.combatsound("block");
                  }
               }
               i++;
            }
         }
         else
         {
            totest = _parent.Player;
            if(this.hitTest(totest) && totest != Firer && totest.dead != true && (totest.invunrabilitytimer == undefined || totest.invunrabilitytimer <= 0))
            {
               if(totest.ducking == false)
               {
                  totest.health -= 20 + random(10);
                  if(totest.health <= 0)
                  {
                     totest.gotoAndPlay("die1");
                  }
                  else
                  {
                     totest.gotoAndPlay("MIDDLEhit");
                  }
                  _root.combatsound("slice3");
                  removeMovieClip(this);
               }
               else
               {
                  spin = true;
                  _root.combatsound("block" + (random(1) + 1));
               }
            }
         }
      }
   }
};
