import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDash, fmtDate } from '../store/useStore';
import { Badge } from './shared';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIORITY_COLORS = {
  'Alta': '#ef4444',
  'Urgente': '#ef4444',
  'Média': '#f59e0b',
  'Baixa': '#22c55e',
};

function formatIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function LembretesCalendar() {
  const lembretes = useDash(s => s.data.lembretes || []);
  const toggleLembrete = useDash(s => s.toggleLembrete);
  const deleteLembrete = useDash(s => s.deleteLembrete);
  const openModal = useDash(s => s.openModal);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatIsoDate(today), [today]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Mapeamento de lembretes por data ISO (YYYY-MM-DD)
  const lembretesByDate = useMemo(() => {
    const map = {};
    lembretes.forEach(item => {
      if (!item.prazo) return;
      const dateKey = item.prazo.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [lembretes]);

  // Estatísticas do mês exibido
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const itemsInMonth = lembretes.filter(l => l.prazo && l.prazo.startsWith(prefix));
    const total = itemsInMonth.length;
    const pendentes = itemsInMonth.filter(l => !l.concluido).length;
    const concluidos = total - pendentes;
    return { total, pendentes, concluidos };
  }, [lembretes, currentYear, currentMonth]);

  // Geração dos dias do grid (42 células = 6 semanas)
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const iso = formatIsoDate(prevDate);
      cells.push({
        dayNumber: d,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayStr,
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(currentYear, currentMonth, d);
      const iso = formatIsoDate(curDate);
      cells.push({
        dayNumber: d,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayStr,
      });
    }

    // Dias do próximo mês para completar 42 células
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const iso = formatIsoDate(nextDate);
      cells.push({
        dayNumber: d,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayStr,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Lembretes do dia selecionado
  const selectedDayItems = useMemo(() => {
    const list = lembretesByDate[selectedDate] || [];
    return [...list].sort((a, b) => {
      if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
      return (a.horario || '99:99').localeCompare(b.horario || '99:99');
    });
  }, [lembretesByDate, selectedDate]);

  // Formatação bonita da data selecionada
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return selectedDate;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Header do Calendário ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 8,
      }}>
        {/* Mês e Ano + Navegação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
            {MONTH_NAMES[currentMonth]} <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{currentYear}</span>
          </div>

          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              className="btn-icon"
              onClick={handlePrevMonth}
              title="Mês anterior"
              style={{ width: 28, height: 28, background: 'var(--bg3)', borderRadius: 6 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={handleNextMonth}
              title="Próximo mês"
              style={{ width: 28, height: 28, background: 'var(--bg3)', borderRadius: 6 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleGoToday}
            style={{ fontSize: 11, padding: '3px 10px', height: 28 }}
          >
            Hoje
          </button>
        </div>

        {/* Resumo do mês e Legenda de Prioridades */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{monthStats.total}</span> lembrete{monthStats.total !== 1 ? 's' : ''} no mês
            {monthStats.pendentes > 0 && (
              <span style={{ color: 'var(--amber)', marginLeft: 6 }}>
                ({monthStats.pendentes} pendente{monthStats.pendentes !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS.Alta }} />
              Alta
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS.Média }} />
              Média
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS.Baixa }} />
              Baixa
            </span>
          </div>
        </div>
      </div>

      {/* ─── Grid de Dias da Semana ──────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        textAlign: 'center',
      }}>
        {WEEK_DAYS.map(day => (
          <div key={day} style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            padding: '6px 0',
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* ─── Grade do Mês (42 células) ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {calendarGrid.map(cell => {
          const isSelected = cell.iso === selectedDate;
          const dayItems = lembretesByDate[cell.iso] || [];
          const hasItems = dayItems.length > 0;
          const pendingCount = dayItems.filter(l => !l.concluido).length;

          return (
            <div
              key={cell.iso}
              onClick={() => setSelectedDate(cell.iso)}
              style={{
                minHeight: 52,
                borderRadius: 'var(--radius-sm, 8px)',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                background: isSelected
                  ? 'var(--accent-bg)'
                  : cell.isToday
                  ? 'rgba(0, 197, 115, 0.08)'
                  : cell.isCurrentMonth
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'transparent',
                border: isSelected ? '1px solid var(--accent)' : 'none',
                opacity: cell.isCurrentMonth ? 1 : 0.35,
              }}
            >
              {/* Top row: day number & today pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: cell.isToday || isSelected ? 700 : 500,
                  color: isSelected ? 'var(--accent)' : cell.isToday ? '#ffffff' : 'var(--text)',
                }}>
                  {cell.dayNumber}
                </span>

                {cell.isToday && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 4px',
                    borderRadius: 4,
                    background: 'var(--accent)',
                    color: '#ffffff',
                    lineHeight: 1,
                  }}>
                    HOJE
                  </span>
                )}
              </div>

              {/* Bottom: Priority Dots */}
              {hasItems && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                  {dayItems.slice(0, 3).map((item, idx) => {
                    const dotColor = item.concluido
                      ? 'var(--text3)'
                      : PRIORITY_COLORS[item.prioridade] || 'var(--accent)';
                    return (
                      <span
                        key={item.id || idx}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: dotColor,
                          opacity: item.concluido ? 0.4 : 1,
                        }}
                        title={`${item.titulo} (${item.prioridade || 'Normal'})`}
                      />
                    );
                  })}
                  {dayItems.length > 3 && (
                    <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, lineHeight: 1 }}>
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Painel do Dia Selecionado ────────────────────────────────────── */}
      <div style={{
        marginTop: 6,
        padding: '14px 16px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg3)',
        border: 'none',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
              {formattedSelectedDate}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {selectedDayItems.length} lembrete{selectedDayItems.length !== 1 ? 's' : ''} registrado{selectedDayItems.length !== 1 ? 's' : ''}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => openModal('lembrete', 'date:' + selectedDate)}
            style={{ fontSize: 11, padding: '4px 10px', height: 28, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar Tarefa
          </button>
        </div>

        {/* Lista de lembretes do dia */}
        {!selectedDayItems.length ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 13,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.35 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>Nenhum lembrete agendado para este dia.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence mode="popLayout">
              {selectedDayItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    background: 'var(--bg2)',
                    border: 'none',
                  }}
                >
                  <label className="dash-reminder-check" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!item.concluido}
                      onChange={() => toggleLembrete(item.id, item.concluido)}
                    />
                    <span className="dash-reminder-checkmark" />
                  </label>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text)',
                      textDecoration: item.concluido ? 'line-through' : 'none',
                      opacity: item.concluido ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.titulo}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {item.categoria && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text2)',
                        }}>
                          {item.categoria}
                        </span>
                      )}

                      {item.prioridade && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: PRIORITY_COLORS[item.prioridade] || 'var(--text3)',
                        }}>
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: PRIORITY_COLORS[item.prioridade] || 'var(--text3)'
                          }} />
                          {item.prioridade}
                        </span>
                      )}

                      {item.horario && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {item.horario}
                        </span>
                      )}

                      {item.descricao && (
                        <span
                          onClick={() => openModal('verNota', item.id)}
                          style={{
                            fontSize: 11,
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          Nota
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn-icon-sub"
                      onClick={() => openModal('lembrete', item.id)}
                      title="Editar"
                      style={{ width: 28, height: 28 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn-icon-sub"
                      onClick={() => deleteLembrete(item.id)}
                      title="Excluir"
                      style={{ width: 28, height: 28, color: 'var(--red)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
