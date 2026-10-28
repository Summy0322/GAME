# 網站載入最佳化

本批針對網站遊玩時的下載量，而非 Git 倉庫歷史大小。

- Service Worker 安裝清單只保留程式與樣式，不再預抓後續章節圖片。依本機檔案大小加總，清單由約 29.78 MiB 降至 0.60 MiB；不是實際網路耗時量測。
- 圖片與字型在使用後才加入執行期快取，音樂、影片不加入此快取，避免音訊 Range 請求問題。首次進入未玩過的章節仍需要網路。
- 首頁背景由 3,422,891 bytes PNG 轉成 309,476 bytes WebP（品質 90），保留 1920×1080 尺寸。
- 相同的市場背景改用共用 WebP，由單份 8,347,709 bytes 降為 618,554 bytes，保留 2728×1536 尺寸。第一、二章雙模式與預覽路徑已更新；原始 PNG 留作素材備份，不在新載入路徑使用。
- 防禦遊戲僅預載目前小關，省略關卡參數時仍可取得完整清單供工具使用。移除第二小關不存在的 heavy_enemy.png 預載項目。
- 首頁影片設定 preload=none，待點擊進入市場後再按原流程預載。
- 保留目前音樂、字型、角色尺寸、對話版面與關卡內容。

驗證：60 項 Node 測試通過；全新本機來源的瀏覽器測試確認 38 個預存項目不含素材，兩張 WebP 解碼尺寸正確。

後續可處理：其他背景／照片轉 WebP、注音字型轉完整字集 WOFF2、音樂試聽比較後壓縮位元率。上述項目尚未包含在本批。

測試：node --test tests/regressions.cjs tests/lifecycle.test.cjs tests/defense-flow.test.cjs tests/dialogue-audio.test.cjs tests/game-music.test.cjs tests/loading-performance.test.cjs
瀏覽器：/GAME/tests/loading-check.html（建議使用全新瀏覽器來源測試首次快取）。
