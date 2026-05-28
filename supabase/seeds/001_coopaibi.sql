-- =============================================================================
-- Seed: Organização COOPAIBI + usuário admin
-- =============================================================================
-- ATENÇÃO: execute após criar o usuário admin no Supabase Auth Dashboard
-- e substitua o UUID abaixo pelo ID real gerado.
--
-- Passos:
--  1. No Supabase Dashboard → Authentication → Users → "Add user"
--     Email: admin@coopaibi.coop.br   Senha: (defina uma senha forte)
--  2. Copie o UUID gerado e substitua em :admin_auth_id abaixo
--  3. Execute este script no SQL Editor do Supabase
-- =============================================================================

do $$
declare
  org_id       uuid := '3ad97dc2-f87f-4e67-950e-387854d5bccc';  -- aplicado em 2026-05-28
  admin_auth_id uuid := '22543201-bc5e-476c-9fdb-59242c25224a'; -- contato@coopaibi.com.br
begin

  -- Organização
  insert into organizacoes (
    id, nome, nome_curto, cnpj, tipo,
    email, telefone, cidade, estado,
    plano, ativo
  ) values (
    org_id,
    'Cooperativa Agroindustrial de Ibitiara — COOPAIBI',
    'COOPAIBI',
    null,               -- preencha quando tiver o CNPJ
    'cooperativa',
    'contato@coopaibi.coop.br',
    null,
    'Ibitiara',
    'BA',
    'cooperativa',
    true
  )
  on conflict do nothing;

  -- Vincula o usuário admin à organização
  -- (o trigger handle_new_user já criou a linha básica na tabela usuarios)
  update usuarios
  set
    organizacao_id = org_id,
    nome_completo  = 'Administrador COOPAIBI',
    role           = 'org_admin',
    ativo          = true
  where id = admin_auth_id;

  raise notice 'Seed COOPAIBI concluído. org_id = %', org_id;
end;
$$;
