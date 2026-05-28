import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgDetalhe from './OrgDetalhe'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Organização — Admin — NextCoop' }
}

export default async function OrgDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!org) redirect('/admin')

  const [
    { data: usuarios },
    { count: totalCooperados },
    { count: totalMensalidades },
    { count: totalDocumentos },
  ] = await Promise.all([
    supabase.from('usuarios').select('*').eq('organizacao_id', params.id).order('nome_completo'),
    supabase.from('cooperados').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
    supabase.from('mensalidades').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
    supabase.from('documentos').select('*', { count: 'exact', head: true }).eq('organizacao_id', params.id),
  ])

  return (
    <OrgDetalhe
      org={org}
      usuarios={usuarios ?? []}
      totalCooperados={totalCooperados ?? 0}
      totalMensalidades={totalMensalidades ?? 0}
      totalDocumentos={totalDocumentos ?? 0}
    />
  )
}
