import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function SistemaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('usuario:', JSON.stringify(usuario))

  let organizacao = null
  if (usuario?.organizacao_id) {
    const { data: org } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('id', usuario.organizacao_id)
      .single()
    organizacao = org
    console.log('organizacao:', JSON.stringify(organizacao))
  } else {
    console.log('organizacao_id nulo — usuario nao tem org vinculada')
  }

  const usuarioComOrg = usuario ? { ...usuario, organizacao } : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f4' }}>
      <Sidebar usuario={usuarioComOrg} />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '2rem',
        minHeight: '100vh',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}