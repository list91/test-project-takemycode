import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  fetchNumbers,
  replaceNumber,
  toggleChecked,
  NumberItem
} from "./api/numbersApi";

const PAGE_SIZE = 20;

const NumberTable: React.FC = () => {
  // Состояния для чисел, пагинации, поиска и загрузки
  const [items, setItems] = useState<NumberItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedLoading, setCheckedLoading] = useState<number | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  // Для работы со скроллом
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);

  // Для Intersection Observer
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Флаг блокировки подгрузки
  const loadingRef = useRef(false);

  // --- Глобальный порядок для универсального drag-and-drop ---
  const [globalOrder, setGlobalOrder] = useState<NumberItem[]>([]);

  // --- Кардинально новый drag-and-drop: управляемый мышью ---
  // Без нативных drag-событий, только onMouseDown/onMouseMove/onMouseUp
  // Гарантированная вставка, ghost-элемент, межстрочная линия

  interface DragState {
    dragging: boolean;
    fromIdx: number | null;
    toIdx: number | null; // индекс вставки (между строками)
    mouseY: number | null;
    offsetY: number; // смещение курсора относительно центра строки
    item: NumberItem | null;
  }

  const [drag, setDrag] = useState<DragState>({
    dragging: false,
    fromIdx: null,
    toIdx: null,
    mouseY: null,
    offsetY: 0,
    item: null
  });
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Обработчик клика по строке таблицы
  function handleMouseDown(idx: number, e: React.MouseEvent) {
    // Не запускаем drag, если клик по интерактивному элементу (чекбокс)
    if (
      (e.target as HTMLElement).closest('input[type="checkbox"]') ||
      (e.target as HTMLElement).closest('button')
    ) {
      return;
    }
    if (idx < 0 || idx >= items.length) return;
    const row = rowRefs.current[idx];
    if (!row) return;
    const rect = row.getBoundingClientRect();
    setDrag({
      dragging: true,
      fromIdx: idx,
      toIdx: idx,
      mouseY: e.clientY,
      offsetY: e.clientY - (rect.top + rect.height / 2),
      item: items[idx]
    });
    // Логируем старт
    const globalFromIdx = globalOrder.findIndex(x => x.value === items[idx].value);
    console.log(`[DND] Старт drag: value=${items[idx].value}, локальный idx=${idx}, глобальный idx=${globalFromIdx}`);
    document.body.style.userSelect = 'none'; // Запрет выделения
  }

  // Глобальный mousemove/mouseup
  useEffect(() => {
    if (!drag.dragging) return;
    function onMove(e: MouseEvent) {
      // Вычисляем глобальный индекс вставки
      let insertIdx = globalOrder.length;
      for (let i = 0; i < items.length; i++) {
        const row = rowRefs.current[i];
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          // Глобальный value под линией
          const underValue = items[i].value;
          insertIdx = globalOrder.findIndex(x => x.value === underValue);
          break;
        }
      }
      setDrag(d => ({ ...d, mouseY: e.clientY, toIdx: insertIdx }));
      console.log(`[DND] Двигаем: курсор Y=${e.clientY}, целимся в глобальный idx=${insertIdx}, value под линией=${globalOrder[insertIdx]?.value}`);
    }
    function onUp() {
      if (drag.fromIdx !== null && drag.toIdx !== null && drag.item) {
        const globalFromIdx = globalOrder.findIndex(x => x.value === drag.item!.value);
        let globalToIdx = drag.toIdx;
        // Корректировка для перемещения вниз
        if (globalFromIdx < globalToIdx && globalToIdx !== globalOrder.length) {
          globalToIdx = globalToIdx - 1;
        }
        console.log(`[DND] Drop: value=${drag.item.value}, глобальный fromIdx=${globalFromIdx}, глобальный toIdx=${globalToIdx}`);
        handleMoveGlobal(drag.item.value, globalFromIdx, globalToIdx);
      }
      setDrag({ dragging: false, fromIdx: null, toIdx: null, mouseY: null, offsetY: 0, item: null });
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag.dragging, drag.fromIdx, drag.toIdx, drag.item, items, globalOrder]);

  // Перемещение по глобальному порядку
  function moveItemInArray(arr: NumberItem[], from: number, to: number): NumberItem[] {
    const copy = arr.slice();
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed);
    return copy;
  }

  async function handleMoveGlobal(val: number, globalFromIdx: number, globalToIdx: number) {
    setMoveLoading(true);
    // Логируем куда целились и что получится
    console.log(`[DND] Перемещаем value=${val} с глобального индекса ${globalFromIdx} на ${globalToIdx}`);
    // Мгновенно переставляем в globalOrder
    setGlobalOrder(prev => {
      const newOrder = moveItemInArray(prev, globalFromIdx, globalToIdx);
      console.log('[DND] Новый порядок после перемещения:', newOrder.map(x => x.value));
      return newOrder;
    });
    // Синхронизируем с сервером
    try {
      await replaceNumber(val, globalToIdx);
      loadPage(page); // после ответа сервера обновим из БД
    } catch {}
    setMoveLoading(false);
  }

  async function handleMove(val: number, toIdx: number) {
    setMoveLoading(true);
    let realToIdx = toIdx;
    if (drag.fromIdx !== null && drag.fromIdx < toIdx && toIdx !== items.length) {
      realToIdx = toIdx - 1;
    }
    // Мгновенно переставляем в UI
    if (drag.fromIdx !== null && realToIdx !== null && drag.fromIdx !== realToIdx) {
      setItems(prev => moveItemInArray(prev, drag.fromIdx!, realToIdx));
    }
    // Синхронизируем с сервером
    try {
      await replaceNumber(val, realToIdx);
      loadPage(page); // после ответа сервера обновим из БД
    } catch {}
    setMoveLoading(false);
  }

  // Загрузка страницы при изменении page или search
  useEffect(() => {
    setItems([]);
    setTotal(0);
    loadPage(page);
    // eslint-disable-next-line
  }, [page, search]);

  // После загрузки данных — корректируем скролл и вызываем handleScroll (для надёжности)
  useLayoutEffect(() => {
    if (scrollWrapperRef.current && items.length > 0) {
      const el = scrollWrapperRef.current;
      setTimeout(() => {
        if (lastScrollDirection.current === 'down') {
          el.scrollTop = 40; // Выводим скроллбар из зоны триггера
          console.log('[scroll] scrollTop set to 40 (down)');
        } else if (lastScrollDirection.current === 'up') {
          el.scrollTop = el.scrollHeight - el.clientHeight - 40;
          console.log('[scroll] scrollTop set to BOTTOM-40 (up)', el.scrollTop);
        }
        lastScrollDirection.current = null;
        // Явно вызываем handleScroll после программного скролла
        console.log('[scroll] call handleScroll after scrollTop set');
        handleScroll();
      }, 0);
    }
  }, [items]);

  // Intersection Observer для верхнего и нижнего "стража"
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (loadingRef.current) return;
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (entry.target === bottomSentinelRef.current && (page * PAGE_SIZE) < total) {
          console.log('[IO] bottom sentinel intersected, next page');
          lastScrollDirection.current = 'down';
          loadingRef.current = true;
          setPage(p => p + 1);
        }
        if (entry.target === topSentinelRef.current && page > 1) {
          console.log('[IO] top sentinel intersected, prev page');
          lastScrollDirection.current = 'up';
          loadingRef.current = true;
          setPage(p => p - 1);
        }
      }
    }
  }, [page, total]);

  useEffect(() => {
    // Отписываем старый observer
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new window.IntersectionObserver(handleIntersection, {
      root: scrollWrapperRef.current,
      rootMargin: '0px',
      threshold: 0.1
    });
    if (topSentinelRef.current) observerRef.current.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observerRef.current.observe(bottomSentinelRef.current);
    console.log('[IO] observer (re)initialized');
    return () => observerRef.current?.disconnect();
  }, [handleIntersection, items]);

  // Fallback: ручная проверка скролла (если IO не сработал)
  const handleScroll = useCallback(() => {
    if (!scrollWrapperRef.current || loadingRef.current) return;
    const el = scrollWrapperRef.current;
    console.log('[handleScroll] scrollTop:', el.scrollTop, 'scrollHeight:', el.scrollHeight, 'clientHeight:', el.clientHeight, 'page:', page);
    // Проверяем низ
    if ((page * PAGE_SIZE) < total && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      console.log('[handleScroll] try load next page');
      lastScrollDirection.current = 'down';
      loadingRef.current = true;
      setPage(p => p + 1);
    }
    // Проверяем верх
    if (page > 1 && el.scrollTop <= 8) {
      console.log('[handleScroll] try load prev page');
      lastScrollDirection.current = 'up';
      loadingRef.current = true;
      setPage(p => p - 1);
    }
  }, [page, total]);

  // Функция загрузки страницы (замещающая подгрузка)
  async function loadPage(pageToLoad: number) {
    setLoading(true);
    loadingRef.current = true;
    try {
      const resp = await fetchNumbers(pageToLoad, PAGE_SIZE, search);
      setItems(resp.data);
      setTotal(resp.total);
    } catch (e) {
      // Можно добавить обработку ошибок
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  // Переключение чекбокса
  async function handleToggle(item: NumberItem) {
    setCheckedLoading(item.value);
    try {
      const resp = await toggleChecked(item.value);
      setItems(prev => prev.map(x => x.value === item.value ? { ...x, checked: resp.checked } : x));
    } catch {}
    setCheckedLoading(null);
  }

  // Поиск
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleClearSearch() {
    setSearch("");
    setPage(1);
  }

  // --- Визуализация строк таблицы ---
  function renderRows() {
    return items.map((item, idx) => {
      // Определяем: надо ли рисовать линию перед этим элементом?
      let showLine = false;
      if (drag.dragging && drag.item) {
        // Глобальный индекс текущего элемента
        const globalIdx = globalOrder.findIndex(x => x.value === item.value);
        // Линия рисуется перед этим элементом, если глобальный toIdx совпадает с этим индексом
        if (drag.toIdx === globalIdx) {
          showLine = true;
        }
      }
      return (
        <React.Fragment key={item.value}>
          {showLine && (
            <tr style={{height: 0}}>
              <td colSpan={2}>
                <div style={{height:2, background:'#0078FF', margin:'-1px 0 0 0', borderRadius:1}} />
              </td>
            </tr>
          )}
          <tr
            ref={el => { rowRefs.current[idx] = el; }} // корректный ref для TS: ничего не возвращаем
            onMouseDown={e => handleMouseDown(idx, e)}
            style={{
              opacity: drag.dragging && drag.item && drag.item.value === item.value ? 0.3 : 1,
              cursor: 'grab',
              background: drag.dragging && drag.item && drag.item.value === item.value ? '#e6f2ff' : undefined
            }}
          >
            <td style={{ width: 48 }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item)}
                // Чекбокс теперь не блокируется drag
                style={{ cursor: 'pointer' }}
              />
            </td>
            <td>{item.value}</td>
          </tr>
        </React.Fragment>
      );
    });
  }

  // Ghost-элемент (летает за курсором)
  const renderGhost = () => {
    if (!drag.dragging || drag.mouseY === null || !drag.item) return null;
    return (
      <div
        className="drag-ghost"
        style={{
          position: 'fixed',
          top: drag.mouseY - 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: 0.95
        }}
      >
        <div className="drag-ghost-inner">{drag.item.value}</div>
      </div>
    );
  };

  // Загружаем полный порядок при монтировании
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchNumbers(1, 1000000);
        setGlobalOrder(res.data);
        console.log('[DND] Загружен глобальный порядок:', res.data.map(x => x.value));
      } catch (e) {
        console.error('[DND] Ошибка загрузки полного порядка:', e);
      }
    })();
  }, []);

  return (
    <div className="centered-container">
      <h2>Тестовая таблица чисел</h2>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={handleSearchChange}
        />
        {search && (
          <button className="clear-search-btn" onClick={handleClearSearch} tabIndex={-1} aria-label="Очистить поиск">×</button>
        )}
      </div>
      <div
        className="scroll-table-wrapper"
        ref={scrollWrapperRef}
        style={{ minHeight: 200, maxHeight: 400, overflowY: 'auto' }}
        onScroll={handleScroll}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        {/* Верхний sentinel для Intersection Observer */}
        <div ref={topSentinelRef} style={{ height: 1 }} />
        <table>
          <tbody>
            {renderRows()}
            {loading && <tr><td colSpan={2} style={{ textAlign: 'center', color: '#aaa' }}>Загрузка...</td></tr>}
          </tbody>
        </table>
        {/* Нижний sentinel для Intersection Observer */}
        <div ref={bottomSentinelRef} style={{ height: 1 }} />
        <div style={{color:'#888', fontSize:12, marginTop:4}}>Перемещать можно только элементы текущей страницы</div>
      </div>
      {renderGhost()}
      <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
        Страница {page} из {Math.ceil(total / PAGE_SIZE) || 1} | Показано {items.length} из {total}
      </div>
    </div>
  );
};

export default NumberTable;
