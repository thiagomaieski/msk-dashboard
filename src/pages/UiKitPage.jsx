import { useState } from 'react';
import { useDash } from '../store/useStore';
import {
  Icon,
  Button,
  Badge,
  StatusChip,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Drawer,
  Modal,
  EmptyState,
  Skeleton,
  Kbd,
  CopyButton,
  PageHeader,
} from '../components/ui';

export default function UiKitPage() {
  const theme = useDash(s => s.theme);
  const toggleTheme = useDash(s => s.toggleTheme);
  const toast = useDash(s => s.toast);
  const showConfirm = useDash(s => s.showConfirm);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('Valor inicial');
  const [selectValue, setSelectValue] = useState('Opção 1');
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <div className="ui-kit-page">
      <PageHeader
        title="Fundação visual"
        count="14 Primitivos"
        subtitle="Maieski · Urbanist, superfícies de vidro e controles compartilhados"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              onClick={toggleTheme}
              icon={<Icon name={theme === 'light' ? 'moon' : 'sun'} />}
            >
              Tema: {theme === 'light' ? 'Claro' : 'Escuro'}
            </Button>
            <Button
              variant="primary"
              onClick={() => toast('Notificação de demonstração.', 'success')}
              icon={<Icon name="check" />}
            >
              Testar Toast
            </Button>
          </div>
        }
      />

      <div className="ui-kit-grid">
        <Card>
          <CardTitle>Vidro e luz</CardTitle>
          <CardDescription>Superfície translúcida, borda iluminada e sombra suave.</CardDescription>
          <div className="ui-kit-tile">
            <strong>Urbanist 600</strong>
            <span>Texto 500 · Detalhes 400 · Ênfase 700</span>
          </div>
        </Card>
        <Card style={{ background: 'var(--accent-bg)' }}>
          <CardTitle>Paleta de apoio</CardTitle>
          <div className="ui-kit-row">
            {[['Lima', '--color-accent'], ['Azul', '--color-blue'], ['Coral', '--color-coral']].map(([name, token]) => (
              <div key={token} style={{ flex: 1 }}>
                <div style={{ height: 44, borderRadius: 14, background: `var(${token})` }} />
                <span>{name}</span>
              </div>
            ))}
          </div>
          <CardDescription>Cores de texto semânticas adaptadas ao contraste de cada tema.</CardDescription>
        </Card>
      </div>
      {/* ── BUTTONS ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Button</CardTitle>
            <CardDescription>4 variantes (primary, secondary, ghost, danger) e 2 tamanhos (sm, md)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Button variant="primary" size="md">Primary MD</Button>
            <Button variant="secondary" size="md">Secondary MD</Button>
            <Button variant="ghost" size="md">Ghost MD</Button>
            <Button variant="danger" size="md">Danger MD</Button>
            <Button variant="primary" size="sm">Primary SM</Button>
            <Button variant="secondary" size="sm">Secondary SM</Button>
            <Button variant="danger" size="sm">Danger SM</Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 10 }}>
            <Button
              variant="primary"
              icon={<Icon name="plus" />}
              loading={loadingBtn}
              onClick={() => {
                setLoadingBtn(true);
                setTimeout(() => setLoadingBtn(false), 1200);
              }}
            >
              Clique para Loading
            </Button>
            <Button variant="secondary" icon={<Icon name="filter" />}>Com Ícone</Button>
            <Button variant="secondary" icon={<Icon name="settings" />} ariaLabel="Configurações" />
            <Button variant="ghost" icon={<Icon name="trash" />} ariaLabel="Excluir" />
            <Button variant="secondary" disabled>Desabilitado</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── BADGES & STATUS CHIPS ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Badge & StatusChip</CardTitle>
            <CardDescription>Ponto colorido + rótulo com cores preservadas dos status de CRM, Finanças e Sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <StatusChip status="Novo" />
            <StatusChip status="Abordado" />
            <StatusChip status="Em negociação" />
            <StatusChip status="Follow-up" />
            <StatusChip status="Fechado" />
            <StatusChip status="Perdido" />
            <StatusChip status="Ativo" />
            <StatusChip status="Inativo" />
            <StatusChip status="Pago" />
            <StatusChip status="Pendente" />
            <StatusChip status="Em andamento" />
            <StatusChip status="Concluído" />
            <StatusChip status="Receita" />
            <StatusChip status="Despesa" />
            <StatusChip status="online" />
            <StatusChip status="offline" />
          </div>

          <div className="ui-kit-row" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Variante Clicável (Avanço):</span>
            <StatusChip
              status="Abordado"
              clickable
              onClick={() => toast('Status avançado!', 'info')}
            />
            <Badge variant="success" size="sm">Pequeno (SM)</Badge>
            <Badge variant="warning" dot={false}>Sem Ponto</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── INPUTS & SELECTS ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Input & Select</CardTitle>
            <CardDescription>Campos de 44px, erro, seleção controlada e foco visível</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="ui-kit-grid">
            <Input
              label="Nome do Lead"
              name="demo-lead"
              placeholder="Ex: Dra. Mariana Costa"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              icon={<Icon name="user" />}
              required
            />
            <Input
              label="Campo com Erro"
              name="demo-email"
              placeholder="Digite o e-mail"
              defaultValue="email-invalido"
              error="Informe um e-mail válido com @"
              icon={<Icon name="alert-circle" />}
            />
            <Input label="Campo desabilitado" name="demo-disabled" disabled defaultValue="Somente demonstração" />
            <Select
              label="Categoria"
              value={selectValue}
              onChange={e => setSelectValue(e.target.value)}
              options={['Opção 1', 'Opção 2', 'Opção 3']}
              helperText="Selecione a categoria correspondente"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── TABLE ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Table</CardTitle>
            <CardDescription>Células com padding de 12px, seleção, hover e números tabulares</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead sortable sorted onSort={() => {}}>Cliente / Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chave Pix / CNPJ</TableHead>
                <TableHead style={{ textAlign: 'right' }}>Valor Mensal</TableHead>
                <TableHead style={{ textAlign: 'center' }}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Dr. Roberto Souza — Clínica Odonto</TableCell>
                <TableCell><StatusChip status="Ativo" size="sm" /></TableCell>
                <TableCell mono>12.345.678/0001-90</TableCell>
                <TableCell align="right" mono>R$ 1.500,00</TableCell>
                <TableCell align="center">
                  <CopyButton text="12.345.678/0001-90" label="Copiar CNPJ" />
                </TableCell>
              </TableRow>
              <TableRow active>
                <TableCell>Advocacia Martins & Associados</TableCell>
                <TableCell><StatusChip status="Pendente" size="sm" /></TableCell>
                <TableCell mono>98.765.432/0001-10</TableCell>
                <TableCell align="right" mono>R$ 2.400,00</TableCell>
                <TableCell align="center">
                  <CopyButton text="98.765.432/0001-10" label="Copiar CNPJ" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── KBD, COPY BUTTON, SKELETON ── */}
      <div className="ui-kit-grid">
        <Card>
          <CardHeader>
            <CardTitle>Kbd & CopyButton</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="ui-kit-row" style={{ fontSize: 13, color: 'var(--text2)' }}>
              <span>Atalhos:</span>
              <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> para busca rápida, <Kbd>Ctrl</Kbd> + <Kbd>B</Kbd> para sidebar, <Kbd>Esc</Kbd> para fechar.
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CopyButton text="maieski@design.com" label="Copiar E-mail" showToast />
              <CopyButton text="00.000.000/0001-00" label="Copiar CNPJ" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skeleton</CardTitle>
            <CardDescription>Carregamento suave com shimmer</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton variant="circle" width={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton variant="line" width="60%" height={14} />
                <Skeleton variant="line" width="90%" height={12} />
              </div>
            </div>
            <Skeleton variant="block" height={44} style={{ marginTop: 8 }} />
          </CardContent>
        </Card>
      </div>

      {/* ── LAYERS: DRAWER, MODAL, EMPTY STATE ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Camadas & Estados (Drawer, Modal, EmptyState)</CardTitle>
            <CardDescription>Camadas com controle de z-index, fechamento por Esc e click fora</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)} icon={<Icon name="layout" />}>
              Abrir Drawer (460px)
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)} icon={<Icon name="grid" />}>
              Abrir Modal (560px)
            </Button>
            <Button onClick={async () => { if (await showConfirm('Confirmar demonstração?', 'Nenhum dado será alterado.', false)) toast('Demonstração confirmada.', 'info'); }}>Testar confirmação</Button>
          </div>

          <div style={{ marginTop: 16, border: '1px dashed var(--border)', borderRadius: 'var(--r-md, 8px)' }}>
            <EmptyState
              title="Nenhum lead encontrado"
              description="Você não possui nenhum lead na etapa selecionada. Adicione novos contatos para iniciar prospecção."
              action={
                <Button variant="primary" size="sm" icon={<Icon name="plus" />}>
                  Adicionar Lead
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Drawer Instance */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalhes do Lead"
        description="Ficha completa de qualificação e histórico de interações"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast('Lead atualizado com sucesso!', 'success'); }}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <Input label="Nome da Empresa" defaultValue="Studio Criativo Ltda" />
        <Input label="Telefone" defaultValue="(11) 98765-4321" />
        <Select label="Status Atual" value="Em negociação" options={['Novo', 'Abordado', 'Em negociação', 'Fechado']} />
      </Drawer>

      {/* Modal Instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirmar Ação"
        description="Esta é uma janela modal padrão para formulários rápidos ou confirmações"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Fechar</Button>
            <Button variant="primary" onClick={() => { setModalOpen(false); toast('Ação confirmada!', 'success'); }}>
              Confirmar
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
          O design system foi estruturado com tokens semânticos, foco visível, curvas de animação e compatibilidade completa com os modos claro e escuro.
        </p>
      </Modal>
    </div>
  );
}
