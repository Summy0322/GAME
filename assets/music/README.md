# 本機試玩所需音樂

請從官方曲目頁手動下載，放入本資料夾並依下列檔名命名。

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

OpenTracks（原 DOVA-SYNDROME）官方條款允許遊戲背景使用，但禁止程式自動收集、音檔外連及讓使用者可直接取得複製原音檔的公開方式。
因此原 MP3 已加入 .gitignore，本次程式 PR 不附第三方音檔。
這是本機試玩接入；公開 GitHub Pages 前仍須確認作者允許的資源封裝／部署方式，不能直接把這四個 MP3 提交到公開倉庫。

官方授權：https://opentracks.com/en/help/articles/license/
網站條款：https://opentracks.com/en/help/articles/terms/

關卡正常結束時，音樂以 800 毫秒線性淡出後釋放；重複完成不重啟淡出。退出、換場景、開始下一關、靜音與隱藏分頁會立即清理舊聲，避免殘留。快取 game-v15。新增淡出測試，全套 56 項通過。
