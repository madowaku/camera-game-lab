import { softServeFaceEffect } from "./faceEffect.js";
import { softServeDirectorProfile } from "../creator/profiles/softServeDirector.js";
export const softServeCreatorProfile=Object.freeze({
  brand:"SOFT SERVE",
  director:softServeDirectorProfile,
  faceEffect:softServeFaceEffect,
  perfect:{label:"PERFECT SWIRL!",duration:1100,slow:.5},
  fail:{label:"NOOOOO!",duration:1250,freeze:180,splashColor:"#fff7eb"},
  finish:{label:"DELICIOUS!",anticipationLabel:"THE BITE",duration:1500,slow:.5,splashColor:"#fff7eb"},
  drawFinishStats(c,data,{width:w,height:h}) {
    c.fillStyle="#583a2d";c.font="800 15px sans-serif";c.fillText("SCORE  "+data.score,w/2,h*.48);c.fillText("SIZE  "+data.size+" SWIRLS",w/2,h*.54);c.fillText("SWIRL  "+data.swirl,w/2,h*.60);
  },
});
