-- ============================================================
-- NextCoop — Corrige RLS do radar (adiciona with check)
-- As políticas originais usavam apenas "using", bloqueando
-- INSERT e UPDATE silenciosamente via session client.
-- ============================================================

-- radar_fontes
drop policy if exists "radar_fontes_org" on radar_fontes;
create policy "radar_fontes_org" on radar_fontes
  for all
  using (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));

-- radar_resultados
drop policy if exists "radar_resultados_org" on radar_resultados;
create policy "radar_resultados_org" on radar_resultados
  for all
  using (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (organizacao_id = (select organizacao_id from usuarios where id = auth.uid()));
