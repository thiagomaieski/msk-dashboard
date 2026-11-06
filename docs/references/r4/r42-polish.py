from pathlib import Path
p=Path('src/components/modals/LeadDrawer.jsx');s=p.read_text(encoding='utf-8').replace('useState, useEffect, useMemo','useState, useEffect, useMemo, useRef',1)
s=s.replace("  const [activeSection, setActiveSection] = useState('resumo');", "  const [activeSection, setActiveSection] = useState('resumo');\n  const identityRef = useRef(null);")
s=s.replace('onClick={() => setActiveSection(id)}', "onClick={() => {\n                setActiveSection(id);\n                identityRef.current?.parentElement.scrollTo({ top: 0 });\n              }}")
s=s.replace('<div className="lead-drawer-identity">','<div ref={identityRef} className="lead-drawer-identity">')
s=s.replace('          {/* Notas PageSpeed & Instagram */}', '''          {!prequalData && !singleProgress && (
            <p className="lead-drawer-empty">Nenhuma análise técnica registrada. {item?.id ? 'Use Qualificar Agora para iniciar a análise.' : 'Salve o lead para disponibilizar a análise.'}</p>
          )}
          {/* Notas PageSpeed & Instagram */}''')
s=s.replace('<span style={{ color: \'var(--text)\', flex: 1 }}>{int.texto}</span>', '<span className="lead-drawer-event-text" style={{ color: \'var(--text)\', flex: 1 }}>{int.texto}</span>')
s=s.replace('className="lightbox-sidebar-textarea"','className="lightbox-sidebar-textarea"\n                aria-label="Anotações do screenshot"')
p.write_text(s,encoding='utf-8')
p=Path('docs/references/r4/r42-fixture.jsx');s=p.read_text(encoding='utf-8').replace('/* eslint-disable no-unused-vars */\n','');p.write_text(s,encoding='utf-8')
