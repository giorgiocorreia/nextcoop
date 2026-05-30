'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Oportunidade, OportunidadeLog, PerfilCaptacao, StatusOportunidade, FonteOportunidade } from '@/types/database'

export type OportunidadeLogComUsuario = OportunidadeLog & {
  usuario: { nome_completo: string } | null
}

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usuario?.organizacao_id) throw new Error('Usuário sem organização')
  return { supabase, usuarioId: user.id, orgId: usuario.organizacao_id as string }
}

export async function listarOportunidades(filtro?: { status?: string; fonte?: string }) {
  try {
    const { supabase } = await getCtx()
    let query = supabase
      .from('oportunidades')
      .select('*')
      .neq('status', 'arquivado' as StatusOportunidade)
      .order('prazo_submissao', { ascending: true, nullsFirst: false })

    if (filtro?.status) query = query.eq('status', filtro.status as StatusOportunidade)
    if (filtro?.fonte)  query = query.eq('fonte',  filtro.fonte  as FonteOportunidade)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { data: data as Oportunidade[] }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function criarOportunidade(dados: Partial<Oportunidade>) {
  try {
    const { supabase, usuarioId, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('oportunidades')
      .insert({ ...dados, organizacao_id: orgId, criado_por: usuarioId })
      .select()
      .single()
    if (error) return { error: error.message }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: data.id,
      usuario_id: usuarioId,
      acao: 'criado',
      status_novo: (dados.status ?? 'identificado') as string,
      descricao: `Oportunidade criada: ${data.titulo}`,
    })

    revalidatePath('/captacao')
    return { data: data as Oportunidade }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function moverOportunidade(id: string, novoStatus: string) {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { data: atual } = await supabase
      .from('oportunidades')
      .select('status, titulo')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('oportunidades')
      .update({ status: novoStatus as StatusOportunidade })
      .eq('id', id)
    if (error) return { error: error.message }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: id,
      usuario_id: usuarioId,
      acao: 'movido',
      status_anterior: (atual?.status ?? null) as string | null,
      status_novo: novoStatus,
      descricao: `Movido de "${atual?.status}" para "${novoStatus}"`,
    })

    revalidatePath('/captacao')
    return { ok: true }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function atualizarOportunidade(id: string, dados: Partial<Oportunidade>) {
  try {
    const { supabase, usuarioId } = await getCtx()
    const { data, error } = await supabase
      .from('oportunidades')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }

    await supabase.from('oportunidade_logs').insert({
      oportunidade_id: id,
      usuario_id: usuarioId,
      acao: 'editado',
      descricao: 'Dados da oportunidade atualizados',
    })

    revalidatePath('/captacao')
    return { data: data as Oportunidade }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function buscarOportunidade(id: string) {
  try {
    const { supabase } = await getCtx()
    const [{ data: oportunidade, error }, { data: logsRaw }] = await Promise.all([
      supabase.from('oportunidades').select('*').eq('id', id).single(),
      supabase
        .from('oportunidade_logs')
        .select('*')
        .eq('oportunidade_id', id)
        .order('criado_em', { ascending: false }),
    ])
    if (error) return { error: error.message }

    // Busca nomes dos usuários separadamente (join não inferido pelo tipo Database)
    const userIds = [...new Set(
      (logsRaw ?? []).map(l => l.usuario_id).filter((v): v is string => v != null)
    )]
    const { data: usuariosLogs } = userIds.length > 0
      ? await supabase.from('usuarios').select('id, nome_completo').in('id', userIds)
      : { data: [] as { id: string; nome_completo: string }[] }

    const userMap = Object.fromEntries((usuariosLogs ?? []).map(u => [u.id, u.nome_completo]))
    const logs: OportunidadeLogComUsuario[] = (logsRaw ?? []).map(l => ({
      ...(l as OportunidadeLog),
      usuario: l.usuario_id ? { nome_completo: userMap[l.usuario_id] ?? 'Usuário' } : null,
    }))

    return { data: { oportunidade: oportunidade as Oportunidade, logs } }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function salvarPerfilCaptacao(dados: Partial<PerfilCaptacao>) {
  try {
    const { supabase, orgId } = await getCtx()
    const { data, error } = await supabase
      .from('perfil_captacao')
      .upsert({ ...dados, organizacao_id: orgId }, { onConflict: 'organizacao_id' })
      .select()
      .single()
    if (error) return { error: error.message }
    revalidatePath('/captacao')
    return { data: data as PerfilCaptacao }
  } catch (e) {
    return { error: String(e) }
  }
}
