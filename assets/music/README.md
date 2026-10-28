# 小遊戲背景音樂

下列四個音檔供小遊戲播放，檔名須與 GameMusic.js 的設定一致。

- ready-for-adventure.mp3 — Ready for Adventure / Yosuke Matsuura
  https://dova-s.jp/en/bgm/detail/19227
  第一章第 1、2 小關。
- restaurant-han.mp3 — 中華料理屋のハンさん / MAKOOTO
  https://dova-s.jp/bgm/detail/13232
  第一章第 3 小關。
- small-town-great-journey.mp3 — A Small Town, A Great Journey / Yosuke Matsuura
  https://dova-s.jp/en/bgm/detail/23817
  第二章記憶／問答小遊戲。
- walk-little-adventure.mp3 — A Walk is a Little Adventure / Yosuke Matsuura
  https://dova-s.jp/en/bgm/detail/21714
  第三章 InteractSystem 拖放小遊戲，付款與前導對話不播放。

四個音檔已取得並改為上列檔名；Chrome 載入及解碼全部成功。長度依序約 137.2、72.7、234.7、185.8 秒。
本機驗證頁：/GAME/tests/music-assets.html（檢查解碼，不播放）。
程式遇到缺檔時保持靜音，不影響遊戲。
音樂預設 20%，結算、離開小遊戲及換場景停止；隱藏分頁暫停。

四個 MP3 依專案作者決定隨遊戲提交，部署後由網站自身的 assets/music 路徑載入，不外連官方音檔。
音樂權利仍屬原作者，不適用本專案程式碼的任何授權。這次提交不代表已取得另外的原音檔散布許可；免費、非營利亦不免除遵守音源條款的義務。

官方授權：https://opentracks.com/en/help/articles/license/
網站條款：https://opentracks.com/en/help/articles/terms/

關卡正常結束時，音樂以 800 毫秒線性淡出後釋放；重複完成不重啟淡出。退出、換場景、開始下一關、靜音與隱藏分頁會立即清理舊聲，避免殘留。
手機若阻擋播放，會在小遊戲期間的點擊或放開觸控後重試；前導對話不播放背景音樂。快取 game-v24。首次載入遊戲不會預先下載所有音樂，音樂不保證離線可用。
