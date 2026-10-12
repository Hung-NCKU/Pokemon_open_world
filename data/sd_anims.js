// 由 tools/fetch_showdown_anims.mjs 產生：Pokémon Showdown 的 Z 招式動畫（battle-animations*.ts，CC0）
// 特效圖從 https://play.pokemonshowdown.com/fx/ 載入（大多是 CC0；icicle、lightning、bone、rock 系列另有授權，見 Showdown 的說明）
// 執行時由 js/sd_anim.js 提供 scene 與 attacker／defender（換算到綠寶石的戰鬥畫面）
/* eslint-disable */
const Config = { routes: { client: 'play.pokemonshowdown.com' } }; // 冰的 Z 招式用到的背景圖網址
const BattleEffects = {"bluefireball":{"url":"https://play.pokemonshowdown.com/fx/bluefireball.png","w":64,"h":64},"electroball":{"url":"https://play.pokemonshowdown.com/fx/electroball.png","w":100,"h":100},"energyball":{"url":"https://play.pokemonshowdown.com/fx/energyball.png","w":100,"h":100},"fireball":{"url":"https://play.pokemonshowdown.com/fx/fireball.png","w":64,"h":64},"fist":{"url":"https://play.pokemonshowdown.com/fx/fist.png","w":55,"h":49},"fist1":{"url":"https://play.pokemonshowdown.com/fx/fist1.png","w":49,"h":55},"flareball":{"url":"https://play.pokemonshowdown.com/fx/flareball.png","w":100,"h":100},"iceball":{"url":"https://play.pokemonshowdown.com/fx/iceball.png","w":100,"h":100},"icicle":{"url":"https://play.pokemonshowdown.com/fx/icicle.png","w":80,"h":60},"impact":{"url":"https://play.pokemonshowdown.com/fx/impact.png","w":127,"h":119},"lightning":{"url":"https://play.pokemonshowdown.com/fx/lightning.png","w":41,"h":229},"mistball":{"url":"https://play.pokemonshowdown.com/fx/mistball.png","w":100,"h":100},"mudwisp":{"url":"https://play.pokemonshowdown.com/fx/mudwisp.png","w":100,"h":100},"petal":{"url":"https://play.pokemonshowdown.com/fx/petal.png","w":60,"h":60},"purplewisp":{"url":"https://play.pokemonshowdown.com/fx/purplewisp.png","w":100,"h":100},"rainbow":{"url":"https://play.pokemonshowdown.com/fx/rainbow.png","w":128,"h":128},"rock1":{"url":"https://play.pokemonshowdown.com/fx/rock1.png","w":64,"h":80},"rock2":{"url":"https://play.pokemonshowdown.com/fx/rock2.png","w":66,"h":72},"rock3":{"url":"https://play.pokemonshowdown.com/fx/rock3.png","w":66,"h":72},"rocks":{"url":"https://play.pokemonshowdown.com/fx/rocks.png","w":100,"h":100},"shadowball":{"url":"https://play.pokemonshowdown.com/fx/shadowball.png","w":100,"h":100},"shine":{"url":"https://play.pokemonshowdown.com/fx/shine.png","w":127,"h":119},"waterwisp":{"url":"https://play.pokemonshowdown.com/fx/waterwisp.png","w":100,"h":100},"web":{"url":"https://play.pokemonshowdown.com/fx/web.png","w":120,"h":122},"wisp":{"url":"https://play.pokemonshowdown.com/fx/wisp.png","w":100,"h":100},"zsymbol":{"url":"https://play.pokemonshowdown.com/fx/z-symbol.png","w":150,"h":100}};
const BattleOtherAnims = {
  zpower: { anim(scene, [attacker]) {
      scene.backgroundEffect("linear-gradient(#000000 20%, #0000DD)", 1800, 0.4);
      scene.showEffect("electroball", {
        x: attacker.x - 60,
        y: attacker.y + 40,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.7,
        time: 0
      }, {
        x: attacker.x,
        y: attacker.y,
        scale: 0.2,
        opacity: 0.2,
        time: 300
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: attacker.x + 60,
        y: attacker.y - 5,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.7,
        time: 100
      }, {
        x: attacker.x,
        y: attacker.y,
        scale: 0.2,
        opacity: 0.2,
        time: 300
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: attacker.x - 30,
        y: attacker.y + 60,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.7,
        time: 100
      }, {
        x: attacker.x,
        y: attacker.y,
        scale: 0.2,
        opacity: 0.2,
        time: 400
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: attacker.x + 20,
        y: attacker.y - 50,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.7,
        time: 100
      }, {
        x: attacker.x,
        y: attacker.y,
        scale: 0.2,
        opacity: 0.2,
        time: 400
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: attacker.x - 70,
        y: attacker.y - 50,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.7,
        time: 200
      }, {
        x: attacker.x,
        y: attacker.y,
        scale: 0.2,
        opacity: 0.2,
        time: 500
      }, "linear", "fade");
      scene.showEffect("zsymbol", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.7,
        opacity: 1,
        time: 500
      }, {
        scale: 1,
        opacity: 0.5,
        time: 800
      }, "decel", "explode");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 800
      }, {
        y: attacker.y + 20,
        scale: 2,
        opacity: 0,
        time: 1200
      }, "accel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 1e3
      }, {
        y: attacker.y + 20,
        scale: 2,
        opacity: 0,
        time: 1400
      }, "accel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 1200
      }, {
        y: attacker.y + 20,
        scale: 2,
        opacity: 0,
        time: 1600
      }, "accel");
    } },
};
const BattleMoveAnims = {
  breakneckblitz: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 700, 0.2);
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.4,
        time: 300
      }, {
        scale: 4,
        opacity: 0,
        time: 600
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.4,
        time: 500
      }, {
        scale: 4,
        opacity: 0,
        time: 800
      }, "linear");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 50
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 350
      }, "accel", "fade");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 100
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 400
      }, "accel", "fade");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 300
      }, "accel");
      attacker.anim({
        time: 500
      }, "ballistic2Back");
      defender.delay(280);
      defender.anim({
        z: defender.behind(20),
        time: 100
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
    } },
  alloutpummeling: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#390000 30%, #B84038)", 2e3, 0.8);
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6
      }, {
        x: defender.x + 30,
        y: defender.y + 30,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 200
      }, "ballistic", "explode");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6,
        time: 75
      }, {
        x: defender.x + 20,
        y: defender.y - 30,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 275
      }, "ballistic2", "explode");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6,
        time: 150
      }, {
        x: defender.x - 30,
        y: defender.y,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 350
      }, "ballistic2Under", "explode");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6,
        time: 225
      }, {
        x: defender.x - 10,
        y: defender.y + 10,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 425
      }, "ballistic", "explode");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6,
        time: 300
      }, {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 500
      }, "ballistic2", "explode");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.6,
        time: 375
      }, {
        x: defender.x - 20,
        y: defender.y,
        z: defender.z,
        scale: 1,
        opacity: 1,
        time: 575
      }, "ballistic2Under", "explode");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-5),
        scale: 1.5,
        opacity: 0,
        time: 800
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        time: 1150
      }, "accel", "explode");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 1,
        time: 800
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 1100
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 1,
        time: 800
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 1125
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 1,
        time: 800
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(-5),
        time: 1150
      }, "accel", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 2,
        opacity: 0.8,
        time: 1150
      }, {
        scale: 1,
        xscale: 12,
        opacity: 0,
        time: 1450
      }, "decel", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 0.7,
        scale: 0.5,
        time: 1150
      }, {
        scale: 3,
        opacity: 0,
        time: 1650
      }, "decel");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 1,
        scale: 0.5,
        time: 1150
      }, {
        scale: 6,
        opacity: 0,
        time: 1650
      }, "decel");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 5,
        yscale: 13,
        time: 1150
      }, {
        opacity: 0.5,
        xscale: 0,
        time: 2e3
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 1,
        scale: 2,
        time: 1150
      }, {
        opacity: 0.5,
        scale: 6,
        time: 2e3
      }, "decel", "explode");
      attacker.delay(600);
      attacker.anim({
        z: attacker.behind(15),
        time: 200
      }, "decel");
      attacker.anim({
        z: defender.behind(-170),
        opacity: 0,
        time: 100
      }, "accel");
      attacker.delay(1e3);
      attacker.anim({
        z: attacker.behind(70),
        opacity: 0,
        time: 1
      }, "linear");
      attacker.anim({
        z: attacker.z,
        time: 300
      }, "swing");
      defender.delay(200);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.delay(300);
      defender.anim({
        z: defender.behind(5),
        opacity: 0,
        time: 75
      }, "swing");
      defender.delay(750);
      defender.anim({
        time: 150
      }, "swing");
    } },
  supersonicskystrike: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#46BFFF 20%, #241714)", 1300, 0.5);
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 25
      }, {
        y: attacker.y + 250,
        opacity: 0,
        time: 325
      }, "decel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.z,
        opacity: 0.3,
        time: 625
      }, {
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0,
        time: 825
      }, "decel");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.z,
        scale: 1,
        opacity: 0.6,
        time: 600
      }, {
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0.3,
        time: 800
      }, "accel", "explode");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        scale: 1,
        opacity: 0.5,
        time: 600
      }, {
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0.6,
        time: 800
      }, "accel", "explode");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 850
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1250
      }, "linear", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 850
      }, {
        scale: 6,
        opacity: 0,
        time: 1400
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 850
      }, {
        xscale: 0,
        time: 1500
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 850
      }, {
        scale: 9,
        time: 1400
      }, "linear", "explode");
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.z,
        time: 300
      }, "decel");
      attacker.delay(300);
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 1,
        time: 200
      }, "ballistic2Under");
      attacker.delay(50);
      attacker.anim({
        opacity: 0,
        time: 1
      });
      attacker.delay(700);
      attacker.anim({
        opacity: 1,
        time: 200
      });
      defender.delay(650);
      defender.anim({
        y: defender.y - 10,
        z: defender.behind(5),
        time: 50
      }, "swing");
      defender.anim({
        y: defender.y - 20,
        z: defender.behind(20),
        time: 200
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
    } },
  aciddownpour: { anim(scene, [attacker, defender]) {
      defender.delay(125);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.delay(100);
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.delay(75);
      defender.anim({
        y: defender.y - 40,
        opacity: 0,
        time: 200
      }, "accel");
      defender.delay(400);
      defender.anim({
        y: defender.y,
        opacity: 0,
        time: 200
      });
      defender.anim({
        y: defender.y,
        opacity: 1,
        time: 200
      });
      scene.backgroundEffect("linear-gradient(#440044 30%, #000000", 2300, 0.7);
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.5
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.5
      }, {
        scale: 4,
        opacity: 0.3,
        time: 600
      }, "decel", "fade");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y - 25,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.3
      }, {
        x: defender.x,
        z: defender.behind(50),
        scale: 2,
        xscale: 4,
        opacity: 0.6
      }, "decel", "fade");
      scene.showEffect("purplewisp", {
        x: attacker.x - 30,
        y: attacker.y - 25,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.3
      }, {
        x: defender.x - 60,
        z: defender.behind(50),
        scale: 2,
        xscale: 4,
        opacity: 0.6
      }, "decel", "fade");
      scene.showEffect("purplewisp", {
        x: attacker.x + 30,
        y: attacker.y - 25,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.3
      }, {
        x: defender.x + 60,
        z: defender.behind(50),
        scale: 2,
        xscale: 4,
        opacity: 0.6
      }, "decel", "fade");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        scale: 2,
        xscale: 6,
        yscale: 1,
        opacity: 0.5,
        time: 650
      }, {
        scale: 0,
        xscale: 2,
        yscale: 0.5,
        opacity: 0,
        time: 1600
      }, "linear", "fade");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        scale: 2,
        xscale: 6,
        yscale: 1,
        opacity: 0.5,
        time: 1450
      }, {
        scale: 0,
        xscale: 2,
        yscale: 0.5,
        opacity: 0,
        time: 2e3
      }, "linear", "fade");
      scene.showEffect("shadowball", {
        x: defender.x - 20,
        y: defender.y + 200,
        z: defender.behind(5),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 775
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 975
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x - 20,
        y: defender.y - 50,
        z: defender.behind(5),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 790
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 875
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x + 40,
        y: defender.y + 200,
        z: defender.behind(-5),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 925
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1100
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x + 40,
        y: defender.y - 50,
        z: defender.behind(-5),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 940
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1100
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x - 70,
        y: defender.y + 200,
        z: defender.behind(-10),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 975
      }, {
        y: defender.y + 150,
        z: defender.behind(-10),
        opacity: 0,
        time: 1125
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x - 70,
        y: defender.y - 50,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 990
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1125
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x + 70,
        y: defender.y + 200,
        z: defender.behind(10),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1050
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1250
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x + 70,
        y: defender.y - 50,
        z: defender.behind(10),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1065
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1250
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y + 200,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1100
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1300
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 50,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1120
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1300
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y + 200,
        z: defender.behind(-20),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1125
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1325
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 35,
        z: defender.behind(-20),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1140
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1425
      }, "linear");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y - 25,
        z: defender.z,
        scale: 2,
        opacity: 0.8,
        time: 350
      }, {
        x: defender.x + 75,
        opacity: 0.3,
        scale: 4,
        xscale: 5,
        time: 1800
      }, "linear", "fade");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y - 25,
        z: defender.z,
        scale: 2,
        opacity: 0.8,
        time: 350
      }, {
        x: defender.x - 75,
        opacity: 0.3,
        scale: 4,
        xscale: 5,
        time: 1800
      }, "linear", "fade");
    } },
  tectonicrage: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#390000 30%, #B84038)", 800, 0.4);
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 6,
        opacity: 0
      }, "linear", "fade");
      scene.showEffect("fireball", {
        x: attacker.x,
        y: attacker.y - 35,
        z: attacker.behind(-50),
        scale: 0,
        opacity: 0.8
      }, {
        scale: 3,
        opacity: 0,
        time: 200
      }, "linear");
      scene.showEffect("rock2", {
        x: attacker.x,
        y: attacker.y - 20,
        z: attacker.behind(-50),
        scale: 0.5,
        yscale: 1.4,
        opacity: 0.7,
        time: 25
      }, {
        y: attacker.y,
        yscale: 1.5,
        time: 250
      }, "decel", "fade");
      scene.showEffect("fireball", {
        x: attacker.x,
        y: attacker.y - 35,
        z: attacker.behind(-125),
        scale: 0,
        opacity: 0.8,
        time: 150
      }, {
        scale: 3,
        opacity: 0
      }, "linear");
      scene.showEffect("rock1", {
        x: attacker.x,
        y: attacker.y - 20,
        z: attacker.behind(-125),
        scale: 0.5,
        yscale: 1.5,
        opacity: 0.7,
        time: 175
      }, {
        y: attacker.y,
        yscale: 1.6,
        time: 400
      }, "decel", "fade");
      scene.showEffect("fireball", {
        x: defender.x,
        y: defender.y - 35,
        z: defender.z,
        scale: 0,
        opacity: 0.8,
        time: 300
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("rock2", {
        x: defender.x - 15,
        y: defender.y - 20,
        z: defender.z,
        scale: 0.5,
        yscale: 1.6,
        opacity: 0.7,
        time: 350
      }, {
        y: attacker.y,
        yscale: 1.7,
        time: 550
      }, "decel", "fade");
      scene.showEffect("rock2", {
        x: defender.x + 15,
        y: defender.y - 20,
        z: defender.z,
        scale: 0.5,
        yscale: 1.6,
        opacity: 0.7,
        time: 375
      }, {
        y: attacker.y,
        yscale: 1.7,
        time: 575
      }, "decel", "fade");
      scene.showEffect("rock1", {
        x: defender.x,
        y: defender.y - 20,
        z: defender.z,
        scale: 0.5,
        yscale: 1.8,
        opacity: 0.7,
        time: 400
      }, {
        y: defender.y + 10,
        yscale: 1.9,
        time: 600
      }, "accel", "fade");
      defender.delay(325);
      defender.anim({
        x: defender.x - 30,
        time: 75
      });
      defender.anim({
        x: defender.x + 30,
        time: 100
      });
      defender.anim({
        x: defender.x - 30,
        time: 100
      });
      defender.anim({
        x: defender.x + 30,
        time: 100
      });
      defender.anim({
        x: defender.x - 30,
        time: 100
      });
      defender.anim({
        x: defender.x + 30,
        time: 100
      });
      defender.anim({
        x: defender.x,
        time: 100
      });
    } },
  continentalcrush: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#421800 40%, #B8652F)", 2200, 0.6);
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 25
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: defender.behind(-50),
        opacity: 0,
        time: 325
      }, "accel");
      scene.showEffect("rock2", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-40),
        scale: 0.4,
        opacity: 0,
        time: 225
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: defender.behind(-30),
        opacity: 1,
        time: 525
      }, "accel");
      scene.showEffect("rocks", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-70),
        scale: 0.8,
        opacity: 0,
        time: 300
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: defender.behind(-20),
        scale: 0.4,
        opacity: 1,
        time: 650
      }, "accel");
      scene.showEffect("rock2", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-90),
        scale: 0.2,
        opacity: 0,
        time: 325
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: defender.behind(-50),
        opacity: 1,
        time: 675
      }, "accel");
      scene.showEffect("rock1", {
        x: defender.x,
        y: defender.y + 175,
        z: defender.z,
        scale: 0.5,
        opacity: 0.5,
        time: 1e3
      }, {
        x: defender.x,
        y: defender.y + 55,
        z: defender.z,
        scale: 5.5,
        opacity: 1,
        time: 1800
      }, "decel", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1650
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 2050
      }, "linear", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 1650
      }, {
        scale: 6,
        opacity: 0,
        time: 2200
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 8,
        time: 1650
      }, {
        xscale: 12,
        opacity: 0.5,
        time: 2e3
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 6,
        time: 1650
      }, {
        scale: 12,
        opacity: 0.7,
        time: 2200
      }, "linear", "explode");
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        time: 300
      }, "decel");
      attacker.delay(1700);
      attacker.anim({
        opacity: 0,
        time: 1
      });
      attacker.anim({
        opacity: 1,
        time: 200
      });
      defender.delay(1450);
      defender.anim({
        y: defender.y - 10,
        yscale: 0.4,
        time: 50
      }, "swing");
      defender.anim({
        y: defender.y - 20,
        yscale: 0.3,
        time: 300
      }, "swing");
      defender.delay(200);
      defender.anim({
        time: 400
      }, "swing");
    } },
  savagespinout: { anim(scene, [attacker, defender]) {
      scene.showEffect("web", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.1,
        opacity: 0
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0.5,
        opacity: 1,
        time: 400
      }, "ballistic", "explode");
      scene.showEffect("web", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.1,
        opacity: 0,
        time: 100
      }, {
        x: defender.x + 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0.5,
        opacity: 1,
        time: 500
      }, "ballistic", "explode");
      scene.showEffect("web", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.1,
        opacity: 0,
        time: 200
      }, {
        x: defender.x - 30,
        y: defender.y - 10,
        z: defender.z,
        scale: 0.5,
        opacity: 1,
        time: 600
      }, "ballistic", "explode");
    } },
  neverendingnightmare: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#440044 30%, #000000", 1500, 0.6);
      let xstep = (defender.x + 200 - defender.x) / 5;
      let ystep = (defender.x - 200 - defender.x) / 5;
      let zstep = defender.z / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x - 200 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 0
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x + 150 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x - 150 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 100
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x + 100 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x - 100 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 1.2,
          opacity: 1,
          time: 40 * i + 200
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x + 50 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x - 50 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 300
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x - 50 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x + 50 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 1.2,
          opacity: 1,
          time: 40 * i + 400
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x - 100 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x + 100 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 500
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x - 150 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x + 150 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 600
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (defender.x - 200 - defender.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: defender.x + 200 + xstep * (i + 1),
          y: defender.y + 200 + ystep * (i + 1),
          z: defender.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 700
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 0.5,
        time: 200
      }, {
        scale: 3,
        xscale: 8,
        opacity: 0.1,
        time: 1300
      }, "linear", "fade");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 1,
        scale: 2,
        time: 200
      }, {
        scale: 2.5,
        opacity: 0,
        time: 1500
      }, "linear", "fade");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 3,
        time: 200
      }, {
        scale: 9,
        opacity: 1,
        time: 1500
      }, "linear", "fade");
    } },
  corkscrewcrash: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 1200, 0.3);
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.5,
        time: 500
      }, {
        scale: 3,
        opacity: 0,
        time: 800
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.5,
        time: 700
      }, {
        scale: 3,
        opacity: 0,
        time: 1e3
      }, "linear");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2,
        opacity: 1
      }, {
        y: attacker.y + 90,
        opacity: 0,
        time: 200
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-165),
        y: defender.y + 170,
        z: defender.z,
        scale: 1,
        opacity: 0,
        time: 400
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 2,
        opacity: 0.5,
        time: 650
      }, "accel", "explode");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 500
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 650
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 550
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 700
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 600
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 750
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 650
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 800
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 700
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 850
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 750
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 900
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 800
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 950
      }, "accel");
      scene.showEffect("iceball", {
        x: defender.leftof(-65),
        y: defender.y + 90,
        z: defender.z,
        scale: 3,
        yscale: 3.3,
        opacity: 0.8,
        time: 900
      }, {
        x: defender.leftof(10),
        y: defender.y - 20,
        z: defender.behind(-10),
        scale: 0,
        xscale: 0,
        yscale: 0,
        time: 1050
      }, "accel");
      attacker.anim({
        y: defender.y + 120,
        xscale: 0,
        yscale: 0,
        opacity: 0,
        time: 300
      }, "accel");
      attacker.delay(825);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 40,
        z: attacker.behind(40),
        xscale: 1,
        yscale: 1,
        time: 1
      });
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      defender.delay(625);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(15),
        time: 200
      }, "decel");
      defender.anim({
        time: 350
      }, "swing");
    } },
  infernooverdrive: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#421800 40%, #B8652F)", 800, 0.7);
      scene.backgroundEffect("#ffffff", 200, 0.7, 700);
      scene.backgroundEffect("#000000", 800, 0.7, 900);
      scene.showEffect("fireball", {
        x: attacker.x,
        y: attacker.y + 20,
        z: attacker.behind(-30),
        scale: 1,
        opacity: 0.3
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 0.6,
        opacity: 1,
        time: 100
      }, "accel", "fade");
      scene.showEffect("fireball", {
        x: attacker.x + 20,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 1,
        opacity: 0.3,
        time: 100
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 0.6,
        opacity: 1,
        time: 200
      }, "accel", "fade");
      scene.showEffect("fireball", {
        x: attacker.x,
        y: attacker.y - 20,
        z: attacker.behind(-30),
        scale: 1,
        opacity: 0.3,
        time: 200
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 0.6,
        opacity: 1,
        time: 300
      }, "accel", "fade");
      scene.showEffect("fireball", {
        x: attacker.x - 20,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 1,
        opacity: 0.3,
        time: 300
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 0.6,
        opacity: 1,
        time: 400
      }, "accel", "fade");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 3,
        opacity: 0.3
      }, {
        scale: 0.6,
        opacity: 1,
        time: 300
      }, "decel", "fade");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 3,
        opacity: 0.3,
        time: 100
      }, {
        scale: 0.8,
        opacity: 0.6,
        time: 400
      }, "decel", "fade");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-30),
        scale: 0.6,
        opacity: 0.8,
        time: 400
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(20),
        scale: 5,
        opacity: 0.8,
        time: 800
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 0.5,
        time: 900
      }, {
        scale: 3,
        xscale: 8,
        opacity: 0.1,
        time: 1300
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 1,
        time: 900
      }, {
        scale: 6,
        opacity: 0,
        time: 1100
      }, "linear");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 1,
        time: 1e3
      }, {
        scale: 6,
        opacity: 0,
        time: 1300
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 5,
        time: 800
      }, {
        scale: 12,
        opacity: 0.5,
        time: 1500
      }, "linear", "fade");
      scene.showEffect("fireball", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 800
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("fireball", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 950
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("fireball", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1100
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      defender.delay(825);
      defender.anim({
        z: defender.behind(20),
        time: 300
      }, "swing");
      defender.anim({
        time: 400
      }, "swing");
    } },
  hydrovortex: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#00CCCC", 700, 0.5);
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1
      }, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 6,
        opacity: 0
      }, "linear", "fade");
      scene.showEffect("waterwisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.3
      }, {
        x: defender.x + 10,
        y: defender.y + 5,
        z: defender.behind(30),
        scale: 1,
        opacity: 0.6
      }, "decel", "explode");
      scene.showEffect("waterwisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.3,
        time: 75
      }, {
        x: defender.x - 10,
        y: defender.y - 5,
        z: defender.behind(30),
        scale: 1,
        opacity: 0.6
      }, "decel", "explode");
      scene.showEffect("waterwisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.3,
        time: 150
      }, {
        x: defender.x,
        y: defender.y + 5,
        z: defender.behind(30),
        scale: 1,
        opacity: 0.6
      }, "decel", "explode");
    } },
  bloomdoom: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#FF99FF", 1400, 0.5);
      attacker.anim({ x: attacker.x - 10, time: 100 });
      attacker.anim({ x: attacker.x + 10, time: 200 });
      attacker.anim({ x: attacker.x, time: 100 });
      attacker.anim({
        x: defender.x,
        y: defender.y + 50,
        z: defender.behind(-150),
        time: 200
      }, "ballistic2");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(-100),
        time: 100
      }, "accel");
      attacker.anim({ z: attacker.z, time: 400 }, "swing");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 0
      }, {
        x: attacker.x - 45,
        y: attacker.y - 45,
        scale: 2,
        opacity: 0,
        time: 300
      }, "decel");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 150
      }, {
        x: attacker.x + 50,
        y: attacker.y - 30,
        scale: 2,
        opacity: 0,
        time: 450
      }, "decel");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 250
      }, {
        x: attacker.x + 25,
        y: attacker.y - 60,
        scale: 2,
        opacity: 0,
        time: 550
      }, "decel");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 300
      }, {
        x: attacker.x - 40,
        y: attacker.y - 40,
        scale: 2,
        opacity: 0,
        time: 600
      }, "decel");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.6,
        opacity: 1,
        time: 700
      }, {
        x: defender.x + 30,
        y: defender.y + 30,
        z: defender.z,
        scale: 0.8,
        opacity: 0.6,
        time: 900
      }, "ballistic", "explode");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.7,
        opacity: 1,
        time: 775
      }, {
        x: defender.x + 20,
        y: defender.y - 30,
        z: defender.z,
        scale: 0.9,
        opacity: 0.6,
        time: 975
      }, "ballistic2Under", "explode");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.5,
        opacity: 0.6,
        time: 850
      }, {
        x: defender.x - 30,
        y: defender.y,
        z: defender.z,
        scale: 0.8,
        opacity: 0.3,
        time: 1050
      }, "ballistic2", "explode");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.6,
        opacity: 1,
        time: 925
      }, {
        x: defender.x - 10,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.9,
        opacity: 0.6,
        time: 1125
      }, "ballistic", "explode");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.8,
        opacity: 1,
        time: 1e3
      }, {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 1200
      }, "linear", "explode");
      scene.showEffect("petal", {
        x: attacker.x,
        y: attacker.y,
        z: defender.behind(-100),
        scale: 0.8,
        opacity: 0.6,
        time: 1075
      }, {
        x: defender.x - 20,
        y: defender.y,
        z: defender.z,
        scale: 0.9,
        opacity: 0.3,
        time: 1175
      }, "ballistic2", "explode");
      defender.delay(825);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 150
      }, "swing");
    } },
  gigavolthavoc: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 800, 0.7);
      scene.backgroundEffect("#ffffff", 200, 0.7, 700);
      scene.backgroundEffect("#000000", 800, 0.7, 900);
      scene.showEffect("electroball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 8,
        opacity: 0,
        time: 0
      }, {
        scale: 0,
        opacity: 0.5,
        time: 300
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 8,
        opacity: 0,
        time: 150
      }, {
        scale: 0,
        opacity: 0.5,
        time: 500
      }, "linear", "fade");
      scene.showEffect("lightning", {
        x: attacker.x - 10,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 200
      }, {
        scale: 3,
        opacity: 0,
        time: 400
      }, "decel");
      scene.showEffect("lightning", {
        x: attacker.x + 10,
        y: attacker.y,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 350
      }, {
        scale: 3,
        opacity: 0,
        time: 550
      }, "decel");
      scene.showEffect("electroball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.8,
        opacity: 0.8,
        time: 600
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(20),
        scale: 1.2,
        opacity: 0.8,
        time: 800
      }, "linear", "explode");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 850
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1250
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 850
      }, {
        scale: 6,
        opacity: 0,
        time: 1400
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 850
      }, {
        xscale: 0,
        opacity: 0.5,
        time: 1200
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 850
      }, {
        scale: 9,
        time: 1400
      }, "linear", "explode");
      scene.showEffect("lightning", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 800
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 950
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1100
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      defender.delay(825);
      defender.anim({
        z: defender.behind(20),
        opacity: 0.5,
        time: 400
      }, "swing");
      defender.anim({
        time: 400
      }, "swing");
    } },
  shatteredpsyche: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#AA44BB", 250, 0.6);
      scene.backgroundEffect("#AA44FF", 250, 0.6, 400);
      defender.anim({
        scale: 1.2,
        time: 100
      });
      defender.anim({
        scale: 1,
        time: 100
      });
      defender.anim({
        scale: 1.4,
        time: 150
      });
      defender.anim({
        scale: 1,
        time: 150
      });
      scene.wait(700);
    } },
  subzeroslammer: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect(`url('https://${Config.routes.client}/sprites/gen6bgs/bg-icecave.jpg')`, 1e3, 0.6);
      scene.showEffect("icicle", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        xscale: 2,
        yscale: 5,
        opacity: 0.6
      }, {
        xscale: 2.2,
        yscale: 5.25,
        scale: 0.6,
        time: 800
      }, "linear", "explode");
    } },
  devastatingdrake: { anim(scene, [attacker, defender]) {
      let xstep = (defender.x - attacker.x) / 5;
      let ystep = (defender.y - attacker.y) / 5;
      let zstep = (defender.z - attacker.z) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("wisp", {
          x: attacker.x + xstep * (i + 1),
          y: attacker.y + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 1,
          opacity: 1,
          time: 20 * i
        }, {
          scale: 2,
          opacity: 0,
          time: 40 * i + 600
        }, "linear");
        scene.showEffect("purplewisp", {
          x: attacker.x + xstep * (i + 1),
          y: attacker.y + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.5,
          opacity: 0.3,
          time: 20 * i
        }, {
          scale: 2,
          opacity: 0,
          time: 40 * i + 600
        }, "linear");
      }
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(-15),
        scale: 0.5,
        opacity: 0.6
      }, {
        scale: 0.6,
        opacity: 0.2,
        time: 400
      }, "linear", "fade");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.1,
        time: 0
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 1,
        time: 200
      }, "linear", "explode");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.1,
        time: 100
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 1,
        time: 300
      }, "linear", "explode");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.1,
        time: 200
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 1,
        time: 400
      }, "linear", "explode");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.1,
        time: 300
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 1,
        time: 500
      }, "linear", "explode");
    } },
  blackholeeclipse: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#440044 30%, #000000", 2500, 0.6);
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.2,
        time: 0
      }, {
        scale: 2,
        opacity: 0.5,
        time: 600
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.1,
        time: 0
      }, {
        scale: 0,
        opacity: 0.5,
        time: 400
      }, "accel");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.1,
        time: 200
      }, {
        scale: 0,
        opacity: 0.5,
        time: 600
      }, "accel");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 0.1,
        time: 550
      }, {
        scale: 0.7,
        opacity: 0.5,
        time: 900
      }, "decel", "fade");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2,
        opacity: 0.1,
        time: 550
      }, {
        scale: 1.5,
        opacity: 1,
        time: 900
      }, "decel", "fade");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.7,
        opacity: 0.5,
        time: 900
      }, {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        opacity: 0.7,
        scale: 2,
        time: 1500
      }, "accel", "explode");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1.5,
        opacity: 1,
        time: 900
      }, {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 3,
        time: 1500
      }, "accel", "explode");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 1,
        opacity: 0.7,
        time: 1500
      }, {
        scale: 2,
        time: 2200
      }, "linear", "fade");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 4,
        opacity: 1,
        time: 1500
      }, {
        scale: 4.2,
        time: 2200
      }, "linear", "fade");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 1,
        opacity: 0.1,
        time: 1600
      }, {
        scale: 3,
        opacity: 0,
        time: 1900
      }, "linear");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 1,
        opacity: 0.1,
        time: 1900
      }, {
        scale: 3,
        opacity: 0,
        time: 2200
      }, "linear");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y + 80,
        z: defender.z,
        scale: 4.2,
        opacity: 0.5,
        time: 2200
      }, {
        scale: 0,
        time: 2500
      }, "accel");
      defender.delay(1500);
      defender.anim({
        y: defender.y + 50,
        xscale: 0,
        yscale: 0,
        opacity: 0,
        time: 400
      }, "accel");
      defender.delay(1500);
      defender.anim({
        y: defender.y,
        opacity: 0,
        time: 1
      });
      defender.anim({
        time: 400
      });
    } },
  twinkletackle: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#FF99FF", 1700, 0.5);
      scene.showEffect("shine", {
        x: attacker.x - 10,
        y: attacker.y - 10,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6
      }, {
        opacity: 0,
        time: 200
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x + 20,
        y: attacker.y - 30,
        z: attacker.z,
        scale: 0.2,
        opacity: 1,
        time: 0
      }, {
        y: attacker.y + 40,
        opacity: 0,
        time: 250
      }, "accel");
      scene.showEffect("shine", {
        x: attacker.x + 20,
        y: attacker.y - 15,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 150
      }, {
        opacity: 0,
        time: 250
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x - 20,
        y: attacker.y + 40,
        z: attacker.z,
        scale: 0.2,
        opacity: 1,
        time: 175
      }, {
        y: attacker.y + 40,
        opacity: 0,
        time: 275
      }, "accel");
      scene.showEffect("shine", {
        x: attacker.x - 5,
        y: attacker.y + 15,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 100
      }, {
        opacity: 0,
        time: 300
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x + 5,
        y: attacker.y - 10,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 125
      }, {
        opacity: 0,
        time: 325
      }, "accel");
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y + 2,
        z: defender.behind(5),
        scale: 0,
        opacity: 0.2,
        time: 600
      }, {
        scale: 2,
        opacity: 0,
        time: 900
      }, "linear");
      scene.showEffect("shine", {
        x: defender.x + 30,
        y: defender.y + 5,
        z: defender.z,
        scale: 0.3,
        opacity: 0.7,
        time: 600
      }, {
        x: defender.x + 40,
        y: defender.y + 10,
        opacity: 0,
        time: 900
      }, "accel");
      scene.showEffect("shine", {
        x: defender.x - 30,
        y: defender.y - 10,
        z: defender.z,
        scale: 0.3,
        opacity: 0.7,
        time: 700
      }, {
        x: defender.x - 40,
        y: defender.y - 20,
        opacity: 0,
        time: 900
      }, "accel");
      scene.showEffect("shine", {
        x: defender.x + 15,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.3,
        opacity: 0.7,
        time: 700
      }, {
        x: defender.x + 25,
        y: defender.y + 20,
        opacity: 0,
        time: 1e3
      }, "accel");
      scene.showEffect("shine", {
        x: defender.x - 15,
        y: defender.y - 30,
        z: defender.z,
        scale: 0.3,
        opacity: 0.7,
        time: 800
      }, {
        x: defender.x - 25,
        y: defender.y - 40,
        opacity: 0,
        time: 1100
      }, "accel");
      attacker.delay(200);
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(5),
        time: 375
      }, "accel");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(20),
        time: 250
      }, "decel");
      attacker.anim({
        time: 700
      }, "ballistic2Back");
      defender.delay(600);
      defender.anim({
        x: defender.leftof(75),
        y: defender.y + 50,
        z: defender.behind(150),
        opacity: 0,
        time: 400
      }, "swing");
      defender.delay(500);
      defender.anim({
        opacity: 0,
        time: 1
      });
      defender.anim({
        time: 400
      });
    } },
  catastropika: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#0000DD", 800, 0.2, 500);
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        time: 25
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        opacity: 0,
        time: 325
      }, "decel");
      scene.showEffect("electroball", {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        scale: 1,
        opacity: 1,
        time: 600
      }, {
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0.8,
        time: 800
      }, "accel", "explode");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        scale: 1,
        opacity: 0.5,
        time: 600
      }, {
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0.6,
        time: 800
      }, "accel", "explode");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 850
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1250
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 850
      }, {
        scale: 6,
        opacity: 0,
        time: 1400
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 850
      }, {
        xscale: 0,
        opacity: 0.5,
        time: 1400
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 850
      }, {
        scale: 9,
        time: 1400
      }, "linear", "explode");
      scene.showEffect("lightning", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 800
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 950
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1100
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        time: 300
      }, "decel");
      attacker.delay(300);
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        opacity: 0,
        time: 200
      });
      attacker.delay(50);
      attacker.anim({
        opacity: 0,
        time: 1
      });
      attacker.delay(700);
      attacker.anim({
        opacity: 1,
        time: 200
      });
      defender.delay(850);
      defender.anim({
        y: defender.y - 10,
        z: defender.behind(5),
        yscale: 0.3,
        time: 50
      }, "swing");
      defender.anim({
        y: defender.y - 20,
        z: defender.behind(20),
        yscale: 0.3,
        time: 300
      }, "swing");
      defender.anim({
        time: 400
      }, "swing");
    } },
  stokedsparksurfer: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#0000DD", 1100, 0.2, 500);
      scene.showEffect("electroball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2,
        opacity: 1
      }, {
        y: attacker.y + 120,
        opacity: 0,
        time: 300
      }, "accel");
      scene.showEffect("electroball", {
        x: defender.leftof(-200),
        y: defender.y + 80,
        z: defender.z,
        scale: 1,
        opacity: 0,
        time: 700
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 2,
        opacity: 1,
        time: 1100
      }, "accel", "explode");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1050
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1450
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 1050
      }, {
        scale: 6,
        opacity: 0,
        time: 1600
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 1050
      }, {
        xscale: 0,
        opacity: 0.5,
        time: 1600
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 1050
      }, {
        scale: 9,
        time: 1600
      }, "linear", "explode");
      scene.showEffect("lightning", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1e3
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1150
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      scene.showEffect("lightning", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 1300
      }, {
        scale: 6,
        opacity: 0
      }, "linear");
      attacker.anim({
        y: attacker.y + 120,
        opacity: 0,
        time: 300
      }, "accel");
      attacker.delay(100);
      attacker.anim({
        x: attacker.leftof(-200),
        y: attacker.y + 80,
        z: attacker.z,
        opacity: 0,
        time: 350
      }, "accel");
      attacker.anim({
        x: defender.leftof(-200),
        y: defender.y + 80,
        z: defender.z,
        time: 1
      }, "linear");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        time: 350
      }, "accel");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.5,
        time: 1e3
      }, {
        scale: 2,
        opacity: 0,
        time: 1300
      }, "linear");
      attacker.anim({
        x: defender.leftof(100),
        y: defender.y - 40,
        z: defender.z,
        opacity: 0,
        time: 175
      });
      attacker.delay(700);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 40,
        z: attacker.behind(40),
        time: 1
      });
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      defender.delay(1e3);
      defender.anim({
        z: defender.behind(20),
        time: 300
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
    } },
  sinisterarrowraid: { anim(scene, [attacker, defender]) {
      defender.delay(1050);
      defender.anim({
        z: defender.behind(20),
        time: 300
      }, "swing");
      defender.anim({
        time: 200
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x - 5,
        time: 75
      }, "swing");
      defender.anim({
        x: defender.x + 5,
        time: 75
      }, "swing");
      defender.anim({
        time: 100
      }, "accel");
      attacker.anim({
        y: attacker.y + 120,
        opacity: 0,
        time: 300
      }, "accel");
      attacker.delay(100);
      attacker.anim({
        x: attacker.leftof(-200),
        y: attacker.y + 80,
        z: attacker.z,
        opacity: 0,
        time: 350
      }, "accel");
      attacker.anim({
        x: defender.leftof(-200),
        y: defender.y + 80,
        z: defender.z,
        time: 1
      }, "linear");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        time: 350
      }, "accel");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.5,
        time: 1e3
      }, {
        scale: 2,
        opacity: 0,
        time: 1300
      }, "linear");
      attacker.anim({
        x: defender.leftof(100),
        y: defender.y - 40,
        z: defender.z,
        opacity: 0,
        time: 175
      });
      attacker.delay(700);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 40,
        z: attacker.behind(40),
        time: 1
      });
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      scene.backgroundEffect("linear-gradient(#440044 30%, #000000", 2300, 0.4);
      scene.showEffect("shadowball", {
        x: defender.x - 20,
        y: defender.y + 200,
        z: defender.behind(5),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1475
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1775
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x - 20,
        y: defender.y - 50,
        z: defender.behind(5),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1490
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1775
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x + 40,
        y: defender.y + 200,
        z: defender.behind(-5),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1625
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 1900
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x + 40,
        y: defender.y - 50,
        z: defender.behind(-5),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1640
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1900
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x - 70,
        y: defender.y + 200,
        z: defender.behind(-10),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1675
      }, {
        y: defender.y + 150,
        z: defender.behind(-10),
        opacity: 0,
        time: 1925
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x - 70,
        y: defender.y - 50,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1690
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 1925
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x + 70,
        y: defender.y + 200,
        z: defender.behind(10),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1750
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 2050
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x + 70,
        y: defender.y - 50,
        z: defender.behind(10),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1765
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 2050
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y + 200,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1800
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 2100
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 50,
        z: defender.z,
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1820
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 2100
      }, "linear");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y + 200,
        z: defender.behind(-20),
        opacity: 0.4,
        xscale: 0.1,
        yscale: 5,
        time: 1825
      }, {
        y: defender.y + 150,
        opacity: 0,
        time: 2125
      }, "decel");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 35,
        z: defender.behind(-20),
        opacity: 0.4,
        xscale: 0.3,
        yscale: 0.1,
        time: 1840
      }, {
        xscale: 0.6,
        yscale: 0.1,
        opacity: 0,
        time: 2125
      }, "linear");
    } },
  maliciousmoonsault: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#421800 40%, #B8652F)", 600, 0.7, 1200);
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1450
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1850
      }, "linear", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 1450
      }, {
        scale: 6,
        opacity: 0,
        time: 2e3
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 1450
      }, {
        xscale: 0,
        opacity: 0.5,
        time: 1800
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 1450
      }, {
        scale: 9,
        opacity: 0.7,
        time: 2e3
      }, "linear", "explode");
      attacker.anim({
        x: defender.x,
        y: defender.y + 50,
        z: defender.behind(-150),
        time: 400
      }, "ballistic");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(-125),
        time: 200
      }, "ballistic2Back");
      attacker.anim({
        x: defender.x,
        y: defender.y - 7,
        z: defender.behind(-125),
        yscale: 0.7,
        time: 50
      }, "ballistic2Back");
      attacker.anim({
        x: defender.x,
        y: defender.y + 200,
        z: defender.behind(-30),
        time: 600
      }, "ballistic");
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        time: 200
      });
      attacker.anim({
        time: 500
      }, "ballistic2Back");
      defender.delay(1450);
      defender.anim({
        y: defender.y - 10,
        z: defender.behind(5),
        yscale: 0.3,
        time: 50
      }, "swing");
      defender.anim({
        y: defender.y - 20,
        z: defender.behind(20),
        yscale: 0.3,
        time: 300
      }, "swing");
      defender.anim({
        time: 400
      }, "swing");
    } },
  oceanicoperetta: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#000000 20%, #0000DD)", 2700, 0.4);
      scene.backgroundEffect(`url('https://${Config.routes.client}/fx/weather-raindance.jpg')`, 700, 0.2, 2e3);
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 120,
        z: attacker.z,
        scale: 2.5,
        opacity: 0
      }, {
        scale: 3,
        opacity: 1,
        time: 599
      }, "linear", "fade");
      scene.showEffect("waterwisp", {
        x: attacker.x,
        y: attacker.y + 120,
        z: attacker.z,
        scale: 3,
        opacity: 0
      }, {
        scale: 3.25,
        opacity: 0.7,
        time: 599
      }, "linear", "fade");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 120,
        z: attacker.z,
        scale: 3,
        opacity: 1,
        time: 600
      }, {
        x: defender.x,
        y: defender.y + 10,
        z: defender.z,
        time: 2e3
      }, "accel", "explode");
      scene.showEffect("waterwisp", {
        x: attacker.x,
        y: attacker.y + 120,
        z: attacker.z,
        scale: 3.25,
        opacity: 0.7,
        time: 600
      }, {
        x: defender.x,
        y: defender.y + 10,
        z: defender.z,
        time: 2e3
      }, "accel", "explode");
    } },
  extremeevoboost: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 1e3, 0.3);
      let xstep = (attacker.x + 200 - attacker.x) / 5;
      let ystep = (attacker.x - 200 - attacker.x) / 5;
      let zstep = (defender.z - attacker.z) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("flareball", {
          x: attacker.x - 200 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 0
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x + 150 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("electroball", {
          x: attacker.x - 150 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 100
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x + 100 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("waterwisp", {
          x: attacker.x - 100 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 1.2,
          opacity: 1,
          time: 40 * i + 200
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x + 50 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("shadowball", {
          x: attacker.x - 50 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 300
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x - 50 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("purplewisp", {
          x: attacker.x + 50 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 1.2,
          opacity: 1,
          time: 40 * i + 400
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x - 100 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("iceball", {
          x: attacker.x + 100 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 500
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x - 150 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("energyball", {
          x: attacker.x + 150 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 600
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      xstep = (attacker.x - 200 - attacker.x) / 5;
      for (let i = 0; i < 5; i++) {
        scene.showEffect("mistball", {
          x: attacker.x + 200 + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 0.6,
          opacity: 0.7,
          time: 40 * i + 700
        }, {
          opacity: 0,
          time: 50 * i + 1e3
        }, "linear");
      }
      scene.showEffect("rainbow", {
        x: attacker.x,
        y: attacker.y - 5,
        z: attacker.z,
        scale: 0.8,
        opacity: 0,
        time: 0
      }, {
        scale: 1,
        opacity: 0.6,
        time: 1e3
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2,
        opacity: 0
      }, {
        scale: 2.5,
        opacity: 0.7,
        time: 1e3
      }, "linear", "explode");
    } },
  pulverizingpancake: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#421800 40%, #B8652F)", 600, 0.7, 1200);
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1450
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1850
      }, "linear", "fade");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 1450
      }, {
        scale: 6,
        opacity: 0,
        time: 2e3
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 1450
      }, {
        xscale: 0,
        opacity: 0.5,
        time: 1800
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 1450
      }, {
        scale: 9,
        opacity: 0.7,
        time: 2e3
      }, "linear", "explode");
      attacker.anim({
        x: defender.x,
        y: defender.y + 50,
        z: defender.behind(-150),
        time: 400
      }, "ballistic");
      attacker.anim({
        x: defender.x,
        y: defender.y,
        z: defender.behind(-125),
        time: 200
      }, "ballistic2Back");
      attacker.anim({
        x: defender.x,
        y: defender.y - 7,
        z: defender.behind(-125),
        yscale: 0.7,
        time: 50
      }, "ballistic2Back");
      attacker.anim({
        x: defender.x,
        y: defender.y + 200,
        z: defender.behind(-30),
        time: 600
      }, "ballistic");
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y + 5,
        z: defender.behind(10),
        time: 200
      });
      attacker.anim({
        time: 500
      }, "ballistic2Back");
      defender.delay(1450);
      defender.anim({
        y: defender.y - 10,
        z: defender.behind(5),
        yscale: 0.3,
        time: 50
      }, "swing");
      defender.anim({
        y: defender.y - 20,
        z: defender.behind(20),
        yscale: 0.3,
        time: 300
      }, "swing");
      defender.anim({
        time: 400
      }, "swing");
    } },
  genesissupernova: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 700, 0.3);
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.6,
        opacity: 0.5
      }, {
        scale: 3,
        opacity: 0.3,
        time: 300
      }, "decel", "fade");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.8,
        opacity: 0.6,
        time: 100
      }, {
        scale: 3,
        opacity: 0.5,
        time: 400
      }, "decel", "fade");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2,
        opacity: 0.8,
        time: 400
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(20),
        scale: 1.25,
        time: 600
      }, "accel", "explode");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 0.8,
        opacity: 0.6,
        time: 100
      }, {
        scale: 4,
        opacity: 0.5,
        time: 400
      }, "decel", "fade");
      scene.showEffect("purplewisp", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 2.5,
        opacity: 0.8,
        time: 400
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(20),
        scale: 1.5,
        opacity: 0.8,
        time: 600
      }, "accel", "explode");
      scene.showEffect("mistball", {
        x: defender.x + 30,
        y: defender.y + 25,
        z: defender.z,
        scale: 0.2,
        opacity: 1,
        time: 800
      }, {
        x: defender.x + 50,
        y: defender.y + 10,
        opacity: 0.5,
        time: 1e3
      }, "accel", "explode");
      scene.showEffect("mistball", {
        x: defender.x - 30,
        y: defender.y - 20,
        z: defender.z,
        scale: 0.2,
        opacity: 1,
        time: 900
      }, {
        x: defender.x - 50,
        y: defender.y - 20,
        opacity: 0.5,
        time: 1100
      }, "accel", "explode");
      scene.showEffect("mistball", {
        x: defender.x + 15,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.2,
        opacity: 1,
        time: 900
      }, {
        x: defender.x + 35,
        y: defender.y + 30,
        opacity: 0.5,
        time: 1100
      }, "accel", "explode");
      scene.showEffect("mistball", {
        x: defender.x - 15,
        y: defender.y - 30,
        z: defender.z,
        scale: 0.2,
        opacity: 1,
        time: 800
      }, {
        x: defender.x - 35,
        y: defender.y - 40,
        opacity: 0.5,
        time: 1e3
      }, "accel", "explode");
      attacker.delay(400);
      attacker.anim({
        z: attacker.behind(20),
        time: 300
      }, "swing");
      attacker.anim({
        time: 300
      }, "swing");
      defender.delay(600);
      defender.anim({
        z: defender.behind(10),
        time: 300
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
    } },
  guardianofalola: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#421800 40%, #B8652F)", 1700, 0.6, 300);
      scene.showEffect("fist1", {
        x: attacker.leftof(200),
        y: defender.y + 175,
        z: defender.z,
        scale: 0.5,
        opacity: 1,
        time: 400
      }, {
        x: defender.x,
        y: defender.y + 15,
        z: defender.z,
        scale: 5.5,
        opacity: 0.5,
        time: 799
      }, "accel", "fade");
      scene.showEffect("fist1", {
        x: defender.x,
        y: defender.y + 15,
        z: defender.z,
        scale: 5.5,
        opacity: 1,
        time: 800
      }, {
        x: defender.x,
        y: defender.y - 10,
        z: defender.z,
        xscale: 10,
        opacity: 0,
        time: 1050
      }, "linear");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 850
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1200
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1050
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1500
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 1,
        time: 1250
      }, {
        scale: 2,
        xscale: 12,
        opacity: 0,
        time: 1800
      }, "linear", "fade");
      scene.showEffect("electroball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 1,
        time: 850
      }, {
        scale: 6,
        opacity: 0,
        time: 2e3
      }, "linear");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 6,
        time: 850
      }, {
        scale: 12,
        opacity: 0.8,
        time: 2e3
      }, "linear", "explode");
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 60,
        z: attacker.behind(40),
        opacity: 0,
        time: 250
      }, "accel");
      attacker.delay(1300);
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      defender.delay(750);
      defender.anim({
        y: defender.y - 30,
        z: defender.z,
        yscale: 0.5,
        time: 200
      }, "swing");
      defender.delay(700);
      defender.anim({
        time: 300
      }, "swing");
    } },
  soulstealing7starstrike: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("linear-gradient(#043B13 55%, #3FBF99", 3600, 0.7);
      scene.backgroundEffect("#ffffff", 700, 0.7, 3300);
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1,
        time: 300
      }, {
        x: attacker.leftof(-20),
        y: attacker.y,
        z: attacker.behind(-40),
        opacity: 0,
        time: 500
      }, "decel");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1,
        time: 350
      }, {
        x: attacker.leftof(20),
        y: attacker.y - 5,
        z: attacker.behind(-40),
        opacity: 0,
        time: 600
      }, "decel");
      scene.showEffect("fist", {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        scale: 1,
        opacity: 1,
        time: 400
      }, {
        x: attacker.x,
        y: attacker.y + 5,
        z: attacker.behind(-40),
        opacity: 0,
        time: 700
      }, "decel");
      scene.showEffect("iceball", {
        x: defender.x - 30,
        y: defender.y + 20,
        z: defender.z,
        scale: 0.1,
        opacity: 1,
        time: 250
      }, {
        opacity: 0,
        scale: 0.5,
        time: 300
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: defender.y + 30,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 450
      }, {
        opacity: 0,
        scale: 0.5,
        time: 550
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x + 30,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 650
      }, {
        opacity: 0,
        scale: 0.5,
        time: 700
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x - 10,
        y: attacker.y,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 850
      }, {
        opacity: 0,
        scale: 0.5,
        time: 900
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x + 10,
        y: attacker.y,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 1050
      }, {
        opacity: 0,
        scale: 0.5,
        time: 1100
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x - 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 1250
      }, {
        opacity: 0,
        scale: 0.5,
        time: 1300
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 1450
      }, {
        opacity: 0,
        scale: 0.5,
        time: 1500
      }, "linear", "explode");
      scene.showEffect("shine", {
        x: defender.x - 30,
        y: defender.y + 20,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 300
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x,
        y: defender.y + 30,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 500
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x + 30,
        y: defender.y + 20,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 700
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x - 10,
        y: defender.y,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 900
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x + 10,
        y: defender.y,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 1100
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x - 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 1300
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("shine", {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 0.1,
        opacity: 0.7,
        time: 1500
      }, {
        opacity: 0.9,
        scale: 0.2,
        time: 2500
      }, "decel", "explode");
      scene.showEffect("zsymbol", {
        x: defender.x,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.7,
        opacity: 1,
        time: 1600
      }, {
        scale: 1,
        opacity: 0,
        time: 2600
      }, "decel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        scale: 1,
        time: 1900
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        opacity: 0,
        time: 2300
      }, "accel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        scale: 1,
        time: 1920
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        opacity: 0,
        time: 2320
      }, "accel");
      scene.showEffect(attacker.sp, {
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        opacity: 0.3,
        scale: 1,
        time: 1940
      }, {
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        opacity: 0,
        time: 2340
      }, "accel");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 2,
        opacity: 0.5,
        time: 3350
      }, {
        scale: 1,
        xscale: 12,
        opacity: 0,
        time: 3750
      }, "decel", "fade");
      scene.showEffect("shadowball", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 0.4,
        scale: 0.5,
        time: 3350
      }, {
        scale: 3,
        opacity: 0,
        time: 3900
      }, "decel");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 5,
        yscale: 13,
        time: 3350
      }, {
        opacity: 0.5,
        xscale: 0,
        time: 4200
      }, "accel", "fade");
      scene.showEffect("purplewisp", {
        x: defender.x,
        y: defender.y - 30,
        z: defender.z,
        opacity: 1,
        scale: 2,
        time: 3350
      }, {
        opacity: 0.5,
        scale: 6,
        time: 4200
      }, "decel", "explode");
      attacker.anim({
        z: attacker.behind(15),
        time: 200
      }, "decel");
      attacker.anim({
        z: defender.behind(-175),
        time: 300
      }, "accel");
      attacker.anim({
        z: attacker.z,
        time: 400
      }, "swing");
      attacker.delay(1100);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        time: 300
      }, "decel");
      attacker.delay(300);
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y,
        z: defender.behind(-10),
        opacity: 1,
        time: 300
      }, "linear");
      attacker.anim({
        x: defender.leftof(-10),
        y: defender.y,
        z: defender.behind(-10),
        opacity: 0,
        time: 0
      }, "linear");
      attacker.delay(600);
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.behind(70),
        opacity: 0,
        time: 1
      }, "linear");
      attacker.delay(600);
      attacker.anim({
        opacity: 1,
        time: 500
      }, "decel");
      defender.delay(400);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.delay(2275);
      defender.anim({
        z: defender.behind(5),
        opacity: 0,
        time: 75
      }, "swing");
      defender.delay(600);
      defender.anim({
        time: 150
      }, "swing");
    } },
  clangoroussoulblaze: { anim(scene, [attacker, ...defenders]) {
      attacker.anim({ x: attacker.x - 10, time: 300 });
      attacker.anim({ x: attacker.x + 10, time: 400 });
      attacker.anim({ x: attacker.x, time: 300 });
      attacker.delay(50);
      attacker.anim({
        y: attacker.y - 10,
        yscale: 0.9,
        time: 50
      });
      attacker.anim({
        y: attacker.y + 250,
        yscale: 1,
        time: 300
      }, "decel");
      attacker.delay(1700);
      attacker.anim({
        opacity: 0,
        time: 1
      });
      attacker.anim({
        opacity: 1,
        time: 200
      });
      for (const defender2 of defenders) {
        defender2.delay(1825);
        defender2.anim({
          z: defender2.behind(5),
          time: 75
        }, "swing");
        defender2.anim({
          time: 75
        }, "swing");
        defender2.anim({
          z: defender2.behind(5),
          time: 75
        }, "swing");
        defender2.anim({
          time: 75
        }, "swing");
        defender2.anim({
          z: defender2.behind(5),
          time: 75
        }, "swing");
        defender2.anim({
          time: 75
        }, "swing");
        defender2.anim({
          z: defender2.behind(5),
          time: 75
        }, "swing");
        defender2.anim({
          time: 75
        }, "swing");
        defender2.anim({
          z: defender2.behind(15),
          time: 75,
          opacity: 0
        }, "swing");
        defender2.delay(400);
        defender2.anim({
          time: 200
        }, "swing");
      }
      const defender = defenders[1] || defenders[0];
      scene.backgroundEffect("#000000", 300, 0.9);
      scene.backgroundEffect(`url('https://${Config.routes.client}/sprites/gen6bgs/bg-earthycave.jpg')`, 2e3, 0.7, 300);
      scene.backgroundEffect("linear-gradient(#FB5C1E 20%, #3F1D0F", 2e3, 0.6, 300);
      scene.backgroundEffect("#FFFFFF", 1e3, 0.9, 2200);
      scene.showEffect("shine", {
        x: attacker.x - 10,
        y: attacker.y - 10,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6
      }, {
        opacity: 0,
        time: 300
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x + 20,
        y: attacker.y - 15,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 100
      }, {
        opacity: 0,
        time: 400
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x - 5,
        y: attacker.y + 15,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 200
      }, {
        opacity: 0,
        time: 500
      }, "decel");
      scene.showEffect("shine", {
        x: attacker.x + 5,
        y: attacker.y - 10,
        z: attacker.z,
        scale: 0.3,
        opacity: 0.6,
        time: 300
      }, {
        opacity: 0,
        time: 600
      }, "accel");
      scene.showEffect("shine", {
        x: attacker.x + 20,
        y: attacker.y - 30,
        z: attacker.z,
        scale: 0.2,
        opacity: 1,
        time: 0
      }, {
        y: attacker.y + 40,
        opacity: 0,
        time: 400
      }, "accel");
      scene.showEffect("shine", {
        x: attacker.x - 20,
        y: attacker.y + 40,
        z: attacker.z,
        scale: 0.2,
        opacity: 1,
        time: 200
      }, {
        y: attacker.y + 40,
        opacity: 0,
        time: 600
      }, "accel");
      scene.showEffect("shine", {
        x: attacker.x,
        y: attacker.y + 30,
        z: attacker.z,
        scale: 0.2,
        opacity: 1,
        time: 400
      }, {
        y: attacker.y + 40,
        opacity: 0,
        time: 800
      }, "accel");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 1700
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2100
      }, "linear");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 1800
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2200
      }, "linear");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 1900
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2300
      }, "linear");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2e3
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2400
      }, "linear");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2100
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2500
      }, "linear");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2200
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2600
      }, "linear");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2300
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2700
      }, "linear");
      scene.showEffect("shadowball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2400
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2800
      }, "linear");
      scene.showEffect("mistball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0,
        opacity: 1,
        time: 2500
      }, {
        y: defender.y - 200,
        z: defender.behind(150),
        scale: 10,
        opacity: 0,
        time: 2900
      }, "linear");
      scene.showEffect("fireball", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 2300
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("fireball", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 2550
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("fireball", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 0.6,
        time: 2700
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
    } },
  splinteredstormshards: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect(`url('https://${Config.routes.client}/sprites/gen6bgs/bg-earthycave.jpg')`, 2700, 0.8, 300);
      scene.backgroundEffect("linear-gradient(#FFC720 15%, #421800)", 2700, 0.7);
      scene.backgroundEffect("#ffffff", 400, 0.6, 2500);
      scene.showEffect("rock3", {
        x: defender.x - 50,
        y: defender.y + 20,
        z: defender.behind(20),
        scale: 0.4,
        opacity: 1
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1e3
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 50,
        y: defender.y + 40,
        z: defender.behind(-40),
        scale: 0.2,
        opacity: 1,
        time: 150
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1100
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 70,
        y: defender.y + 45,
        z: defender.behind(10),
        scale: 0.4,
        opacity: 1,
        time: 175
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1175
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 60,
        y: defender.y + 60,
        z: defender.behind(30),
        scale: 0.3,
        opacity: 1,
        time: 200
      }, {
        y: defender.x + 100,
        opacity: 0,
        time: 1200
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x - 40,
        y: defender.y + 40,
        z: defender.behind(-30),
        scale: 0.5,
        opacity: 1,
        time: 210
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1300
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 30,
        y: defender.y + 25,
        z: defender.behind(20),
        scale: 0.2,
        opacity: 1,
        time: 220
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1220
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x - 80,
        y: defender.y + 40,
        z: defender.behind(-40),
        scale: 0.2,
        opacity: 1,
        time: 650
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1500
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x - 72,
        y: defender.y + 10,
        z: defender.behind(20),
        scale: 0.3,
        opacity: 1,
        time: 750
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1500
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 80,
        y: defender.y + 40,
        z: defender.behind(-60),
        scale: 0.4,
        opacity: 1,
        time: 850
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1500
      }, "accel");
      scene.showEffect("rock3", {
        x: defender.x + 70,
        y: defender.y + 40,
        z: defender.behind(-60),
        scale: 0.4,
        opacity: 1,
        time: 950
      }, {
        y: defender.y + 100,
        opacity: 0,
        time: 1500
      }, "accel");
      scene.showEffect("flareball", {
        x: defender.leftof(-200),
        y: defender.y + 175,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1600
      }, {
        x: defender.x + 30,
        y: defender.y,
        scale: 1.5,
        opacity: 0.8
      }, "accel", "explode");
      scene.showEffect("rock3", {
        x: defender.leftof(-200),
        y: defender.y + 175,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1600
      }, {
        x: defender.x + 30,
        y: defender.y,
        scale: 1,
        opacity: 0.4
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.leftof(-200),
        y: defender.y - 20 + 175,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1750
      }, {
        x: defender.x + 30,
        y: defender.y - 5,
        scale: 1.5,
        opacity: 0.8
      }, "accel", "explode");
      scene.showEffect("rock3", {
        x: defender.leftof(-150),
        y: defender.y + 20 + 175,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1750
      }, {
        x: defender.x + 20,
        y: defender.y - 5,
        scale: 1,
        opacity: 0.4
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.leftof(150),
        y: defender.y + 255,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1900
      }, {
        x: defender.x - 20,
        y: defender.y,
        scale: 1,
        opacity: 0.8
      }, "accel", "explode");
      scene.showEffect("rock3", {
        x: defender.leftof(150),
        y: defender.y + 255,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1900
      }, {
        x: defender.x - 20,
        y: defender.y,
        scale: 1,
        opacity: 0.4
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.leftof(-300),
        y: defender.y - 20 + 150,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1950
      }, {
        x: defender.x + 20,
        y: defender.y,
        scale: 1.5,
        opacity: 0.8
      }, "accel", "explode");
      scene.showEffect("rock3", {
        x: defender.leftof(-300),
        y: defender.y - 20 + 150,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 1950
      }, {
        x: defender.x + 20,
        y: defender.y,
        scale: 1,
        opacity: 0.4
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.leftof(-175),
        y: defender.y - 20 + 225,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 2100
      }, {
        x: defender.x + 20,
        y: defender.y,
        scale: 1.5,
        opacity: 0.8
      }, "accel", "explode");
      scene.showEffect("rock3", {
        x: defender.leftof(-175),
        y: defender.y - 20 + 225,
        z: defender.z,
        scale: 0.1,
        opacity: 0,
        time: 2100
      }, {
        x: defender.x + 20,
        y: defender.y,
        scale: 1,
        opacity: 0.4
      }, "accel", "explode");
      scene.showEffect("mudwisp", {
        x: defender.x,
        y: defender.y - 60,
        z: defender.z,
        scale: 1,
        xscale: 2,
        opacity: 0.8,
        time: 1850
      }, {
        scale: 1,
        xscale: 9,
        opacity: 0,
        time: 2750
      }, "decel", "fade");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 2,
        time: 1950
      }, {
        scale: 6,
        time: 2700
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y + 350,
        z: defender.z,
        opacity: 1,
        scale: 3,
        yscale: 10,
        time: 1850
      }, {
        xscale: 0,
        time: 2700
      }, "accel", "fade");
      scene.showEffect("wisp", {
        x: defender.x - 5,
        y: defender.y - 5,
        z: defender.z,
        scale: 0.6,
        opacity: 0.6,
        time: 2450
      }, {
        x: defender.x - 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 2,
        opacity: 0.1,
        time: 2750
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: defender.x + 10,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.6,
        opacity: 0.6,
        time: 2575
      }, {
        x: defender.x + 20,
        y: defender.y + 20,
        z: defender.z,
        scale: 1.5,
        opacity: 0.1,
        time: 2875
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: defender.x + 20,
        y: defender.y - 30,
        z: defender.z,
        scale: 0.6,
        opacity: 0.6,
        time: 2600
      }, {
        x: defender.x + 30,
        y: defender.y - 25,
        z: defender.z,
        scale: 2,
        opacity: 0.1,
        time: 2900
      }, "linear", "explode");
      defender.delay(1925);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(15),
        time: 75,
        opacity: 0
      }, "swing");
      defender.delay(300);
      defender.anim({
        time: 200
      }, "swing");
    } },
  letssnuggleforever: { anim(scene, [attacker, defender]) {
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 250,
        z: attacker.behind(-50),
        time: 300
      }, "decel");
      attacker.delay(300);
      attacker.anim({
        x: defender.x,
        y: defender.y + 15,
        z: defender.behind(10),
        scale: 4,
        time: 400
      }, "decel");
      attacker.delay(300);
      attacker.anim({
        x: defender.x,
        y: defender.y + 20,
        z: defender.behind(10),
        yscale: 4.2,
        xscale: 4,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y - 5,
        z: defender.behind(10),
        yscale: 3,
        xscale: 4.2,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y + 20,
        z: defender.behind(10),
        yscale: 4.5,
        xscale: 4,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y - 5,
        z: defender.behind(10),
        yscale: 3,
        xscale: 4.2,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y + 20,
        z: defender.behind(10),
        yscale: 4.5,
        xscale: 4,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y - 5,
        z: defender.behind(10),
        yscale: 3,
        xscale: 4.2,
        time: 200
      });
      attacker.anim({
        x: defender.x,
        y: defender.y + 15,
        z: defender.behind(10),
        scale: 4,
        time: 200
      });
      attacker.delay(300);
      attacker.anim({
        time: 500
      }, "ballistic");
      defender.delay(750);
      defender.anim({
        opacity: 0,
        time: 50
      }, "swing");
      defender.delay(2100);
      defender.anim({
        y: defender.y + 100,
        z: defender.behind(5),
        opacity: 1,
        time: 300
      }, "decel");
      defender.anim({
        time: 250
      }, "accel");
      defender.anim({
        x: defender.x,
        y: defender.y - 30,
        yscale: 0.25,
        time: 50
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
      scene.showEffect("impact", {
        x: defender.x - 25,
        y: defender.y - 10,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 1575
      }, {
        scale: 2,
        opacity: 0,
        time: 1775
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x + 25,
        y: defender.y - 25,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 1700
      }, {
        scale: 2,
        opacity: 0,
        time: 1900
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x - 25,
        y: defender.y - 10,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 1700
      }, {
        scale: 2,
        opacity: 0,
        time: 2e3
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x + 2,
        y: defender.y - 5,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 1800
      }, {
        scale: 2,
        opacity: 0,
        time: 2100
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x + 35,
        y: defender.y - 20,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 1900
      }, {
        scale: 2,
        opacity: 0,
        time: 2300
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x + 5,
        y: defender.y + 20,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 2100
      }, {
        scale: 2,
        opacity: 0,
        time: 2300
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x - 35,
        y: defender.y - 35,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 2200
      }, {
        scale: 2,
        opacity: 0,
        time: 2500
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x + 35,
        y: defender.y - 35,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 2300
      }, {
        scale: 2,
        opacity: 0,
        time: 2600
      }, "linear");
      scene.showEffect("impact", {
        x: defender.x,
        y: defender.y - 10,
        z: defender.behind(5),
        scale: 1,
        opacity: 1,
        time: 2500
      }, {
        scale: 3,
        opacity: 0,
        time: 2800
      }, "linear");
      scene.showEffect("mudwisp", {
        x: defender.x + 5,
        y: defender.y - 5,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 1450
      }, {
        x: defender.x - 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 1,
        opacity: 0.8,
        time: 1750
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: defender.x + 10,
        y: defender.y + 10,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 1575
      }, {
        x: defender.x + 20,
        y: defender.y + 20,
        z: defender.z,
        scale: 1,
        opacity: 0.8,
        time: 1875
      }, "linear", "explode");
      scene.showEffect("mudwisp", {
        x: defender.x + 20,
        y: defender.y - 30,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 1600
      }, {
        x: defender.x + 30,
        y: defender.y - 25,
        z: defender.z,
        scale: 1,
        opacity: 0.8,
        time: 2e3
      }, "linear", "explode");
      scene.showEffect("wisp", {
        x: defender.x + 5,
        y: defender.y - 5,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 1950
      }, {
        x: defender.x - 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 1.5,
        opacity: 0.8,
        time: 2350
      }, "linear", "explode");
      scene.showEffect("mudwisp", {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 1,
        opacity: 0.6,
        time: 2175
      }, {
        x: defender.x + 20,
        y: defender.y - 25,
        scale: 1.5,
        opacity: 0.8,
        time: 2575
      }, "linear", "explode");
    } },
  searingsunrazesmash: { anim(scene, [attacker, defender]) {
      let xstep = (defender.x - attacker.x) / 5;
      let ystep = (defender.x - 200 - attacker.x) / 5;
      let zstep = (defender.z - attacker.z) / 5;
      scene.backgroundEffect(`url('https://${Config.routes.client}/fx/weather-trickroom.png')`, 700, 1);
      scene.backgroundEffect(`url('https://${Config.routes.client}/fx/bg-space.jpg')`, 2500, 1, 700);
      scene.backgroundEffect("#FFFFFF", 1500, 1, 2500);
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 2.5,
        opacity: 1,
        time: 1700
      }, {
        scale: 3,
        opacity: 0,
        time: 2400
      }, "decel");
      for (let i = 0; i < 5; i++) {
        scene.showEffect("flareball", {
          x: attacker.x + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 2,
          opacity: 0.8,
          time: 40 * i + 1900
        }, {
          opacity: 0,
          time: 60 * i + 2700
        }, "linear");
      }
      scene.showEffect("iceball", {
        x: attacker.leftof(-25),
        y: attacker.y + 250,
        z: attacker.z,
        scale: 1,
        opacity: 0.1,
        time: 2e3
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(5),
        scale: 1.5,
        time: 2400
      }, "accel", "explode");
      scene.showEffect("iceball", {
        x: attacker.leftof(-25),
        y: attacker.y + 250,
        z: attacker.z,
        scale: 1,
        opacity: 0.8,
        time: 2050
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.behind(5),
        scale: 1.5,
        time: 2450
      }, "accel", "explode");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y - 50,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 0.5,
        time: 2275
      }, {
        scale: 3,
        xscale: 8,
        opacity: 0.1,
        time: 2875
      }, "linear", "fade");
      scene.showEffect("fireball", {
        x: defender.x + 40,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 2500
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("fireball", {
        x: defender.x - 40,
        y: defender.y - 20,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 2650
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("fireball", {
        x: defender.x + 10,
        y: defender.y + 20,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 2800
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("fireball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 0,
        opacity: 1,
        time: 2950
      }, {
        scale: 6,
        opacity: 0
      }, "decel");
      scene.showEffect("wisp", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 1,
        scale: 3,
        time: 2350
      }, {
        scale: 13,
        time: 3700
      }, "linear", "explode");
      attacker.anim({
        opacity: 0,
        time: 100
      });
      attacker.delay(500);
      attacker.anim({
        opacity: 1,
        time: 100
      });
      attacker.delay(500);
      attacker.anim({
        y: defender.y + 120,
        opacity: 0,
        time: 300
      }, "accel");
      attacker.delay(2525);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 40,
        z: attacker.behind(40),
        time: 1
      });
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      defender.anim({
        opacity: 0,
        time: 100
      });
      defender.delay(500);
      defender.anim({
        opacity: 1,
        time: 100
      });
      defender.delay(1875);
      defender.anim({
        z: defender.behind(30),
        time: 500,
        opacity: 0
      }, "decel");
      defender.delay(600);
      defender.anim({
        time: 400
      }, "swing");
    } },
  menacingmoonrazemaelstrom: { anim(scene, [attacker, defender]) {
      let xstep = (defender.x - attacker.x) / 5;
      let ystep = (defender.x - 200 - attacker.x) / 5;
      let zstep = (defender.z - attacker.z) / 5;
      scene.backgroundEffect("#000000", 600, 0.6);
      scene.backgroundEffect("linear-gradient(#000000 10%, #2630A9)", 1100, 0.6, 600);
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 2.5,
        opacity: 1,
        time: 500
      }, {
        scale: 3,
        opacity: 0,
        time: 1300
      }, "decel");
      for (let i = 0; i < 5; i++) {
        scene.showEffect("wisp", {
          x: attacker.x + xstep * (i + 1),
          y: attacker.y + 200 + ystep * (i + 1),
          z: attacker.z + zstep * (i + 1),
          scale: 2.5,
          opacity: 1,
          time: 40 * i + 700
        }, {
          scale: 2,
          opacity: 0,
          time: 60 * i + 1500
        }, "linear");
      }
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 800
      }, {
        x: defender.x + 30,
        y: defender.y + 30,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1e3
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 875
      }, {
        x: defender.x + 20,
        y: defender.y - 30,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1075
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 950
      }, {
        x: defender.x - 30,
        y: defender.y,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1150
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 1025
      }, {
        x: defender.x - 10,
        y: defender.y + 10,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1225
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 1100
      }, {
        x: defender.x + 10,
        y: defender.y - 10,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1300
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: attacker.x,
        y: attacker.y + 200,
        z: attacker.z,
        scale: 0.4,
        opacity: 0.6,
        time: 1175
      }, {
        x: defender.x - 20,
        y: defender.y,
        z: defender.z,
        scale: 0.6,
        opacity: 0.3,
        time: 1375
      }, "linear", "explode");
      scene.showEffect("iceball", {
        x: defender.x,
        y: defender.y - 50,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 0.5,
        time: 1375
      }, {
        scale: 3,
        xscale: 8,
        opacity: 0.1,
        time: 1675
      }, "linear", "explode");
      scene.showEffect("bluefireball", {
        x: defender.x,
        y: defender.y,
        z: defender.behind(5),
        scale: 0,
        opacity: 1,
        time: 1175
      }, {
        scale: 8,
        opacity: 0,
        time: 1375
      }, "linear");
      scene.showEffect("bluefireball", {
        x: defender.x,
        y: defender.y,
        z: defender.behind(10),
        scale: 0,
        opacity: 1,
        time: 1275
      }, {
        scale: 8,
        opacity: 0,
        time: 1675
      }, "linear");
      attacker.anim({
        y: defender.y + 120,
        opacity: 0,
        time: 300
      }, "accel");
      attacker.delay(1150);
      attacker.anim({
        x: attacker.x,
        y: attacker.y + 40,
        z: attacker.behind(40),
        time: 1
      });
      attacker.anim({
        x: attacker.x,
        y: attacker.y,
        z: attacker.z,
        time: 250
      }, "decel");
      defender.delay(775);
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(5),
        time: 75
      }, "swing");
      defender.anim({
        time: 75
      }, "swing");
      defender.anim({
        z: defender.behind(10),
        time: 300
      }, "decel");
      defender.anim({
        time: 300
      }, "swing");
    } },
  lightthatburnsthesky: { anim(scene, [attacker, defender]) {
      scene.backgroundEffect("#000000", 700, 0.3);
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y + 90,
        z: attacker.z,
        scale: 0
      }, {
        x: attacker.x,
        y: attacker.y + 90,
        z: attacker.z,
        scale: 2,
        time: 200
      }, "accel", "fade");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y + 90,
        z: attacker.z,
        opacity: 0.4,
        scale: 0,
        time: 150
      }, {
        x: attacker.x,
        y: attacker.y + 90,
        z: attacker.z,
        scale: 3,
        opacity: 0,
        time: 800
      }, "linear");
      scene.showEffect("flareball", {
        x: attacker.x,
        y: attacker.y + 90,
        z: attacker.z,
        opacity: 0.8,
        scale: 2,
        time: 200
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 2.5,
        time: 500
      }, "accel", "fade");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y - 50,
        z: defender.z,
        scale: 1,
        xscale: 3,
        opacity: 0.5,
        time: 550
      }, {
        scale: 3,
        xscale: 8,
        opacity: 0.1,
        time: 1e3
      }, "linear", "fade");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.3,
        scale: 0,
        time: 500
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 4,
        opacity: 0,
        time: 800
      }, "linear");
      scene.showEffect("flareball", {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        opacity: 0.7,
        scale: 0,
        time: 700
      }, {
        x: defender.x,
        y: defender.y,
        z: defender.z,
        scale: 4,
        opacity: 0,
        time: 1e3
      }, "linear");
      defender.delay(500);
      defender.anim({
        z: defender.behind(20),
        time: 100
      }, "swing");
      defender.anim({
        time: 300
      }, "swing");
    } },
};
window.SD_ANIMS = { BattleEffects, BattleOtherAnims, BattleMoveAnims, Z: {"normal":"breakneckblitz","fighting":"alloutpummeling","flying":"supersonicskystrike","poison":"aciddownpour","ground":"tectonicrage","rock":"continentalcrush","bug":"savagespinout","ghost":"neverendingnightmare","steel":"corkscrewcrash","fire":"infernooverdrive","water":"hydrovortex","grass":"bloomdoom","electric":"gigavolthavoc","psychic":"shatteredpsyche","ice":"subzeroslammer","dragon":"devastatingdrake","dark":"blackholeeclipse","fairy":"twinkletackle"} };
