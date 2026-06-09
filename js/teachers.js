// ===================== PROFESSORES =====================
// Busca dados reais da API; substitui os dados mockados do data.js

const API_URL = window.API_URL || 'http://localhost:3000/api';

let filters = { materia: '', modalidade: '', sort: 'avaliacao', busca: '' };
let paginaAtual = 1;
const LIMITE = 12;

/**
 * Gera o HTML de um card de professor a partir de dados da API.
 */
function teacherCard(p) {
  const u = p.usuario || {};
  const materias = (p.materias || []).map(m => m.materia?.nome || m.nome).filter(Boolean);
  const primMateria = materias[0] || '—';
  const modalLabel = { online: '🖥️ Online', presencial: '🏫 Presencial', ambos: '🖥️+🏫 Ambos' };
  const modalClass = { online: 'badge-primary', presencial: 'badge-success', ambos: 'badge-accent' };
  const mod = p.modalidade || 'ambos';
  const iniciais = (u.nome || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `<div class="teacher-card" onclick="window.location.href='perfil-professor.html?id=${p.id}'">
    <div class="tc-cover" style="background:linear-gradient(135deg,#e0eaff,#c7d7fc);">
      <div class="avatar tc-avatar" style="background:#dbeafe;color:#1d4ed8;">${
        u.foto_perfil
          ? `<img src="${u.foto_perfil}" alt="${u.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
          : iniciais
      }</div>
    </div>
    <div class="tc-body">
      <div class="tc-name">${u.nome || '—'}</div>
      <div class="tc-subject">${primMateria}</div>
      <div class="tc-bio">${p.biografia || 'Sem biografia.'}</div>
      <div class="tc-meta">
        <span class="badge badge-gray">📍 ${u.cidade || '—'}</span>
        <span class="badge ${modalClass[mod] || 'badge-accent'}">${modalLabel[mod] || mod}</span>
      </div>
      <div class="tc-footer">
        <div>
          <div class="rating">
            <span style="color:#f59e0b;font-size:14px;">★</span>
            <span class="rating-num">${Number(p.media_avaliacao || 0).toFixed(1)}</span>
            <span class="rating-count">(${p.total_avaliacoes || 0})</span>
          </div>
        </div>
        <div class="tc-price">R$ ${p.valor_hora ? Number(p.valor_hora).toFixed(0) : '—'}<span>/h</span></div>
      </div>
    </div>
  </div>`;
}

/** Busca professores da API com filtros e paginação */
async function renderTeachers(resetPagina = true) {
  const grid = document.getElementById('teachers-grid');
  if (!grid) return;

  if (resetPagina) paginaAtual = 1;

  const params = new URLSearchParams();
  if (filters.materia) params.set('materia', filters.materia);
  if (filters.modalidade) params.set('modalidade', filters.modalidade);
  if (filters.sort) params.set('ordem', filters.sort);
  if (filters.busca) params.set('busca', filters.busca);
  params.set('pagina', paginaAtual);
  params.set('limite', LIMITE);

  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando...</div>';

  try {
    const res = await fetch(`${API_URL}/professores?${params}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erro ao carregar professores.');

    const professores = data.professores || [];

    if (professores.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Nenhum professor encontrado.</div>';
      return;
    }

    grid.innerHTML = professores.map(teacherCard).join('');

    // Atualiza paginação se houver elemento
    const pagInfo = document.getElementById('pag-info');
    if (pagInfo) {
      pagInfo.textContent = `Página ${paginaAtual} de ${data.totalPaginas || 1} (${data.total || 0} professores)`;
    }
  } catch (err) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">${err.message}</div>`;
  }
}

function setFilter(el, key, val) {
  filters[key] = val;
  document.querySelectorAll('.filter-chip[data-val]').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderTeachers();
}

function setFilterVal(key, val) {
  filters[key] = val;
  renderTeachers();
}

function filterSubject(s) {
  filters.materia = s;
  renderTeachers();
}

/** Renderiza o perfil completo de um professor na página perfil-professor.html */
async function openTeacher(id) {
  const content = document.getElementById('teacher-profile-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Carregando perfil...</div>';

  try {
    const res = await fetch(`${API_URL}/professores/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Professor não encontrado.');

    const t = data.professor;
    const u = t.usuario || {};
    const materias = (t.materias || []).map(m => m.materia?.nome || m.nome).filter(Boolean);
    const iniciais = (u.nome || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const mod = t.modalidade || 'ambos';
    const modalLabel = { online: '🖥️ Online', presencial: '🏫 Presencial', ambos: '🖥️+🏫 Ambos' };
    const modalClass = { online: 'badge-primary', presencial: 'badge-success', ambos: 'badge-accent' };

    content.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--primary);font-size:14px;font-weight:600;margin-bottom:16px;" onclick="history.back()">← Voltar aos professores</div>
        <h1>${u.nome || '—'}</h1><p>${materias[0] || '—'} · ${u.cidade || '—'}</p>
      </div>
      <div class="profile-layout">
        <div>
          <div class="profile-card">
            <div class="profile-cover" style="background:linear-gradient(135deg,#dbeafe,#1d4ed820);"></div>
            <div class="profile-info">
              <div class="profile-avatar-wrap">
                <div class="avatar lg" style="background:#dbeafe;color:#1d4ed8;font-size:28px;overflow:hidden;">
                  ${u.foto_perfil ? `<img src="${u.foto_perfil}" alt="${u.nome}" style="width:100%;height:100%;object-fit:cover;">` : iniciais}
                </div>
              </div>
              <div class="profile-name">${u.nome || '—'}</div>
              <div class="profile-subject">${materias[0] || '—'}</div>
              <div class="rating" style="margin-bottom:12px;">
                <span style="color:#f59e0b;">★</span>
                <span class="rating-num" style="font-size:15px;">${Number(t.media_avaliacao || 0).toFixed(1)}</span>
                <span class="rating-count">(${t.total_avaliacoes || 0} avaliações)</span>
              </div>
              <div class="tag-list">
                ${materias.map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
                <span class="badge ${modalClass[mod] || 'badge-accent'}">${modalLabel[mod] || mod}</span>
              </div>
              <hr class="profile-divider">
              ${t.formacao ? `<div class="info-row"><span class="icon">🎓</span><span><strong>Formação:</strong> ${t.formacao}</span></div>` : ''}
              ${t.experiencia ? `<div class="info-row"><span class="icon">📅</span><span><strong>Experiência:</strong> ${t.experiencia}</span></div>` : ''}
              ${u.cidade ? `<div class="info-row"><span class="icon">📍</span><span><strong>Cidade:</strong> ${u.cidade}</span></div>` : ''}
              ${t.valor_hora ? `<div class="info-row"><span class="icon">💰</span><span><strong>Valor:</strong> <span style="color:var(--primary);font-weight:700;font-size:16px;">R$ ${Number(t.valor_hora).toFixed(0)}/h</span></span></div>` : ''}
              <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="iniciarConversa('${t.id}')">💬 Conversar</button>
                <button class="btn btn-accent" style="flex:1;justify-content:center;" onclick="openModal('modal-agendar')">📅 Agendar</button>
              </div>
            </div>
          </div>
        </div>
        <div class="profile-main">
          <div class="tabs">
            <div class="tab active" onclick="switchTab(this,'tp-sobre')">Sobre</div>
            <div class="tab" onclick="switchTab(this,'tp-avaliacoes');carregarAvaliacoes('${t.id}')">Avaliações (${t.total_avaliacoes || 0})</div>
          </div>
          <div class="tab-content active" id="tp-sobre">
            <div style="background:var(--white);border-radius:var(--radius);border:1px solid var(--border);padding:24px;margin-bottom:16px;">
              <h3 style="margin-bottom:12px;">Sobre mim</h3>
              <p style="color:var(--text-muted);line-height:1.7;">${t.biografia || 'Sem biografia cadastrada.'}</p>
            </div>
            <div style="background:var(--white);border-radius:var(--radius);border:1px solid var(--border);padding:24px;">
              <h3 style="margin-bottom:12px;">Matérias lecionadas</h3>
              <div class="tag-list">${materias.map(s => `<span class="badge badge-primary" style="font-size:13px;padding:6px 14px;">${s}</span>`).join('') || '—'}</div>
            </div>
          </div>
          <div class="tab-content" id="tp-avaliacoes">
            <div id="avaliacoes-lista"><p style="color:var(--text-muted);">Clique em "Avaliações" para carregar.</p></div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div style="text-align:center;padding:60px;color:#dc2626;">${err.message}</div>`;
  }
}

/** Carrega avaliações de um professor pelo id do professor */
async function carregarAvaliacoes(professorId) {
  const lista = document.getElementById('avaliacoes-lista');
  if (!lista) return;
  lista.innerHTML = '<p style="color:var(--text-muted);">Carregando avaliações...</p>';

  try {
    const res = await fetch(`${API_URL}/avaliacoes/professor/${professorId}`);
    const data = await res.json();

    if (!res.ok || !data.avaliacoes?.length) {
      lista.innerHTML = '<p style="color:var(--text-muted);">Nenhuma avaliação ainda.</p>';
      return;
    }

    lista.innerHTML = data.avaliacoes.map(a => {
      const nomeAluno = a.aluno?.usuario?.nome || 'Aluno';
      const inicialAluno = nomeAluno[0] || 'A';
      const stars = '⭐'.repeat(a.nota);
      const data_fmt = new Date(a.criado_em).toLocaleDateString('pt-BR');
      return `<div class="review-card">
        <div class="review-header">
          <div class="avatar sm" style="background:var(--primary-light);color:var(--primary);">${inicialAluno}</div>
          <div><div class="review-name">${nomeAluno}</div><div class="review-date">${data_fmt}</div></div>
          <div style="margin-left:auto;font-size:14px;">${stars}</div>
        </div>
        <div class="review-text">"${a.comentario || ''}"</div>
      </div>`;
    }).join('');
  } catch {
    lista.innerHTML = '<p style="color:#dc2626;">Erro ao carregar avaliações.</p>';
  }
}

/** Inicia conversa com professor (redireciona para chat) */
async function iniciarConversa(professor_id) {
  const token = sessionStorage.getItem('mt_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const res = await fetch(`${API_URL}/chat/conversas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ professor_id }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = `chat.html?conversa=${data.conversa.id}`;
    } else {
      alert(data.error || 'Erro ao iniciar conversa.');
    }
  } catch {
    alert('Erro ao conectar ao servidor.');
  }
}

// ── Inicialização ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Página de listagem
  if (document.getElementById('teachers-grid')) {
    renderTeachers();

    // Busca em tempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          filters.busca = searchInput.value.trim();
          renderTeachers();
        }, 400);
      });
    }
  }

  // Página de perfil individual
  if (document.getElementById('teacher-profile-content')) {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) openTeacher(id);
  }
});
