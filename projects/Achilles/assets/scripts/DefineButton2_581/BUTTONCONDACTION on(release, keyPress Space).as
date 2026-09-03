on(release, keyPress "<Space>"){
   _root.controlsseen = true;
   so = SharedObject.getLocal("Achilles_Options");
   so.data.sound = _root.option_sound;
   so.data.music = _root.option_music;
   so.data.blood = _root.option_blood;
   so.data.quality = _root._quality;
   gotoAndStop(1);
}
