this.onEnterFrame = function()
{
   if(_X > 0)
   {
      _X = _X - 700;
   }
   if(_X < -700)
   {
      _X = _X + 700;
   }
};
