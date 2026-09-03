if(_root.Message == "Game Over")
{
   _root.gotoAndStop("gameover" + _root.gamemode);
}
else if(_root.Message == "Stage Complete")
{
   _root.gotoAndStop("nextlevel");
}
else
{
   _root.gotoAndStop("complete");
}
