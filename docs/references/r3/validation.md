# Reprodução local R3.1

1. Na raiz react-app, executar `npm run dev -- --host 127.0.0.1 --port 5174`.
2. No Playwright MCP, antes de navegar, aplicar bloqueio de rede:

```js
await page.route('**/*', route => {
  const u = new URL(route.request().url());
  return u.hostname === '127.0.0.1' && !u.pathname.includes('api-storage')
    ? route.continue() : route.abort();
});
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:5174/docs/references/r3/dashboard.html');
await page.locator('.dashboard-operation').first().waitFor();
await page.evaluate(() => document.fonts.ready);
```

3. Usar `?baseline` para a versão anterior, `?empty` para dados vazios. A fixture expõe `window.r3Store` e dados locais em `window.r3Data`. Não usar a aplicação autenticada de produção.
4. Comparar textos de `.modern-kpi-card`, `.segmented-metric-container`, `.dash-bento-donut`, `.dash-bento-projetos` e os cinco indicadores operacionais. Na baseline, clicar primeiro em Expandir gráficos e KPIs.
5. Testar os dois temas pelo botão original ou `window.r3Store.getState().toggleTheme()`, que a fixture protege de gravação remota. Esperar estabilização antes da captura. Repetir 1440x900, 1280x800, 1024x768 e 390x844.
6. Alternar gráficos, passar o mouse sobre área/donut/barras, conferir tooltips, alternar Lista/Calendário, navegar mês e Hoje. Abrir Adicionar Tarefa e conferir o campo date. Fechar sem salvar.
7. Clicar no label do checkbox da tarefa, conferir estado e `window.r3Calls`, depois desfazer. O handler local simula somente a conclusão em memória.
8. Abrir Novo, Editar e Nota. Conferir os atalhos por activePage e URL. Retornar via ação `goTo('dashboard')`, sem recarregar URL canônica, pois isso sairia da fixture.
9. Para loading, `window.r3Store.setState({appReady:false})`; depois restaurar true. Para conexão, disparar eventos offline/online. Não simula disponibilidade de backend.
10. Screenshots fullPage e resultados ficam nesta pasta. Logs JSON exportados pelo browser_evaluate podem conter a representação textual da ferramenta.

Nenhum teste deve salvar formulários, excluir dados ou executar pagamentos. As cópias históricas com eslint-disable são apenas artefatos de comparação, não importadas pelo build de produção.
