import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { FonteOportunidade, StatusOportunidade } from '@/types/database'

const FONTES = [
  {
    nome: 'CAR/Bahia',
    url:  'https://www.ba.gov.br/car/editais',
    tipo: 'nacional' as FonteOportunidade,
  },
  {
    nome: 'GIZ Brasil',
    url:  'https://www.giz.de/en/brasil-portugues/tenders.html',
    tipo: 'internacional' as FonteOportunidade,
  },
]

const TERMOS_ICT = [
  'exclusivo para icts',
  'instituições científicas',
  'ict pública',
  'ict privada',
  'finep',
  'fndct',
  'instituições de pesquisa',
]

function contemTermosICT(texto: string): boolean {
  const lower = texto.toLowerCase()
  return TERMOS_ICT.some(termo => lower.includes(termo))
}

interface EditalExtraido {
  titulo:          string
  fonte:           string
  prazo_inscricao: string | null
  valor_estimado:  number | null
  url_original:    string | null
  resumo:          string | null
}

export interface ResultadoRadar {
  inseridos: number
  pulados:   number
  erros:     string[]
}

export async function executarRadar(orgId: string): Promise<ResultadoRadar> {
  const admin     = createAdminClient()
  const resultado: ResultadoRadar = { inseridos: 0, pulados: 0, erros: [] }
  const hoje      = new Date().toISOString().split('T')[0]

  // Busca tipo da org para aplicar pré-filtro ICT
  const { data: org } = await admin
    .from('organizacoes')
    .select('tipo')
    .eq('id', orgId)
    .single()

  const isCooperativa = org?.tipo === 'cooperativa'

  for (const fonte of FONTES) {
    // Fetch via Jina.ai
    let conteudo = ''
    try {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(fonte.url)}`
      const res = await fetch(jinaUrl)
      conteudo = (await res.text()).slice(0, 2500)
    } catch (err) {
      resultado.erros.push(`[${fonte.nome}] Jina fetch falhou: ${err}`)
      continue
    }

    if (!conteudo.trim()) {
      resultado.erros.push(`[${fonte.nome}] Conteúdo vazio`)
      continue
    }

    // Pré-filtro: cooperativas não se enquadram em editais exclusivos para ICTs
    if (isCooperativa && contemTermosICT(conteudo)) {
      resultado.pulados++
      continue
    }

    // Claude Haiku
    let editais: EditalExtraido[] = []
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role:    'user',
          content: `Analise o conteúdo abaixo e extraia editais e oportunidades de financiamento com prazo ainda aberto.

Hoje é ${hoje}. Ignore editais com prazo já vencido.

CONTEÚDO:
${conteudo}

Retorne SOMENTE um JSON array válido, sem markdown, sem texto adicional:
[{"titulo":"string","fonte":"${fonte.nome}","prazo_inscricao":"YYYY-MM-DD ou null","valor_estimado":numero_ou_null,"url_original":"URL ou null","resumo":"1-2 frases"}]

Se não encontrar editais: []`,
        }],
      })

      const raw   = msg.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('\n')
      const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const match = clean.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed: unknown = JSON.parse(match[0])
        if (Array.isArray(parsed)) editais = parsed as EditalExtraido[]
      }
    } catch (err) {
      resultado.erros.push(`[${fonte.nome}] Claude falhou: ${err}`)
      continue
    }

    if (editais.length === 0) continue

    // Filtra vencidos e salva
    const inserts = editais
      .filter(e => !e.prazo_inscricao || e.prazo_inscricao >= hoje)
      .map(e => ({
        organizacao_id:  orgId,
        titulo:          e.titulo   ?? 'Sem título',
        financiador:     e.fonte    ?? fonte.nome,
        fonte:           fonte.tipo as FonteOportunidade,
        fonte_detalhe:   fonte.nome,
        fonte_url:       e.url_original   ?? null,
        area_tematica:   [] as string[],
        valor_estimado:  e.valor_estimado ?? null,
        moeda:           'BRL',
        status:          'identificado' as StatusOportunidade,
        prazo_submissao: e.prazo_inscricao ?? null,
        observacoes:     e.resumo ?? null,
        documentos:      {},
      }))

    if (inserts.length > 0) {
      const { error } = await admin.from('oportunidades').insert(inserts)
      if (error) {
        resultado.erros.push(`[${fonte.nome}] Insert falhou: ${error.message}`)
      } else {
        resultado.inseridos += inserts.length
      }
    }
  }

  return resultado
}
