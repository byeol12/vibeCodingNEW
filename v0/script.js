/* ═══════════════════════════════════════════════════════════
   도장 스트릭 챌린지 — script.js
   단일 파일 프로토타입(v8) · localStorage 기반 · 백엔드 없음
   ═══════════════════════════════════════════════════════════ */
   (function () {
    'use strict';
  
    /* ───────────────────────────────────────────
       0. 상수 / 유틸
       ─────────────────────────────────────────── */
    var STORAGE_KEY = 'stampChallenge_v8';
    var PROGRAM_START = '2026-06-01';
    var PROGRAM_END = '2026-12-31';
    var PROGRAM_WEEKDAYS = [2, 4, 5]; // Date#getDay(): 화=2, 목=4, 금=5
    var WEEKDAY_NAME = { 2: '화', 4: '목', 5: '금' };
    var MONTH_EMOJI = { 6: '☀️', 7: '☀️', 8: '🌻', 9: '🍁', 10: '🍂', 11: '🍂', 12: '❄️' };
  
    var PRAISE_LABELS = {
      hand: '🙋 먼저 손 들고 발표', ask: '🧠 모르는 걸 질문', note: '✍️ 필기를 꼼꼼히',
      time: '⏰ 제시간에 도착', retry: '🔁 틀린 문제 다시 풀기', help: '🤝 친구를 도와줌',
      focus: '🎯 끝까지 집중', grit: '💪 포기하지 않음', prep: '📚 예습·복습 완료', greet: '😊 밝게 인사'
    };
    var STRUGGLE_LABELS = {
      sleepy: '😴 잠이 부족했어요', phone: '📱 폰이 자꾸 생각났어요', focus: '🌀 집중이 안 됐어요',
      hard: '😰 어려워서 포기했어요', lost: '🤯 뭘 해야 할지 몰랐어요'
    };
    var GRADE_NAME = { C: '커먼', U: '언커먼', R: '레어', E: '에픽', L: '레전더리', J: '조커' };
    var POINTS = { check: 1, stamp: 2, praise: 2, lucky: 5, growth: 20, recovery: 10 };
  
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function el(tag, attrs, children) {
      var node = document.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          if (k === 'text') node.textContent = attrs[k];
          else if (k === 'html') node.innerHTML = attrs[k];
          else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
        });
      }
      (children || []).forEach(function (c) { if (c) node.appendChild(c); });
      return node;
    }
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function toISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function fromISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function todayISO() { return toISO(new Date()); }
    function mondayOf(d) {
      var day = d.getDay();
      var diff = (day === 0 ? -6 : 1) - day; // 월요일 기준 시작
      var m = new Date(d);
      m.setDate(d.getDate() + diff);
      return m;
    }
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  
    /* ───────────────────────────────────────────
       1. 데이터 모델
       ─────────────────────────────────────────── */
    function defaultShopItems() {
      return [
        { id: 's1', icon: '🎵', name: '수업 시작 노래', desc: '수업 시작 전 원하는 노래 1곡 신청', price: 25, needsApproval: true, limitMonth: 2 },
        { id: 's2', icon: '⏱️', name: '수업 10분 단축', desc: '오늘 수업을 10분 일찍 마쳐요', price: 110, needsApproval: true, limitSeason: 2 },
        { id: 's3', icon: '📝', name: '숙제 1개 면제권', desc: '다음 숙제 중 1개를 면제해요', price: 80, needsApproval: true, limitMonth: 1 },
        { id: 's4', icon: '🃏', name: '조커 카드', desc: '보유 조커 카드 +1장', price: 50, needsApproval: false, effect: 'joker' },
        { id: 's5', icon: '🪑', name: '자리 선택권', desc: '다음 1주일 동안 앉고 싶은 자리를 골라요', price: 40, needsApproval: true, limitMonth: 1 },
        { id: 's6', icon: '🎮', name: '자유활동 20분', desc: '수업 중 자유활동 시간 20분', price: 160, needsApproval: true, limitSeason: 1 },
        { id: 's7', icon: '🌌', name: '프레임: 오로라', desc: '카드 테두리를 오로라빛으로. 영구 소유', price: 30, needsApproval: false, effect: 'frame', frameId: 'aurora' },
        { id: 's8', icon: '🥇', name: '프레임: 골드', desc: '카드 테두리를 금빛으로. 영구 소유', price: 70, needsApproval: false, effect: 'frame', frameId: 'gold' },
        { id: 's9', icon: '🌠', name: '프레임: 갤럭시', desc: '카드 테두리를 은하수로. 영구 소유', price: 130, needsApproval: false, effect: 'frame', frameId: 'galaxy' },
        { id: 's10', icon: '👑', name: '스페셜 보상', desc: '선생님과 함께 정하는 특별 보상', price: 280, needsApproval: true, limitSeason: 1 }
      ];
    }
  
    function defaultState() {
      return {
        version: 9,
        student: { name: '', className: '' },
        pin: '1234',
        program: { start: PROGRAM_START, end: PROGRAM_END, weekdays: PROGRAM_WEEKDAYS },
        records: {},           // { 'YYYY-MM-DD': {attitude,participation,homework,praise:[],struggle:[],memo,jokerUsed,isLucky} }
        jokers: { available: 0, homeworkAwards: [] },
        perfectWeeks: {},       // { weekKey: true }
        purchases: [],          // {id, itemId, name, icon, price, status, ts}
        shopItems: defaultShopItems(),
        cardArt: {},            // { C:dataURL, ... }
        frame: 'basic',
        frameOwned: ['basic'],
        bestStreak: 0,
        reflections: {},        // { weekKey: value }
        recoveryAwards: {},     // { 스트릭이 끊긴 수업일: true }
        bonusPoints: 0          // 이전 버전 호환용 수동 보너스
      };
    }

    function buildSessionModel(program) {
      var start = fromISO(program.start);
      var end = fromISO(program.end);
      var weekdays = program.weekdays;
      var dates = [];
      var cur = new Date(start);
      while (cur <= end) {
        if (weekdays.indexOf(cur.getDay()) !== -1) dates.push(toISO(cur));
        cur.setDate(cur.getDate() + 1);
      }

      // 월 경계를 넘는 달력 주는 각 월의 별도 주차로 분리한다.
      // 예: 6/30은 6월 5주차, 7/2·7/3은 7월 1주차.
      var weeks = [];
      var groups = {};
      dates.forEach(function (iso) {
        var d = fromISO(iso);
        var month = d.getMonth() + 1;
        var mondayKey = toISO(mondayOf(d));
        var groupKey = month + ':' + mondayKey;
        if (!groups[groupKey]) {
          groups[groupKey] = { mondayKey: groupKey, calendarMonday: mondayKey, month: month, dates: [] };
          weeks.push(groups[groupKey]);
        }
        groups[groupKey].dates.push(iso);
      });

      var monthCounter = {};
      weeks.forEach(function (week) {
        monthCounter[week.month] = (monthCounter[week.month] || 0) + 1;
        week.weekOfMonth = monthCounter[week.month];
      });

      var monthTotals = {};
      dates.forEach(function (iso) {
        var month = fromISO(iso).getMonth() + 1;
        monthTotals[month] = (monthTotals[month] || 0) + 1;
      });
      var months = Object.keys(monthTotals).map(Number).sort(function (a, b) { return a - b; });
      return { dates: dates, weeks: weeks, monthTotals: monthTotals, months: months };
    }

    function migrateFromV8() {
      var legacyRaw = localStorage.getItem('stamp_challenge_v8');
      if (!legacyRaw) return null;
      try {
        var legacy = JSON.parse(legacyRaw);
        if (!legacy || !legacy.months) return null;
        var migrated = defaultState();
        var model = buildSessionModel(migrated.program);
        var weekdaySlot = { 2: 0, 4: 1, 5: 2 };

        model.weeks.forEach(function (week) {
          var monthState = legacy.months[week.month] || legacy.months[String(week.month)];
          if (!monthState) return;
          if (Array.isArray(monthState.pwAwardedWeeks) && monthState.pwAwardedWeeks.indexOf(week.weekOfMonth) !== -1) {
            migrated.perfectWeeks[week.mondayKey] = true;
          }
          week.dates.forEach(function (iso) {
            var slot = weekdaySlot[fromISO(iso).getDay()];
            var prefix = 'w' + week.weekOfMonth + '_d' + slot;
            var rec = {
              attitude: !!(monthState.checks && monthState.checks[prefix + '_attitude']),
              participation: !!(monthState.checks && monthState.checks[prefix + '_sincere']),
              homework: !!(monthState.checks && monthState.checks[prefix + '_homework']),
              praise: monthState.tags && monthState.tags[prefix] ? monthState.tags[prefix].slice() : [],
              struggle: [],
              memo: monthState.teacherMemos && monthState.teacherMemos[prefix] ? monthState.teacherMemos[prefix] : '',
              jokerUsed: Array.isArray(monthState.jokerApplied) && monthState.jokerApplied.some(function (joker) {
                return joker.w === week.weekOfMonth && joker.d === slot;
              }),
              isLucky: !!(legacy.glob && legacy.glob.lucky && legacy.glob.lucky[week.month + '_w' + week.weekOfMonth + '_d' + slot]),
              _luckyRolled: !!(legacy.glob && legacy.glob.lucky &&
                Object.prototype.hasOwnProperty.call(legacy.glob.lucky, week.month + '_w' + week.weekOfMonth + '_d' + slot))
            };
            if (itemCount(rec) > 0 || rec.jokerUsed || rec.praise.length || rec.memo) migrated.records[iso] = rec;
          });
        });

        model.months.forEach(function (month) {
          var monthState = legacy.months[month] || legacy.months[String(month)];
          if (!monthState) return;
          migrated.jokers.available += Math.max(0, (Number(monthState.jokersEarned) || 0) - (Number(monthState.jokersUsed) || 0));
          var awardLimit = Array.isArray(monthState.hwAwardedAt) ? monthState.hwAwardedAt.length : 0;
          var run = 0;
          var recordedMonthAwards = 0;
          model.dates.filter(function (iso) { return fromISO(iso).getMonth() + 1 === month; }).forEach(function (iso) {
            var rec = migrated.records[iso];
            if (!rec || (itemCount(rec) === 0 && !rec.jokerUsed)) return;
            if (rec.homework || rec.jokerUsed) {
              run += 1;
              if (run % 3 === 0 && recordedMonthAwards < awardLimit) {
                migrated.jokers.homeworkAwards.push(iso);
                recordedMonthAwards += 1;
              }
            } else {
              run = 0;
            }
          });
        });

        var legacyIdMap = {
          song: 's1', short: 's2', hw: 's3', joker: 's4', seat: 's5', free: 's6',
          f_aurora: 's7', f_gold: 's8', f_galaxy: 's9', special: 's10'
        };
        var legacyPurchases = legacy.glob && Array.isArray(legacy.glob.purchases) ? legacy.glob.purchases : [];
        legacyPurchases.forEach(function (purchase, index) {
          var itemId = legacyIdMap[purchase.id] || purchase.id;
          var item = migrated.shopItems.find(function (candidate) { return candidate.id === itemId; });
          if (!item) return;
          var purchaseDate = typeof purchase.ts === 'number' ? toISO(new Date(purchase.ts)) : todayISO();
          migrated.purchases.push({
            id: 'legacy-' + index + '-' + purchaseDate,
            itemId: item.id,
            name: item.name,
            icon: item.icon,
            price: item.price,
            status: 'approved',
            ts: purchaseDate,
            month: purchase.m || fromISO(purchaseDate).getMonth() + 1
          });
        });

        if (legacy.glob) {
          migrated.bestStreak = Number(legacy.glob.bestStreak) || 0;
          migrated.frameOwned = Array.isArray(legacy.glob.frames) ? legacy.glob.frames.slice() : ['basic'];
          if (migrated.frameOwned.indexOf('basic') === -1) migrated.frameOwned.unshift('basic');
          migrated.frame = legacy.glob.activeFrame || 'basic';
        }
        migrated.student.name = localStorage.getItem('stamp_info_name') || '';
        migrated.student.className = localStorage.getItem('stamp_info_class') || '';
        migrated.pin = localStorage.getItem('stamp_pin') || '1234';
        var legacyArt = localStorage.getItem('stamp_card_art_v1');
        if (legacyArt) {
          try { migrated.cardArt = JSON.parse(legacyArt) || {}; }
          catch (artError) { console.warn('v8 카드 아트 불러오기 실패', artError); }
        }
        migrated.version = 9;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch (error) {
        console.warn('v8 데이터 마이그레이션 실패', error);
        return null;
      }
    }
  
    var state = loadState();
    var teacherUnlocked = false;
    var sessionsCache = null; // computeSessions() 결과 캐시
  
    function loadState() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return migrateFromV8() || defaultState();
        var parsed = JSON.parse(raw);
        var base = defaultState();
        var defaults = defaultShopItems();
        var loadedShopItems = (parsed.shopItems && parsed.shopItems.length) ? parsed.shopItems.map(function (item) {
          var preset = defaults.find(function (candidate) { return candidate.id === item.id; });
          return preset ? Object.assign({}, preset, item) : item;
        }) : defaults;
        var merged = Object.assign(base, parsed, {
          student: Object.assign(base.student, parsed.student || {}),
          program: Object.assign(base.program, parsed.program || {}),
          jokers: Object.assign(base.jokers, parsed.jokers || {}),
          records: parsed.records || {},
          shopItems: loadedShopItems
        });
        if (!Array.isArray(merged.jokers.homeworkAwards)) merged.jokers.homeworkAwards = [];
        if (!merged.recoveryAwards) merged.recoveryAwards = {};
        if (!merged.perfectWeeks) merged.perfectWeeks = {};
        var normalizedPerfectWeeks = {};
        var mergedModel = buildSessionModel(merged.program);
        Object.keys(merged.perfectWeeks).forEach(function (key) {
          if (key.indexOf(':') !== -1) {
            normalizedPerfectWeeks[key] = true;
            return;
          }
          mergedModel.weeks.filter(function (week) { return week.calendarMonday === key; }).forEach(function (week) {
            normalizedPerfectWeeks[week.mondayKey] = true;
          });
        });
        merged.perfectWeeks = normalizedPerfectWeeks;
        if (!merged.reflections) merged.reflections = {};
        var normalizedReflections = {};
        Object.keys(merged.reflections).forEach(function (key) {
          if (key.indexOf(':') !== -1) {
            normalizedReflections[key] = merged.reflections[key];
            return;
          }
          mergedModel.weeks.filter(function (week) { return week.calendarMonday === key; }).forEach(function (week) {
            normalizedReflections[week.mondayKey] = merged.reflections[key];
          });
        });
        merged.reflections = normalizedReflections;
        if (!Array.isArray(merged.frameOwned)) merged.frameOwned = ['basic'];
        if (merged.frameOwned.indexOf('basic') === -1) merged.frameOwned.unshift('basic');
        merged.version = 9;
        return merged;
      } catch (e) {
        console.warn('상태 로드 실패, 기본값 사용', e);
        return defaultState();
      }
    }
  
    var saveTimer = null;
    function persist() {
      clearTimeout(saveTimer);
      indicateSaving();
      saveTimer = setTimeout(function () {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          indicateSaved();
        } catch (e) {
          showToast('저장에 실패했어요. 저장 공간을 확인해주세요.');
        }
      }, 400);
    }
  
    /* ───────────────────────────────────────────
       2. 세션(수업일) 계산
       ─────────────────────────────────────────── */
    function computeSessions() {
      if (sessionsCache) return sessionsCache;
      sessionsCache = buildSessionModel(state.program);
      return sessionsCache;
    }
  
    function itemCount(rec) {
      if (!rec) return 0;
      return (rec.attitude ? 1 : 0) + (rec.participation ? 1 : 0) + (rec.homework ? 1 : 0);
    }
  
    function isDoneRecord(rec) {
      return !!rec && (rec.jokerUsed || itemCount(rec) === 3);
    }

    function monthProgress(month) {
      var sess = computeSessions();
      var dates = sess.dates.filter(function (iso) { return fromISO(iso).getMonth() + 1 === month; });
      var touched = dates.some(function (iso) { return itemCount(state.records[iso]) > 0 || (state.records[iso] && state.records[iso].jokerUsed); });
      var done = dates.filter(function (iso) { return isDoneRecord(state.records[iso]); }).length;
      return { touched: touched, ratio: dates.length ? done / dates.length : 0 };
    }

    function growthCount() {
      var months = computeSessions().months;
      var count = 0;
      for (var i = 1; i < months.length; i++) {
        var previous = monthProgress(months[i - 1]);
        var currentMonthProgress = monthProgress(months[i]);
        if (previous.touched && currentMonthProgress.touched && currentMonthProgress.ratio > previous.ratio) count++;
      }
      return count;
    }

    function recordPoints(rec) {
      if (!rec) return 0;
      var points = itemCount(rec) * POINTS.check;
      if (isDoneRecord(rec)) points += POINTS.stamp;
      if (rec.praise && rec.praise.length) points += POINTS.praise;
      if (rec.isLucky && itemCount(rec) === 3) points += POINTS.lucky;
      return points;
    }

    /* 전체 세션을 순회하며 등급·스트릭·포인트·회복 진행을 순수 계산 */
    function computeDerived() {
      var sess = computeSessions();
      var records = state.records;
      var today = todayISO();
      var grades = {};           // iso -> 'C'|'U'|'R'|'E'|'L'|'J'|null
      var streakAt = {};         // iso -> 그 날짜까지의 연속 기록(0이면 끊김)
      var current = 0, best = 0;
      var earnedPoints = 0;
      var stamps = 0;
      var hwRun = 0;
      var hwMonth = null;
      var lastBrokenBest = 0;
      var latestBreak = null;
      var recoveryProgress = 0;
      var recoveryBest = 0;
  
      sess.dates.forEach(function (iso) {
        if (iso > today) return; // 아직 오지 않은 수업일은 계산에서 제외 (미래=미완료가 아니라 '아직 없음')
        var rec = records[iso];
        var n = itemCount(rec);
        var grade = null;

        // v8과 동일하게 아무 기록도 없는 날은 스트릭을 끊지 않는다.
        if (!rec || (n === 0 && !rec.jokerUsed)) {
          streakAt[iso] = current;
          return;
        }
  
        if (rec && rec.jokerUsed) {
          grade = 'J';
          current += 1;
        } else if (n === 3) {
          var willStreak = current + 1;
          if (rec.isLucky || willStreak >= 10) grade = 'L';
          else if (willStreak >= 5) grade = 'E';
          else grade = 'R';
          current = willStreak;
        } else if (n > 0) {
          grade = n === 1 ? 'C' : 'U';
          if (current > 0) {
            lastBrokenBest = Math.max(lastBrokenBest, current);
            latestBreak = iso;
            recoveryBest = Math.max(recoveryBest, current);
            recoveryProgress = 0;
          }
          current = 0;
        }
        earnedPoints += recordPoints(rec);
        if (isDoneRecord(rec)) stamps += 1;
        if (grade) grades[iso] = grade;
        best = Math.max(best, current);
        streakAt[iso] = current;

        if (latestBreak && iso > latestBreak && isDoneRecord(rec)) recoveryProgress += 1;
  
        // 숙제 3연속 조커 카운트(프로그램 요일 기준, joker 사용일도 유지로 간주)
        var recordMonth = fromISO(iso).getMonth() + 1;
        if (hwMonth !== null && hwMonth !== recordMonth) hwRun = 0;
        hwMonth = recordMonth;
        if (rec.homework || rec.jokerUsed) hwRun += 1;
        else if (n > 0) hwRun = 0;
      });
  
      best = Math.max(best, lastBrokenBest, current, state.bestStreak || 0);
      earnedPoints += state.bonusPoints || 0;
      earnedPoints += growthCount() * POINTS.growth;
      earnedPoints += Object.keys(state.recoveryAwards || {}).length * POINTS.recovery;
  
      var spent = state.purchases
        .filter(function (p) { return p.status === 'approved'; })
        .reduce(function (sum, p) { return sum + p.price; }, 0);
      var reserved = state.purchases
        .filter(function (p) { return p.status === 'pending'; })
        .reduce(function (sum, p) { return sum + p.price; }, 0);
  
      return {
        grades: grades, streakAt: streakAt, current: current, best: best,
        stamps: stamps,
        earnedPoints: earnedPoints, spent: spent, balance: Math.max(0, earnedPoints - spent),
        availableBalance: Math.max(0, earnedPoints - spent - reserved), reserved: reserved,
        hwRun: hwRun, growth: growthCount(),
        recovery: latestBreak ? {
          breakIso: latestBreak,
          progress: recoveryProgress,
          best: recoveryBest || best,
          awarded: !!state.recoveryAwards[latestBreak]
        } : null
      };
    }
  
    /* ───────────────────────────────────────────
       3. 토스트 / 자동저장 표시 / 컨페티
       ─────────────────────────────────────────── */
    var toastTimer = null;
    function showToast(msg) {
      var t = $('#toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
    }
  
    function indicateSaving() {
      var bar = $('#autosave-bar');
      if (bar) bar.classList.add('active');
    }
    function indicateSaved() {
      var bar = $('#autosave-bar');
      var label = $('#autosave-label');
      if (bar) bar.classList.remove('active');
      if (label) { label.classList.add('show'); setTimeout(function () { label.classList.remove('show'); }, 1400); }
    }
  
    function launchConfetti(intensity) {
      var canvas = $('#confetti-canvas');
      if (!canvas || !canvas.getContext) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      var colors = ['#ff6b4a', '#ffd166', '#b98cff', '#4d96ff', '#6ee7b7'];
      var count = intensity === 'big' ? 140 : 60;
      var parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3,
          size: 4 + Math.random() * 5, rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3, color: colors[i % colors.length]
        });
      }
      var start = Date.now();
      var duration = intensity === 'big' ? 2400 : 1600;
      (function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var elapsed = Date.now() - start;
        parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
        if (elapsed < duration) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      })();
    }
  
    /* ───────────────────────────────────────────
       4. 테마
       ─────────────────────────────────────────── */
    function initTheme() {
      var saved = localStorage.getItem('theme_choice');
      var theme = saved || 'dark';
      applyTheme(theme, false);
      $all('.theme-switch button[data-theme-choice]').forEach(function (btn) {
        btn.addEventListener('click', function () { applyTheme(btn.getAttribute('data-theme-choice'), true); });
      });
    }
    function applyTheme(theme, save) {
      document.documentElement.setAttribute('data-theme', theme);
      $all('.theme-switch button[data-theme-choice]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-theme-choice') === theme ? 'true' : 'false');
      });
      if (save) { localStorage.setItem('theme_choice', theme); showToast('테마를 바꿨어요'); }
      if ($('#panel-dash') && !$('#panel-dash').hidden) renderDashboard();
    }
  
    /* ───────────────────────────────────────────
       5. 라우터 (뷰 전환 + 방 서브섹션)
       ─────────────────────────────────────────── */
    var VIEW_IDS = {
      'landing': 'view-landing',
      'dashboard': 'view-teacher-dashboard',
      'room': 'view-teacher-room',
      '': 'view-student'
    };
    var ROOM_SECTION_IDS = {
      eval: 'teacher-eval', shop: 'teacher-shop-edit', art: 'teacher-art',
      report: 'teacher-report', approve: 'teacher-approve'
    };
  
    function parseHash() {
      var h = location.hash.replace(/^#\/?/, ''); // '#/room/eval' -> 'room/eval'
      if (h === 'main-content') return null; // skip-link 앵커는 라우팅 대상 아님
      var legacyRoutes = {
        'room-example': 'room/eval', 'room-eval': 'room/eval', 'room-report': 'room/report',
        'room-approve': 'room/approve', 'teacher-eval': 'room/eval',
        'teacher-shop-edit': 'room/shop', 'teacher-art': 'room/art',
        'teacher-report': 'room/report', 'teacher-approve': 'room/approve'
      };
      if (legacyRoutes[h]) h = legacyRoutes[h];
      var parts = h.split('/').filter(Boolean);
      return { view: parts[0] || '', sub: parts[1] || null };
    }
  
    function showView(name) {
      Object.keys(VIEW_IDS).forEach(function (key) {
        var node = document.getElementById(VIEW_IDS[key]);
        if (!node) return;
        node.hidden = key !== name;
      });
    }
  
    function showRoomSection(sub) {
      var target = ROOM_SECTION_IDS[sub] ? sub : 'eval';
      Object.keys(ROOM_SECTION_IDS).forEach(function (key) {
        var node = document.getElementById(ROOM_SECTION_IDS[key]);
        if (node) node.hidden = key !== target;
      });
      $all('.sub-nav a').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var match = href.indexOf('/room/' + target) !== -1;
        if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }
  
    function handleRoute() {
      var parsed = parseHash();
      if (!parsed) return;
      var known = Object.prototype.hasOwnProperty.call(VIEW_IDS, parsed.view) ? parsed.view : '';
      showView(known);
      if (known === 'room') {
        showRoomSection(parsed.sub);
        renderTeacherRoom();
      } else if (known === 'dashboard') {
        renderTeacherDashboard();
      } else if (known === '') {
        renderStudentApp();
      }
    }
  
    function initRouter() {
      window.addEventListener('hashchange', handleRoute);
      if (!location.hash || location.hash === '#') { handleRoute(); }
      else { handleRoute(); }
    }
  
    /* ───────────────────────────────────────────
       6. 학생용 탭 (ARIA 탭 패턴)
       ─────────────────────────────────────────── */
    function initTabs() {
      var tablist = $('.tabs[role="tablist"]');
      if (!tablist) return;
      var tabs = $all('.tab', tablist);
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { selectTab(tab); });
        tab.addEventListener('keydown', function (e) {
          var idx = tabs.indexOf(tab);
          if (e.key === 'ArrowRight') { e.preventDefault(); focusTab(tabs[(idx + 1) % tabs.length]); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); focusTab(tabs[(idx - 1 + tabs.length) % tabs.length]); }
          else if (e.key === 'Home') { e.preventDefault(); focusTab(tabs[0]); }
          else if (e.key === 'End') { e.preventDefault(); focusTab(tabs[tabs.length - 1]); }
        });
      });
      function focusTab(tab) { tab.focus(); selectTab(tab); }
      function selectTab(tab) {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.tabIndex = selected ? 0 : -1;
          t.classList.toggle('active', selected);
          var panel = document.getElementById(t.getAttribute('data-panel'));
          if (panel) panel.hidden = !selected;
        });
        if (tab.getAttribute('data-panel') === 'panel-dex') renderDex();
        if (tab.getAttribute('data-panel') === 'panel-shop') renderShop();
        if (tab.getAttribute('data-panel') === 'panel-dash') renderDashboard();
      }
    }
  
    /* ───────────────────────────────────────────
       7. PIN 다이얼로그 (선생님 피드백/승인 잠금 해제)
       ─────────────────────────────────────────── */
    var pinBuffer = '';
    var pinOnSuccess = null;
  
    function initPinDialog() {
      var dialog = $('#pin-dialog');
      if (!dialog) return;
      $all('.pin-key[data-key]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key');
          if (key === 'del') pinBuffer = pinBuffer.slice(0, -1);
          else if (pinBuffer.length < 4) pinBuffer += key;
          renderPinDots();
          if (pinBuffer.length === 4) checkPin();
        });
      });
      var cancelBtn = $('.pin-key[value="cancel"]', dialog);
      if (cancelBtn) cancelBtn.addEventListener('click', function () { pinBuffer = ''; dialog.close(); });
      var changeBtn = $('#change-pin-btn');
      if (changeBtn) changeBtn.addEventListener('click', function () { promptChangePin(); });
    }
  
    function renderPinDots() {
      for (var i = 0; i < 4; i++) {
        var dot = document.getElementById('pd' + i);
        if (dot) dot.classList.toggle('filled', i < pinBuffer.length);
      }
    }
  
    function openPinDialog(onSuccess) {
      var dialog = $('#pin-dialog');
      if (!dialog) return;
      pinBuffer = '';
      pinOnSuccess = onSuccess || null;
      renderPinDots();
      $('#pin-error').textContent = '';
      $('#pin-modal-sub').textContent = '4자리 PIN을 입력하세요';
      $('#change-pin-btn').hidden = true;
      if (typeof dialog.showModal === 'function') dialog.showModal();
    }
  
    function checkPin() {
      var dialog = $('#pin-dialog');
      if (pinBuffer === state.pin) {
        $('#pin-error').textContent = '';
        dialog.close();
        $('#change-pin-btn').hidden = false;
        if (pinOnSuccess) pinOnSuccess();
        pinBuffer = '';
      } else {
        $('#pin-error').textContent = 'PIN이 올바르지 않아요';
        pinBuffer = '';
        renderPinDots();
      }
    }
  
    function promptChangePin() {
      var next = prompt('새 PIN 4자리를 입력하세요');
      if (next && /^\d{4}$/.test(next)) {
        var confirmPin = prompt('새 PIN을 한 번 더 입력하세요');
        if (confirmPin !== next) {
          showToast('PIN이 서로 일치하지 않아요');
          return;
        }
        state.pin = next;
        persist();
        showToast('PIN이 변경됐어요');
      } else if (next !== null) {
        showToast('4자리 숫자로 입력해주세요');
      }
    }
  
    function unlockTeacherMode() {
      openPinDialog(function () {
        teacherUnlocked = true;
        updateTeacherBar();
        $all('.memo-input').forEach(function (t) { t.readOnly = false; });
        showToast('선생님 모드가 열렸어요');
        renderTeacherRoom();
      });
    }
    function lockTeacherMode() {
      teacherUnlocked = false;
      editingDates = {};
      updateTeacherBar();
      $all('.memo-input').forEach(function (t) { t.readOnly = true; });
      renderStudentApp();
      renderTeacherRoom();
    }
    function updateTeacherBar() {
      var label = $('#teacher-bar-label'), sub = $('#teacher-bar-sub'), btn = $('#teacher-lock-btn');
      if (!label) return;
      var changeButton = $('#teacher-change-pin-btn');
      if (teacherUnlocked) {
        label.textContent = '선생님 모드 — 열림';
        sub.textContent = '다시 잠그려면 버튼을 누르세요';
        btn.textContent = '잠그기';
        if (!changeButton) {
          changeButton = el('button', { type: 'button', id: 'teacher-change-pin-btn', class: 'teacher-lock-btn', text: 'PIN 변경' });
          changeButton.addEventListener('click', promptChangePin);
          btn.parentElement.insertBefore(changeButton, btn);
        }
        changeButton.hidden = false;
      } else {
        label.textContent = '선생님 모드 — 잠금됨';
        sub.textContent = '피드백 입력 · 보상 승인을 하려면 해제하세요';
        btn.textContent = '열기';
        if (changeButton) changeButton.hidden = true;
      }
    }
    function initTeacherBar() {
      var btn = $('#teacher-lock-btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (teacherUnlocked) lockTeacherMode(); else unlockTeacherMode();
      });
    }
  
    /* ───────────────────────────────────────────
       8. 카드 렌더링 (canvas)
       ─────────────────────────────────────────── */
    var GRADE_COLORS = { C: '#9aa5b1', U: '#52c785', R: '#4d96ff', E: '#b060ff', L: '#ffb703' };
    var JOKER_COLORS = ['#ff5da2', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    function gradeFrameColors(grade) {
      var frames = {
        C: ['#cbd5e1', '#64748b', '#f8fafc'],
        U: ['#52c785', '#14532d', '#d9f99d'],
        R: ['#4d96ff', '#67e8f9', '#eef2ff', '#2563eb'],
        E: ['#b060ff', '#f0abfc', '#60a5fa', '#7e22ce'],
        L: ['#ffb703', '#fff7ae', '#f97316', '#92400e'],
        J: JOKER_COLORS
      };
      return frames[grade] || frames.C;
    }
  
    function drawCard(canvas, iso, grade) {
      if (!canvas || !canvas.getContext) return;
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
  
      var artUrl = state.cardArt[grade];
      // 배경
      if (grade === 'J') {
        var grad = ctx.createLinearGradient(0, 0, w, h);
        JOKER_COLORS.forEach(function (c, i) { grad.addColorStop(i / (JOKER_COLORS.length - 1), c); });
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      } else {
        var base = GRADE_COLORS[grade] || '#666';
        var g2 = ctx.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, base); g2.addColorStop(1, '#14121c');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
      }
  
      function drawArtAndText() {
        var record = state.records[iso] || {};
        var cardDerived = computeDerived();
        // 프레임
        // 상점 구매와 무관하게 카드 등급이 프레임을 자동 결정한다.
        var frameColors = gradeFrameColors(grade);
        var fg = ctx.createLinearGradient(0, 0, w, h);
        frameColors.forEach(function (c, i) { fg.addColorStop(i / Math.max(1, frameColors.length - 1), c); });
        ctx.strokeStyle = fg; ctx.lineWidth = grade === 'L' || grade === 'J' ? 26 : 18;
        ctx.strokeRect(13, 13, w - 26, h - 26);

        // 레어 이상 카드의 홀로그램 입자
        if (grade === 'R' || grade === 'E' || grade === 'L' || grade === 'J') {
          var seed = iso.split('').reduce(function (sum, char) { return sum + char.charCodeAt(0); }, 0);
          for (var sparkle = 0; sparkle < 34; sparkle++) {
            var sx = 34 + ((seed * (sparkle + 7) * 37) % (w - 68));
            var sy = 110 + ((seed * (sparkle + 11) * 53) % (h - 420));
            var sr = 1 + (sparkle % 3);
            ctx.fillStyle = sparkle % 3 === 0 ? 'rgba(255,255,255,.75)' : 'rgba(170,235,255,.42)';
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
  
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(0, 0, w, 90);
        ctx.fillStyle = '#fff';
        ctx.font = '700 34px "Jua", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(GRADE_NAME[grade] || grade, 34, 58);
  
        ctx.textAlign = 'right';
        ctx.font = '400 22px "JetBrains Mono", monospace';
        ctx.fillText(iso, w - 34, 58);
        ctx.font = '700 24px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffd166';
        ctx.fillText('+' + recordPoints(state.records[iso]) + 'P', w - 34, 125);

        // 수집 카드의 핵심 기록 정보
        ctx.fillStyle = 'rgba(10,8,20,.72)';
        ctx.fillRect(24, h - 270, w - 48, 135);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = '400 21px "Gowun Dodum", sans-serif';
        var completedChecks = [];
        if (record.attitude) completedChecks.push('✓ 수업 태도');
        if (record.participation) completedChecks.push('✓ 수업 참여');
        if (record.homework) completedChecks.push('✓ 숙제');
        var checkWidth = (w - 96) / Math.max(1, completedChecks.length);
        ctx.textAlign = 'center';
        completedChecks.forEach(function (label, index) {
          ctx.fillText(label, 48 + checkWidth * (index + 0.5), h - 228);
        });
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd166';
        ctx.font = '700 19px "JetBrains Mono", monospace';
        ctx.fillText('STREAK ' + (cardDerived.streakAt[iso] || 0), 48, h - 185);
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.font = '400 17px "Gowun Dodum", sans-serif';
        var praiseText = (record.praise || []).slice(0, 3).map(function (tag) {
          return PRAISE_LABELS[tag] ? PRAISE_LABELS[tag].split(' ').slice(1).join(' ') : tag;
        }).join(' · ');
        ctx.fillText(praiseText || '오늘의 기록을 차곡차곡 모았어요', 48, h - 151, w - 96);
  
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(0, h - 110, w, 110);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '400 26px "Gowun Dodum", sans-serif';
        ctx.fillText(state.student.name || '학생', w / 2, h - 60);
        ctx.font = '400 18px "Gowun Dodum", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillText('도장 스트릭 챌린지', w / 2, h - 30);
      }
  
      if (artUrl) {
        var img = new Image();
        img.onload = function () {
          ctx.save();
          ctx.beginPath(); ctx.rect(18, 18, w - 36, h - 36); ctx.clip();
          var scale = Math.max(w / img.width, h / img.height);
          var iw = img.width * scale, ih = img.height * scale;
          ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
          ctx.restore();
          drawArtAndText();
        };
        img.onerror = drawArtAndText;
        img.src = artUrl;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.font = '160px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('★', w / 2, h / 2);
        ctx.textBaseline = 'alphabetic';
        drawArtAndText();
      }
    }

    function setCardFlipped(flipped) {
      var flipper = $('#card-flipper');
      var button = $('#btn-flip-card');
      if (!flipper) return;
      flipper.classList.toggle('is-flipped', flipped);
      if (button) {
        button.setAttribute('aria-pressed', flipped ? 'true' : 'false');
        button.textContent = flipped ? '앞면 보기' : '뒷면 보기';
      }
    }

    function initCardMotion() {
      var stage = $('#card-stage');
      var flipper = $('#card-flipper');
      var glare = $('.card-glare');
      if (!stage || !flipper || stage._motionWired) return;
      stage._motionWired = true;
      var pointerDown = false;
      var startX = 0;
      var lastX = 0;
      var moved = 0;

      function updateTilt(event) {
        var rect = stage.getBoundingClientRect();
        var x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        var y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        flipper.style.setProperty('--tilt-y', ((x - 0.5) * 18).toFixed(2) + 'deg');
        flipper.style.setProperty('--tilt-x', ((0.5 - y) * 14).toFixed(2) + 'deg');
        if (glare) {
          glare.style.setProperty('--glare-x', (x * 100).toFixed(1) + '%');
          glare.style.setProperty('--glare-y', (y * 100).toFixed(1) + '%');
        }
      }

      function resetTilt() {
        flipper.style.setProperty('--tilt-x', '0deg');
        flipper.style.setProperty('--tilt-y', '0deg');
        flipper.classList.remove('is-dragging');
      }

      stage.addEventListener('pointerdown', function (event) {
        pointerDown = true;
        startX = lastX = event.clientX;
        moved = 0;
        flipper.classList.add('is-dragging');
        if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
        updateTilt(event);
      });
      stage.addEventListener('pointermove', function (event) {
        updateTilt(event);
        if (pointerDown) {
          moved += Math.abs(event.clientX - lastX);
          lastX = event.clientX;
        }
      });
      stage.addEventListener('pointerup', function (event) {
        if (!pointerDown) return;
        pointerDown = false;
        var horizontalMove = event.clientX - startX;
        if (Math.abs(horizontalMove) > 42 || moved < 8) {
          setCardFlipped(!flipper.classList.contains('is-flipped'));
        }
        resetTilt();
      });
      stage.addEventListener('pointercancel', function () { pointerDown = false; resetTilt(); });
      stage.addEventListener('pointerleave', function () { if (!pointerDown) resetTilt(); });
    }
  
    function openCardDialog(iso, grade) {
      var dialog = $('#card-dialog');
      if (!dialog) return;
      var canvas = $('#card-canvas');
      drawCard(canvas, iso, grade);
      var flipper = $('#card-flipper');
      if (flipper) {
        flipper.setAttribute('data-grade', grade);
        flipper.style.setProperty('--tilt-x', '0deg');
        flipper.style.setProperty('--tilt-y', '0deg');
      }
      setCardFlipped(false);
      initCardMotion();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      var closeBtn = $('#btn-close-card');
      if (closeBtn) closeBtn.onclick = function () { dialog.close(); };
      var flipBtn = $('#btn-flip-card');
      if (flipBtn) flipBtn.onclick = function () {
        setCardFlipped(!$('#card-flipper').classList.contains('is-flipped'));
      };
      var dlBtn = $('#btn-download-card');
      if (dlBtn) dlBtn.onclick = function () {
        var a = document.createElement('a');
        a.download = '도장카드_' + iso + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      var shareBtn = $('#btn-share-card');
      if (shareBtn) shareBtn.onclick = function () {
        canvas.toBlob(function (blob) {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'card.png', { type: 'image/png' })] })) {
            navigator.share({ files: [new File([blob], 'card.png', { type: 'image/png' })], title: '내 카드' }).catch(function () {});
          } else {
            showToast('이 브라우저는 공유를 지원하지 않아요. 이미지 저장을 이용해주세요.');
          }
        });
      };
    }
  
    /* ───────────────────────────────────────────
       9. 평가 기록 갱신 (체크/칭찬/어려움/메모)
       ─────────────────────────────────────────── */
    function getRecord(iso) {
      if (!state.records[iso]) state.records[iso] = { attitude: false, participation: false, homework: false, praise: [], struggle: [], memo: '', jokerUsed: false, isLucky: false };
      return state.records[iso];
    }
  
    function toggleCheckItem(iso, field) {
      var rec = getRecord(iso);
      rec[field] = !rec[field];
      var n = itemCount(rec);
      if (n === 3 && !rec._luckyRolled) {
        rec._luckyRolled = true;
        rec.isLucky = Math.random() < 0.1;
      }
      if (rec[field]) launchConfetti('normal');
      if (rec.attitude && rec.participation && rec.homework) {
        showToast(rec.isLucky ? '럭키 도장! +5P 보너스 🍀' : '오늘 도장 완성! 최고예요 🎉');
        if (rec.isLucky) launchConfetti('big');
      }
      checkJokerConditions(iso);
      checkPerfectWeek(iso);
      checkRecoveryBonus();
      syncBestStreak();
      persist();
      renderStudentApp();
    }
  
    function togglePraise(iso, value) {
      var rec = getRecord(iso);
      var idx = rec.praise.indexOf(value);
      if (idx === -1) {
        if (rec.praise.length >= 3) {
          showToast('칭찬 태그는 최대 3개까지예요');
          renderStudentApp();
          if (!$('#view-teacher-room').hidden) renderTeacherRoom();
          return;
        }
        rec.praise.push(value);
        if (rec.praise.length === 1) showToast('칭찬 태그 보너스 +2P ✨');
      } else rec.praise.splice(idx, 1);
      persist(); renderStudentApp();
    }
    function toggleStruggle(iso, value) {
      var rec = getRecord(iso);
      var idx = rec.struggle.indexOf(value);
      if (idx === -1) rec.struggle.push(value); else rec.struggle.splice(idx, 1);
      persist(); renderStudentApp();
    }
    function updateMemo(iso, value) {
      var rec = getRecord(iso);
      rec.memo = value;
      persist();
    }
  
    function checkJokerConditions(iso) {
      var sess = computeSessions();
      var today = todayISO();
      var run = 0;
      var runMonth = null;
      var newAwards = [];
      sess.dates.forEach(function (date) {
        if (date > today) return;
        var month = fromISO(date).getMonth() + 1;
        if (runMonth !== null && runMonth !== month) run = 0;
        runMonth = month;
        var rec = state.records[date];
        var n = itemCount(rec);
        if (!rec || (n === 0 && !rec.jokerUsed)) return;
        if (rec.homework || rec.jokerUsed) {
          run += 1;
          if (run % 3 === 0 && state.jokers.homeworkAwards.indexOf(date) === -1) newAwards.push(date);
        } else {
          run = 0;
        }
      });
      if (newAwards.length) {
        newAwards.forEach(function (date) {
          state.jokers.homeworkAwards.push(date);
          state.jokers.available += 1;
        });
        showToast('숙제 3연속! 조커 카드 +' + newAwards.length + '장 🃏');
        launchConfetti('big');
      }
    }
  
    function checkPerfectWeek(iso) {
      var sess = computeSessions();
      var week = sess.weeks.find(function (w) { return w.dates.indexOf(iso) !== -1; });
      if (!week) return;
      var allDone = week.dates.every(function (d) {
        var rec = state.records[d];
        return rec && (rec.jokerUsed || (rec.attitude && rec.participation && rec.homework));
      });
      if (allDone && !state.perfectWeeks[week.mondayKey]) {
        state.perfectWeeks[week.mondayKey] = true;
        state.jokers.available += 1;
        showToast('퍼펙트 위크! 조커 카드 +1장 🌟');
        launchConfetti('big');
      }
    }

    function checkRecoveryBonus() {
      var recovery = computeDerived().recovery;
      if (!recovery || recovery.awarded || recovery.progress < 3) return;
      state.recoveryAwards[recovery.breakIso] = true;
      showToast('3일 연속 회복 성공! 리커버리 보너스 +10P 💪');
      launchConfetti('big');
    }

    function syncBestStreak() {
      var best = computeDerived().best;
      state.bestStreak = Math.max(state.bestStreak || 0, best);
    }

    function undoJoker(iso) {
      var rec = state.records[iso];
      if (!rec || !rec.jokerUsed) return;
      rec.jokerUsed = false;
      state.jokers.available += 1;
      persist();
      showToast('조커 사용을 취소하고 카드를 돌려받았어요');
      renderStudentApp();
    }
  
    /* ───────────────────────────────────────────
       10. 조커 사용 다이얼로그
       ─────────────────────────────────────────── */
    function openJokerDialog() {
      if (state.jokers.available <= 0) { showToast('보유한 조커 카드가 없어요'); return; }
      var sess = computeSessions();
      var today = todayISO();
      var candidates = sess.dates.filter(function (iso) {
        if (iso > today) return false;
        if (activeMonth && fromISO(iso).getMonth() + 1 !== activeMonth) return false;
        var rec = state.records[iso];
        var n = itemCount(rec);
        return n > 0 && n < 3 && rec && !rec.jokerUsed;
      });
      var list = $('#modal-days');
      var dialog = $('#joker-dialog');
      if (!list || !dialog) return;
      list.innerHTML = '';
      if (candidates.length === 0) {
        list.appendChild(el('li', { text: '사용할 수 있는 날이 없어요. 체크가 1~2개만 있는 미완성 날에만 쓸 수 있어요.' }));
      }
      candidates.forEach(function (iso) {
        var li = el('li', {}, [
          el('button', { type: 'button', text: iso }, [])
        ]);
        li.querySelector('button').addEventListener('click', function () {
          var rec = getRecord(iso);
          rec.jokerUsed = true;
          state.jokers.available -= 1;
          checkJokerConditions(iso);
          checkPerfectWeek(iso);
          checkRecoveryBonus();
          syncBestStreak();
          persist();
          dialog.close();
          showToast(iso + ' 에 조커 카드를 사용했어요');
          renderStudentApp();
        });
        list.appendChild(li);
      });
      if (typeof dialog.showModal === 'function') dialog.showModal();
      var cancel = $('#joker-dialog-cancel');
      if (cancel) cancel.onclick = function () { dialog.close(); };
    }
  
    /* ───────────────────────────────────────────
       11. 학생 앱 렌더링 — 지갑 / 스트릭 / 회복 / 조커
       ─────────────────────────────────────────── */
    function renderWallet(derived) {
      var balance = $('#w-balance'), earned = $('#w-earned'), spent = $('#w-spent'),
        joker = $('#w-joker'), cards = $('#w-cards');
      var sess = computeSessions();
      var cardCount = Object.keys(derived.grades).length;
      if (balance) balance.textContent = derived.availableBalance;
      if (earned) earned.textContent = derived.earnedPoints;
      if (spent) spent.textContent = derived.spent;
      if (joker) joker.textContent = state.jokers.available;
      if (cards) cards.textContent = cardCount + '/' + sess.dates.length;
    }
  
    var dismissedRecoveryBreak = null;

    function monthStreak(month) {
      var current = 0;
      computeSessions().dates.filter(function (iso) {
        return fromISO(iso).getMonth() + 1 === month && iso <= todayISO();
      }).forEach(function (iso) {
        var rec = state.records[iso];
        if (isDoneRecord(rec)) current += 1;
        else if (itemCount(rec) > 0) current = 0;
      });
      return current;
    }

    function homeworkStreak(month) {
      var current = 0;
      computeSessions().dates.filter(function (iso) {
        return fromISO(iso).getMonth() + 1 === month && iso <= todayISO();
      }).forEach(function (iso) {
        var rec = state.records[iso];
        if (rec && (rec.homework || rec.jokerUsed)) current += 1;
        else if (itemCount(rec) > 0) current = 0;
      });
      return current;
    }

    function renderStreak(derived) {
      var fire = $('#fire-emoji'), num = $('#streak-num'), desc = $('#streak-desc'),
        best = $('#streak-best'), monthLabel = $('#streak-month-label'), dots = $('#streak-dots');
      var selectedMonth = activeMonth || computeSessions().months[0];
      var selectedStreak = monthStreak(selectedMonth);
      if (num) num.textContent = selectedStreak;
      if (best) best.textContent = '최고 기록 ' + derived.best + '일 — 절대 사라지지 않아요';
      if (monthLabel) monthLabel.textContent = selectedMonth + '월';
      if (fire) {
        fire.style.opacity = selectedStreak > 0 ? '1' : '.45';
        fire.textContent = selectedStreak >= 30 ? '👑' : selectedStreak >= 20 ? '🌋' : selectedStreak >= 10 ? '🔥' : selectedStreak >= 5 ? '⚡' : '🔥';
      }
      if (desc) {
        if (selectedStreak === 0) desc.textContent = '첫 번째 도장을 찍어봐요!';
        else if (selectedStreak < 5) desc.textContent = '좋아요, 계속 이어가요!';
        else if (selectedStreak < 10) desc.textContent = '에픽 등급이 보이기 시작해요 ✨';
        else desc.textContent = '레전더리 등급 유지 중! 대단해요 👑';
      }
      if (dots) {
        dots.innerHTML = '';
        var milestones = [3, 6, 9, 12, 20, 30];
        milestones.forEach(function (target) {
          var dot = el('li', {
            class: selectedStreak >= target ? 'done' : '',
            title: target + '일',
            'aria-label': target + '일 목표' + (selectedStreak >= target ? ' 달성' : '')
          });
          dot.textContent = String(target);
          dots.appendChild(dot);
        });
        if (selectedStreak > 30) {
          dots.appendChild(el('li', { class: 'done', text: String(selectedStreak), 'aria-label': selectedStreak + '일 달성' }));
        }
      }
      var recovery = $('#recovery-prompt');
      if (recovery) {
        var recoveryActive = derived.recovery && !derived.recovery.awarded &&
          derived.recovery.progress < 3 && dismissedRecoveryBreak !== derived.recovery.breakIso;
        recovery.hidden = !recoveryActive;
        if (recoveryActive) {
          $('#recovery-best').textContent = derived.recovery.best;
          $('#recovery-bonus').textContent = String(Math.max(0, 3 - derived.recovery.progress));
        }
      }
    }

    function initRecoveryPrompt() {
      var button = $('#btn-dismiss-recovery');
      if (!button) return;
      button.addEventListener('click', function () {
        var recovery = computeDerived().recovery;
        dismissedRecoveryBreak = recovery ? recovery.breakIso : null;
        renderStreak(computeDerived());
      });
    }
  
    function renderJokerSection(derived) {
      var available = $('#joker-available');
      if (available) available.textContent = '보유 ' + state.jokers.available + '장';
      var hwEarnedBadge = $('#jc-hw .joker-earned-badge');
      if (hwEarnedBadge) hwEarnedBadge.hidden = state.jokers.homeworkAwards.length === 0;
      var weekEarnedBadge = $('#jc-pw .joker-earned-badge');
      if (weekEarnedBadge) weekEarnedBadge.hidden = Object.keys(state.perfectWeeks).length === 0;
      var hwRun = homeworkStreak(activeMonth || computeSessions().months[0]) % 3;
      for (var i = 0; i < 3; i++) {
        var dot = document.getElementById('hw-s' + i);
        if (dot) dot.style.opacity = i < hwRun ? '1' : '.35';
      }
      var hwLabel = $('#hw-label');
      if (hwLabel) hwLabel.textContent = hwRun + ' / 3회 달성';
  
      var sess = computeSessions();
      var today = todayISO();
      var curWeek = sess.weeks.find(function (w) { return w.dates.indexOf(today) !== -1; });
      if (!curWeek) {
        var monthWeeks = sess.weeks.filter(function (w) { return w.month === activeMonth; });
        curWeek = monthWeeks.filter(function (w) { return w.dates[0] <= today; }).pop() || monthWeeks[0] || sess.weeks[0];
      }
      var doneInWeek = curWeek ? curWeek.dates.filter(function (d) {
        var rec = state.records[d]; return rec && (rec.jokerUsed || (rec.attitude && rec.participation && rec.homework));
      }).length : 0;
      for (var j = 0; j < 3; j++) {
        var pdot = document.getElementById('pw-s' + j);
        if (pdot) pdot.style.opacity = j < doneInWeek ? '1' : '.35';
      }
      var pwLabel = $('#pw-label');
      if (pwLabel) pwLabel.textContent = doneInWeek + ' / ' + (curWeek ? curWeek.dates.length : 3) + '일 달성';
  
      var row = $('#joker-cards-row');
      if (row) {
        row.innerHTML = '';
        for (var k = 0; k < state.jokers.available; k++) row.appendChild(el('li', {}));
        if (state.jokers.available > 0) {
          row.style.cursor = 'pointer';
          row.onclick = openJokerDialog;
        } else { row.onclick = null; }
      }
    }
  
    /* ───────────────────────────────────────────
       12. 월 스트립 + 주간 카드 (체크리스트 패널)
       ─────────────────────────────────────────── */
    var activeMonth = null;
    var editingDates = {};

    function togglePastDateEdit(iso) {
      if (editingDates[iso]) {
        editingDates[iso] = false;
        persist();
        showToast(iso + ' 기록 수정을 완료했어요');
        renderStudentApp();
        return;
      }

      function beginEdit() {
        teacherUnlocked = true;
        editingDates[iso] = true;
        updateTeacherBar();
        showToast(iso + ' 기록을 수정할 수 있어요');
        renderStudentApp();
      }

      if (teacherUnlocked) beginEdit();
      else openPinDialog(beginEdit);
    }
  
    function renderMonthStrip(derived) {
      var strip = $('#month-strip');
      if (!strip) return;
      var sess = computeSessions();
      if (activeMonth === null) {
        var today = todayISO();
        var todayRec = sess.dates.indexOf(today) !== -1;
        activeMonth = todayRec ? fromISO(today).getMonth() + 1 : sess.months[0];
        if (sess.months.indexOf(activeMonth) === -1) activeMonth = sess.months[0];
      }
      strip.innerHTML = '';
      sess.months.forEach(function (m) {
        var doneCount = sess.dates.filter(function (d) {
          return fromISO(d).getMonth() + 1 === m && isDoneRecord(state.records[d]);
        }).length;
        var btn = el('button', {
          type: 'button', class: 'month-chip' + (m === activeMonth ? ' active' : ''),
          'data-month': m, 'aria-pressed': m === activeMonth ? 'true' : 'false'
        }, [
          el('span', { class: 'month-chip-emoji', 'aria-hidden': 'true', text: MONTH_EMOJI[m] || '📅' }),
          el('span', { class: 'month-chip-name', text: m + '월' }),
          el('span', { class: 'month-chip-stat', text: doneCount + ' / ' + sess.monthTotals[m] + ' 도장' })
        ]);
        btn.addEventListener('click', function (e) {
          var mm = Number(e.currentTarget.getAttribute('data-month'));
          activeMonth = mm;
          renderStudentApp();
        });
        strip.appendChild(btn);
      });
    }
  
    function buildDayCol(iso, derived, weekNo, dayIdx) {
      var rec = state.records[iso] || {};
      var n = itemCount(rec);
      var grade = derived.grades[iso];
      var isToday = iso === todayISO();
      var isPast = iso < todayISO();
      var isFuture = iso > todayISO();
      var isEditing = !!editingDates[iso];
      var d = fromISO(iso);
      var wd = d.getDay();
      var complete = n === 3 || rec.jokerUsed;
      var lucky = !!rec.isLucky && n === 3;
  
      var classes = ['day-col'];
      if (complete) classes.push('complete');
      if (isToday) classes.push('today');
      if (isPast && !isEditing) classes.push('past-locked');
      if (isPast && isEditing) classes.push('day-editing');
      if (n > 0) classes.push('interacted');
      if (rec.jokerUsed) classes.push('joker-used');
      if (grade) classes.push('foil-frame');
  
      var col = el('article', { class: classes.join(' '), 'data-week': weekNo, 'data-day': dayIdx });
  
      var head = el('header', { class: 'day-head' }, [
        el('span', { class: 'day-name', text: WEEKDAY_NAME[wd] || '' }),
        el('span', { class: 'day-stamp', 'aria-hidden': 'true', text: rec.jokerUsed ? '🃏' : lucky ? '🍀' : complete ? '⭐' : '☆' })
      ]);
      col.appendChild(head);
  
      var dateP = el('p', { class: 'day-date' }, [
        el('time', { datetime: iso, text: d.getMonth() + 1 + '/' + d.getDate() })
      ]);
      if (isToday) dateP.appendChild(el('span', { class: 'today-tag', text: '오늘' }));
      if (lucky) dateP.appendChild(el('span', { class: 'lucky-tag', text: '럭키' }));
      col.appendChild(dateP);

      if (isPast) {
        var editBtn = el('button', {
          type: 'button',
          class: 'past-edit-btn' + (isEditing ? ' editing' : ''),
          text: isEditing ? '수정 완료' : '수정하기',
          'aria-pressed': isEditing ? 'true' : 'false'
        });
        editBtn.addEventListener('click', function () { togglePastDateEdit(iso); });
        col.appendChild(editBtn);
      }
  
      var checklist = el('ul', { class: 'day-checklist', role: 'list' });
      [['attitude', '수업 태도', '선생님 눈 보고 바른 자세로 들었나요?', '😊'],
       ['participation', '수업 참여도', '질문에 대답하거나 필기를 했나요?', '📖'],
       ['homework', '숙제 확인', '오늘 숙제를 다 해왔나요?', '✏️']
      ].forEach(function (row) {
        var field = row[0], name = row[1], desc = row[2], icon = row[3];
        var checked = !!rec[field];
        // 카드가 만들어진 지난 기록은 달성한 평가만 요약해서 보여준다.
        if (isPast && !isEditing && !checked) return;
        var inputLocked = isFuture || (isPast && !isEditing);
        var label = el('label', { class: 'check-item' + (checked ? ' checked' : ''), 'data-row': field });
        var input = el('input', { type: 'checkbox' });
        if (checked) input.checked = true;
        if (inputLocked) input.disabled = true;
        label.appendChild(input);
        label.appendChild(el('span', { class: 'check-box', 'aria-hidden': 'true', text: checked ? icon : '' }));
        label.appendChild(el('span', { class: 'check-label' }, [
          el('span', { class: 'name', text: name }), document.createTextNode(desc)
        ]));
        if (!inputLocked) {
          input.addEventListener('change', function () { toggleCheckItem(iso, field); });
        }
        checklist.appendChild(el('li', {}, [label]));
      });
      if (checklist.childElementCount || !isPast || isEditing) col.appendChild(checklist);
  
      // 평가를 하나 이상 입력한 뒤에만 자기관찰 목록을 노출한다.
      if (iso <= todayISO() && n > 0) {
        // 지난 수업일과 오늘 모두 자기관찰 태그를 입력할 수 있다.
        var praiseValues = isPast && !isEditing ? (rec.praise || []) : Object.keys(PRAISE_LABELS);
        var praiseBox = el('fieldset', { class: 'praise-box' });
        praiseBox.appendChild(el('legend', {}, [
          document.createTextNode('오늘 잘한 것 '),
          el('span', { class: 'praise-count', text: rec.praise ? rec.praise.length + ' / 3' : '0 / 3' })
        ]));
        var praiseWrap = el('div', { class: 'praise-chips', role: 'group' });
        praiseValues.forEach(function (val) {
          var on = rec.praise && rec.praise.indexOf(val) !== -1;
          var chip = el('label', { class: 'praise-chip' + (on ? ' on' : '') });
          var cb = el('input', { type: 'checkbox', value: val });
          if (on) cb.checked = true;
          if (isPast && !isEditing) cb.disabled = true;
          else cb.addEventListener('change', function () { togglePraise(iso, val); });
          chip.appendChild(cb);
          chip.appendChild(el('span', { text: PRAISE_LABELS[val] }));
          praiseWrap.appendChild(chip);
        });
        praiseBox.appendChild(praiseWrap);
        if (praiseValues.length || !isPast || isEditing) col.appendChild(praiseBox);
  
        var struggleValues = isPast && !isEditing ? (rec.struggle || []) : Object.keys(STRUGGLE_LABELS);
        var struggleBox = el('fieldset', { class: 'struggle-box' });
        struggleBox.appendChild(el('legend', { text: '오늘 어려웠던 것' }));
        var struggleWrap = el('div', { class: 'struggle-chips', role: 'group' });
        struggleValues.forEach(function (val) {
          var on = rec.struggle && rec.struggle.indexOf(val) !== -1;
          var chip = el('label', { class: 'struggle-chip' + (on ? ' interacted on' : '') });
          var cb = el('input', { type: 'checkbox', value: val });
          if (on) cb.checked = true;
          if (isPast && !isEditing) cb.disabled = true;
          else cb.addEventListener('change', function () { toggleStruggle(iso, val); });
          chip.appendChild(cb);
          chip.appendChild(el('span', { text: STRUGGLE_LABELS[val] }));
          struggleWrap.appendChild(chip);
        });
        struggleBox.appendChild(struggleWrap);
        if (struggleValues.length || !isPast || isEditing) col.appendChild(struggleBox);
      }
  
      var cardBtn = el('button', { type: 'button', class: 'card-btn' + (n > 0 || rec.jokerUsed ? ' ready' : '') }, [
        document.createTextNode('카드 보기')
      ]);
      if (n === 0 && !rec.jokerUsed) cardBtn.disabled = true;
      else cardBtn.addEventListener('click', function () { openCardDialog(iso, grade); });
      col.appendChild(cardBtn);

      if (rec.jokerUsed) {
        var undoBtn = el('button', { type: 'button', class: 'joker-undo-btn', text: '조커 사용 취소' });
        if (isPast && !isEditing) undoBtn.disabled = true;
        else undoBtn.addEventListener('click', function () { undoJoker(iso); });
        col.appendChild(undoBtn);
      }
  
      var memoWrap = el('div', { class: 'day-memos' }, [
        el('label', { class: 'memo-label', for: 'memo-' + iso, text: '선생님 한마디' })
      ]);
      var memoInput = el('textarea', {
        class: 'memo-input', id: 'memo-' + iso, rows: '2',
        placeholder: '선생님이 남긴 피드백이 여기에…'
      });
      memoInput.value = rec.memo || '';
      memoInput.readOnly = !teacherUnlocked || isFuture || (isPast && !isEditing);
      if (!memoInput.readOnly) memoInput.addEventListener('change', function () { updateMemo(iso, memoInput.value); });
      memoWrap.appendChild(memoInput);
      if (!(isPast && !isEditing && !rec.memo)) col.appendChild(memoWrap);
  
      return col;
    }
  
    function renderWeeks(derived) {
      var container = $('#weeks-container');
      if (!container) return;
      container.innerHTML = '';
      var sess = computeSessions();
      var weeksInMonth = sess.weeks.filter(function (w) { return w.month === activeMonth; });
      weeksInMonth.forEach(function (week) {
        var doneCount = week.dates.filter(function (d) { return isDoneRecord(state.records[d]); }).length;
        var isPerfect = !!state.perfectWeeks[week.mondayKey];
        var first = fromISO(week.dates[0]), last = fromISO(week.dates[week.dates.length - 1]);
        var range = (first.getMonth() + 1) + '/' + first.getDate() + ' ~ ' + (last.getMonth() + 1) + '/' + last.getDate();
  
        var head = el('header', { class: 'week-head' }, [
          el('span', { class: 'week-num', 'aria-hidden': 'true', text: week.weekOfMonth }),
          el('div', {}, [
            el('h3', { class: 'week-title', text: week.weekOfMonth + '주차' }),
            el('p', { class: 'week-range', text: range }),
            isPerfect ? el('span', { class: 'perfect-badge', text: '퍼펙트 위크!' }) : null
          ]),
          el('div', { class: 'week-progress' }, [
            el('p', { class: 'week-progress-num', text: doneCount + ' / ' + week.dates.length }),
            el('p', { class: 'week-progress-label', text: '도장' })
          ])
        ]);
  
        var grid = el('div', { class: 'days-grid' });
        state.program.weekdays.forEach(function (weekday, idx) {
          var iso = week.dates.find(function (date) { return fromISO(date).getDay() === weekday; });
          if (iso) {
            grid.appendChild(buildDayCol(iso, derived, week.weekOfMonth, idx));
          } else {
            grid.appendChild(el('div', {
              class: 'day-col empty',
              text: (WEEKDAY_NAME[weekday] || '') + '요일 · 수업 없음',
              'aria-label': (WEEKDAY_NAME[weekday] || '') + '요일 수업 없음'
            }));
          }
        });
  
        var article = el('article', { class: 'week-card', 'data-week': week.weekOfMonth }, [head, grid]);
        container.appendChild(article);
      });
    }
  
    function renderReflection() {
      var section = $('#weekly-reflection');
      if (!section) return;
      var sess = computeSessions();
      var today = todayISO();
      var week = sess.weeks.find(function (w) { return w.dates.indexOf(today) !== -1; });
      var isLastDayOfWeek = week && week.dates[week.dates.length - 1] === today;
      var already = week && state.reflections[week.mondayKey];
      section.hidden = !(isLastDayOfWeek && !already);
      if (!section.hidden) {
        $all('input[name="reflection"]', section).forEach(function (r) { r.checked = false; });
        var saveBtn = $('#btn-save-reflection');
        if (saveBtn) saveBtn.onclick = function () {
          var picked = $('input[name="reflection"]:checked', section);
          if (!picked) { showToast('하나를 골라주세요'); return; }
          state.reflections[week.mondayKey] = picked.value;
          persist();
          showToast('회고를 저장했어요');
          renderStudentApp();
        };
      }
    }
  
    /* ───────────────────────────────────────────
       13. 카드 도감
       ─────────────────────────────────────────── */
    function renderBadges(derived) {
      var grid = $('#badge-grid');
      if (!grid) return;
      var milestones = [
        { icon: '⚡', name: '점화', label: '3연속', got: derived.best >= 3 },
        { icon: '🌊', name: '파도', label: '6연속', got: derived.best >= 6 },
        { icon: '🚀', name: '로켓', label: '9연속', got: derived.best >= 9 },
        { icon: '👑', name: '한 달 왕', label: '12연속', got: derived.best >= 12 },
        { icon: '💎', name: '다이아', label: '20연속', got: derived.best >= 20 },
        { icon: '🏆', name: '레전드', label: '30연속', got: derived.best >= 30 },
        { icon: '🥉', name: '브론즈', label: '도장 30', got: derived.stamps >= 30 },
        { icon: '🥈', name: '실버', label: '도장 60', got: derived.stamps >= 60 },
        { icon: '🥇', name: '골드', label: '도장 92', got: derived.stamps >= computeSessions().dates.length },
        { icon: '🌟', name: '별 다섯', label: '퍼펙트 5주', got: Object.keys(state.perfectWeeks).length >= 5 },
        { icon: '✨', name: '은하수', label: '퍼펙트 15주', got: Object.keys(state.perfectWeeks).length >= 15 },
        { icon: '🌱', name: '성장', label: '전월보다 ↑', got: derived.growth >= 1 },
        { icon: '🌳', name: '큰 나무', label: '3개월 성장', got: derived.growth >= 3 },
        { icon: '🍀', name: '행운아', label: '럭키 도장', got: Object.keys(state.records).some(function (iso) { return state.records[iso].isLucky; }) },
        { icon: '🎖️', name: '칭찬 수집가', label: '태그 10종', got: (function () {
          var kinds = {};
          Object.keys(state.records).forEach(function (iso) {
            (state.records[iso].praise || []).forEach(function (tag) { kinds[tag] = true; });
          });
          return Object.keys(kinds).length >= 10;
        })() }
      ];
      grid.innerHTML = '';
      milestones.forEach(function (m) {
        grid.appendChild(el('li', { class: 'badge' + (m.got ? ' got' : '') }, [
          el('span', { class: 'badge-icon', 'aria-hidden': 'true', text: m.icon }),
          el('p', { class: 'badge-name', text: m.name }),
          el('p', { class: 'badge-req', text: m.label })
        ]));
      });
    }
  
    function renderDex() {
      var derived = computeDerived();
      var sess = computeSessions();
      var countEl = $('#dex-count');
      var got = Object.keys(derived.grades).length;
      if (countEl) countEl.textContent = got + ' / ' + sess.dates.length;
  
      renderBadges(derived);
  
      var body = $('#dex-body');
      if (!body) return;
      body.innerHTML = '';
      sess.months.forEach(function (m) {
        var monthDates = sess.dates.filter(function (d) { return fromISO(d).getMonth() + 1 === m; });
        var monthDone = monthDates.filter(function (d) { return derived.grades[d]; }).length;
        var section = el('section', { class: 'dex-month' });
        section.appendChild(el('h4', { class: 'dex-month-head' }, [
          el('strong', { text: m + '월' }), document.createTextNode(' · ' + monthDone + ' / ' + monthDates.length)
        ]));
        var ul = el('ul', { class: 'dex-grid', role: 'list' });
        monthDates.forEach(function (iso) {
          var grade = derived.grades[iso];
          var d = fromISO(iso);
          var label = (d.getMonth() + 1) + '/' + d.getDate();
          var cardNumber = sess.dates.indexOf(iso) + 1;
          if (grade) {
            var btn = el('button', { type: 'button', class: 'dex-slot got grade-' + grade, 'data-grade': grade, 'aria-label': label + ' ' + GRADE_NAME[grade] + ' 카드' }, [
              el('span', { class: 'dex-card-emoji', 'aria-hidden': 'true', text: grade === 'J' ? '🃏' : grade === 'L' ? '🍀' : grade === 'E' ? '💜' : grade === 'R' ? '⭐' : grade === 'U' ? '🔹' : '▫️' }),
              el('span', { class: 'dex-card-date', text: label }),
              el('span', { class: 'dex-grade', text: grade })
            ]);
            if (grade === 'R' || grade === 'E' || grade === 'L' || grade === 'J') btn.classList.add('foil-frame');
            btn.addEventListener('click', function () { openCardDialog(iso, grade); });
            ul.appendChild(el('li', {}, [btn]));
          } else {
            ul.appendChild(el('li', {}, [
              el('button', { type: 'button', class: 'dex-slot locked', 'aria-label': label + ' 미획득' }, [
                el('span', { 'aria-hidden': 'true', text: '🔒' }),
                el('span', { class: 'dex-card-date', text: '#' + cardNumber })
              ])
            ]));
          }
        });
        section.appendChild(ul);
        body.appendChild(section);
      });
    }
  
    /* ───────────────────────────────────────────
       14. 상점 / 프레임 / 아트 / 사용내역
       ─────────────────────────────────────────── */
    function purchaseMonth(purchase) {
      if (purchase.month) return purchase.month;
      if (purchase.ts && /^\d{4}-\d{2}-\d{2}$/.test(purchase.ts)) return fromISO(purchase.ts).getMonth() + 1;
      return null;
    }

    function purchaseCount(item, scope) {
      return state.purchases.filter(function (purchase) {
        if (purchase.itemId !== item.id || purchase.status === 'rejected' || purchase.status === 'refunded') return false;
        if (scope === 'month') return purchaseMonth(purchase) === (activeMonth || new Date().getMonth() + 1);
        return true;
      }).length;
    }

    function itemAvailability(item, derived) {
      if (item.effect === 'frame' && state.frameOwned.indexOf(item.frameId) !== -1) return { ok: false, reason: 'owned' };
      if (item.limitMonth && purchaseCount(item, 'month') >= item.limitMonth) return { ok: false, reason: 'month' };
      if (item.limitSeason && purchaseCount(item, 'season') >= item.limitSeason) return { ok: false, reason: 'season' };
      if (derived.availableBalance < item.price) return { ok: false, reason: 'points' };
      return { ok: true, reason: '' };
    }

    function renderShop() {
      var derived = computeDerived();
      var grid = $('#shop-grid');
      if (grid) {
        grid.innerHTML = '';
        state.shopItems.filter(function (item) { return item.effect !== 'frame'; }).forEach(function (item) {
          var pendingSame = state.purchases.some(function (p) { return p.itemId === item.id && p.status === 'pending'; });
          var availability = itemAvailability(item, derived);
          var limitText = '무제한';
          if (item.effect === 'frame') limitText = '영구 소유';
          else if (item.limitMonth) limitText = '이번 달 ' + purchaseCount(item, 'month') + ' / ' + item.limitMonth + '회';
          else if (item.limitSeason) limitText = '학기 ' + purchaseCount(item, 'season') + ' / ' + item.limitSeason + '회';
          var li = el('li', { class: 'shop-item' + (item.needsApproval ? ' needs-approval' : '') });
          var article = el('article', {}, [
            el('span', { class: 'shop-icon', 'aria-hidden': 'true', text: item.icon }),
            el('h4', { class: 'shop-name' }, [
              document.createTextNode(item.name + ' '),
              item.needsApproval ? el('span', { class: 'approval-badge', 'aria-label': '승인 필요', text: '🔐' }) : null
            ]),
            el('p', { class: 'shop-desc', text: item.desc }),
            el('p', { class: 'shop-limit', text: limitText }),
            el('p', { class: 'shop-price', text: item.price + 'P' })
          ]);
          var buttonText = pendingSame ? '승인 대기 중' :
            availability.reason === 'owned' ? '보유 중' :
            availability.reason === 'points' ? 'P 부족' :
            (availability.reason === 'month' || availability.reason === 'season') ? '한도 초과' :
            (item.needsApproval ? '구매 요청' : '구매');
          var buyBtn = el('button', { type: 'button', class: 'btn shop-buy-btn', text: buttonText });
          if (!availability.ok || pendingSame) buyBtn.disabled = true;
          buyBtn.addEventListener('click', function () { purchaseItem(item.id); });
          article.appendChild(buyBtn);
          li.appendChild(article);
          grid.appendChild(li);
        });
      }
  
      var pick = $('#frame-pick');
      if (pick) {
        pick.innerHTML = '';
        ['C', 'U', 'R', 'E', 'L', 'J'].forEach(function (grade) {
          pick.appendChild(el('li', {}, [
            el('span', {
              class: 'frame-option grade-frame-preview',
              'data-grade': grade,
              text: grade + ' · ' + GRADE_NAME[grade]
            })
          ]));
        });
      }
  
      renderArtGrid('#art-grid', '#art-file', true);
      renderLedger();
      renderWallet(derived);
    }
  
    function resizeImageFile(file, cb) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var maxSide = 640;
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          cb(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  
    function renderArtGrid(gridSel, sharedInputSel, sharedMode) {
      var grid = $(gridSel);
      if (!grid) return;
      var grades = ['C', 'U', 'R', 'E', 'L', 'J'];
      grid.innerHTML = '';
      var sharedInput = sharedMode ? $(sharedInputSel) : null;
      grades.forEach(function (g) {
        var artUrl = state.cardArt[g];
        var figure = el('figure', {}, [
          el('figcaption', { text: GRADE_NAME[g] })
        ]);
        if (artUrl) figure.appendChild(el('img', { src: artUrl, alt: GRADE_NAME[g] + ' 등급 카드 아트', width: '160', height: '224' }));
        var btn = el('button', { type: 'button', class: 'art-upload-btn', text: artUrl ? '변경' : '+ 사진' });
        figure.appendChild(btn);
        if (artUrl) {
          var clearBtn = el('button', { type: 'button', class: 'art-clear-btn', text: '삭제' });
          clearBtn.addEventListener('click', function () {
            if (!confirm(GRADE_NAME[g] + ' 카드 아트를 삭제할까요?')) return;
            delete state.cardArt[g];
            persist();
            showToast('카드 아트를 삭제했어요');
            if (sharedMode) renderShop(); else renderTeacherRoom();
          });
          figure.appendChild(clearBtn);
        }
        var li = el('li', { class: 'art-slot', 'data-grade': g }, [figure]);
  
        if (sharedMode) {
          btn.addEventListener('click', function () {
            sharedInput.onchange = function () {
              var file = sharedInput.files && sharedInput.files[0];
              if (!file) return;
              resizeImageFile(file, function (dataUrl) {
                state.cardArt[g] = dataUrl; persist(); showToast(GRADE_NAME[g] + ' 카드 아트를 등록했어요'); renderShop();
              });
              sharedInput.value = '';
            };
            sharedInput.click();
          });
        } else {
          var perSlotInput = el('input', { type: 'file', class: 'art-file', accept: 'image/*', hidden: 'hidden' });
          li.appendChild(perSlotInput);
          btn.addEventListener('click', function () { perSlotInput.click(); });
          perSlotInput.addEventListener('change', function () {
            var file = perSlotInput.files && perSlotInput.files[0];
            if (!file) return;
            resizeImageFile(file, function (dataUrl) {
              state.cardArt[g] = dataUrl; persist(); showToast(GRADE_NAME[g] + ' 카드 아트를 등록했어요'); renderTeacherRoom();
            });
          });
        }
        grid.appendChild(li);
      });
    }
  
    function renderLedger() {
      var ledger = $('#ledger');
      if (!ledger) return;
      ledger.innerHTML = '';
      var mine = state.purchases.slice().reverse();
      if (mine.length === 0) {
        ledger.appendChild(el('li', { class: 'ledger-empty', text: '아직 사용한 보상이 없어요.' }));
        return;
      }
      mine.forEach(function (p) {
        var statusLabel = p.status === 'approved' ? '승인됨' :
          p.status === 'pending' ? '승인 대기' :
          p.status === 'refunded' ? '사용 취소' : '거절됨';
        var article = el('article', {}, [
          el('p', {}, [
            el('strong', { text: p.icon + ' ' + p.name }),
            document.createTextNode(' — ' + p.price + 'P (' + statusLabel + ')')
          ]),
          el('time', { datetime: p.ts, text: p.ts })
        ]);
        if (p.status === 'approved') {
          var refundBtn = el('button', { type: 'button', class: 'btn ledger-refund-btn', text: '사용 취소' });
          refundBtn.addEventListener('click', function () { refundPurchase(p.id); });
          article.appendChild(refundBtn);
        }
        ledger.appendChild(el('li', {}, [article]));
      });
    }
  
    function purchaseItem(itemId) {
      var item = state.shopItems.find(function (i) { return i.id === itemId; });
      if (!item) return;
      var derived = computeDerived();
      var availability = itemAvailability(item, derived);
      if (!availability.ok) {
        var messages = {
          owned: '이미 가지고 있는 프레임이에요',
          month: '이번 달 사용 한도를 다 썼어요',
          season: '학기 사용 한도를 다 썼어요',
          points: '별 포인트가 부족해요'
        };
        showToast(messages[availability.reason] || '지금은 구매할 수 없어요');
        return;
      }
      var purchase = {
        id: 'p' + Date.now(), itemId: item.id, name: item.name, icon: item.icon,
        price: item.price, status: item.needsApproval ? 'pending' : 'approved',
        ts: todayISO(), month: activeMonth || new Date().getMonth() + 1
      };
      state.purchases.push(purchase);
      if (!item.needsApproval) applyPurchaseEffect(item);
      persist();
      showToast(item.needsApproval ? '구매를 요청했어요. 선생님 승인을 기다려요.' : '구매 완료!');
      renderShop();
    }
  
    function applyPurchaseEffect(item) {
      if (item.effect === 'joker') { state.jokers.available += 1; }
      else if (item.effect === 'frame') {
        if (state.frameOwned.indexOf(item.frameId) === -1) state.frameOwned.push(item.frameId);
        state.frame = item.frameId;
      }
    }
  
    function resolvePurchase(purchaseId, approve) {
      var p = state.purchases.find(function (x) { return x.id === purchaseId; });
      if (!p || p.status !== 'pending') return;
      if (approve) {
        var currentPoints = computeDerived();
        if (currentPoints.earnedPoints - currentPoints.spent - currentPoints.reserved < 0) {
          showToast('현재 포인트가 부족해 승인할 수 없어요');
          return;
        }
      }
      p.status = approve ? 'approved' : 'rejected';
      if (approve) {
        var item = state.shopItems.find(function (i) { return i.id === p.itemId; });
        if (item) applyPurchaseEffect(item);
      }
      persist();
      showToast(approve ? '승인했어요' : '거절했어요');
      renderTeacherRoom();
    }

    function refundPurchase(purchaseId) {
      var purchase = state.purchases.find(function (p) { return p.id === purchaseId; });
      if (!purchase || purchase.status !== 'approved') return;
      var purchaseItemData = state.shopItems.find(function (candidate) { return candidate.id === purchase.itemId; });
      if (purchaseItemData && purchaseItemData.effect === 'joker' && state.jokers.available <= 0) {
        showToast('이미 사용한 조커 카드는 취소할 수 없어요');
        return;
      }
      openPinDialog(function () {
        var item = state.shopItems.find(function (candidate) { return candidate.id === purchase.itemId; });
        purchase.status = 'refunded';
        if (item && item.effect === 'frame') {
          var stillOwned = state.purchases.some(function (other) {
            return other.id !== purchase.id && other.itemId === item.id && other.status === 'approved';
          });
          if (!stillOwned) {
            state.frameOwned = state.frameOwned.filter(function (frameId) { return frameId !== item.frameId; });
            if (state.frame === item.frameId) state.frame = 'basic';
          }
        } else if (item && item.effect === 'joker' && state.jokers.available > 0) {
          state.jokers.available -= 1;
        }
        persist();
        showToast('사용을 취소하고 포인트를 돌려줬어요');
        renderShop();
      });
    }
  
    /* ───────────────────────────────────────────
       15. 대시보드 (바닐라 캔버스 차트)
       ─────────────────────────────────────────── */
    function fitCanvas(canvas) {
      var wrap = canvas.parentElement;
      var w = wrap.clientWidth || 320, h = wrap.clientHeight || 220;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx: ctx, w: w, h: h };
    }
    function themeColor(varName) {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#888';
    }
  
    function drawBarChart(canvasId, labels, values, color) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      if (values.length === 0) {
        ctx.fillStyle = themeColor('--text-muted');
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('아직 데이터가 없어요', w / 2, h / 2);
        return;
      }
      var max = Math.max.apply(null, values.concat([1]));
      var padL = 28, padB = 22, barGap = 8;
      var chartW = w - padL - 10, chartH = h - padB - 10;
      var barW = chartW / values.length - barGap;
      ctx.strokeStyle = themeColor('--border'); ctx.beginPath();
      ctx.moveTo(padL, 6); ctx.lineTo(padL, chartH + 6); ctx.lineTo(w - 4, chartH + 6); ctx.stroke();
      ctx.fillStyle = themeColor('--text-muted'); ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      values.forEach(function (v, i) {
        var x = padL + i * (barW + barGap) + barGap / 2;
        var barH = max > 0 ? (v / max) * (chartH - 10) : 0;
        ctx.fillStyle = color;
        ctx.fillRect(x, chartH - barH + 6, barW, barH);
        ctx.fillStyle = themeColor('--text-muted');
        ctx.fillText(labels[i], x + barW / 2, chartH + 20);
      });
    }
  
    function drawLineChart(canvasId, labels, values, color) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      var max = Math.max.apply(null, values.concat([1])), min = 0;
      var padL = 30, padB = 20, padT = 10;
      var chartW = w - padL - 10, chartH = h - padB - padT;
      ctx.strokeStyle = themeColor('--border'); ctx.beginPath();
      ctx.moveTo(padL, padT); ctx.lineTo(padL, chartH + padT); ctx.lineTo(w - 4, chartH + padT); ctx.stroke();
      ctx.beginPath();
      values.forEach(function (v, i) {
        var x = padL + (values.length > 1 ? i / (values.length - 1) : 0) * chartW;
        var y = padT + chartH - ((v - min) / (max - min || 1)) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = themeColor('--text-muted'); ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      labels.forEach(function (lb, i) {
        if (i % Math.ceil(labels.length / 8 || 1) !== 0) return;
        var x = padL + (values.length > 1 ? i / (values.length - 1) : 0) * chartW;
        ctx.fillText(lb, x, chartH + padT + 16);
      });
    }
  
    function drawDonutChart(canvasId, labels, values, colors) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      var total = values.reduce(function (a, b) { return a + b; }, 0);
      var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
      if (total === 0) {
        ctx.strokeStyle = themeColor('--border'); ctx.lineWidth = 18;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = themeColor('--text-muted'); ctx.textAlign = 'center'; ctx.font = '12px sans-serif';
        ctx.fillText('아직 데이터가 없어요', cx, cy);
        return;
      }
      var start = -Math.PI / 2;
      values.forEach(function (v, i) {
        var angle = (v / total) * Math.PI * 2;
        ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = 18;
        ctx.beginPath(); ctx.arc(cx, cy, r, start, start + angle); ctx.stroke();
        start += angle;
      });
    }
  
    function renderDashboard() {
      var derived = computeDerived();
      var sess = computeSessions();
      $('#d-stamps') && ($('#d-stamps').textContent = derived.stamps);
      $('#d-stamps-sub') && ($('#d-stamps-sub').textContent = '전체 ' + sess.dates.length + '일 중');
      $('#d-points') && ($('#d-points').textContent = derived.balance);
      $('#d-points-sub') && ($('#d-points-sub').textContent = '누적 ' + derived.earnedPoints + 'P');
      $('#d-best') && ($('#d-best').textContent = derived.best);
      $('#d-perfect') && ($('#d-perfect').textContent = Object.keys(state.perfectWeeks).length);
      $('#d-perfect-sub') && ($('#d-perfect-sub').textContent = '전체 ' + sess.weeks.length + '주 중');
  
      var monthLabels = sess.months.map(function (m) { return m + '월'; });
      var monthValues = sess.months.map(function (m) {
        return sess.dates.filter(function (d) { return fromISO(d).getMonth() + 1 === m && isDoneRecord(state.records[d]); }).length;
      });
      drawBarChart('chart-month', monthLabels, monthValues, themeColor('--accent'));
  
      var weekLabels = sess.weeks.map(function (w) { return w.month + '/' + w.weekOfMonth; });
      var weekValues = sess.weeks.map(function (w) {
        var done = w.dates.filter(function (d) { return isDoneRecord(state.records[d]); }).length;
        return Math.round((done / w.dates.length) * 100);
      });
      drawLineChart('chart-week', weekLabels, weekValues, themeColor('--accent-3'));
  
      var itemTotals = { attitude: 0, participation: 0, homework: 0 };
      Object.keys(state.records).forEach(function (iso) {
        var r = state.records[iso];
        if (r.attitude) itemTotals.attitude++;
        if (r.participation) itemTotals.participation++;
        if (r.homework) itemTotals.homework++;
      });
      var totalSessions = Math.max(1, sess.dates.length);
      drawDonutChart('chart-item', ['태도', '참여', '숙제'], [
        Math.round(itemTotals.attitude / totalSessions * 100),
        Math.round(itemTotals.participation / totalSessions * 100),
        Math.round(itemTotals.homework / totalSessions * 100)
      ],
        [themeColor('--accent'), themeColor('--accent-2'), themeColor('--accent-3')]);
  
      var praiseTotals = {};
      Object.keys(state.records).forEach(function (iso) {
        (state.records[iso].praise || []).forEach(function (p) { praiseTotals[p] = (praiseTotals[p] || 0) + 1; });
      });
      var praiseKeys = Object.keys(praiseTotals).sort(function (a, b) { return praiseTotals[b] - praiseTotals[a]; }).slice(0, 6);
      drawBarChart('chart-praise', praiseKeys.map(function (k) { return PRAISE_LABELS[k].slice(0, 2); }),
        praiseKeys.map(function (k) { return praiseTotals[k]; }), themeColor('--success'));
  
      var struggleTotals = {};
      Object.keys(state.records).forEach(function (iso) {
        (state.records[iso].struggle || []).forEach(function (s) { struggleTotals[s] = (struggleTotals[s] || 0) + 1; });
      });
      var struggleKeys = Object.keys(struggleTotals).sort(function (a, b) { return struggleTotals[b] - struggleTotals[a]; }).slice(0, 5);
      drawBarChart('chart-struggle', struggleKeys.map(function (k) { return STRUGGLE_LABELS[k].slice(0, 2); }),
        struggleKeys.map(function (k) { return struggleTotals[k]; }), themeColor('--danger'));
  
      var gradeTotals = { C: 0, U: 0, R: 0, E: 0, L: 0, J: 0 };
      Object.keys(derived.grades).forEach(function (iso) { gradeTotals[derived.grades[iso]]++; });
      drawDonutChart('chart-grade', Object.keys(gradeTotals), Object.keys(gradeTotals).map(function (k) { return gradeTotals[k]; }),
        [GRADE_COLORS.C, GRADE_COLORS.U, GRADE_COLORS.R, GRADE_COLORS.E, GRADE_COLORS.L, '#ff5da2']);
    }
  
    /* ───────────────────────────────────────────
       16. 학생 정보 / 저장·내보내기·초기화
       ─────────────────────────────────────────── */
    function initInfoStrip() {
      var nameInput = $('#info-name'), classInput = $('#info-class');
      if (nameInput) {
        nameInput.value = state.student.name || '';
        nameInput.addEventListener('change', function () { state.student.name = nameInput.value; persist(); });
      }
      if (classInput) {
        classInput.value = state.student.className || '';
        classInput.addEventListener('change', function () { state.student.className = classInput.value; persist(); });
      }
    }

    function renderScheduleHeader() {
      var header = $('#header-schedule');
      if (!header) return;
      var start = fromISO(state.program.start);
      var end = fromISO(state.program.end);
      var names = state.program.weekdays.map(function (day) { return WEEKDAY_NAME[day] || ''; }).filter(Boolean);
      header.textContent = start.getFullYear() + '년 ' + (start.getMonth() + 1) + '월 ~ ' +
        (end.getMonth() + 1) + '월 · ' + names.join(' · ');
    }
  
    function exportCSV() {
      var sess = computeSessions();
      var derived = computeDerived();
      var rows = [['날짜', '수업태도', '수업참여도', '숙제확인', '칭찬태그', '어려움태그', '선생님메모', '카드등급', '획득포인트', '조커사용', '럭키']];
      sess.dates.forEach(function (iso) {
        var r = state.records[iso];
        if (!r) return;
        rows.push([iso, r.attitude ? '1' : '0', r.participation ? '1' : '0', r.homework ? '1' : '0',
          (r.praise || []).join('|'), (r.struggle || []).join('|'), (r.memo || '').replace(/\n/g, ' '),
          derived.grades[iso] || '', recordPoints(r), r.jokerUsed ? '1' : '0', r.isLucky ? '1' : '0']);
      });
      rows.push([]);
      rows.push(['누적 획득 P', derived.earnedPoints]);
      rows.push(['사용 P', derived.spent]);
      rows.push(['사용 가능 P', derived.availableBalance]);
      rows.push(['최고 스트릭', derived.best]);
      rows.push(['총 도장', derived.stamps]);
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
      var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '도장기록_' + todayISO() + '.csv';
      a.click();
    }
  
    function exportJSON() {
      persist();
      var blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json;charset=utf-8;'
      });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '도장스트릭_v0_' + todayISO() + '.json';
      a.click();
      showToast('JSON을 내보냈어요');
    }

    function initActionBar() {
      var saveBtn = $('#save-btn'), csvBtn = $('#export-csv-btn'), jsonBtn = $('#export-json-btn'), resetBtn = $('#reset-btn');
      if (saveBtn) saveBtn.addEventListener('click', function () { persist(); showToast('저장했어요'); });
      if (csvBtn) csvBtn.addEventListener('click', exportCSV);
      if (jsonBtn) jsonBtn.addEventListener('click', exportJSON);
      if (resetBtn) resetBtn.addEventListener('click', function () {
        if (confirm('정말 모든 기록을 초기화할까요? 되돌릴 수 없어요.')) {
          state = defaultState();
          sessionsCache = null;
          activeMonth = null;
          editingDates = {};
          dismissedRecoveryBreak = null;
          persist();
          showToast('초기화했어요');
          if ($('#info-name')) $('#info-name').value = '';
          if ($('#info-class')) $('#info-class').value = '';
          renderScheduleHeader();
          renderStudentApp();
        }
      });
    }
  
    /* ───────────────────────────────────────────
       17. 학생 앱 전체 렌더 진입점
       ─────────────────────────────────────────── */
    function renderStudentApp() {
      var derived = computeDerived();
      renderWallet(derived);
      renderMonthStrip(derived);
      renderStreak(derived);
      renderJokerSection(derived);
      renderWeeks(derived);
      renderReflection();
      updateTeacherBar();
      var checkPanel = $('#panel-check');
      if (checkPanel && !checkPanel.hidden) { /* 기본 패널 */ }
      if ($('#panel-dex') && !$('#panel-dex').hidden) renderDex();
      if ($('#panel-shop') && !$('#panel-shop').hidden) renderShop();
      if ($('#panel-dash') && !$('#panel-dash').hidden) renderDashboard();
    }
  
    /* ───────────────────────────────────────────
       18. 선생님 대시보드 / 방 관리 뷰
       ─────────────────────────────────────────── */
    function renderTeacherDashboard() {
      var title = $('#view-teacher-dashboard h1');
      // 이 프로토타입은 단일 학생/방 기준. 방 카드는 정적 예시를 그대로 사용.
      var createBtn = $('#btn-create-room');
      if (createBtn && !createBtn._wired) {
        createBtn._wired = true;
        createBtn.addEventListener('click', function () { showToast('여러 방 관리는 다음 버전에서 지원돼요'); });
      }
    }
  
    function renderTeacherRoom() {
      var derived = computeDerived();
      var sessionDates = computeSessions().dates;
      var today = todayISO();
      var evaluationDate = sessionDates.indexOf(today) !== -1 ? today :
        sessionDates.filter(function (iso) { return iso <= today; }).pop() || sessionDates[0];
  
      var dateEl = $('#teacher-session-date');
      if (dateEl) {
        var d = fromISO(evaluationDate);
        var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
        dateEl.textContent = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + wd + ')';
      }
  
      var legend = $('#form-teacher-eval fieldset legend');
      if (legend) legend.textContent = state.student.name || '학생';
  
      var rec = getRecord(evaluationDate);
      ['attitude', 'participation', 'homework'].forEach(function (field) {
        var input = $('.eval-checklist input[name="' + field + '"]');
        if (input) {
          input.checked = !!rec[field];
          input.onchange = function () { toggleCheckItem(evaluationDate, field); renderTeacherRoom(); };
        }
      });
      $all('.praise-chips input[name="praise"]', $('#form-teacher-eval')).forEach(function (cb) {
        cb.checked = rec.praise.indexOf(cb.value) !== -1;
        cb.onchange = function () { togglePraise(evaluationDate, cb.value); renderTeacherRoom(); };
      });
      $all('.struggle-chips input[name="struggle"]', $('#form-teacher-eval')).forEach(function (cb) {
        cb.checked = rec.struggle.indexOf(cb.value) !== -1;
        cb.onchange = function () { toggleStruggle(evaluationDate, cb.value); renderTeacherRoom(); };
      });
      var praiseCount = $('#form-teacher-eval .praise-count');
      if (praiseCount) praiseCount.textContent = rec.praise.length + ' / 3';
      var memo = $('#teacher-memo');
      if (memo) {
        memo.value = rec.memo || '';
        memo.onchange = function () { updateMemo(evaluationDate, memo.value); };
      }
      var evalForm = $('#form-teacher-eval');
      if (evalForm && !evalForm._wired) {
        evalForm._wired = true;
        evalForm.addEventListener('submit', function (e) {
          e.preventDefault();
          persist();
          showToast('평가를 저장했어요');
        });
      }
  
      renderShopEditList();
      renderArtGrid('#teacher-art-grid', null, false);
  
      var reportName = $('#teacher-report h3');
      if (reportName) reportName.textContent = state.student.name || '학생';
      $('#report-stamps') && ($('#report-stamps').textContent = derived.stamps);
      $('#report-points') && ($('#report-points').textContent = derived.balance);
      $('#report-streak') && ($('#report-streak').textContent = derived.best);
  
      renderApproveList();
    }
  
    function renderShopEditList() {
      var list = $('#shop-edit-list');
      if (!list) return;
      list.innerHTML = '';
      state.shopItems.filter(function (item) { return item.effect !== 'frame'; }).forEach(function (item) {
        var form = el('form', { action: '#', method: 'post' });
        var iconField = el('div', { class: 'form-field' }, [
          el('label', { text: '아이콘' }),
          (function () { var i = el('input', { type: 'text', maxlength: '4' }); i.value = item.icon; return i; })()
        ]);
        var nameField = el('div', { class: 'form-field' }, [
          el('label', { text: '이름' }),
          (function () { var i = el('input', { type: 'text' }); i.value = item.name; return i; })()
        ]);
        var descField = el('div', { class: 'form-field' }, [
          el('label', { text: '설명' }),
          (function () { var i = el('input', { type: 'text' }); i.value = item.desc || ''; return i; })()
        ]);
        var priceField = el('div', { class: 'form-field' }, [
          el('label', { text: '가격 (P)' }),
          (function () { var i = el('input', { type: 'number', min: '0' }); i.value = item.price; return i; })()
        ]);
        var monthLimitField = el('div', { class: 'form-field' }, [
          el('label', { text: '월 한도' }),
          (function () { var i = el('input', { type: 'number', min: '0', placeholder: '무제한' }); i.value = item.limitMonth || ''; return i; })()
        ]);
        var seasonLimitField = el('div', { class: 'form-field' }, [
          el('label', { text: '학기 한도' }),
          (function () { var i = el('input', { type: 'number', min: '0', placeholder: '무제한' }); i.value = item.limitSeason || ''; return i; })()
        ]);
        var approvalLabel = el('label', { class: 'check-item' }, [
          (function () { var i = el('input', { type: 'checkbox' }); i.checked = !!item.needsApproval; return i; })(),
          el('span', { class: 'check-label' }, [el('span', { class: 'name', text: '승인 필요' })])
        ]);
        var saveBtn = el('button', { type: 'submit', class: 'btn', text: '저장' });
        var delBtn = el('button', { type: 'button', class: 'btn btn-danger', text: '삭제' });
  
        form.appendChild(iconField); form.appendChild(nameField); form.appendChild(descField); form.appendChild(priceField);
        form.appendChild(monthLimitField); form.appendChild(seasonLimitField);
        form.appendChild(approvalLabel); form.appendChild(saveBtn); form.appendChild(delBtn);
  
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          item.icon = iconField.querySelector('input').value || item.icon;
          item.name = nameField.querySelector('input').value || item.name;
          item.desc = descField.querySelector('input').value;
          var nextPrice = Number(priceField.querySelector('input').value);
          if (Number.isFinite(nextPrice) && nextPrice >= 0) item.price = nextPrice;
          item.limitMonth = Number(monthLimitField.querySelector('input').value) || null;
          item.limitSeason = Number(seasonLimitField.querySelector('input').value) || null;
          if (item.limitMonth) item.limitSeason = null;
          item.needsApproval = approvalLabel.querySelector('input').checked;
          persist();
          showToast('상점 항목을 저장했어요');
          renderShopEditList();
        });
        delBtn.addEventListener('click', function () {
          if (!confirm(item.name + ' 항목을 삭제할까요?')) return;
          state.shopItems = state.shopItems.filter(function (i) { return i.id !== item.id; });
          persist();
          renderShopEditList();
        });
  
        list.appendChild(el('li', { class: 'shop-edit-item' }, [form]));
      });
    }
  
    function initShopAdd() {
      var addBtn = $('#btn-add-shop-item');
      if (!addBtn) return;
      addBtn.addEventListener('click', function () {
        var id = 'custom' + Date.now();
        state.shopItems.push({ id: id, icon: '🎁', name: '새 보상', desc: '', price: 10, needsApproval: true });
        persist();
        renderShopEditList();
        showToast('새 보상을 추가했어요. 이름과 가격을 정해주세요');
      });
    }
  
    function renderApproveList() {
      var list = $('#approve-list'), empty = $('#approve-empty');
      if (!list) return;
      var pending = state.purchases.filter(function (p) { return p.status === 'pending'; });
      list.innerHTML = '';
      if (empty) empty.hidden = pending.length > 0;
      pending.forEach(function (p) {
        var li = el('li', { class: 'approve-item' }, [
          el('article', {}, [
            el('p', {}, [
              el('strong', { text: state.student.name || '학생' }),
              document.createTextNode(' — ' + p.icon + ' ' + p.name + ' (' + p.price + 'P)')
            ]),
            el('time', { datetime: p.ts, text: p.ts }),
            el('div', { class: 'approve-actions' }, [
              el('button', { type: 'button', class: 'btn btn-primary', text: '승인' }),
              el('button', { type: 'button', class: 'btn btn-danger', text: '거절' })
            ])
          ])
        ]);
        var buttons = $all('.approve-actions button', li);
        buttons[0].addEventListener('click', function () {
          if (!teacherUnlocked) { openPinDialog(function () { resolvePurchase(p.id, true); }); return; }
          resolvePurchase(p.id, true);
        });
        buttons[1].addEventListener('click', function () {
          if (!teacherUnlocked) { openPinDialog(function () { resolvePurchase(p.id, false); }); return; }
          resolvePurchase(p.id, false);
        });
        list.appendChild(li);
      });
    }
  
    /* ───────────────────────────────────────────
       19. 랜딩 폼 (로그인/입장 — 프로토타입 안내용)
       ─────────────────────────────────────────── */
    function initLandingForms() {
      var teacherForm = $('#form-teacher-login');
      if (teacherForm) teacherForm.addEventListener('submit', function (e) {
        e.preventDefault();
        location.hash = '#/dashboard';
        showToast('선생님 대시보드로 이동했어요 (체험 모드)');
      });
      var signupBtn = $('#btn-show-signup');
      if (signupBtn) signupBtn.addEventListener('click', function () {
        showToast('회원가입은 다음 버전(클라우드 저장)에서 지원돼요');
      });
      var joinForm = $('#form-student-join');
      if (joinForm) joinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('#join-name').value.trim();
        var code = $('#join-code').value.trim().toUpperCase();
        if (!name || code.length !== 6) {
          showToast('6자리 방 코드와 이름을 확인해주세요');
          return;
        }
        state.student.name = name;
        state.student.roomCode = code;
        persist();
        var infoName = $('#info-name');
        if (infoName) infoName.value = name;
        location.hash = '#/';
        showToast('입장했어요!');
      });
    }
  
    /* ───────────────────────────────────────────
       20. 초기화
       ─────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      initTabs();
      initPinDialog();
      initTeacherBar();
      initRecoveryPrompt();
      initInfoStrip();
      renderScheduleHeader();
      initActionBar();
      initShopAdd();
      initLandingForms();
      updateTeacherBar();
      initRouter();
      if (!location.hash) renderStudentApp();
      window.addEventListener('resize', function () {
        if ($('#panel-dash') && !$('#panel-dash').hidden) renderDashboard();
      });
    });
  })();