from pathlib import Path
p=Path('src/components/modals/LeadDrawer.jsx');s=p.read_text(encoding='utf-8')
s=s.replace("  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));", """  const u = (k) => (e) => {
    // Radix can emit an empty native-select event during form initialization.
    // Status and niche have no empty option: keep their populated values.
    if ((k === 'status' || k === 'nicho') && e.target.value === '') return;
    setF(p => ({ ...p, [k]: e.target.value }));
  };""")
# Make settings links keyboard accessible.
s=s.replace('<span\n                    style={{ fontSize: 10', '<button type="button"\n                    className="lead-drawer-text-action"\n                    style={{ fontSize: 10',1).replace('                    Gerenciar →\n                  </span>', '                    Gerenciar →\n                  </button>',1)
s=s.replace('<span\n                  style={{ fontSize: 10, color: \'var(--text3)\', cursor:', '<button type="button" className="lead-drawer-text-action"\n                  style={{ fontSize: 10, color: \'var(--text3)\', cursor:',1).replace('                  Instruções da IA →\n                </span>', '                  Instruções da IA →\n                </button>',1)
p.write_text(s,encoding='utf-8')
