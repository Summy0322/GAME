# 小朋友版長對話分頁草稿

本次只建立草稿分支，不合併 main。

保留所有原始對話文字，不縮小字體。小朋友模式以實際對話框、注音字型及裝置大小量測，內容超出時分頁，盡量在標點後換頁。一般版維持原行為；小朋友版短句維持一頁。長句可能需要兩頁以上，以完整顯示為優先。

每頁打字完成後，框外右上方顯示「下一頁（目前頁／總頁數）」按鈕。按鈕最小高度 44px，不佔用文字區；最後一頁完成後，才讓對話系統顯示原本選項、開啟相簿或前往下一段。問答說明與經由 Typewriter 顯示的第三章店家對話也適用。不改相簿、命名或旁白等獨立介面。

分頁保留注音 IVS 與 emoji 字素；會等待字型載入，並同時檢查打字中與打字完成後的文字能否容納。直向手機的矮舞台至少保留一整行文字的高度。

驗證：65 項 Node 測試通過，包含文字重組不遺漏、一般版不分頁、最後一頁前不完成 Promise、清除後舊按鈕無效、延遲字型不能重開已退出對話。

尚未驗證：目前 Work 關閉本機瀏覽器操作，未能執行實際字型與手機尺寸的視覺檢查。程式測試不等於所有手機實機已驗證。請先用草稿比較按鈕位置、分頁節奏與畫面旋轉後的表現，再決定是否合併。

本機預覽伺服器啟動後：
- /GAME/：照原遊戲流程，選小朋友版試玩。
- /GAME/tests/child-dialogue-pages.html：自動掃描開場、三章對話、第三章內嵌店家對話與問答文字；涵蓋五種尺寸。保留原文並檢查每頁實際高度，結束後呈現較長範例供點擊。
- /preview?w=844&h=390&scene=childpages&child=1&safe=1：單一手機橫向預覽。

測試：node --test tests/child-dialogue-pages.test.cjs tests/regressions.cjs tests/lifecycle.test.cjs tests/defense-flow.test.cjs tests/dialogue-audio.test.cjs tests/game-music.test.cjs tests/loading-performance.test.cjs
