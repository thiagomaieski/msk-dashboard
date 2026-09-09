import { forwardRef, Children, isValidElement } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';

const EMPTY_VALUE_SENTINEL = '__RADIX_EMPTY__';

/**
 * CustomSelect - Componente unificado de Select baseado em @radix-ui/react-select
 * 
 * Variantes:
 * - 'chip': Para barras de filtros (ex: Leads). O chip inteiro é clicável e exibe ícone, rótulo e valor.
 * - 'form': Padrão para formulários e modais (substitui .form-select).
 * - 'filter': Compacto para barras secundárias de tabelas (substitui .filter-select).
 */
export const CustomSelect = forwardRef(function CustomSelect(
  {
    value,
    onChange,
    onValueChange,
    options,
    children,
    placeholder = 'Selecione...',
    label,
    icon,
    variant = 'form',
    className = '',
    style = {},
    name,
    disabled = false,
    required = false,
    title,
    ariaLabel,
  },
  ref
) {
  // Normalização de opções: aceita array de strings, array de objetos ou children <option>
  let normalizedOptions = [];

  if (Array.isArray(options)) {
    normalizedOptions = options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? String(opt.value) : '',
          label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
          icon: opt.icon,
        };
      }
      return {
        value: String(opt),
        label: String(opt),
      };
    });
  } else if (children) {
    Children.forEach(children, child => {
      if (isValidElement(child)) {
        const val = child.props.value !== undefined ? String(child.props.value) : (child.props.children ? String(child.props.children) : '');
        const lbl = child.props.children !== undefined ? String(child.props.children) : val;
        normalizedOptions.push({
          value: val,
          label: lbl,
        });
      }
    });
  }

  // Valor atual mapeado para evitar que o Radix receba string vazia ""
  const isValueEmpty = value === '' || value === null || value === undefined;
  const radixValue = isValueEmpty ? EMPTY_VALUE_SENTINEL : String(value);

  // Encontra o item selecionado para exibir no trigger
  const selectedOption = normalizedOptions.find(opt => 
    (isValueEmpty && opt.value === '') || String(opt.value) === String(value)
  );

  const displayLabel = selectedOption ? selectedOption.label : (isValueEmpty ? placeholder : String(value));
  const isActive = !isValueEmpty;

  const handleValueChange = (newVal) => {
    const actualVal = newVal === EMPTY_VALUE_SENTINEL ? '' : newVal;
    if (onValueChange) {
      onValueChange(actualVal);
    }
    if (onChange) {
      onChange({
        target: {
          value: actualVal,
          name: name || '',
        },
      });
    }
  };

  // Determina as classes do trigger com base na variante
  let triggerClass = 'custom-select-trigger';
  if (variant === 'chip') {
    triggerClass += ` filter-chip ${isActive ? 'active' : ''}`;
  } else if (variant === 'filter') {
    triggerClass += ' filter-select custom-select-filter';
  } else {
    triggerClass += ' form-select custom-select-form';
  }

  if (className) {
    triggerClass += ` ${className}`;
  }

  return (
    <SelectPrimitive.Root
      value={radixValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
    >
      <SelectPrimitive.Trigger
        ref={ref}
        className={triggerClass}
        style={style}
        title={title}
        aria-label={ariaLabel || label || placeholder}
      >
        {/* Ícone se presente */}
        {icon && (
          <span className="custom-select-icon">
            {icon}
          </span>
        )}

        {/* Rótulo se presente (usado em chips) */}
        {label && (
          <span className="custom-select-label">
            {label}
          </span>
        )}

        {/* Valor selecionado */}
        <span className="custom-select-value">
          {displayLabel}
        </span>

        {/* Chevron indicador customizado */}
        <SelectPrimitive.Icon asChild>
          <span className="custom-select-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="custom-select-content"
          position="popper"
          sideOffset={6}
          align="start"
        >
          <SelectPrimitive.ScrollUpButton className="custom-select-scroll-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="custom-select-viewport">
            {normalizedOptions.map((opt, idx) => {
              const itemVal = opt.value === '' ? EMPTY_VALUE_SENTINEL : opt.value;
              const isItemChecked = radixValue === itemVal;

              return (
                <SelectPrimitive.Item
                  key={`${itemVal}-${idx}`}
                  value={itemVal}
                  className="custom-select-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {opt.icon && <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>{opt.icon}</span>}
                    <SelectPrimitive.ItemText>
                      <span className="custom-select-item-text">{opt.label}</span>
                    </SelectPrimitive.ItemText>
                  </div>

                  <SelectPrimitive.ItemIndicator className="custom-select-item-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="custom-select-scroll-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

export default CustomSelect;
