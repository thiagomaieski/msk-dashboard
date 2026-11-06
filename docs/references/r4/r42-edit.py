from pathlib import Path
p=Path('src/components/modals/LeadDrawer.jsx')
s=p.read_text(encoding='utf-8')
Path('docs/references/r4/r42-LeadDrawer-before.txt').write_text(s,encoding='utf-8')
s=s.replace("import Drawer from '../ui/Drawer';", "import Drawer from '../ui/Drawer';\nimport Modal from '../ui/Modal';\nimport Button from '../ui/Button';\nimport Badge from '../ui/Badge';\nimport './LeadDrawer.css';")
a=s.index('  useEffect(() => {\n    if (isOpen) {\n      refreshAiUsage();')
b=s.index('  const navTo',a)
s=s[:a]+"  const [activeSection, setActiveSection] = useState('resumo');\n\n"+s[b:]
s=s.replace("    setIntText('');\n    setSingleProgress", "    setActiveSection('resumo');\n    setIntText('');\n    setSingleProgress",1)
s=s.replace("      if ((e.ctrlKey", "      if (lightboxOpen || e.defaultPrevented || document.querySelector('.custom-select-content')) return;\n      if ((e.ctrlKey",1)
s=s.replace('<div style={{ display: \'flex\', alignItems: \'center\', gap: 10, flexWrap: \'wrap\' }}>\n      <span>{item ? (item.nome || \'Editar Lead\') : \'Novo Lead\'}</span>', '<span className="lead-drawer-title">\n      <span>{item ? \'Detalhes do lead\' : \'Novo Lead\'}</span>')
s=s.replace("style={{ padding: '2px 7px', fontSize: 11 }}", "aria-label=\"Lead anterior\"",1)
pos=s.index('title="Próximo lead')
a=s.index("style={{ padding: '2px 7px', fontSize: 11 }}",pos)
s=s[:a]+s[a:].replace("style={{ padding: '2px 7px', fontSize: 11 }}",'aria-label="Próximo lead"',1)
a=s.index('  const titleNode');b=s.index('  const footerNode',a)
part=s[a:b].replace('<div style={{ display:', '<span style={{ display:').replace('</div>','</span>')
s=s[:a]+part+s[b:]
a=s.index('  const footerNode');b=s.index('  return (\n    <Drawer',a)
part=s[a:b].replace('<button','<Button').replace('</button>','</Button>')
part=part.replace('className="btn btn-primary"','variant="primary"').replace('className="btn btn-secondary"','variant="secondary"')
s=s[:a]+part+s[b:]
s=s.replace("description={item ? 'Use ↑/↓ fora dos campos para navegar pela lista filtrada • Esc para fechar' : 'Preencha os dados do novo lead'}", "description={item ? 'Carteira comercial / Leads' : 'Cadastre uma nova oportunidade comercial'}")
s=s.replace('width={620}', '''width={760}
      className="lead-drawer"
      navigation={
        <nav className="lead-drawer-nav" aria-label="Seções do lead">
          {[["resumo", "01", "Resumo"], ["qualificacao", "02", "Qualificação"], ["historico", "03", "Histórico"]].map(([id, number, label]) => (
            <button type="button" key={id} id={`lead-nav-${id}`} aria-controls={`lead-panel-${id}`}
              aria-current={activeSection === id ? 'step' : undefined}
              onClick={() => setActiveSection(id)}>
              <span>{number}</span>{label}
            </button>
          ))}
        </nav>
      }''')
s=s.replace('<form id="lead-drawer-form" onSubmit={handleSave} style={{ display: \'flex\', flexDirection: \'column\', gap: 20 }}>', '''<div className="lead-drawer-identity">
        <span className="lead-drawer-avatar" aria-hidden="true">{(f.nome || 'Novo lead').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()}</span>
        <div><span className="lead-drawer-eyebrow">{item ? 'Oportunidade comercial' : 'Novo cadastro'}</span>
          <h3>{f.nome || 'Nome / Empresa'}</h3>
          <p>{[f.nicho, f.cidade].filter(Boolean).join(' • ') || 'Complete os dados abaixo'}</p>
        </div>
        <Badge status={f.status} />
      </div>
      <form id="lead-drawer-form" onSubmit={handleSave}>''')
# Move existing observations to summary, message composer to history, without altering handlers.
a=s.index('          {/* Observações */}');b=s.index('          {/* T4.3:',a)
notes=s[a:b];s=s[:a]+s[b:]
a=s.index('          {/* T4.3:');b=s.index('\n        </div>\n\n        {/* ─── SEÇÃO 3',a)
message=s[a:b];s=s[:a]+s[b:]
s=s.replace("<div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>", '<section className="lead-drawer-section" id="lead-panel-resumo" aria-labelledby="lead-nav-resumo" hidden={activeSection !== \'resumo\'}>',1)
s=s.replace('            1. Resumo','            Cadastro e contato',1)
a=s.index('        {/* ─── SEÇÃO 2')
b=s.rfind('        </div>',0,a)
s=s[:b]+'''          <div className="lead-drawer-card lead-drawer-notes">
'''+notes+'''          </div>
        </section>'''+s[b+len('        </div>'):]
s=s.replace("<div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>", '<section className="lead-drawer-section lead-drawer-card" id="lead-panel-qualificacao" aria-labelledby="lead-nav-qualificacao" hidden={activeSection !== \'qualificacao\'}>',1)
s=s.replace('                2. Qualificação','                Análise e presença digital',1)
a=s.index('        {/* ─── SEÇÃO 3');b=s.rfind('        </div>',0,a)
s=s[:b]+'        </section>'+s[b+len('        </div>'):]
s=s.replace("<div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>", '<section className="lead-drawer-section lead-drawer-card" id="lead-panel-historico" aria-labelledby="lead-nav-historico" hidden={activeSection !== \'historico\'}>',1)
s=s.replace('              3. Histórico de Interações','              Histórico de interações',1)
a=s.index('      </form>');b=s.rfind('        </div>',0,a)
s=s[:b]+message+'\n        </section>'+s[b+len('        </div>'):]
# Divide primary fields from complementary fields using existing DOM row boundaries.
a=s.index('          <div className="form-grid" style={{ gap: 10 }}>')
s=s[:a]+s[a:].replace('<div className="form-grid" style={{ gap: 10 }}>','<div className="form-grid lead-drawer-card">',1)
a=s.index('                <label className="form-label">Valor Estimado')
b=s.rfind('            <div className="form-grid form-grid-2">',0,a)
s=s[:b]+'''          </div>
          <details className="lead-drawer-card lead-drawer-details">
            <summary>Informações complementares <span>Valor, origem e acompanhamento</span></summary>
            <div className="form-grid">
'''+s[b:]
a=s.index('          <div className="lead-drawer-card lead-drawer-notes">')
s=s[:a]+s[a:].replace('          <div className="lead-drawer-card lead-drawer-notes">','          </details>\n          <div className="lead-drawer-card lead-drawer-notes">',1)
# Existing closing grid closes inner details div.
s=s.replace('              >\n                IA hoje:', '              >\n                IA hoje:',1)
a=s.index('                IA hoje:');b=s.index('              </span>',a)+len('              </span>')
s=s[:b]+'''\n              <Button size="sm" variant="ghost" onClick={refreshAiUsage} title="Consultar utilização atual de IA">Atualizar cota</Button>'''+s[b:]
s=s.replace("background: isPrequaling ? 'var(--bg2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',\n                    color: '#fff', border: 'none',", "background: 'var(--color-accent)',\n                    color: 'var(--on-accent)', border: 'none',")
s=s.replace("style={{ background: 'var(--green)', borderColor: 'var(--green)', color: '#fff' }}", "style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--on-accent)' }}")
s=s.replace("background: '#25D366',\n                      borderColor: '#25D366',\n                      color: '#fff',", "background: 'var(--color-accent)',\n                      borderColor: 'var(--color-accent)',\n                      color: 'var(--on-accent)',")
s=s.replace("color: '#25D366'", "color: 'var(--green)'")
s=s.replace('key={chip.id}\n                    type="button"','key={chip.id}\n                    aria-pressed={active}\n                    type="button"')
s=s.replace("onClick={() => setF(p => ({ ...p, botBarreira: !p.botBarreira }))}", "aria-pressed={f.botBarreira}\n                onClick={() => setF(p => ({ ...p, botBarreira: !p.botBarreira }))}")
s=s.replace('<div\n                className="prequal-screenshot-wrap"','<button\n                type="button"\n                aria-label="Amplier le screenshot"\n                className="prequal-screenshot-wrap"'.replace('Amplier le screenshot','Ampliar screenshot'))
s=s.replace('className="prequal-screenshot-img" />\n              </div>', 'className="prequal-screenshot-img" />\n              </button>')
s=s.replace("<div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>",'<div className="lead-drawer-timeline">')
s=s.replace("{(f.interacoes || []).map((int, i) => (", "{(f.interacoes || []).map((int, i) => ({ int, i })).sort((a, b) => (Date.parse(b.int.data || b.int.criadoEm) || 0) - (Date.parse(a.int.data || a.int.criadoEm) || 0)).map(({ int, i }) => (")
s=s.replace('<div key={i} style={{ fontSize:', '<div className="lead-drawer-event" key={i} style={{ fontSize:')
s=s.replace("{(int.data || int.criadoEm || '').split('T')[0].split('-').reverse().join('/')}","{(int.data || int.criadoEm || '').split('T')[0].split('-').reverse().join('/')}\n                    <small>{(int.data || int.criadoEm || '').includes('T') ? new Date(int.data || int.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</small>")
s=s.replace('className="row-btn del"', 'className="row-btn del"\n                    aria-label="Remover interação"')
# Labels for current inputs. Select uses its own ariaLabel contract.
import re
for field,label in [('nome','Nome / Empresa'),('telefone','Telefone / WhatsApp'),('cidade','Cidade / Localização'),('lote','Lote'),('site','Site / Instagram'),('email','E-mail'),('valorEstimado','Valor Estimado (R$)'),('ultimoContato','Último Contato'),('proximoContato','Próximo Contato'),('observacoes','Observações de Qualificação')]:
    s=s.replace('value={f.'+field+'}', 'aria-label="'+label+'" value={f.'+field+'}')
for field,label in [('status','Status'),('nicho','Nicho'),('origem','Origem do Lead')]:
    s=s.replace('value={f.'+field+'}', 'ariaLabel="'+label+'" value={f.'+field+'}')
# Port existing lightbox content via shared R1 modal, outside transformed/clipped drawer panel.
s=s.replace('''        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-split-left">''','''        <Modal isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} title="Screenshot do site" description={item?.nome || 'Lead'} className="lead-lightbox" size="lg">
          <div className="lead-lightbox-layout">
          <div className="lightbox-split-left">''')
s=s.replace('''        </div>
      )}
    </Drawer>''','''          </div>
        </Modal>
      )}
    </Drawer>''')
p.write_text(s,encoding='utf-8')
p=Path('src/components/ui/Drawer.jsx');s=p.read_text(encoding='utf-8').replace('  footer,','  footer,\n  navigation,').replace('            {/* Content Body */}', '            {navigation}\n\n            {/* Content Body */}').replace("                flex: 1,\n                overflowY", "                flex: 1,\n                minHeight: 0,\n                overflowY")
p.write_text(s,encoding='utf-8')
