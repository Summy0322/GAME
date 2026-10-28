# 對話短音與背景音樂候選

## 已實作：上揚啾音

逐字對話使用 Web Audio 即時產生 triangle 波，660 → 990 Hz，40 毫秒；至少間隔 75 毫秒。
音量沿用試聽頁的 30%，標點與空白略過。第一次點擊或鍵盤互動啟用音訊，若瀏覽器尚未允許播放，直接略過、不補播舊聲音。
停止打字、略過／清除對話及頁面隱藏時停止已產生短音。點擊／答題音效及明確指定的語音維持原播放器。
setSFXVolume 同時控制逐字短音；設為 0 或原音效播放器 muted 時不產生短音。
44 項自動測試通過，含音訊未啟用、節流、正確音高、標點、停止、靜音、隱藏頁面、重複初始化。
尚需手機／不同瀏覽器及實際喇叭試聽，測試不保證所有裝置都能播放。

## 背景音樂：候選，尚未下載／接入

選曲是依官方樂器、風格與節奏資料提出的建議，仍需遊戲內試聽確認混音；不是已完成的聽感驗證。

- 第一章防禦：Kevin MacLeod《Cipher》。電子合成器、電鋼琴、打擊，150 BPM。建議低音量試配，保持操作提示清楚。
  https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100844
- 第二章記憶／問答：Kevin MacLeod《Carefree》。烏克麗麗、木琴等，96 BPM。較輕鬆，可先作為思考活動的候選。
  https://www.incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037
- 第三章逛店／購物互動：Kevin MacLeod《Monkeys Spinning Monkeys》。輕快趣味方向的候選；若覺得喜劇感太強，可與第二章共用《Carefree》。
  https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400011

官方頁提供 CC BY 4.0 署名授權；正式使用時在遊戲製作名單及 README 寫曲名、Kevin MacLeod、來源連結、授權連結，若剪輯／改作亦註明。
授權入口：https://incompetech.com/music/royalty-free/licenses/
授權全文：https://creativecommons.org/licenses/by/4.0/
本提交沒有加入音樂檔，不構成已套用背景音樂。
