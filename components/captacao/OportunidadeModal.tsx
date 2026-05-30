'use client'

import React, { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import type { Oportunidade, Usuario } from '@/types/database'
import type { OportunidadeLogComUsuario } from '@/lib/captacao/actions'
import { criarOportunidade, atualizarOportunidade } from '@/lib/captacao/actions'
import LogTimeline from './LogTimeline'

const AREAS_TEMATICAS = [
  'agrofloresta', 'cacau', 'café', 'pecuária', 'pesca', 'mel',
  'plantas medicinais', 'clima', 'cooperativismo',
  'agricultura familiar', 'biodiversidade', 'outro',
]

const STATUS_LABEL: Record<string, string> = {
  identificado: 'Identificado', contatado: 'Contatado', proposta: 'Proposta',
  aguardando: 'Aguardando', aprovado: 'Aprovado', reprovado: 'Reprovado', arquivado: 'Arquivado',
}

const FONTE_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  internacional: { label: 'Internacional', cor: '#185FA5', bg: '#E6F1FB' },
  nacional:      { label: 'Nacional',      cor: '#1D9E75', bg: '#E6F7F1' },
  manual:        { label: 'Manual',        cor: '#555',    bg: '#f5f5f2' },
}

type FonteOp = 'internacional' | 'nacional' | 'manual'

interface FormValues {
  titulo:          string
  financiador:     string
  fonte:           FonteOp
  fonte_detalhe:   string
  fonte_url:       string
  area_tematica:   string[]
  valor_estimado:  string
  moeda:           string
  prazo_submissao: string
  prazo_resultado: string
  responsavel_id:  string
  observacoes:     string
}

function formatData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatValor(v: number | null | undefined, moeda = 'BRL') {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: moeda })
}

interface Props {
  mode: 'create' | 'view' | 'edit'
  oportunidade?: Oportunidade
  logs?: OportunidadeLogComUsuario[]
  carregando?: boolean
  responsaveis: Pick<Usuario, 'id' | 'nome_completo'>[]
  onClose: () => void
  onSalvo: () => void
  onEditar?: () => void
}

export default function OportunidadeModal({
  mode, oportunidade, logs = [], carregando = false,
  responsaveis, onClose, onSalvo, onEditar,
}: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const defaultValues: FormValues = {
    titulo:          oportunidade?.titulo          ?? '',
    financiador:     oportunidade?.financiador     ?? '',
    fonte:           (oportunidade?.fonte          ?? 'nacional') as FonteOp,
    fonte_detalhe:   oportunidade?.fonte_detalhe   ?? '',
    fonte_url:       oportunidade?.fonte_url       ?? '',
    area_tematica:   oportunidade?.area_tematica   ?? [],
    valor_estimado:  oportunidade?.valor_estimado != null ? String(oportunidade.valor_estimado) : '',
    moeda:           oportunidade?.moeda           ?? 'BRL',
    prazo_submissao: oportunidade?.prazo_submissao ?? '',
    prazo_resultado: oportunidade?.prazo_resultado ?? '',
    responsavel_id:  oportunidade?.responsavel_id  ?? '',
    observacoes:     oportunidade?.observacoes     ?? '',
  }

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({ defaultValues })

  const areasTematicas = watch('area_tematica') ?? []

  function toggleArea(area: string) {
    if (areasTematicas.includes(area)) {
      setValue('area_tematica', areasTematicas.filter(a => a !== area))
    } else {
      setValue('area_tematica', [...areasTematicas, area])
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!values.titulo.trim())     { setError('titulo',     { message: 'Obrigatório' }); return }
    if (!values.financiador.trim()){ setError('financiador',{ message: 'Obrigatório' }); return }

    setSalvando(true)
    setErro('')

    const valorNum = values.valor_estimado ? parseFloat(values.valor_estimado) : null
    const dados: Partial<Oportunidade> = {
      titulo:          values.titulo,
      financiador:     values.financiador,
      fonte:           values.fonte,
      fonte_detalhe:   values.fonte_detalhe   || null,
      fonte_url:       values.fonte_url       || null,
      area_tematica:   values.area_tematica,
      valor_estimado:  valorNum != null && !isNaN(valorNum) ? valorNum : null,
      moeda:           values.moeda,
      prazo_submissao: values.prazo_submissao || null,
      prazo_resultado: values.prazo_resultado || null,
      responsavel_id:  values.responsavel_id  || null,
      observacoes:     values.observacoes     || null,
    }

    const res = mode === 'create'
      ? await criarOportunidade(dados)
      : await atualizarOportunidade(oportunidade!.id, dados)

    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
  }

  const isForm = mode === 'create' || mode === 'edit'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', padding: '1.5rem',
          width: '100%', maxWidth: '680px', maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              {mode === 'create' ? 'Nova oportunidade' : isForm ? 'Editar oportunidade' : oportunidade?.titulo}
            </h2>
            {mode === 'view' && oportunidade && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {(() => { const f = FONTE_BADGE[oportunidade.fonte] ?? FONTE_BADGE.manual; return (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: f.cor, background: f.bg, padding: '2px 8px', borderRadius: '12px' }}>
                    {f.label}
                  </span>
                )})()}
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#635BFF', background: '#EEEDFE', padding: '2px 8px', borderRadius: '12px' }}>
                  {STATUS_LABEL[oportunidade.status] || oportunidade.status}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        {/* VIEW MODE */}
        {mode === 'view' && oportunidade && (
          carregando ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#aaa', fontSize: '13px' }}>Carregando…</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                <Campo label="Financiador"       valor={oportunidade.financiador} />
                <Campo label="Fonte detalhe"     valor={oportunidade.fonte_detalhe || '—'} />
                <Campo label="Valor estimado"    valor={formatValor(oportunidade.valor_estimado, oportunidade.moeda)} />
                <Campo label="Prazo submissão"   valor={formatData(oportunidade.prazo_submissao)} />
                <Campo label="Prazo resultado"   valor={formatData(oportunidade.prazo_resultado)} />
                <Campo label="Responsável"       valor={responsaveis.find(r => r.id === oportunidade.responsavel_id)?.nome_completo || '—'} />
              </div>

              {oportunidade.fonte_url && (
                <div style={{ marginBottom: '12px' }}>
                  <FieldLabel text="URL do edital" />
                  <a href={oportunidade.fonte_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#635BFF', wordBreak: 'break-all' }}>
                    {oportunidade.fonte_url}
                  </a>
                </div>
              )}

              {(oportunidade.area_tematica?.length ?? 0) > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <FieldLabel text="Áreas temáticas" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {oportunidade.area_tematica.map(a => (
                      <span key={a} style={{ fontSize: '11px', background: '#f0eeea', color: '#555', padding: '3px 8px', borderRadius: '12px' }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {oportunidade.observacoes && (
                <div style={{ marginBottom: '12px' }}>
                  <FieldLabel text="Observações" />
                  <p style={{ fontSize: '13px', color: '#444', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{oportunidade.observacoes}</p>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e5e3dc', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
                <FieldLabel text="Histórico" />
                <div style={{ marginTop: '12px' }}>
                  <LogTimeline logs={logs} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e5e3dc', paddingTop: '1rem' }}>
                <button onClick={onClose} style={btnSecondary}>Fechar</button>
                {onEditar && <button onClick={onEditar} style={btnPrimary}>Editar</button>}
              </div>
            </>
          )
        )}

        {/* FORM MODE */}
        {isForm && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <FormLabel text="Título *" error={errors.titulo?.message} />
                <input {...register('titulo')} placeholder="Nome da oportunidade" style={{ ...inputStyle, borderColor: errors.titulo ? '#dc2626' : '#d5d3cc', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="Financiador *" error={errors.financiador?.message} />
                <input {...register('financiador')} placeholder="ex: GIZ, CAR, BNDES" style={{ ...inputStyle, borderColor: errors.financiador ? '#dc2626' : '#d5d3cc', width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="Fonte" />
                <select {...register('fonte')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div>
                <FormLabel text="Detalhe da fonte" />
                <input {...register('fonte_detalhe')} placeholder="ex: NORAD, Petrobras" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="URL do edital" />
                <input {...register('fonte_url')} placeholder="https://..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="Valor estimado" />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select {...register('moeda')} style={{ ...inputStyle, width: '80px', flexShrink: 0, cursor: 'pointer' }}>
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input {...register('valor_estimado')} placeholder="0,00" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>

              <div>
                <FormLabel text="Prazo de submissão" />
                <input type="date" {...register('prazo_submissao')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="Prazo de resultado" />
                <input type="date" {...register('prazo_resultado')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div>
                <FormLabel text="Responsável" />
                <select {...register('responsavel_id')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="">Nenhum</option>
                  {responsaveis.map(u => (
                    <option key={u.id} value={u.id}>{u.nome_completo}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Áreas temáticas */}
            <div style={{ marginTop: '14px' }}>
              <FormLabel text="Áreas temáticas" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {AREAS_TEMATICAS.map(area => {
                  const sel = areasTematicas.includes(area)
                  return (
                    <button
                      key={area} type="button"
                      onClick={() => toggleArea(area)}
                      style={{
                        fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                        border: `1px solid ${sel ? '#1D9E75' : '#d5d3cc'}`,
                        background: sel ? '#E6F7F1' : '#fff',
                        color: sel ? '#1D9E75' : '#555',
                        cursor: 'pointer', fontWeight: sel ? '600' : '400',
                      }}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Observações */}
            <div style={{ marginTop: '14px' }}>
              <FormLabel text="Observações" />
              <textarea
                {...register('observacoes')}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                placeholder="Informações adicionais…"
              />
            </div>

            {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>{erro}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #e5e3dc', paddingTop: '1rem' }}>
              <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={salvando} style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando…' : mode === 'create' ? 'Criar oportunidade' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{valor}</div>
    </div>
  )
}

function FieldLabel({ text }: { text: string }) {
  return <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{text}</div>
}

function FormLabel({ text, error }: { text: string; error?: string }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: '500', color: error ? '#dc2626' : '#555', marginBottom: '4px' }}>
      {text}{error && <span style={{ fontWeight: '400', marginLeft: '6px' }}>{error}</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: '13px', borderRadius: '8px',
  border: '1px solid #d5d3cc', outline: 'none', background: '#fff',
  color: '#1a1a1a', display: 'block',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', background: '#1D9E75', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', background: 'transparent', color: '#555',
  border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
}
