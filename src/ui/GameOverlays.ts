import type { Player } from "../game/Player";
import type { SkillDef } from "../game/Skill";
import { GIFT_DEFS, JOB_DEFS } from "../game/Player";
import { MATERIAL_DEFS } from "../game/Equipment";
import { listWorlds, canCreateWorld, type SavedWorld } from "../game/SaveData";

declare const __BUILD_TIME__: string;
declare const __COMMIT_HASH__: string;

function getOverlay(): HTMLElement {
  return document.getElementById("overlay")!;
}

export function showOverlay(): void {
  getOverlay().classList.remove("hidden");
}

export function hideOverlay(): void {
  const overlay = getOverlay();
  overlay.classList.add("hidden");
  overlay.onclick = null;
}

export function renderTitleScreen(worlds: SavedWorld[], tutorialDone = true): void {
  const overlay = getOverlay();
  showOverlay();

  let html = `
    <h1>異世界迷宮録</h1>
    <div class="subtitle">Isekai Dungeon Crawl</div>
  `;

  if (worlds.length > 0) {
    html += '<div style="width:100%;max-width:300px;margin:8px 0">';
    for (const w of worlds) {
      const date = new Date(w.lastPlayed).toLocaleDateString("ja-JP");
      html += `
        <div style="display:flex;gap:4px;margin:4px 0">
          <button class="menu-btn" style="flex:1;font-size:13px;padding:8px" id="load-${w.id}">
            ${w.name}<br><span style="font-size:10px;color:#888">${date} HP:${w.playerHp}</span>
          </button>
          <button class="menu-btn secondary" style="padding:8px;font-size:11px" id="del-${w.id}">×</button>
        </div>
      `;
    }
    html += "</div>";
  }

  if (canCreateWorld()) {
    html += '<button class="menu-btn" id="btn-new-world">新しい世界を作る</button>';
  }

  if (!tutorialDone) {
    html += '<button class="menu-btn secondary" id="btn-tutorial">チュートリアル</button>';
  }
  html += '<button class="menu-btn secondary" id="btn-help">遊び方</button>';
  html += `<div class="build-info">${__BUILD_TIME__} / ${__COMMIT_HASH__} <a href="https://github.com/tokuhirom/cokesmoke" target="_blank" style="color:#666;text-decoration:none">GitHub</a></div>`;

  overlay.innerHTML = html;
}

export function renderWorldNameInput(): void {
  const overlay = getOverlay();
  const count = listWorlds().length;
  overlay.innerHTML = `
    <div class="tutorial-dialog">
      <p>世界の名前を入力</p>
      <input type="text" id="world-name-input" value="世界${count + 1}"
        style="background:#0f3460;color:#e94560;border:1px solid #e94560;padding:8px;
        font-family:monospace;font-size:14px;width:200px;text-align:center;border-radius:4px">
      <br>
      <button class="menu-btn" id="btn-create-world" style="margin-top:12px">作成</button>
      <button class="menu-btn secondary" id="btn-cancel-create">戻る</button>
    </div>
  `;
}

export function renderJobSelection(): void {
  const overlay = getOverlay();
  showOverlay();

  let html = `
    <div class="tutorial-dialog">
      <p style="color:#aaddff">「まずは...あなたの前世での生き方を教えてください」</p>
      <p style="font-size:11px;color:#888;margin:4px 0">職業を選んでください</p>
  `;

  for (const job of JOB_DEFS) {
    html += `<button class="menu-btn" style="font-size:12px;padding:8px;margin:3px 0;text-align:left" id="job-${job.id}">`;
    html += `<strong>${job.name}</strong><br>`;
    html += `<span style="font-size:10px;color:#aaa">${job.description}</span>`;
    html += "</button>";
  }

  html += "</div>";
  overlay.innerHTML = html;
}

export function renderGiftSelection(): void {
  const overlay = getOverlay();
  showOverlay();

  let html = `
    <div class="tutorial-dialog">
      <p style="color:#aaddff">「ようこそ、異世界の旅人よ」</p>
      <p style="color:#aaddff;font-size:12px">「私は女神ルミナ。<br>転生のしるしに、一つだけ贈り物をあげましょう」</p>
      <p style="font-size:11px;color:#888;margin:4px 0">ギフトを選んでください</p>
  `;

  for (const gift of GIFT_DEFS) {
    html += `<button class="menu-btn" style="font-size:12px;padding:8px;margin:3px 0;text-align:left" id="gift-${gift.id}">`;
    html += `<strong>${gift.name}</strong><br>`;
    html += `<span style="font-size:10px;color:#aaa">${gift.description}</span>`;
    html += "</button>";
  }

  html += "</div>";
  overlay.innerHTML = html;
}

export function renderHelpScreen(): void {
  const overlay = getOverlay();
  showOverlay();
  overlay.innerHTML = `
    <div id="help-content">
      <h2>世界観</h2>
      <p>気がつくと、見知らぬ村にいた。
      この世界には複数の迷宮が存在し、
      全ての迷宮を踏破した者だけが元の世界に帰れるという。</p>

      <h2>操作方法</h2>
      <table>
        <tr><td>移動</td><td>8方向D-pad / スワイプ / 矢印キー</td></tr>
        <tr><td>斜め</td><td>D-pad斜めボタン / 斜めスワイプ / YUBN</td></tr>
        <tr><td>待機</td><td>D-pad中央 / タップ / .キー</td></tr>
        <tr><td>入る</td><td>> キー / 階段ボタン（街・迷宮に入る）</td></tr>
        <tr><td>スキル</td><td>1-3キー / スキルボタン</td></tr>
        <tr><td>持ち物</td><td>iキー / 持物ボタン</td></tr>
        <tr><td>攻撃</td><td>敵の方向に移動（斜めもOK）</td></tr>
      </table>

      <h2>ワールドマップ</h2>
      <p>ランダム生成のワールドを冒険しよう。
      <span style="color:#ffcc00">*</span>=街、
      <span style="color:#ff6644">▼</span>=迷宮入口。
      街やダンジョンの上で>キーで入れる。</p>

      <h2>迷宮</h2>
      <p>入るたびに構成が変わる不思議な迷宮。
      食料(<span style="color:#44ff88">\u2666</span>)を拾って空腹を凌ごう。
      最深部に到達すると踏破完了。</p>

      <h2>装備と素材</h2>
      <p>迷宮で素材を集め、各地の職人に装備を作ってもらおう。
      職人はスカウトして始まりの村に住み着かせることもできる。</p>

      <h2>死亡</h2>
      <p>死亡するとスポーン地点（始まりの村）に戻される。
      集めたアイテムは死んだ場所に残される。</p>

      <div class="back-btn-wrap">
        <button class="menu-btn secondary" id="btn-back">戻る</button>
      </div>
    </div>
  `;
}

export function renderEquipMenu(player: Player): void {
  const overlay = getOverlay();
  showOverlay();

  const p = player;
  const slotNames: Record<string, string> = { weapon: "武器", armor: "防具", accessory: "装飾" };

  let html = '<div class="tutorial-dialog">';
  html += "<p>装備変更</p>";

  html += '<div style="margin:8px 0;font-size:12px;color:#aaa">';
  html += `武器: ${p.weapon ? `<span style="color:#ffaa44">${p.weapon.name}</span>` : "なし"} / `;
  html += `防具: ${p.armor ? `<span style="color:#44aaff">${p.armor.name}</span>` : "なし"} / `;
  html += `装飾: ${p.accessory ? `<span style="color:#aa88ff">${p.accessory.name}</span>` : "なし"}`;
  html += "</div>";
  html += `<div style="font-size:11px;color:#888;margin-bottom:8px">ATK:${p.attack} DEF:${p.defense} MP上限:${p.maxSp}</div>`;

  for (const slot of ["weapon", "armor", "accessory"] as const) {
    const items = p.ownedEquipment.filter((e) => e.slot === slot);
    if (items.length === 0) continue;

    html += `<div style="font-size:11px;color:#666;margin-top:6px">${slotNames[slot]}</div>`;
    for (const eq of items) {
      const isEquipped = p[slot]?.id === eq.id;
      const label = isEquipped ? `✓ ${eq.name}` : eq.name;
      const btnClass = isEquipped ? "menu-btn secondary" : "menu-btn";
      html += `<button class="${btnClass}" style="font-size:12px;padding:6px;margin:2px 0" id="eq-${eq.id}">`;
      html += `${label} <span style="font-size:10px;color:#aaa">${eq.description}</span>`;
      html += "</button>";
    }

    if (p[slot]) {
      html += `<button class="menu-btn secondary" style="font-size:11px;padding:4px;margin:2px 0" id="uneq-${slot}">`;
      html += `${slotNames[slot]}を外す`;
      html += "</button>";
    }
  }

  if (p.ownedEquipment.length === 0) {
    html += '<p style="color:#666;font-size:12px">装備品を持っていない</p>';
  }

  html +=
    '<button class="menu-btn secondary" id="equip-close" style="margin-top:8px">閉じる</button>';
  html += "</div>";
  overlay.innerHTML = html;
}

export function renderGameMenu(): void {
  const overlay = getOverlay();
  showOverlay();

  const html = `
    <div class="tutorial-dialog">
      <p>メニュー</p>
      <button class="menu-btn" id="menu-status">ステータス</button>
      <button class="menu-btn" id="menu-equip">装備変更</button>
      <button class="menu-btn" id="menu-inv">持ち物</button>
      <button class="menu-btn secondary" id="menu-title">タイトルに戻る</button>
      <button class="menu-btn secondary" id="menu-close" style="margin-top:8px">閉じる</button>
    </div>
  `;
  overlay.innerHTML = html;
}

export function renderStatusScreen(player: Player): void {
  const overlay = getOverlay();
  showOverlay();

  const p = player;
  const jobName = JOB_DEFS.find((j) => j.id === p.jobId)?.name ?? "なし";
  const giftName = GIFT_DEFS.find((g) => g.id === p.giftId)?.name ?? "なし";

  let html = '<div class="tutorial-dialog" style="text-align:left">';
  html += '<p style="text-align:center">ステータス</p>';
  html += `<div style="font-size:12px;line-height:2;color:#ccc">`;
  html += `職業: <span style="color:#ffaa44">${jobName}</span><br>`;
  html += `ギフト: <span style="color:#aaddff">${giftName}</span><br>`;
  html += `HP: <span style="color:#e94560">${p.hp}/${p.maxHp}</span><br>`;
  html += `MP: <span style="color:#88ccff">${p.sp}/${p.maxSp}</span><br>`;
  html += `ATK: ${p.attack}  DEF: ${p.defense}<br>`;
  html += `満腹: ${p.hunger}/${p.maxHunger}<br>`;
  html += `所持金: <span style="color:#ffdd44">${p.gold}G</span><br>`;

  // Equipment
  html += `武器: ${p.weapon ? `<span style="color:#ffaa44">${p.weapon.name}</span>` : "なし"}<br>`;
  html += `防具: ${p.armor ? `<span style="color:#44aaff">${p.armor.name}</span>` : "なし"}<br>`;
  html += `装飾: ${p.accessory ? `<span style="color:#aa88ff">${p.accessory.name}</span>` : "なし"}<br>`;

  // Resistances
  const resists: string[] = [];
  for (const elem of ["fire", "ice", "poison", "lightning"] as const) {
    const val = p.getResistance(elem);
    if (val > 0) {
      const names: Record<string, string> = {
        fire: "炎",
        ice: "氷",
        poison: "毒",
        lightning: "雷",
      };
      resists.push(`${names[elem]}${val}%`);
    }
  }
  if (resists.length > 0) {
    html += `耐性: <span style="color:#88aacc">${resists.join(" ")}</span><br>`;
  }

  // Skills
  if (p.skills.length > 0) {
    html += `スキル: `;
    html += p.skills
      .map((s) => {
        const cost = s.spCost === "all" ? "全MP" : `${s.spCost}MP`;
        return `${s.name}(${cost})`;
      })
      .join(", ");
    html += `<br>`;
  }

  // Materials
  if (p.materials.size > 0) {
    const matStrs: string[] = [];
    for (const [matId, count] of p.materials) {
      const matDef = MATERIAL_DEFS.find((m) => m.id === matId);
      matStrs.push(`${matDef?.name ?? matId}x${count}`);
    }
    html += `素材: ${matStrs.join(", ")}<br>`;
  }

  html += `</div>`;
  html +=
    '<button class="menu-btn secondary" id="status-close" style="margin-top:8px">閉じる</button>';
  html += "</div>";
  overlay.innerHTML = html;
}

export function renderInventoryMenu(player: Player): void {
  const overlay = getOverlay();
  showOverlay();

  let html = '<div class="tutorial-dialog"><p>持ち物</p>';

  if (player.consumables.size === 0) {
    html += '<p style="color:#666;font-size:12px">消耗品を持っていない</p>';
  } else {
    let idx = 0;
    for (const [name, entry] of player.consumables) {
      html += `<button class="menu-btn" style="font-size:12px;padding:6px;margin:2px 0;text-align:left" id="use-item-${idx}">`;
      html += `${name} x${entry.count} <span style="font-size:10px;color:#aaa">${entry.def.description}</span>`;
      html += "</button>";
      idx++;
    }
  }

  html +=
    '<button class="menu-btn secondary" id="inv-close" style="margin-top:8px">閉じる</button>';
  html += "</div>";
  overlay.innerHTML = html;
}

export function renderSkillReplaceMenu(player: Player, newSkill: SkillDef): void {
  const overlay = getOverlay();
  showOverlay();

  let html = '<div class="tutorial-dialog">';
  html += `<p>「${newSkill.name}」を覚えたい！</p>`;
  html += `<p style="font-size:11px;color:#aaa">${newSkill.description} (${typeof newSkill.spCost === "number" ? newSkill.spCost + "MP" : "全MP"})</p>`;
  html += '<p style="font-size:11px;color:#888;margin:8px 0">忘れるスキルを選んでください</p>';

  for (let i = 0; i < player.skills.length; i++) {
    const s = player.skills[i];
    const cost = s.spCost === "all" ? "全MP" : `${s.spCost}MP`;
    html += `<button class="menu-btn" style="font-size:12px;padding:6px;margin:2px 0" id="forget-${i}">`;
    html += `${s.name} <span style="font-size:10px;color:#aaa">${s.description} (${cost})</span>`;
    html += "</button>";
  }

  html +=
    '<button class="menu-btn secondary" id="forget-cancel" style="margin-top:8px">覚えない</button>';
  html += "</div>";
  overlay.innerHTML = html;
}

export function renderProloguePage(text: string, isLast: boolean): void {
  const overlay = getOverlay();
  showOverlay();
  const htmlText = text.replace(/\n/g, "<br>");
  overlay.innerHTML = `
    <div class="prologue-text">
      <p>${htmlText}</p>
      <div class="prologue-tap">${isLast ? "タップして冒険を始める" : "タップで次へ"}</div>
    </div>
  `;
}

export function renderGoddessScene(text: string, isLast: boolean): void {
  const overlay = getOverlay();
  showOverlay();
  const htmlText = text.replace(/\n/g, "<br>");
  overlay.innerHTML = `
    <div class="prologue-text" style="color:#aaddff">
      <p>${htmlText}</p>
      <div class="prologue-tap">${isLast ? "タップして目を覚ます" : "タップで次へ"}</div>
    </div>
  `;
}

export function renderTutorialDialog(message: string): void {
  const overlay = getOverlay();
  showOverlay();
  const text = message.replace(/\n/g, "<br>");
  overlay.innerHTML = `
    <div class="tutorial-dialog">
      <p>${text}</p>
      <button class="menu-btn" id="btn-tutorial-ok">了解</button>
    </div>
  `;
}
