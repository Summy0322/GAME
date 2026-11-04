// node scripts/check-assets.cjs [--write-docs]
// 不依賴額外套件。精確大小寫檢查可在 Windows 預先抓出 GitHub Pages 的 404。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):[dir+'/'+entry.name]);}
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function audit(){
    const files=walk('assets'),existing=new Set(files),errors=[],mapping=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/asset-paths.json'),'utf8'));
    const records=new Map();
    for(const file of files){
        const raw=fs.readFileSync(path.join(ROOT,file));
        // 授權文件的換行不應因 Windows/Linux checkout 差異而誤報。
        const data=/\.(md|txt)$/.test(file)?Buffer.from(raw.toString('utf8').replace(/\r\n/g,'\n')):raw;
        records.set(file,{bytes:data.length,sha256:hash(data)});
    }
    for(const row of mapping.assets){
        const record=records.get(row.path);
        if(!record)errors.push('Missing/case mismatch: '+row.path);
        else if(record.sha256!==row.sha256||record.bytes!==row.bytes)errors.push('Migration changed original bytes: '+row.oldPath);
        if(row.oldPath!==row.path&&existing.has(row.oldPath))errors.push('Old duplicate remains: '+row.oldPath);
    }
    const runtime=['index.html','style.css','manifest.json','test-font.html',...walk('js'),...walk('css'),...walk('tests').filter(file=>file.endsWith('.html'))];
    for(const file of runtime){
        const text=fs.readFileSync(path.join(ROOT,file),'utf8');
        for(const match of text.matchAll(/assets\/[\p{L}\p{N}_.\/-]+\.(?:png|jpe?g|webp|gif|svg|ico|mp3|wav|ogg|mp4|webm|ttf|woff2?|otf)\b/gu)){
            if(!existing.has(match[0]))errors.push(`${file}: missing/case mismatch ${match[0]}`);
        }
        if(file.endsWith('.css'))for(const match of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
            if(!match[1].includes('assets/'))continue;
            const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));
            if(!existing.has(resolved))errors.push(`${file}: broken CSS-relative URL ${match[1]}`);
        }
    }
    const window={};
    const context=vm.createContext({window});
    for(const file of ['js/data/minigameAssets.js','js/minigames/DefenseLevels.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context);
    for(const level of [1,2,3]){
        const urls=new Set(window.MinigameAssets.getDefensePreloadUrls(level));
        for(const url of urls)if(!existing.has(url))errors.push(`Defense ${level}: missing preload ${url}`);
        for(const config of Object.values(window.DefenseLevels[level]))for(const [key,value] of Object.entries(config)){
            if(key.endsWith('Image')&&(!existing.has(value)||!urls.has(value)))errors.push(`Defense ${level}: missing/unpreloaded ${key}: ${value}`);
        }
    }
    for(const url of window.MinigameAssets.getMemoryPreloadUrls())if(!existing.has(url))errors.push('Memory missing: '+url);
    const media=files.filter(file=>/\.(png|jpe?g|webp|gif|svg|ico|mp3|wav|ogg|mp4|webm|ttf|woff2?|otf)$/i.test(file));
    const hashes=new Map();
    for(const file of media){const h=records.get(file).sha256;if(hashes.has(h))errors.push(`Identical duplicate: ${hashes.get(h)} / ${file}`);else hashes.set(h,file);}
    return {errors,files,records,mapping,mediaCount:media.length,bytes:[...records.values()].reduce((sum,r)=>sum+r.bytes,0)};
}
function writeDocs(result){
    const groups=new Map();for(const file of result.files){const dir=path.posix.dirname(file);if(!groups.has(dir))groups.set(dir,[]);groups.get(dir).push(file);}
    const aliases=new Map();for(const row of result.mapping.assets){if(!aliases.has(row.path))aliases.set(row.path,[]);aliases.get(row.path).push(row.oldPath);}
    const lines=['# 素材目錄與替換方式','',
        '本清單涵蓋儲存庫內全部素材與隨附授權文件，路徑相對於儲存庫根目錄。執行 `node scripts/check-assets.cjs --write-docs` 可重新檢查並更新這份清單。','',
        `整理前 ${result.mapping.assets.length} 個檔案、${result.mapping.beforeBytes.toLocaleString('en-US')} bytes；整理後 ${result.files.length} 個檔案（${result.mediaCount} 個影音／字型）、${result.bytes.toLocaleString('en-US')} bytes。減少 ${(result.mapping.beforeBytes-result.bytes).toLocaleString('en-US')} bytes。只合併 SHA-256 完全一致的檔案，沒有壓縮、裁切或改寫素材內容。Git 歷史仍保存舊版，這個數字是目前版本的素材大小。`,'',
        '## 目錄規則','',
        '- `assets/images/story/`：故事背景、第三章商店與收集物。',
        '- `assets/images/minigames/`：防守、配對及食材拖放；防守跨關共用圖只存在 `defense/shared/`。',
        '- `assets/images/characters/`：角色；`gallery/`：人物介紹中的地點及收藏物。',
        '- `assets/images/ui/`：生命、游標及共用介面；`title/`：標題與按鈕；`shared/`：跨章背景。',
        '- `assets/images/reference/`：用途尚未確認的既有參考圖，保留而不猜測刪除。',
        '- `assets/audio/music/`：背景音樂與來源說明；`assets/audio/sfx/`：音效。',
        '- `assets/fonts/`、`assets/icons/`、`assets/videos/`：字型及授權、網站圖示、影片。',
        '- 英文檔名使用小寫與連字號；原有店家、角色中文檔名保留，方便辨識。','',
        '## 後續替換','',
        '直接替換同一路徑的檔案即可沿用程式引用。若更改檔名，需修改對應 JS／CSS／HTML，執行檢查並提高 `sw.js` 的快取版本。防守的角色、石頭、第三關共用投射物與特殊物件，由 `js/data/minigameAssets.js` 的 `getDefenseAssetUrl()` 統一對應；它與關卡配置共同產生預載清單。中文路徑與大小寫必須完全相同。','',
        '共用素材會同時影響所有引用者；若某一關需要獨立改圖，請另存該關路徑並修改配置，不要覆寫共用檔。原本不存在的 `collect.mp3`／`success.mp3` 已改用現有的 `correct.mp3`，避免成功操作請求缺檔。','',
        '完整新舊對照及每個來源的 SHA-256／大小見 [asset-paths.json](asset-paths.json)。影音與字型以原始位元組核對；授權文字／README 以 LF 換行核對，避免 Windows 與 Linux 的換行差異。該檔是本次遷移的完整性基準：刻意替換素材後應同步更新對應紀錄中的大小與雜湊；新增素材也需補入清單，不應略過缺檔檢查。','',
        '## 全部現有路徑',''];
    for(const [dir,files] of [...groups].sort(([a],[b])=>a.localeCompare(b))){lines.push('### '+dir,'');for(const file of files.sort()){
        const old=aliases.get(file)||[],extra=old.filter(p=>p!==file);
        lines.push(`- [${path.posix.basename(file)}](../${file}) — ${result.records.get(file).bytes.toLocaleString('en-US')} bytes${extra.length?'；原路徑：'+extra.map(p=>'`'+p+'`').join('、'):''}`);
    }lines.push('');}
    fs.writeFileSync(path.join(ROOT,'docs/ASSET-LIBRARY.md'),lines.join('\n'));
}
if(require.main===module){const result=audit();if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}else{if(process.argv.includes('--write-docs'))writeDocs(result);console.log(`PASS: ${result.files.length} files (${result.mediaCount} media), ${result.bytes} bytes; original hashes, runtime paths, CSS-relative URLs, defense/memory preload and duplicate check.`);}}
module.exports={audit};
