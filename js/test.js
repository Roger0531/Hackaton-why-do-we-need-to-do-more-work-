// Рушій тестів у форматі НМТ.
// Працює з об'єктом TEST (див. js/data/*.js) і розміткою сторінки:
//   #test     – екран із завданнями (обов'язковий)
//   #intro    – вступний екран (лише для вхідного тесту)
//   #results  – екран результатів (лише для вхідного тесту)
(function () {
  const L = ["А", "Б", "В", "Г", "Д"];
  const KIND = {
    single: "Завдання з вибором однієї правильної відповіді",
    match: "Завдання на встановлення відповідності (логічні пари)",
    order: "Завдання на встановлення послідовності",
    three: "Завдання з вибором трьох правильних відповідей із семи"
  };
  const TYPE_NAME = { single: "Одна відповідь", match: "Логічні пари", order: "Послідовність", three: "Три з семи" };

  const tasks = TEST.tasks;
  const exam = TEST.mode === "exam";
  const KEY = "nmt-test-" + TEST.id;
  const $ = id => document.getElementById(id);
  const root = $("test");

  // ---------- Збереження ----------
  function fresh() {
    return {
      started: false, finished: false, review: false,
      current: TEST.theory ? "T" : 0, elapsed: 0,
      answers: tasks.map(emptyAnswer), revealed: {}
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.answers) && s.answers.length === tasks.length) return s;
    } catch (e) { /* немає збереженого стану */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* сховище недоступне */ }
  }
  let state = load();

  function emptyAnswer(t) {
    if (t.type === "single") return null;
    if (t.type === "three") return [];
    return [null, null, null, null];
  }
  function isShown(i) { return exam ? (state.review || !!state.revealed[i]) : !!state.revealed[i]; }
  function isAnswered(i) {
    const a = state.answers[i];
    if (a === null) return false;
    if (Array.isArray(a)) return a.some(v => v !== null);
    return true;
  }

  // ---------- Оцінювання за схемою НМТ ----------
  function maxPoints(t) { return { single: 1, match: 4, order: 3, three: 3 }[t.type]; }
  function score(i) {
    const t = tasks[i], a = state.answers[i];
    if (t.type === "single") return a === t.answer ? 1 : 0;
    if (t.type === "match") return a.filter((v, r) => v === t.answer[r]).length;
    if (t.type === "three") return a.filter(v => t.answer.includes(v)).length;
    // послідовність: 3 – усе правильно, 2 – перша й остання, 1 – перша або остання
    if (a.every((v, r) => v === t.answer[r])) return 3;
    const first = a[0] === t.answer[0], last = a[3] === t.answer[3];
    return first && last ? 2 : (first || last ? 1 : 0);
  }
  function keyText(t) {
    if (t.type === "single") return L[t.answer];
    if (t.type === "match") return t.answer.map((v, r) => (r + 1) + "–" + L[v]).join(", ");
    if (t.type === "order") return t.answer.map(v => L[v]).join(", ");
    return t.answer.map(v => v + 1).sort().join(", ");
  }
  function isKey(t, r, c) {
    if (t.type === "single") return t.answer === c;
    if (t.type === "three") return t.answer.includes(c);
    return t.answer[r] === c;
  }
  function isChecked(i, r, c) {
    const t = tasks[i], a = state.answers[i];
    if (t.type === "single") return a === c;
    if (t.type === "three") return a.includes(c);
    return a[r] === c;
  }

  // ---------- Відповіді ----------
  let notice = "";
  function mark(i, r, c) {
    const t = tasks[i];
    notice = "";
    if (t.type === "single") {
      state.answers[i] = state.answers[i] === c ? null : c;
    } else if (t.type === "three") {
      const a = state.answers[i];
      if (a.includes(c)) a.splice(a.indexOf(c), 1);
      else if (a.length < 3) a.push(c);
      else notice = "Можна позначити лише три варіанти. Зніміть позначку з одного, щоб обрати інший.";
    } else {
      const a = state.answers[i];
      if (a[r] === c) a[r] = null;
      else {
        // у кожному стовпці бланка – лише одна позначка
        for (let k = 0; k < a.length; k++) if (a[k] === c) a[k] = null;
        a[r] = c;
      }
    }
    save();
    render({ keepFocus: [r, c] });
  }

  // ---------- Розмітка ----------
  function esc(s) {
    return String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }
  function metaHtml() {
    const rows = TEST.meta.map(([k, v]) => "<li>" + esc(k) + ": <b>" + esc(v) + "</b></li>");
    rows.push("<li>Кількість завдань: <b>" + tasks.length + "</b></li>");
    if (exam && !state.finished) rows.push('<li class="timer">Час: <b id="timer">' + clock(state.elapsed) + "</b> з орієнтовних 60 хв</li>");
    return '<ul class="meta">' + rows.join("") + "</ul>";
  }
  function clock(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function tileClass(i) {
    const cls = ["tile"];
    if (state.current === i) cls.push("current");
    const shown = isShown(i);
    if (shown) {
      const got = score(i), max = maxPoints(tasks[i]);
      cls.push(got === max ? "r-ok" : got > 0 ? "r-part" : "r-bad");
    } else if (isAnswered(i)) cls.push("done");
    return cls.join(" ");
  }
  function tilesHtml() {
    let h = '<nav class="tiles" aria-label="Номери завдань">';
    if (TEST.theory) {
      h += '<button type="button" class="tile theory' + (state.current === "T" ? " current" : "") +
        '" data-go="T" aria-label="Теорія"' + (state.current === "T" ? ' aria-current="step"' : "") + ">Т</button>";
    }
    tasks.forEach((t, i) => {
      const label = "Завдання " + (i + 1) + (isAnswered(i) ? ", є відповідь" : "");
      h += '<button type="button" class="' + tileClass(i) + '" data-go="' + i + '" aria-label="' + label + '"' +
        (state.current === i ? ' aria-current="step"' : "") + ">" + (i + 1) + "</button>";
    });
    return h + "</nav>";
  }
  // state(k): "key" – правильний варіант, "wrong" – позначений помилково
  function optsHtml(items, keys, state) {
    return '<ul class="opts">' + items.map((txt, k) => {
      const st = state ? state(k) : "";
      const mark = st === "key" ? "✓" : st === "wrong" ? "✕" : keys[k];
      const sr = st === "key" ? '<span class="visually-hidden">правильна відповідь: </span>' :
        st === "wrong" ? '<span class="visually-hidden">помилкова відповідь: </span>' : "";
      return '<li><span class="key' + (st ? " is-" + st : "") + '" aria-hidden="' + (st ? "true" : "false") + '">' + mark +
        "</span><span>" + sr + esc(txt) + "</span></li>";
    }).join("") + "</ul>";
  }
  function bodyHtml(t, i) {
    const st = isShown(i) ? (k => isKey(t, 0, k) ? "key" : isChecked(i, 0, k) ? "wrong" : "") : null;
    if (t.type === "single") return optsHtml(t.options, L, st);
    if (t.type === "order") return optsHtml(t.items, L);
    if (t.type === "three") return optsHtml(t.options, t.options.map((_, k) => k + 1), st);
    return '<div class="pairs">' + optsHtml(t.left, [1, 2, 3, 4]) + optsHtml(t.right, L) + "</div>";
  }
  function sheetHtml(i, locked, showKey) {
    const t = tasks[i];
    let cols, rows;
    if (t.type === "single") { cols = L.slice(0, 4); rows = [null]; }
    else if (t.type === "three") { cols = [1, 2, 3, 4, 5, 6, 7]; rows = [null]; }
    else if (t.type === "match") { cols = L.slice(0, 5); rows = [1, 2, 3, 4]; }
    else { cols = L.slice(0, 4); rows = [1, 2, 3, 4]; }
    const hasRows = rows[0] !== null;

    let h = '<table class="sheet' + (locked ? " locked" : "") + '" role="presentation"><tr>' + (hasRows ? "<th></th>" : "");
    cols.forEach(c => { h += "<th>" + c + "</th>"; });
    h += "</tr>";
    rows.forEach((rowName, r) => {
      h += "<tr>" + (hasRows ? '<th class="row-h">' + rowName + "</th>" : "");
      cols.forEach((colName, c) => {
        const on = isChecked(i, r, c);
        let cls = "cell";
        if (showKey && isKey(t, r, c)) cls += " is-key";
        else if (showKey && on) cls += " is-wrong";
        const label = (hasRows ? "Рядок " + rowName + ", " : "") + "варіант " + colName;
        h += '<td><button type="button" role="checkbox" class="' + cls + '" aria-checked="' + on + '" aria-label="' + label +
          '" data-r="' + r + '" data-c="' + c + '"' + (locked ? ' aria-disabled="true"' : "") + "></button></td>";
      });
      h += "</tr>";
    });
    return h + "</table>";
  }
  function feedbackHtml(i) {
    const t = tasks[i], got = score(i), max = maxPoints(t);
    const cls = got === max ? "" : got > 0 ? " partial" : " wrong";
    let h = '<div class="feedback' + cls + '" role="status"><p class="verdict">Правильна відповідь: <b>' + keyText(t) + "</b>. " +
      "Бали: " + got + " з " + max + "." +
      (exam && !state.review ? " Після показу відповіді змінити її вже не можна." : "") + "</p>";
    if (t.explain) h += '<h3 class="why">Чому так</h3><p class="why-text">' + t.explain + "</p>";
    // посилання на теми, до яких стосується завдання (крім теми поточної сторінки)
    const here = (location.pathname.match(/tema([\d-]+)\.html$/) || [])[1];
    const nums = [...new Set(t.rowTopics || t.topics)].filter(n => String(n) !== here);
    if (nums.length && typeof TOPICS !== "undefined") {
      h += '<p class="why-links">Повторити: ' + nums.map(n =>
        '<a href="tema' + n + '.html">' + topicLabel(n) + ". " + esc(topicTitle(n)) + "</a>").join("; ") + "</p>";
    }
    return h + "</div>";
  }
  function theoryHtml() {
    return '<div class="theory"><h2>Теорія</h2>' + TEST.theory.map(s =>
      "<section><h3>" + esc(s.title) + "</h3><p>" + s.html + "</p></section>").join("") + "</div>";
  }

  let confirmOpen = false;
  function render(opts) {
    opts = opts || {};
    const cur = state.current;
    let h = metaHtml() + tilesHtml();

    if (cur === "T") {
      h += '<div class="rule"><span>Теорія</span></div>' + theoryHtml();
      h += '<div class="actions mt-4"><button type="button" class="btn btn-act btn-green" data-act="next">До завдань</button></div>';
      root.innerHTML = h;
      return;
    }

    const t = tasks[cur];
    const shown = isShown(cur);
    const locked = shown;
    const last = cur === tasks.length - 1;

    h += '<div class="rule"><span>Завдання ' + (cur + 1) + " з " + tasks.length + "</span></div>";
    h += '<p class="task-kind">' + KIND[t.type] + "</p>";
    h += '<p class="task-text">' + esc(t.text) + "</p>";
    h += bodyHtml(t, cur);
    h += '<p class="sheet-label">Позначте відповіді:</p>' + sheetHtml(cur, locked, shown);
    if (notice) h += '<div class="feedback partial" role="alert">' + notice + "</div>";
    if (shown) h += feedbackHtml(cur);

    const nextLabel = isAnswered(cur) || shown ? "Наступне завдання" : "Пропустити";
    h += '<div class="actions"><div class="stack">';
    if (!(exam && state.review && last)) {
      h += '<button type="button" class="btn btn-act btn-green" data-act="next">' + (exam && last && !state.review ? "Завершити тест" : nextLabel) + "</button>";
    }
    if (!shown) h += '<button type="button" class="btn btn-act btn-green" data-act="reveal">Показати відповідь</button>';
    if (exam && state.review) h += '<button type="button" class="btn btn-act btn-ghost" data-act="results">До результатів</button>';
    else if (exam) { if (!last) h += '<button type="button" class="btn btn-act btn-ghost" data-act="finish">Завершити тест</button>'; }
    else if (shown) h += '<button type="button" class="btn btn-act btn-ghost" data-act="retry">Спробувати ще раз</button>';
    h += "</div>";
    if (!(exam && state.review)) h += '<div><button type="button" class="btn btn-act btn-red" data-act="later">Продовжити пізніше</button></div>';
    h += "</div>";

    if (confirmOpen) {
      const empty = tasks.filter((_, i) => !isAnswered(i)).length;
      h += '<div class="confirm" role="alertdialog" aria-labelledby="confirmText"><p id="confirmText">' +
        (empty ? "Без відповіді залишилося завдань: <b>" + empty + "</b>. За них буде 0 балів." : "Ви відповіли на всі завдання.") +
        ' Після завершення змінити відповіді не можна.</p><div class="d-flex flex-wrap gap-3">' +
        '<button type="button" class="btn btn-act btn-green" data-act="confirm-finish">Завершити й побачити результат</button>' +
        '<button type="button" class="btn btn-act btn-ghost" data-act="cancel-finish">Повернутися до тесту</button></div></div>';
    }

    root.innerHTML = h;
    if (opts.keepFocus) {
      const b = root.querySelector('.cell[data-r="' + opts.keepFocus[0] + '"][data-c="' + opts.keepFocus[1] + '"]');
      if (b) b.focus();
    }
    if (confirmOpen) root.querySelector('[data-act="confirm-finish"]').focus();
  }

  function go(to) {
    notice = ""; confirmOpen = false;
    state.current = to;
    save(); render();
    root.scrollIntoView({ block: "start" });
  }

  root.addEventListener("click", e => {
    const tile = e.target.closest("[data-go]");
    if (tile) return go(tile.dataset.go === "T" ? "T" : Number(tile.dataset.go));

    const cell = e.target.closest(".cell");
    if (cell && !cell.hasAttribute("aria-disabled")) return mark(state.current, Number(cell.dataset.r), Number(cell.dataset.c));

    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act, cur = state.current;
    if (act === "next") {
      if (cur === "T") return go(0);
      if (cur < tasks.length - 1) return go(cur + 1);
      if (exam && !state.review) { confirmOpen = true; return render(); }
      return go(0);
    }
    if (act === "reveal") { state.revealed[cur] = true; notice = ""; save(); return render(); }
    if (act === "retry") { delete state.revealed[cur]; state.answers[cur] = emptyAnswer(tasks[cur]); save(); return render(); }
    if (act === "finish") { confirmOpen = true; return render(); }
    if (act === "cancel-finish") { confirmOpen = false; return render(); }
    if (act === "confirm-finish") return finish();
    if (act === "results") { state.review = false; save(); return show("results"); }
    if (act === "later") {
      save();
      if (exam) return show("intro");
      location.href = "index.html";
    }
  });

  // ---------- Таймер ----------
  let tick = null;
  function startTimer() {
    stopTimer();
    if (!exam || state.finished) return;
    tick = setInterval(() => {
      state.elapsed++;
      const el = $("timer");
      if (el) el.textContent = clock(state.elapsed);
      if (state.elapsed % 10 === 0) save();
    }, 1000);
  }
  function stopTimer() { if (tick) clearInterval(tick); tick = null; }

  // ---------- Результати ----------
  function topicStats() {
    const stats = {};
    const add = (n, got, max) => {
      stats[n] = stats[n] || { got: 0, max: 0 };
      stats[n].got += got; stats[n].max += max;
    };
    tasks.forEach((t, i) => {
      if (t.type === "match") {
        t.rowTopics.forEach((n, r) => add(n, state.answers[i][r] === t.answer[r] ? 1 : 0, 1));
      } else {
        const got = score(i), max = maxPoints(t);
        t.topics.forEach(n => add(n, got, max));
      }
    });
    return stats;
  }
  function finish() {
    confirmOpen = false;
    state.finished = true; state.review = false;
    stopTimer();
    const stats = topicStats(), status = {};
    Object.keys(stats).forEach(n => {
      const r = stats[n].got / stats[n].max;
      status[n] = r < 0.5 ? "gap" : r < 1 ? "weak" : "ok";
    });
    try { localStorage.setItem("nmt-topic-status-v2", JSON.stringify(status)); } catch (e) { /* сховище недоступне */ }
    save();
    location.reload(); // щоб бічна панель одразу показала позначки
  }
  function renderResults() {
    const box = $("results");
    const total = tasks.reduce((s, _, i) => s + score(i), 0);
    const maxTotal = tasks.reduce((s, t) => s + maxPoints(t), 0);
    const stats = topicStats();

    const byType = {};
    tasks.forEach((t, i) => {
      byType[t.type] = byType[t.type] || { got: 0, max: 0 };
      byType[t.type].got += score(i); byType[t.type].max += maxPoints(t);
    });

    const groups = { gap: [], weak: [], ok: [] };
    Object.keys(stats).sort((a, b) => TOPIC_INDEX[a] - TOPIC_INDEX[b]).forEach(n => {
      const r = stats[n].got / stats[n].max;
      groups[r < 0.5 ? "gap" : r < 1 ? "weak" : "ok"].push(n);
    });
    const untested = TOPICS.map(([id]) => id).filter(n => !stats[n]);

    const item = n => '<li><span class="num">' + topicLabel(n) + '</span><a href="tema' + n + '.html">' + esc(topicTitle(n)) + "</a>" +
      (stats[n] ? '<span class="pts">' + stats[n].got + " з " + stats[n].max + "</span>" : "") + "</li>";
    const group = (key, title, hint) => groups[key].length ?
      '<section class="result-group ' + key + '-group"><h2>' + title + '</h2><p class="hint">' + hint + '</p><ul class="result-list">' +
      groups[key].map(item).join("") + "</ul></section>" : "";

    let h = '<h1>Результат вхідного тесту</h1><div class="score"><strong>' + total + "</strong><span>з " + maxTotal + " тестових балів</span></div>";
    h += '<div class="table-wrap by-type"><table class="structure"><tr><th>Тип завдань</th><th>Бали</th></tr>' +
      Object.keys(byType).map(k => "<tr><td>" + TYPE_NAME[k] + "</td><td>" + byType[k].got + " з " + byType[k].max + "</td></tr>").join("") +
      "</table></div>";
    h += group("gap", "Прогалини", "Менше половини балів. З цих тем варто почати підготовку.");
    h += group("weak", "Варто повторити", "Частину матеріалу ви знаєте, але є помилки.");
    h += group("ok", "Засвоєно", "Усі завдання з цих тем виконано правильно.");
    if (untested.length) {
      h += '<section class="result-group"><h2>Не перевірялися цим тестом</h2><p class="hint">Вхідний тест охоплює не всі теми. Ці теми перегляньте самостійно.</p><ul class="result-list">' +
        untested.map(item).join("") + "</ul></section>";
    }
    h += '<div class="d-flex flex-wrap gap-3"><button type="button" class="btn btn-act btn-green" id="reviewBtn">Переглянути відповіді</button>' +
      '<button type="button" class="btn btn-act btn-ghost" id="restartBtn">Пройти тест ще раз</button></div>';
    box.innerHTML = h;
    $("reviewBtn").onclick = () => { state.review = true; state.current = 0; save(); show("test"); };
    $("restartBtn").onclick = restart;
  }
  function restart() {
    state = fresh(); state.started = true;
    try { localStorage.removeItem("nmt-topic-status-v2"); } catch (e) { /* сховище недоступне */ }
    save();
    location.reload();
  }

  // ---------- Перемикання екранів ----------
  function show(view) {
    ["intro", "test", "results"].forEach(v => { const el = $(v); if (el) el.hidden = v !== view; });
    if (view === "test") { render(); startTimer(); }
    else stopTimer();
    if (view === "results") renderResults();
    if (view === "intro") renderIntro();
    window.scrollTo(0, 0);
  }
  function renderIntro() {
    const btn = $("startBtn"), note = $("resumeNote");
    const answered = tasks.filter((_, i) => isAnswered(i)).length;
    note.innerHTML = "";
    if (state.finished) {
      btn.textContent = "Переглянути результати";
      note.innerHTML = 'Тест уже пройдено. <a href="#" id="againLink">Пройти ще раз</a>';
    } else if (state.started) {
      btn.textContent = "Продовжити тест";
      note.innerHTML = "Ви зупинилися на завданні " + (state.current + 1) + ", відповіли на " + answered + " з " + tasks.length +
        '. <a href="#" id="againLink">Почати заново</a>';
    } else {
      btn.textContent = "Почати тест";
    }
    const again = $("againLink");
    if (again) again.onclick = e => { e.preventDefault(); restart(); };
  }

  if (exam) {
    $("startBtn").addEventListener("click", () => {
      if (state.finished) return show("results");
      state.started = true; save(); show("test");
    });
    if (state.finished && !state.review) show("results");
    else if (state.review) show("test");
    else show("intro");
  } else {
    render();
  }
  window.addEventListener("beforeunload", save);
})();
