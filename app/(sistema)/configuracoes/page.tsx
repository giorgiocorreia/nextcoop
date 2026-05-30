import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracoesForm from './ConfiguracoesForm'
import type { Organizacao, PerfilCaptacao, Usuario } from '@/types/database'

export const metadata = { title: 'Configurações — NextCoop' }

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/login')

  const isSuperAdmin = usuario.role === 'super_admin'

  // super_admin pode não ter org; outros usuários sem org vão para o dashboard
  if (!usuario.organizacao_id && !isSuperAdmin) redirect('/dashboard')

  let org: Organizacao | null = null
  let perfilCaptacao: PerfilCaptacao | null = null

  if (usuario.organizacao_id) {
    const [orgRes, perfilRes] = await Promise.all([
      supabase.from('organizacoes').select('*').eq('id', usuario.organizacao_id).single(),
      supabase.from('perfil_captacao').select('*').eq('organizacao_id', usuario.organizacao_id).maybeSingle(),
    ])
    org = orgRes.data ?? null
    perfilCaptacao = perfilRes.data ?? null
  }

  return (
    <ConfiguracoesForm
      org={org}
      isSuperAdmin={isSuperAdmin}
      perfilCaptacao={perfilCaptacao}
      usuario={usuario as Usuario}
    />
  )
}
