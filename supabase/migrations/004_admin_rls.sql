-- =============================================================================
-- NextCoop — Admin RLS: bypass policies para super_admin
-- =============================================================================
-- Execute no Supabase Dashboard → SQL Editor
-- Autocontido: não depende de auth_org_id() nem de outras funções externas.
-- Usa subquery direta em `usuarios` para verificar role = 'super_admin'.
-- =============================================================================

-- organizacoes: super_admin vê e gerencia todas
create policy "super_admin_organizacoes" on organizacoes
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- usuarios: super_admin vê e gerencia todos
-- (usa alias para evitar recursão na policy da tabela usuarios)
create policy "super_admin_usuarios" on usuarios
  for all
  using (
    exists (
      select 1 from usuarios u2
      where u2.id = auth.uid()
        and u2.role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios u2
      where u2.id = auth.uid()
        and u2.role = 'super_admin'
    )
  );

-- cooperados: super_admin vê todos
create policy "super_admin_cooperados" on cooperados
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- lancamentos: super_admin vê todos
create policy "super_admin_lancamentos" on lancamentos
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- assembleias: super_admin vê todas
create policy "super_admin_assembleias" on assembleias
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- documentos: super_admin vê todos
create policy "super_admin_documentos" on documentos
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );

-- mensalidades: super_admin vê todas
create policy "super_admin_mensalidades" on mensalidades
  for all
  using (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from usuarios
      where id = auth.uid()
        and role = 'super_admin'
    )
  );
