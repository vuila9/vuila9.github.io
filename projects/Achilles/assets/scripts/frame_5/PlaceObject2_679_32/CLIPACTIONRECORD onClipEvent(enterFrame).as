onClipEvent(enterFrame){
   if(Math.random() > 0.98 && _root.amountmoved >= 200 || _root.amountmoved > 500)
   {
      _root.amountmoved = 0;
      _root.CreateEnemy();
   }
   _root.gamewidth = 700;
   _root.gameheight = 500;
   dragSq = new Object();
   dragSq.x = Player._x;
   dragSq.y = Player._y;
   this.localToGlobal(dragSq);
   globalX = dragSq.x;
   xscrollspeed = (globalX - 350) / 10;
   _X = _X - xscrollspeed;
   _root.sand._x -= xscrollspeed;
   _root.ground._x -= xscrollspeed / 3;
}
