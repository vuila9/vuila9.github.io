this.onEnterFrame = function()
{
   if(_X > 0)
   {
      _X = _X - 1400;
   }
   if(_X < -1400)
   {
      _X = _X + 1400;
   }
};
