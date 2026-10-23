import { forwardRef } from 'react';

export const Table = forwardRef(function Table(
  { children, className = '', style = {}, containerStyle = {}, ...props },
  ref
) {
  return (
    <div
      className="table-wrap ui-table-wrap"
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--r-lg, 12px)',
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        ...containerStyle,
      }}
    >
      <table
        ref={ref}
        className={`ui-table ${className}`}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--font-table, 13px)',
          textAlign: 'left',
          ...style,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

export const TableHeader = forwardRef(function TableHeader({ children, className = '', style = {}, ...props }, ref) {
  return (
    <thead
      ref={ref}
      className={className}
      style={{
        background: 'var(--bg3)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky, 10)',
        ...style,
      }}
      {...props}
    >
      {children}
    </thead>
  );
});

export const TableBody = forwardRef(function TableBody({ children, className = '', style = {}, ...props }, ref) {
  return (
    <tbody ref={ref} className={className} style={style} {...props}>
      {children}
    </tbody>
  );
});

export const TableRow = forwardRef(function TableRow({ children, className = '', style = {}, active = false, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={`ui-table-row ${active ? 'active' : ''} ${className}`}
      style={{
        borderBottom: '1px solid var(--border2, rgba(255,255,255,0.04))',
        transition: 'background var(--t-fast, 120ms) ease',
        background: active ? 'var(--accent-bg)' : undefined,
        height: 40,
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
});

export const TableHead = forwardRef(function TableHead(
  { children, sortable = false, sorted = false, sortDirection = 'asc', onSort, className = '', style = {}, ...props },
  ref
) {
  return (
    <th
      ref={ref}
      onClick={sortable && onSort ? onSort : undefined}
      className={`ui-table-head ${sortable ? 'sortable' : ''} ${className}`}
      style={{
        padding: '10px 14px',
        fontSize: 'var(--font-meta, 12px)',
        fontWeight: 600,
        color: sorted ? 'var(--text)' : 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {children}
        {sortable && (
          <span style={{ display: 'inline-flex', color: sorted ? 'var(--accent)' : 'var(--text3)', opacity: sorted ? 1 : 0.4 }}>
            {sortDirection === 'desc' ? '▼' : '▲'}
          </span>
        )}
      </div>
    </th>
  );
});

export const TableCell = forwardRef(function TableCell({ children, align = 'left', mono = false, className = '', style = {}, ...props }, ref) {
  return (
    <td
      ref={ref}
      className={className}
      style={{
        padding: '9px 14px',
        color: 'var(--text)',
        textAlign: align,
        fontFamily: mono ? 'var(--font-mono, JetBrains Mono, monospace)' : 'inherit',
        fontVariantNumeric: align === 'right' || mono ? 'tabular-nums' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
});

export default Table;
