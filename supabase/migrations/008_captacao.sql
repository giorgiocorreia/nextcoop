-- ============================================================
-- NextCoop — Módulo de Captação de Recursos
-- ============================================================

-- Tabela principal de oportunidades
create table oportunidades (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid references organizacoes(id) on delete cascade not null,
  titulo           text not null,
  financiador      text not null,
  fonte            text not null,
  -- 'internacional' | 'nacional' | 'manual'
  fonte_detalhe    text,
  -- ex: 'GIZ', 'NORAD', 'CAR', 'BNDES'
  fonte_url        text,
  area_tematica    text[],
  valor_estimado   numeric(15,2),
  valor_captado    numeric(15,2),
  moeda            text default 'BRL',
  status           text not null default 'identificado',
  -- 'identificado'|'contatado'|'proposta'|'aguardando'|'aprovado'|'reprovado'|'arquivado'
  prazo_submissao  date,
  prazo_resultado  date,
  responsavel_id   uuid references usuarios(id),
  observacoes      text,
  documentos       jsonb default '[]',
  criado_por       uuid references usuarios(id),
  criado_em        timestamptz default now(),
  atualizado_em    timestamptz default now()
);

-- Log imutável de movimentações
create table oportunidade_logs (
  id               uuid primary key default gen_random_uuid(),
  oportunidade_id  uuid references oportunidades(id) on delete cascade,
  usuario_id       uuid references usuarios(id),
  acao             text not null,
  -- 'criado'|'movido'|'editado'|'comentario'
  status_anterior  text,
  status_novo      text,
  descricao        text,
  criado_em        timestamptz default now()
);

-- Perfil de captação da organização
create table perfil_captacao (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid references organizacoes(id) on delete cascade unique,
  areas_tematicas  text[] default '{}',
  publicos_alvo    text[] default '{}',
  abrangencia      text[] default '{}',
  porte_min        numeric(15,2),
  porte_max        numeric(15,2),
  idiomas          text[] default '{pt}',
  ativo            boolean default true,
  criado_em        timestamptz default now(),
  atualizado_em    timestamptz default now()
);

-- RLS
alter table oportunidades enable row level security;
alter table oportunidade_logs enable row level security;
alter table perfil_captacao enable row level security;

create policy "oportunidades_org" on oportunidades
  using (organizacao_id = (
    select organizacao_id from usuarios where id = auth.uid()
  ));

create policy "logs_org" on oportunidade_logs
  using (oportunidade_id in (
    select id from oportunidades where organizacao_id = (
      select organizacao_id from usuarios where id = auth.uid()
    )
  ));

create policy "perfil_captacao_org" on perfil_captacao
  using (organizacao_id = (
    select organizacao_id from usuarios where id = auth.uid()
  ));

-- Índices
create index idx_oportunidades_org_status
  on oportunidades(organizacao_id, status);
create index idx_oportunidades_prazo
  on oportunidades(prazo_submissao)
  where status not in ('aprovado','reprovado','arquivado');

-- Trigger para atualizado_em
create or replace function update_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger oportunidades_atualizado_em
  before update on oportunidades
  for each row execute function update_atualizado_em();
