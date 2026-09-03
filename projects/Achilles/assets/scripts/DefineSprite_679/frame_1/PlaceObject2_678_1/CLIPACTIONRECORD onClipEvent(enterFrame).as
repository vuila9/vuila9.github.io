onClipEvent(enterFrame){
   if(invunrabilitytimer > 0)
   {
      invunrabilitytimer--;
      if(_visible == false)
      {
         _visible = true;
      }
      else
      {
         _visible = false;
      }
   }
   else
   {
      _visible = true;
   }
}
