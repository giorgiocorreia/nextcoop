-- =============================================================================
-- Storage: políticas RLS para o bucket "documentos"
-- =============================================================================
-- Execute no Supabase Dashboard → SQL Editor
-- (ou via: npx supabase db push, após supabase login)
-- =============================================================================

-- Upload: usuário autenticado sobe arquivos apenas na pasta da sua org
create policy "documentos_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

-- Leitura: usuário autenticado lê arquivos da sua org
-- (documentos restritos: apenas org_admin/super_admin)
create policy "documentos_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

-- Substituição: usuário autenticado pode fazer upsert (nova versão)
create policy "documentos_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
  );

-- Exclusão: apenas org_admin e super_admin
create policy "documentos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select organizacao_id::text from usuarios where id = auth.uid()
    )
    and (
      select role from usuarios where id = auth.uid()
    ) in ('org_admin', 'super_admin')
  );
