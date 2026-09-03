if(_root.arrSavedLives[level - 1] != 0)
{
   leveltext = "Level " + level + " - " + _root.arrSavedLives[level - 1] + " Lives";
   stop();
}
else
{
   leveltext = "Level " + level + " not reached";
   gotoAndStop(2);
}
