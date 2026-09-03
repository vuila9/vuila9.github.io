function die(obj)
{
   if(obj.dead != true)
   {
      obj.dead = true;
      if(gamemode == 1)
      {
         totalenemies--;
         if(totalenemies <= 0)
         {
            _root.Message = "Stage Complete";
            if(level < 5 || levelstage < 3)
            {
               fade.play();
            }
         }
      }
   }
}
function combatsound(playsound)
{
   if(option_sound != false)
   {
      _root.combatsounds.gotoAndStop(playsound);
   }
}
function playmusic(playsound)
{
   if(option_music != false)
   {
      stopAllSounds();
      _root.music.gotoAndStop(playsound);
   }
}
function CreateEnemy()
{
   IncrementObjectNum();
   if(enemynum >= 30)
   {
      enemynum = 0;
   }
   if(enemynum < 30 && tocreate > 0)
   {
      enemynum++;
      if(hasboss == true && tocreate == 1)
      {
         game.attachMovie("Boss " + level,"enemy" + enemynum,objectnum);
         game["enemy" + enemynum].health = 80 + 20 * level;
      }
      else if(Math.random() > 0.5)
      {
         game.attachMovie("Swordsman","enemy" + enemynum,objectnum);
      }
      else if(Math.random() > 0.5)
      {
         game.attachMovie("Spearman","enemy" + enemynum,objectnum);
      }
      else
      {
         game.attachMovie("Archer","enemy" + enemynum,objectnum);
      }
      if(Math.random() > 0.3)
      {
         game["enemy" + enemynum]._x = game.Player._x + 500;
      }
      else
      {
         game["enemy" + enemynum]._x = game.Player._x - 500;
      }
      game["enemy" + enemynum]._y = game.Player._x;
      game["enemy" + enemynum].swapDepths(game.Player);
      game["enemy" + enemynum].onEnterFrame = function()
      {
         if(this.dead != true)
         {
            if(this._x - this._parent.Player._x < -600)
            {
               this._x = this._parent.Player._x - 500;
               this.gotoAndPlay(1);
            }
            if(this._x - this._parent.Player._x > 600)
            {
               this._x = this._parent.Player._x + 500;
               this.gotoAndPlay(1);
            }
         }
      };
      if(gamemode == 1)
      {
         tocreate--;
      }
      game["enemy" + enemynum].onEnterFrame = function()
      {
         if(this.dead == true)
         {
            if(this.deadtimer == undefined)
            {
               this.deadtimer = 0;
            }
            this.deadtimer = this.deadtimer + 1;
            if(this.deadtimer > 800)
            {
               this._alpha = this._alpha - 1;
            }
            if(Math.abs(this._x - this._parent.Player._x) > 800 || this._alpha <= 0)
            {
               removeMovieClip(this);
            }
         }
      };
   }
}
function attack(obj, pos, range, damage, chop)
{
   if(obj == game.Player)
   {
      target = GetClosestEnemy(obj);
   }
   else
   {
      target = game.Player;
   }
   if(GetDistance(obj,target) < range && obj.hitTest(target) && target.dead != true && (obj.facing == "left" && target._x <= obj._x || obj.facing == "right" && target._x >= obj._x) && (target.invunrabilitytimer == undefined || target.invunrabilitytimer <= 0))
   {
      if(target.dead != true && target.jumping != true)
      {
         if(target.ducking == true)
         {
            combatsound("block" + (random(2) + 1));
         }
         else
         {
            target.health -= random(damage);
            if(target == game.Player)
            {
               red.gotoAndPlay(2);
            }
            combatsound("slice" + (random(3) + 1));
            if(target.health <= 0)
            {
               if(target == game.Player)
               {
                  target.gotoAndPlay("die1");
               }
               else
               {
                  Kills++;
                  if(gamemode == 2)
                  {
                     difficulty = Kills;
                  }
                  if(chop == "head" && !(target.boss == true && level >= 5))
                  {
                     decapitate(target);
                  }
                  else if(chop == "leg" && !(target.boss == true && level >= 5))
                  {
                     target.gotoAndPlay("legchop");
                  }
                  else
                  {
                     target.gotoAndPlay("die1");
                  }
               }
            }
            else
            {
               blood(Math.ceil(damage / 10),target,60,target.facing);
               if(target == game.Player && target.spear == true)
               {
                  target.gotoAndPlay(pos + "spearhit");
               }
               else
               {
                  target.gotoAndPlay(pos + "hit");
               }
            }
         }
      }
   }
   else
   {
      combatsound("swipe" + (random(2) + 1));
   }
}
function bash(obj, pos, range, damage)
{
   if(obj == game.Player)
   {
      target = GetClosestEnemy(obj);
   }
   else
   {
      target = game.Player;
   }
   if(GetDistance(obj,target) < range && obj.hitTest(target) && target.dead != true && (obj.facing == "left" && target._x <= obj._x || obj.facing == "right" && target._x >= obj._x) && (target.invunrabilitytimer == undefined || target.invunrabilitytimer <= 0))
   {
      if(target.dead != true && target.jumping != true)
      {
         if(target == game.Player)
         {
            red.gotoAndPlay(2);
         }
         if(obj.facing == "right")
         {
            target._x += damage + random(damage);
         }
         else
         {
            target._x -= damage + random(damage);
         }
         if(target.health <= 0)
         {
            target.gotoAndPlay("die1");
            combatsound("bash" + (random(1) + 1));
         }
         else if(target.ducking == true)
         {
            combatsound("block" + (random(2) + 1));
            target.health -= random(damage) / 10;
         }
         else
         {
            if(target == game.Player && target.spear == true)
            {
               target.gotoAndPlay("spearbashed");
            }
            else
            {
               target.gotoAndPlay(pos + "bashed");
            }
            target.health -= random(damage) / 5;
            if(pos == "LOW")
            {
               combatsound("break");
            }
            else
            {
               combatsound("bash" + (random(1) + 1));
            }
         }
      }
   }
   else
   {
      combatsound("bashmiss");
   }
}
function IncrementObjectNum()
{
   objectnum++;
   if(objectnum > 2000)
   {
      objectnum = 1;
   }
}
function decapitate(obj)
{
   blood(10,obj,60,obj.facing);
   obj.gotoAndPlay("decap1");
   IncrementObjectNum();
   game.attachMovie("Removed Head","head" + objectnum,objectnum);
   game["head" + objectnum].losthead = true;
   game["head" + objectnum]._x = obj._x;
   game["head" + objectnum]._y = obj._y - (obj._height - 20);
   game["head" + objectnum].swapDepths(game.Player);
}
function firearrow(obj, spear)
{
   combatsound("bowfire");
   IncrementObjectNum();
   if(spear == true)
   {
      game.attachMovie("Spear Fired","arrow" + objectnum,objectnum);
   }
   else
   {
      game.attachMovie("Arrow Fired","arrow" + objectnum,objectnum);
   }
   game["arrow" + objectnum].Firer = obj;
   game["arrow" + objectnum]._x = obj._x;
   game["arrow" + objectnum]._y = obj._y - 66;
   game["arrow" + objectnum].swapDepths(game.Player);
   if(obj.facing == "left")
   {
      game["arrow" + objectnum]._xscale = -100;
   }
}
function dropspear(obj)
{
   IncrementObjectNum();
   game.attachMovie("Spear Dropped","arrow" + objectnum,objectnum);
   game["arrow" + objectnum].Firer = obj;
   game["arrow" + objectnum]._x = obj._x;
   game["arrow" + objectnum]._y = obj._y - 66;
   game["arrow" + objectnum].swapDepths(game.Player);
   if(obj.facing == "left")
   {
      game["arrow" + objectnum]._xscale = -100;
   }
}
function GetClosestEnemy(obj)
{
   totest = "";
   closestenemy = "";
   closestrange = -1;
   i = 1;
   while(i <= 30)
   {
      totest = game["enemy" + i];
      dist = GetDistance(obj,totest);
      if((dist < closestrange || closestrange < 0) && totest.dead != true && dist < 400)
      {
         closestrange = dist;
         closestenemy = totest;
         closestenemytype = totest.type;
      }
      i++;
   }
   return closestenemy;
}
function GetDistance(obj1, obj2)
{
   return Math.abs(obj1._x - obj2._x);
}
function moveman(obj, amount, keymustbedown)
{
   CheckKeys();
   if(obj != Player)
   {
      keymustbedown = false;
   }
   if((heldSwipe || heldBash || heldjump) && keymustbedown == true)
   {
      ready(obj);
   }
   else if(keymustbedown == true && (heldForward || heldBack) || keymustbedown != true)
   {
      if(obj.facing == "right")
      {
         if(GetDistance(obj,game.Player) > 350)
         {
            amount *= 2;
         }
         obj._x += amount * 1.2;
         if(obj == game.Player)
         {
            amountmoved += Math.abs(amount);
         }
      }
      else
      {
         obj._x -= amount * 1.2;
      }
   }
   else
   {
      obj.gotoAndPlay(1);
   }
}
function CheckKeys()
{
   if(game.Player.facing == "right")
   {
      KeyForward = 39;
      KeyBack = 37;
      KeyForward2 = 68;
      KeyBack2 = 65;
   }
   else
   {
      KeyForward = 37;
      KeyBack = 39;
      KeyForward2 = 65;
      KeyBack2 = 68;
   }
   heldForward = Key.isDown(KeyForward) || Key.isDown(KeyForward2);
   heldBack = Key.isDown(KeyBack) || Key.isDown(KeyBack2);
   heldSwipe = Key.isDown(100) || Key.isDown(84);
   heldBash = Key.isDown(101) || Key.isDown(89);
   heldjump = Key.isDown(38) || Key.isDown(87);
   heldduck = Key.isDown(40) || Key.isDown(83);
}
function ready(obj)
{
   obj.ducking = false;
   obj._y = 0;
   obj.jumping = false;
   if(obj.dead == true)
   {
      if(obj.lostlimb == "head")
      {
         obj.gotoAndPlay("decap1");
      }
      else
      {
         obj.gotoAndPlay("die1");
      }
   }
   else if(obj == Player)
   {
      nearest = GetClosestEnemy(obj);
      if(nearest != "")
      {
         if(nearest._x < obj._x)
         {
            obj._xscale = -100;
            obj.facing = "left";
         }
         else
         {
            obj._xscale = 100;
            obj.facing = "right";
         }
      }
      else
      {
         obj._xscale = 100;
         obj.facing = "right";
      }
      CheckKeys();
      if(heldForward && heldSwipe)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearthrow");
         }
         else
         {
            obj.gotoAndPlay("fswipe" + (random(3) + 1));
         }
      }
      else if(heldSwipe)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearswipe" + (random(3) + 1));
         }
         else
         {
            obj.gotoAndPlay("swipe" + (random(3) + 1));
         }
      }
      else if(heldBash)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearbash1");
         }
         else
         {
            obj.gotoAndPlay("bash" + (random(2) + 1));
         }
      }
      else if(heldjump && heldForward)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearjump");
         }
         else
         {
            obj.gotoAndPlay("jump");
         }
         obj.sidespeed = 5;
      }
      else if(heldjump && heldBack)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearjump");
         }
         else
         {
            obj.gotoAndPlay("jump");
         }
         obj.sidespeed = -5;
      }
      else if(heldjump)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearjump");
         }
         else
         {
            obj.gotoAndPlay("jump");
         }
         obj.sidespeed = 0;
      }
      else if(heldForward)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearwalk");
         }
         else
         {
            obj.gotoAndPlay("walk");
         }
      }
      else if(heldBack)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearwalkback");
         }
         else
         {
            obj.gotoAndPlay("walkback");
         }
      }
      else if(heldduck)
      {
         if(obj.spear == true)
         {
            obj.gotoAndPlay("spearduck");
         }
         else
         {
            obj.gotoAndPlay("duck");
         }
      }
   }
   else
   {
      if(obj.health == undefined)
      {
         obj.health = 20;
      }
      if(Player._x < obj._x)
      {
         obj._xscale = -100;
         obj.facing = "left";
      }
      else
      {
         obj._xscale = 100;
         obj.facing = "right";
      }
      distance = GetDistance(obj,game.Player);
      if((Math.random() > (100 - difficulty) / 100 || distance > 300 || obj.boss == true) && game.Player.dead != true)
      {
         if(distance > obj.range)
         {
            obj.gotoAndPlay("walk");
         }
         else if(Math.random() > 0.6 && distance < 80)
         {
            obj.gotoAndPlay("bash1");
         }
         else
         {
            obj.gotoAndPlay("swipe" + (random(obj.swipes) + 1));
         }
      }
   }
}
function jumpmovement(obj, allowswipe)
{
   CheckKeys();
   obj.jumping = true;
   obj._y -= obj.upspeed;
   moveman(obj,obj.sidespeed,false);
   obj.upspeed = obj.upspeed - 1;
   if(heldSwipe && allowswipe == true)
   {
      if(obj.spear == true)
      {
         obj.gotoAndPlay("jumpspearswipe");
      }
      else
      {
         obj.gotoAndPlay("jumpswipe");
      }
   }
   if(obj._y >= 0)
   {
      obj._y = 0;
      if(obj.spear == true)
      {
         obj.gotoAndPlay("landspearjump");
      }
      else
      {
         obj.gotoAndPlay("landjump");
      }
   }
}
function blood(amount, obj, offset, thedirection)
{
   if(option_blood != false)
   {
      i = 0;
      while(i <= amount)
      {
         IncrementObjectNum();
         game.attachMovie("Blood","blood" + objectnum,objectnum);
         game["blood" + objectnum]._x = obj._x;
         game["blood" + objectnum]._y = obj._y - (obj._height - 40);
         game["blood" + objectnum].swapDepths(game.Player);
         if(thedirection == "left")
         {
            game["blood" + objectnum].sidespeed = random(10);
            game["blood" + objectnum].upspeed = random(3);
         }
         else if(thedirection == "right")
         {
            game["blood" + objectnum].sidespeed = - random(10);
            game["blood" + objectnum].upspeed = random(3);
         }
         else if(thedirection == "up")
         {
            game["blood" + objectnum].sidespeed = random(3) - random(3);
            game["blood" + objectnum].upspeed = random(15);
         }
         else
         {
            game["blood" + objectnum].sidespeed = random(3) - random(3);
            game["blood" + objectnum].upspeed = random(3) - random(3);
         }
         i++;
      }
   }
}
_root.kongregateServices.connect();
stopAllSounds();
level = 1;
levelstage = 0;
Kills = 0;
Lives = 5;
so = SharedObject.getLocal("Achilles");
arrSavedLives = so.data.lives;
arrSavedKills = so.data.kills;
so = SharedObject.getLocal("Achilles_Options");
option_sound = so.data.sound;
option_music = so.data.music;
option_blood = so.data.blood;
option_quality = so.data.quality;
if(option_sound == undefined)
{
   option_music = true;
   option_sound = true;
   option_blood = true;
   _quality = "MEDIUM";
}
else
{
   _quality = option_quality;
}
fscommand("showmenu","false");
Stage.showMenu = false;
if(arrSavedLives == undefined)
{
   arrSavedLives = new Array(5,0,0,0,0);
   arrSavedKills = new Array(0,0,0,0,0);
}
stop();
objectnum = 1;
