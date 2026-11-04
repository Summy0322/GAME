# 素材目錄與替換方式

本清單涵蓋儲存庫內全部素材與隨附授權文件，路徑相對於儲存庫根目錄。執行 `node scripts/check-assets.cjs --write-docs` 可重新檢查並更新這份清單。

整理前 148 個檔案、142,762,158 bytes；整理後 136 個檔案（132 個影音／字型）、125,573,618 bytes。減少 17,188,540 bytes。只合併 SHA-256 完全一致的檔案，沒有壓縮、裁切或改寫素材內容。Git 歷史仍保存舊版，這個數字是目前版本的素材大小。

## 目錄規則

- `assets/images/story/`：故事背景、第三章商店與收集物。
- `assets/images/minigames/`：防守、配對及食材拖放；防守跨關共用圖只存在 `defense/shared/`。
- `assets/images/characters/`：角色；`gallery/`：人物介紹中的地點及收藏物。
- `assets/images/ui/`：生命、游標及共用介面；`title/`：標題與按鈕；`shared/`：跨章背景。
- `assets/images/reference/`：用途尚未確認的既有參考圖，保留而不猜測刪除。
- `assets/audio/music/`：背景音樂與來源說明；`assets/audio/sfx/`：音效。
- `assets/fonts/`、`assets/icons/`、`assets/videos/`：字型及授權、網站圖示、影片。
- 英文檔名使用小寫與連字號；原有店家、角色中文檔名保留，方便辨識。

## 後續替換

直接替換同一路徑的檔案即可沿用程式引用。若更改檔名，需修改對應 JS／CSS／HTML，執行檢查並提高 `sw.js` 的快取版本。防守的角色、石頭、第三關共用投射物與特殊物件，由 `js/data/minigameAssets.js` 的 `getDefenseAssetUrl()` 統一對應；它與關卡配置共同產生預載清單。中文路徑與大小寫必須完全相同。

共用素材會同時影響所有引用者；若某一關需要獨立改圖，請另存該關路徑並修改配置，不要覆寫共用檔。原本不存在的 `collect.mp3`／`success.mp3` 已改用現有的 `correct.mp3`，避免成功操作請求缺檔。

完整新舊對照及每個來源的 SHA-256／大小見 [asset-paths.json](asset-paths.json)。影音與字型以原始位元組核對；授權文字／README 以 LF 換行核對，避免 Windows 與 Linux 的換行差異。該檔是本次遷移的完整性基準：刻意替換素材後應同步更新對應紀錄中的大小與雜湊；新增素材也需補入清單，不應略過缺檔檢查。

## 全部現有路徑

### assets/audio/music

- [README.md](../assets/audio/music/README.md) — 1,970 bytes；原路徑：`assets/music/README.md`
- [ready-for-adventure.mp3](../assets/audio/music/ready-for-adventure.mp3) — 5,490,396 bytes；原路徑：`assets/music/ready-for-adventure.mp3`
- [restaurant-han.mp3](../assets/audio/music/restaurant-han.mp3) — 1,749,145 bytes；原路徑：`assets/music/restaurant-han.mp3`
- [small-town-great-journey.mp3](../assets/audio/music/small-town-great-journey.mp3) — 9,388,956 bytes；原路徑：`assets/music/small-town-great-journey.mp3`
- [walk-little-adventure.mp3](../assets/audio/music/walk-little-adventure.mp3) — 7,434,393 bytes；原路徑：`assets/music/walk-little-adventure.mp3`

### assets/audio/sfx

- [click.mp3](../assets/audio/sfx/click.mp3) — 29,376 bytes；原路徑：`assets/sounds/click.mp3`
- [correct.mp3](../assets/audio/sfx/correct.mp3) — 68,335 bytes；原路徑：`assets/sounds/correct.mp3`
- [hover.mp3](../assets/audio/sfx/hover.mp3) — 25,703 bytes；原路徑：`assets/sounds/hover.mp3`
- [menu-hover.mp3](../assets/audio/sfx/menu-hover.mp3) — 27,584 bytes；原路徑：`assets/sounds/menu_hover.mp3`
- [place-card.mp3](../assets/audio/sfx/place-card.mp3) — 26,496 bytes；原路徑：`assets/sounds/place_card.mp3`
- [sfx-blipfemale.wav](../assets/audio/sfx/sfx-blipfemale.wav) — 2,394 bytes；原路徑：`assets/sounds/sfx-blipfemale.wav`
- [sfx-blipmale.wav](../assets/audio/sfx/sfx-blipmale.wav) — 2,340 bytes；原路徑：`assets/sounds/sfx-blipmale.wav`
- [text-blip.wav](../assets/audio/sfx/text-blip.wav) — 58,022 bytes；原路徑：`assets/sounds/text_blip.wav`
- [wrong.mp3](../assets/audio/sfx/wrong.mp3) — 42,004 bytes；原路徑：`assets/sounds/wrong.mp3`

### assets/fonts

- [BpmfZihiKaiStd-Regular.ttf](../assets/fonts/BpmfZihiKaiStd-Regular.ttf) — 17,141,668 bytes
- [LICENSE-2.0.txt](../assets/fonts/LICENSE-2.0.txt) — 11,358 bytes
- [LICENSE-ZihiKaiStd.txt](../assets/fonts/LICENSE-ZihiKaiStd.txt) — 5,610 bytes
- [NOTICE.txt](../assets/fonts/NOTICE.txt) — 1,008 bytes

### assets/icons

- [game-icon.ico](../assets/icons/game-icon.ico) — 4,785 bytes；原路徑：`assets/icons/game_icon.ico`
- [icon-128.png](../assets/icons/icon-128.png) — 21,901 bytes
- [icon-16.png](../assets/icons/icon-16.png) — 905 bytes
- [icon-256.png](../assets/icons/icon-256.png) — 62,079 bytes
- [icon-32.png](../assets/icons/icon-32.png) — 2,624 bytes
- [icon-64.png](../assets/icons/icon-64.png) — 7,685 bytes

### assets/images/characters

- [challenge-player.png](../assets/images/characters/challenge-player.png) — 27,844 bytes；原路徑：`assets/images/challenge/player.png`、`assets/images/人物設計.png`
- [grocery-owner.png](../assets/images/characters/grocery-owner.png) — 202,745 bytes；原路徑：`assets/images/characters/grocery_owner.png`
- [herbal-owner.png](../assets/images/characters/herbal-owner.png) — 265,100 bytes；原路徑：`assets/images/characters/herbal_owner.png`
- [knife-smith.png](../assets/images/characters/knife-smith.png) — 212,845 bytes；原路徑：`assets/images/characters/knife_smith.png`
- [mom.png](../assets/images/characters/mom.png) — 209,729 bytes
- [non-character.png](../assets/images/characters/non-character.png) — 6,211 bytes；原路徑：`assets/images/characters/non_character.png`
- [阿斗仔.png](../assets/images/characters/阿斗仔.png) — 547,217 bytes
- [阿斗仔1.png](../assets/images/characters/阿斗仔1.png) — 138,279 bytes
- [阿斗仔頭像.png](../assets/images/characters/阿斗仔頭像.png) — 84,990 bytes

### assets/images/gallery/items

- [平安符.png](../assets/images/gallery/items/平安符.png) — 1,793,552 bytes；原路徑：`assets/images/items/平安符.png`
- [豆花.png](../assets/images/gallery/items/豆花.png) — 1,980,011 bytes；原路徑：`assets/images/items/豆花.png`
- [電子秤.png](../assets/images/gallery/items/電子秤.png) — 2,394,477 bytes；原路徑：`assets/images/items/電子秤.png`

### assets/images/gallery/places

- [保安館.png](../assets/images/gallery/places/保安館.png) — 3,202,052 bytes；原路徑：`assets/images/heros/保安館.png`
- [其實豆製所.png](../assets/images/gallery/places/其實豆製所.png) — 2,428,658 bytes；原路徑：`assets/images/heros/其實豆製所.png`
- [寶斗青村未來式.jpg](../assets/images/gallery/places/寶斗青村未來式.jpg) — 111,403 bytes；原路徑：`assets/images/heros/寶斗青村未來式.jpg`、`assets/images/items/寶斗青村.jpg`
- [攤販.png](../assets/images/gallery/places/攤販.png) — 2,732,683 bytes；原路徑：`assets/images/heros/攤販.png`

### assets/images/minigames/defense/level1

- [aoe-line.png](../assets/images/minigames/defense/level1/aoe-line.png) — 756 bytes；原路徑：`assets/images/defense/level1/aoe_line.png`
- [bg.png](../assets/images/minigames/defense/level1/bg.png) — 3,338,790 bytes；原路徑：`assets/images/defense/level1/bg.png`
- [enemy.png](../assets/images/minigames/defense/level1/enemy.png) — 29,240 bytes；原路徑：`assets/images/defense/level1/enemy.png`
- [projectile-hit.png](../assets/images/minigames/defense/level1/projectile-hit.png) — 36,083 bytes；原路徑：`assets/images/defense/level1/projectile_hit.png`
- [projectile.png](../assets/images/minigames/defense/level1/projectile.png) — 18,803 bytes；原路徑：`assets/images/defense/level1/projectile.png`、`assets/images/defense/level3/projectile.png`
- [shield.png](../assets/images/minigames/defense/level1/shield.png) — 356 bytes；原路徑：`assets/images/defense/level1/shield.png`、`assets/images/defense/level3/shield2.png`

### assets/images/minigames/defense/level2

- [aoe-line.png](../assets/images/minigames/defense/level2/aoe-line.png) — 5,581 bytes；原路徑：`assets/images/defense/level2/aoe_line.png`
- [bg.png](../assets/images/minigames/defense/level2/bg.png) — 3,407,262 bytes；原路徑：`assets/images/defense/level2/bg.png`
- [enemy.png](../assets/images/minigames/defense/level2/enemy.png) — 14,471 bytes；原路徑：`assets/images/defense/level2/enemy.png`
- [projectile-hit.png](../assets/images/minigames/defense/level2/projectile-hit.png) — 11,514 bytes；原路徑：`assets/images/defense/level2/projectile_hit.png`、`assets/images/defense/level3/heavy_enemy.png`
- [projectile.png](../assets/images/minigames/defense/level2/projectile.png) — 26,533 bytes；原路徑：`assets/images/defense/level2/projectile.png`
- [shield.png](../assets/images/minigames/defense/level2/shield.png) — 70,199 bytes；原路徑：`assets/images/defense/level2/shield.png`

### assets/images/minigames/defense/level3

- [aoe-line.png](../assets/images/minigames/defense/level3/aoe-line.png) — 142,301 bytes；原路徑：`assets/images/defense/level3/aoe_line.png`
- [bg.png](../assets/images/minigames/defense/level3/bg.png) — 3,173,729 bytes；原路徑：`assets/images/defense/level3/bg.png`
- [enemy.png](../assets/images/minigames/defense/level3/enemy.png) — 15,776 bytes；原路徑：`assets/images/defense/level3/enemy.png`
- [projectile-hit.png](../assets/images/minigames/defense/level3/projectile-hit.png) — 27,767 bytes；原路徑：`assets/images/defense/level3/projectile_hit.png`
- [shield.png](../assets/images/minigames/defense/level3/shield.png) — 38,446 bytes；原路徑：`assets/images/defense/level3/shield.png`

### assets/images/minigames/defense/shared

- [player.png](../assets/images/minigames/defense/shared/player.png) — 51,675 bytes；原路徑：`assets/images/defense/level1/player.png`、`assets/images/defense/level2/player.png`、`assets/images/defense/level3/player.png`
- [stone.png](../assets/images/minigames/defense/shared/stone.png) — 28,062 bytes；原路徑：`assets/images/defense/level1/stone.png`、`assets/images/defense/level2/stone.png`、`assets/images/defense/level3/stone.png`

### assets/images/minigames/ingredients

- [black-pepper.png](../assets/images/minigames/ingredients/black-pepper.png) — 63,207 bytes；原路徑：`assets/images/ch3/game/black_pepper.png`
- [broken-mushroom.png](../assets/images/minigames/ingredients/broken-mushroom.png) — 139,526 bytes；原路徑：`assets/images/ch3/game/broken_mushroom.png`
- [coarse-stone.png](../assets/images/minigames/ingredients/coarse-stone.png) — 195,290 bytes；原路徑：`assets/images/ch3/game/coarse_stone.png`
- [fine-stone.png](../assets/images/minigames/ingredients/fine-stone.png) — 190,367 bytes；原路徑：`assets/images/ch3/game/fine_stone.png`
- [newspaper.png](../assets/images/minigames/ingredients/newspaper.png) — 153,861 bytes；原路徑：`assets/images/ch3/game/newspaper.png`
- [sichuan-pepper.png](../assets/images/minigames/ingredients/sichuan-pepper.png) — 95,780 bytes；原路徑：`assets/images/ch3/game/sichuan_pepper.png`
- [star-anise.png](../assets/images/minigames/ingredients/star-anise.png) — 182,443 bytes；原路徑：`assets/images/ch3/game/star_anise.png`
- [thick-mushroom.png](../assets/images/minigames/ingredients/thick-mushroom.png) — 237,318 bytes；原路徑：`assets/images/ch3/game/thick_mushroom.png`
- [thin-mushroom.png](../assets/images/minigames/ingredients/thin-mushroom.png) — 179,919 bytes；原路徑：`assets/images/ch3/game/thin_mushroom.png`
- [white-pepper.png](../assets/images/minigames/ingredients/white-pepper.png) — 73,726 bytes；原路徑：`assets/images/ch3/game/white_pepper.png`

### assets/images/minigames/memory

- [background.png](../assets/images/minigames/memory/background.png) — 1,419,116 bytes；原路徑：`assets/images/ch2/bg.png`
- [card-back.png](../assets/images/minigames/memory/card-back.png) — 32,609 bytes；原路徑：`assets/images/ch2/卡背.png`
- [hud.png](../assets/images/minigames/memory/hud.png) — 4,094 bytes；原路徑：`assets/images/ch2/資訊欄.png`
- [panel.png](../assets/images/minigames/memory/panel.png) — 10,899 bytes；原路徑：`assets/images/ch2/面板.png`

### assets/images/minigames/memory/cards

- [card-back.jpg](../assets/images/minigames/memory/cards/card-back.jpg) — 170,393 bytes；原路徑：`assets/images/memory/card-back.jpg`
- [card.jpg](../assets/images/minigames/memory/cards/card.jpg) — 6,786 bytes；原路徑：`assets/images/memory/card.jpg`
- [cardA.png](../assets/images/minigames/memory/cards/cardA.png) — 34,271 bytes；原路徑：`assets/images/memory/cardA.png`
- [cardB.png](../assets/images/minigames/memory/cards/cardB.png) — 34,491 bytes；原路徑：`assets/images/memory/cardB.png`
- [cardC.png](../assets/images/minigames/memory/cards/cardC.png) — 34,857 bytes；原路徑：`assets/images/memory/cardC.png`
- [cardD.png](../assets/images/minigames/memory/cards/cardD.png) — 34,388 bytes；原路徑：`assets/images/memory/cardD.png`
- [cardE.png](../assets/images/minigames/memory/cards/cardE.png) — 32,978 bytes；原路徑：`assets/images/memory/cardE.png`
- [其實豆製所.png](../assets/images/minigames/memory/cards/其實豆製所.png) — 126,820 bytes；原路徑：`assets/images/memory/其實豆製所.png`
- [刈包.png](../assets/images/minigames/memory/cards/刈包.png) — 252,102 bytes；原路徑：`assets/images/memory/刈包.png`
- [奠安宮楊記炸物.png](../assets/images/minigames/memory/cards/奠安宮楊記炸物.png) — 125,874 bytes；原路徑：`assets/images/memory/奠安宮楊記炸物.png`
- [彰化北斗肉圓.png](../assets/images/minigames/memory/cards/彰化北斗肉圓.png) — 166,578 bytes；原路徑：`assets/images/memory/彰化北斗肉圓.png`
- [擔仔麵.png](../assets/images/minigames/memory/cards/擔仔麵.png) — 120,067 bytes；原路徑：`assets/images/memory/擔仔麵.png`
- [正老店阿美.png](../assets/images/minigames/memory/cards/正老店阿美.png) — 147,930 bytes；原路徑：`assets/images/memory/正老店阿美.png`
- [珍珠奶茶.png](../assets/images/minigames/memory/cards/珍珠奶茶.png) — 262,144 bytes；原路徑：`assets/images/memory/珍珠奶茶.png`
- [碗粿.png](../assets/images/minigames/memory/cards/碗粿.png) — 169,135 bytes；原路徑：`assets/images/memory/碗粿.png`
- [紅豆餅.png](../assets/images/minigames/memory/cards/紅豆餅.png) — 160,061 bytes；原路徑：`assets/images/memory/紅豆餅.png`
- [芋圓.png](../assets/images/minigames/memory/cards/芋圓.png) — 145,062 bytes；原路徑：`assets/images/memory/芋圓.png`
- [蚵仔煎.png](../assets/images/minigames/memory/cards/蚵仔煎.png) — 3,077,126 bytes；原路徑：`assets/images/memory/蚵仔煎.png`
- [詹永豐米店.png](../assets/images/minigames/memory/cards/詹永豐米店.png) — 119,528 bytes；原路徑：`assets/images/memory/詹永豐米店.png`
- [阿在伯炸彈蔥油餅.png](../assets/images/minigames/memory/cards/阿在伯炸彈蔥油餅.png) — 162,295 bytes；原路徑：`assets/images/memory/阿在伯炸彈蔥油餅.png`

### assets/images/order

- [002-2.png](../assets/images/order/002-2.png) — 3,446,766 bytes
- [002-3.png](../assets/images/order/002-3.png) — 3,387,240 bytes
- [002-4.png](../assets/images/order/002-4.png) — 3,239,224 bytes
- [002-5.png](../assets/images/order/002-5.png) — 3,344,332 bytes
- [002-6.png](../assets/images/order/002-6.png) — 2,756,263 bytes

### assets/images/reference

- [002-1.jpg](../assets/images/reference/002-1.jpg) — 193,893 bytes；原路徑：`assets/images/002-1.jpg`
- [3-1.jpg](../assets/images/reference/3-1.jpg) — 378,540 bytes；原路徑：`assets/images/3-1.jpg`
- [3-2.jpg](../assets/images/reference/3-2.jpg) — 494,457 bytes；原路徑：`assets/images/3-2.jpg`
- [3-3.jpg](../assets/images/reference/3-3.jpg) — 146,082 bytes；原路徑：`assets/images/3-3.jpg`
- [red-brick-market.jpg](../assets/images/reference/red-brick-market.jpg) — 198,911 bytes；原路徑：`assets/images/red-brick-market.jpg`
- [背景.png](../assets/images/reference/背景.png) — 128,478 bytes；原路徑：`assets/images/背景.png`
- [遊戲.png](../assets/images/reference/遊戲.png) — 3,850,839 bytes；原路徑：`assets/images/遊戲.png`

### assets/images/shared

- [market-background-source.png](../assets/images/shared/market-background-source.png) — 8,347,709 bytes；原路徑：`assets/images/ch1/background.png`、`assets/images/ch2/background.png`、`assets/images/ch3/background.png`
- [market-background.webp](../assets/images/shared/market-background.webp) — 618,554 bytes

### assets/images/story/chapter-3

- [kitchen.png](../assets/images/story/chapter-3/kitchen.png) — 905,636 bytes；原路徑：`assets/images/ch3/kitchen.png`
- [map.png](../assets/images/story/chapter-3/map.png) — 1,698,726 bytes；原路徑：`assets/images/ch3/map.png`
- [shop-grocery-s.png](../assets/images/story/chapter-3/shop-grocery-s.png) — 164,949 bytes；原路徑：`assets/images/ch3/shop_grocery_s.png`
- [shop-grocery.png](../assets/images/story/chapter-3/shop-grocery.png) — 1,750,968 bytes；原路徑：`assets/images/ch3/shop_grocery.png`
- [shop-herbal-s.png](../assets/images/story/chapter-3/shop-herbal-s.png) — 172,264 bytes；原路徑：`assets/images/ch3/shop_herbal_s.png`
- [shop-herbal.png](../assets/images/story/chapter-3/shop-herbal.png) — 1,431,729 bytes；原路徑：`assets/images/ch3/shop_herbal.png`
- [shop-knife-s.png](../assets/images/story/chapter-3/shop-knife-s.png) — 158,789 bytes；原路徑：`assets/images/ch3/shop_knife_s.png`
- [shop-knife.png](../assets/images/story/chapter-3/shop-knife.png) — 1,495,736 bytes；原路徑：`assets/images/ch3/shop_knife.png`
- [temple.png](../assets/images/story/chapter-3/temple.png) — 1,427,121 bytes；原路徑：`assets/images/ch3/temple.png`

### assets/images/story/chapter-3/collection

- [herbal-black.png](../assets/images/story/chapter-3/collection/herbal-black.png) — 62,562 bytes；原路徑：`assets/images/ch3/items/herbal_black.png`
- [herbal.png](../assets/images/story/chapter-3/collection/herbal.png) — 163,202 bytes；原路徑：`assets/images/ch3/items/herbal.png`
- [knife-black.png](../assets/images/story/chapter-3/collection/knife-black.png) — 34,369 bytes；原路徑：`assets/images/ch3/items/knife_black.png`
- [knife.png](../assets/images/story/chapter-3/collection/knife.png) — 78,392 bytes；原路徑：`assets/images/ch3/items/knife.png`
- [mushroom-black.png](../assets/images/story/chapter-3/collection/mushroom-black.png) — 31,899 bytes；原路徑：`assets/images/ch3/items/mushroom_black.png`
- [mushroom.png](../assets/images/story/chapter-3/collection/mushroom.png) — 133,669 bytes；原路徑：`assets/images/ch3/items/mushroom.png`

### assets/images/story/intro

- [market-cover.jpg](../assets/images/story/intro/market-cover.jpg) — 163,728 bytes；原路徑：`assets/images/intro/封面.jpg`、`assets/images/market.jpg`

### assets/images/title

- [background.png](../assets/images/title/background.png) — 3,422,891 bytes
- [background.webp](../assets/images/title/background.webp) — 309,476 bytes
- [chapter-title.png](../assets/images/title/chapter-title.png) — 214,867 bytes；原路徑：`assets/images/title2.png`
- [enter.png](../assets/images/title/enter.png) — 31,549 bytes
- [leave.png](../assets/images/title/leave.png) — 29,985 bytes
- [title-legacy.png](../assets/images/title/title-legacy.png) — 917,542 bytes；原路徑：`assets/images/title.png`
- [title.png](../assets/images/title/title.png) — 186,150 bytes

### assets/images/ui

- [close.png](../assets/images/ui/close.png) — 18,276 bytes；原路徑：`assets/images/close_icon.png`
- [cursor-active.png](../assets/images/ui/cursor-active.png) — 9,038 bytes；原路徑：`assets/images/cursor2.png`
- [cursor.png](../assets/images/ui/cursor.png) — 13,254 bytes；原路徑：`assets/images/cursor.png`
- [heart.png](../assets/images/ui/heart.png) — 2,825 bytes；原路徑：`assets/images/heart.png`
- [old-paper.png](../assets/images/ui/old-paper.png) — 430,957 bytes；原路徑：`assets/images/old_paper.png`

### assets/videos

- [intro.mp4](../assets/videos/intro.mp4) — 2,838,863 bytes
