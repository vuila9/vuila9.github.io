onClipEvent(enterFrame){
   if(_root.closestenemy != "")
   {
      if(bossmaxhealth == undefined || _root.closestenemy != prev)
      {
         bossmaxhealth = _root.closestenemy.health;
         prev = _root.closestenemy;
         _parent._visible = true;
      }
      _xscale = Math.round(_root.closestenemy.health / bossmaxhealth * 100);
   }
   else
   {
      _parent._visible = false;
   }
}
