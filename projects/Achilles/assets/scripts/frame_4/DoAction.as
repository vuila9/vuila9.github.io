_root.levelstage = _root.levelstage + 1;
_root.closestenemy = "";
playmusic("title");
if(_root.levelstage > 3)
{
   _root.levelstage = 1;
   _root.level = _root.level + 1;
   if(Lives > arrSavedLives[level - 1])
   {
      arrSavedLives[level - 1] = Lives;
      arrSavedKills[level - 1] = Kills;
      so = SharedObject.getLocal("Achilles");
      so.data.lives = arrSavedLives;
      so.data.kills = arrSavedKills;
      so.flush();
   }
}
if(_root.levelstage == 1)
{
   totalenemies = 3 + level * 2;
   hasboss = false;
}
else if(_root.levelstage == 2)
{
   totalenemies = 7 + level * 3;
   hasboss = false;
}
else if(_root.levelstage == 3)
{
   totalenemies = 3 + level * 2;
   hasboss = true;
}
_root.kongregateStats.submit("Level Reached",_root.level);
