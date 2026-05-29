import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracoesForm from './ConfiguracoesForm'

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

  if (!usuario?.organizacao_id) redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('*')
    .eq('id', usuario.organizacao_id)
    .single()

  if (!org) redirect('/dashboard')

  const isSuperAdmin = usuario.role === 'super_admin'

  return <ConfiguracoesForm org={org} isSuperAdmin={isSuperAdmin} />
}