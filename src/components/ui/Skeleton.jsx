import { forwardRef } from 'react';

export const Skeleton = forwardRef(function Skeleton(
  {
    variant = 'line',
    width,
    height,
    count = 1,
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const getDefaultStyles = () => {
    switch (variant) {
      case 'circle':
        return {
          width: width || 40,
          height: height || width || 40,
          borderRadius: '50%',
        };
      case 'block':
        return {
          width: width || '100%',
          height: height || 120,
          borderRadius: 'var(--r-md, 8px)',
        };
      case 'line':
      default:
        return {
          width: width || '100%',
          height: height || 14,
          borderRadius: 'var(--r-sm, 6px)',
        };
    }
  };

  const renderSingle = (index = 0) => (
    <div
      key={index}
      ref={index === 0 ? ref : undefined}
      className={`ui-skeleton ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
        backgroundSize: '200% 100%',
        animation: 'ui-skeleton-shimmer 1.6s infinite ease-in-out',
        ...getDefaultStyles(),
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );

  if (count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {Array.from({ length: count }).map((_, i) => renderSingle(i))}
      </div>
    );
  }

  return renderSingle(0);
});

export default Skeleton;
