if(_root.Lives > 1)
{
   _root.Lives--;
   health = 100;
}
else
{
   stop();
   _root.Message = "Game Over";
   _root.fade.play();
}
