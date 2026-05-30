-- ============================================================
-- NextCoop — Funções operacionais de usuários (multi-role)
-- Separa vínculo com a org da função operacional no sistema.
-- O campo role é mantido para compatibilidade e para o super_admin.
-- ============================================================

-- Colunas novas na tabela usuarios
alter table usuarios add column if not exists funcoes text[] default '{}';
alter table usuarios add column if not exists vinculo text;

-- Migra dados existentes: role → funcoes + vinculo
update usuarios set
  funcoes = case role
    when 'org_admin'       then array['admin']
    when 'financeiro'      then array['financeiro']
    when 'tecnico'         then array['tecnico']
    when 'comercial'       then array['comercial']
    when 'conselho_fiscal' then array['conselho_fiscal']
    when 'cooperado'       then array[]::text[]
    when 'parceiro'        then array[]::text[]
    else array[]::text[]
  end,
  vinculo = case role
    when 'cooperado' then 'cooperado'
    when 'parceiro'  then 'externo'
    when 'org_admin' then 'diretoria'
    else 'funcionario'
  end
where role != 'super_admin';

-- Catálogo de funções disponíveis (organizacao_id null = padrão global)
create table if not exists funcoes_disponiveis (
  id             uuid primary key default gen_random_uuid(),
  organizacao_id uuid references organizacoes(id) on delete cascade,
  nome           text not null,
  label          text not null,
  descricao      text,
  modulo         text,
  is_padrao      boolean default false,
  criado_em      timestamptz default now()
);

insert into funcoes_disponiveis
  (nome, label, descricao, modulo, is_padrao, organizacao_id)
values
  ('admin',          'Administrador',        'Acesso total à organização',                   'sistema',    true, null),
  ('financeiro',     'Financeiro',           'Lançamentos, contas e relatórios financeiros', 'financeiro', true, null),
  ('tecnico',        'Técnico',              'Produção, cooperados e documentos técnicos',   'producao',   true, null),
  ('conselho_fiscal','Conselho fiscal',       'Leitura de financeiro e atas sem edição',     'sistema',    true, null),
  ('captador',       'Captador de recursos', 'Editais, kanban de captação e geração de MI',  'captacao',   true, null)
on conflict do nothing;

-- RLS: cada org vê só suas próprias funções + os padrões globais
alter table funcoes_disponiveis enable row level security;

create policy "funcoes_visivel" on funcoes_disponiveis
  using (
    organizacao_id is null
    or organizacao_id = (
      select organizacao_id from usuarios where id = auth.uid()
    )
  );
