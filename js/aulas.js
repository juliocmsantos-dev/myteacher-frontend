// ===================== AULAS =====================
// Substitui dados mockados por chamadas reais à API

const _API = window.API_URL || 'http://localhost:3000/api';

function _token() { return sessionStorage.getItem('mt_token'); }

async function renderAulas() {
  const futuras = document.getElementById('aulas-futuras');
  const concluidas = document.getElementById('aulas-concluidas');
  if (!futuras || !concluidas) return;

  futuras.innerHTML = '<p style="color:var(--text-muted)">Carregando...</p>';
  concluidas.innerHTML = '';

  try {
    const res = await fetch(`${_API}/aulas`, {
      headers: { Authorization: `Bearer ${_token()}` }
    });
    if (!res.ok) throw new Error('Erro ao buscar aulas.');
    const data = await res.json();

    const fList = (data.aulas || []).filter(a => ['pendente', 'aceita'].includes(a.status));
    const cList = (data.aulas || []).filter(a => ['concluida', 'cancelada', 'recusada'].includes(a.status));

    futuras.innerHTML = fList.length ? fList.map(a => aulaCard(a, false)).join('') : '<p style="color:var(--text-muted)">Nenhuma aula agendada.</p>';
    concluidas.innerHTML = cList.length ? cList.map(a => aulaCard(a, true)).join('') : '<p style="color:var(--text-muted)">Nenhuma aula concluída.</p>';
  } catch (err) {
    futuras.innerHTML = `<p style="color:#dc2626;">${err.message}</p>`;
  }
}

function aulaCard(a, withRating = false) {
  const statusLabel = { pendente: 'Pendente', aceita: 'Agendada', concluida: 'Concluída', cancelada: 'Cancelada', recusada: 'Recusada' };
  const prof = a.professor?.usuario || {};
  const aluno = a.aluno?.usuario || {};
  const materia = a.materia?.nome || '—';
  const dataFmt = a.data_aula ? new Date(a.data_aula).toLocaleDateString('pt-BR') : '—';
  const horaFmt = a.data_aula ? new Date(a.data_aula).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const nome = prof.nome || aluno.nome || '—';
  const iniciais = nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `<div class="aula-card">
    <div class="aula-header">
      <div class="avatar sm" style="background:#dbeafe;color:#1d4ed8;">${iniciais}</div>
      <div>
        <div style="font-weight:600;">${nome}</div>
        <div style="font-size:12px;color:var(--text-muted);">${materia}</div>
      </div>
      <span class="status-badge status-${a.status}" style="margin-left:auto;">${statusLabel[a.status] || a.status}</span>
    </div>
    <div class="aula-meta">
      <span class="badge badge-gray">📅 ${dataFmt}</span>
      <span class="badge badge-gray">🕐 ${horaFmt}</span>
      ${a.valor_hora ? `<span class="badge badge-accent">R$ ${a.valor_hora}</span>` : ''}
    </div>
    <div class="aula-footer">
      <a href="chat.html" class="btn btn-ghost" style="padding:7px 14px;font-size:12px;">💬 Chat</a>
      ${withRating && a.status === 'concluida'
        ? `<button class="btn btn-primary" style="padding:7px 14px;font-size:12px;"
             onclick="abrirModalAvaliar('${a.id}','${a.professor?.id || ''}','${nome}')">⭐ Avaliar</button>`
        : a.status === 'pendente' || a.status === 'aceita'
        ? `<button class="btn btn-ghost" style="padding:7px 14px;font-size:12px;color:#dc2626;border-color:#fecaca;"
             onclick="cancelarAula('${a.id}')">Cancelar</button>`
        : ''
      }
    </div>
  </div>`;
}

async function cancelarAula(id) {
  if (!confirm('Cancelar esta aula?')) return;
  try {
    const res = await fetch(`${_API}/aulas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token()}` },
      body: JSON.stringify({ status: 'cancelada' })
    });
    if (!res.ok) throw new Error('Erro ao cancelar aula.');
    renderAulas();
  } catch (err) {
    alert(err.message);
  }
}

function abrirModalAvaliar(aulaId, professorId, nomeProfessor) {
  const el = document.getElementById('modal-avaliar-nome');
  if (el) el.textContent = nomeProfessor;
  // Guarda ids para envio
  document.getElementById('modal-avaliar')?.setAttribute('data-aula-id', aulaId);
  document.getElementById('modal-avaliar')?.setAttribute('data-prof-id', professorId);
  openModal('modal-avaliar');
}

async function enviarAvaliacao() {
  const modal = document.getElementById('modal-avaliar');
  const aula_id = modal?.getAttribute('data-aula-id');
  const professor_id = modal?.getAttribute('data-prof-id');
  const nota = document.querySelectorAll('.star.active').length;
  const comentario = document.getElementById('review-text')?.value || '';

  if (!nota) { alert('Selecione uma nota.'); return; }

  try {
    const res = await fetch(`${_API}/avaliacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token()}` },
      body: JSON.stringify({ aula_id, professor_id, nota, comentario })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar avaliação.');
    closeModal('modal-avaliar');
    renderAulas();
    alert('Avaliação enviada com sucesso!');
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', renderAulas);
