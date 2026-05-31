'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, isSuperAdmin } from '@/lib/permissoes'
import type { TipoOrganizacao } from '@/types/database'

export interface SalvarOrgInput {
  email: string
  telefone: string
  site: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  nome: string
  nome_curto: string
  tipo: TipoOrganizacao
  cnpj: string
  data_fundacao: string
  registro_juceb: string
}

export async function salvarOrganizacao(input: SalvarOrgInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: usuarioAtual } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuarioAtual) return { error: 'Usuário não encontrado.' }
  if (!isAdmin(usuarioAtual) && !isSuperAdmin(usuarioAtual)) return { error: 'Sem permissão.' }
  if (!usuarioAtual.organizacao_id) return { error: 'Organização não encontrada.' }

  const n = (s: string) => s.trim() || null

  const payload: Record<string, unknown> = {
    email:       n(input.email),
    telefone:    n(input.telefone),
    site:        n(input.site),
    cep:         input.cep.replace(/\D/g, '') || null,
    logradouro:  n(input.logradouro),
    numero:      n(input.numero),
    complemento: n(input.complemento),
    bairro:      n(input.bairro),
  }

  // cidade e estado têm NOT NULL — só atualiza se não estiverem vazios
  if (input.cidade.trim()) payload.cidade = input.cidade.trim()
  if (input.estado)        payload.estado = input.estado

  if (isSuperAdmin(usuarioAtual)) {
    payload.nome         = input.nome.trim()
    payload.nome_curto   = n(input.nome_curto)
    payload.tipo         = input.tipo
    payload.cnpj         = input.cnpj.replace(/\D/g, '') || null
    payload.data_fundacao  = input.data_fundacao || null
    payload.registro_juceb = n(input.registro_juceb)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizacoes')
    .update(payload)
    .eq('id', usuarioAtual.organizacao_id)

  if (error) return { error: error.message }
  return {}
}
