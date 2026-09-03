on(release){
   _root.level = level;
   _root.levelstage = 0;
   _root.Kills = _root.arrSavedKills[level - 1];
   _root.Lives = _root.arrSavedLives[level - 1];
   _root.gotoAndStop("nextlevel");
}
