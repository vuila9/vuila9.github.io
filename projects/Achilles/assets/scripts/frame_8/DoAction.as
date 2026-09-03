playmusic("gameover");
fs = "Final Score: " + Kills;
_root.kongregateStats.submit("Survival Kills",Kills);
_root.HPScoreService.postScore(Kills,"Survival");
