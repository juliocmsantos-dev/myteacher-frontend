// ===================== CHAT REAL (Socket.IO) =====================
// Substitui o chat mockado por chat em tempo real

const _CHAT_API = window.API_URL || 'http://localhost:3000/api';
const _SOCKET_URL = window.SOCKET_URL || 'http://localhost:3000';

let socket = null;
let conversaAtiva = null;
let conversas = [];
let usuarioAtual = null;
let mediaRecorder = null;
let audioChunks = [];

function _token() { return sessionStorage.getItem('mt_token'); }

// ── Inicializa Socket.IO ───────────────────────────────────────────────────────
function conectarSocket() {
  if (socket?.connected) return;
  const token = _token();
  if (!token) return;

  socket = io(_SOCKET_URL, {
    auth: { token },
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    if (conversaAtiva) socket.emit('entrar_conversa', { conversa_id: conversaAtiva });
  });

  socket.on('nova_mensagem', ({ mensagem }) => {
    if (mensagem.conversa_id === conversaAtiva) {
      appendMensagem(mensagem);
      socket.emit('marcar_lida', { conversa_id: conversaAtiva });
    } else {
      // Incrementa badge na lista de conversas
      atualizarBadge(mensagem.conversa_id);
    }
  });

  socket.on('usuario_digitando', ({ userId }) => {
    if (userId !== usuarioAtual?.id) mostrarDigitando(true);
  });
  socket.on('usuario_parou_digitar', () => mostrarDigitando(false));

  socket.on('mensagens_lidas', ({ conversa_id }) => {
    if (conversa_id === conversaAtiva) marcarMensagensComoLidas();
  });

  socket.on('usuario_online', ({ userId }) => atualizarStatusOnline(userId, true));
  socket.on('usuario_offline', ({ userId }) => atualizarStatusOnline(userId, false));

  socket.on('disconnect', () => console.warn('Socket desconectado.'));
}

// ── Carrega lista de conversas ─────────────────────────────────────────────────
async function renderChat() {
  const list = document.getElementById('chat-list-items');
  if (!list) return;

  const rawUser = sessionStorage.getItem('mt_usuario');
  usuarioAtual = rawUser ? JSON.parse(rawUser) : null;

  conectarSocket();

  try {
    const res = await fetch(`${_CHAT_API}/chat/conversas`, {
      headers: { Authorization: `Bearer ${_token()}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar conversas.');
    const data = await res.json();
    conversas = data.conversas || [];

    list.innerHTML = conversas.map((c, i) => {
      const outro = usuarioAtual?.tipo_usuario === 'professor'
        ? c.aluno?.usuario
        : c.professor?.usuario;
      const nome = outro?.nome || 'Usuário';
      const iniciais = nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const ultimaMsg = (c.mensagens || []).sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em))[0];
      const preview = ultimaMsg?.conteudo
        ? (ultimaMsg.tipo === 'texto' ? ultimaMsg.conteudo.slice(0, 40) : `[${ultimaMsg.tipo}]`)
        : 'Sem mensagens';
      const naoLidas = (c.mensagens || []).filter(m => !m.lida && m.remetente_id !== usuarioAtual?.id).length;

      return `<div class="chat-item" id="chat-item-${c.id}" onclick="switchChat('${c.id}')">
        <div class="avatar sm" style="background:#dbeafe;color:#1d4ed8;">${iniciais}</div>
        <div class="info">
          <div class="name">${nome} ${naoLidas ? `<span class="chat-unread">${naoLidas}</span>` : ''}</div>
          <div class="last">${preview}</div>
        </div>
      </div>`;
    }).join('') || '<p style="padding:16px;color:var(--text-muted)">Nenhuma conversa ainda.</p>';

    // Abre conversa da URL se houver
    const urlParams = new URLSearchParams(location.search);
    const cId = urlParams.get('conversa');
    if (cId) switchChat(cId);
    else if (conversas.length > 0) switchChat(conversas[0].id);
  } catch (err) {
    list.innerHTML = `<p style="padding:16px;color:#dc2626;">${err.message}</p>`;
  }
}

// ── Troca de conversa ──────────────────────────────────────────────────────────
async function switchChat(conversaId) {
  // Sai da sala anterior
  if (conversaAtiva && socket) socket.emit('sair_conversa', { conversa_id: conversaAtiva });

  conversaAtiva = conversaId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`chat-item-${conversaId}`)?.classList.add('active');

  if (socket) {
    socket.emit('entrar_conversa', { conversa_id: conversaId });
    socket.emit('marcar_lida', { conversa_id: conversaId });
  }

  // Atualiza header
  const conversa = conversas.find(c => c.id === conversaId);
  if (conversa) {
    const outro = usuarioAtual?.tipo_usuario === 'professor'
      ? conversa.aluno?.usuario
      : conversa.professor?.usuario;
    document.getElementById('chat-name').textContent = outro?.nome || '—';
    document.getElementById('chat-status').textContent = 'Online';
    const avEl = document.getElementById('chat-av');
    if (avEl) {
      avEl.textContent = (outro?.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      avEl.style.background = '#dbeafe';
      avEl.style.color = '#1d4ed8';
    }
  }

  await carregarMensagens(conversaId);
}

// ── Carrega histórico de mensagens ─────────────────────────────────────────────
async function carregarMensagens(conversaId) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Carregando...</div>';

  try {
    const res = await fetch(`${_CHAT_API}/chat/conversas/${conversaId}/mensagens`, {
      headers: { Authorization: `Bearer ${_token()}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar mensagens.');
    const data = await res.json();

    msgs.innerHTML = (data.mensagens || []).map(m => mensagemHTML(m)).join('');
    msgs.scrollTop = msgs.scrollHeight;
  } catch (err) {
    msgs.innerHTML = `<div style="padding:16px;color:#dc2626;">${err.message}</div>`;
  }
}

function mensagemHTML(m) {
  const enviado = m.remetente_id === usuarioAtual?.id;
  const hora = m.enviado_em ? new Date(m.enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  let conteudoHTML = '';

  if (m.tipo === 'imagem') {
    conteudoHTML = `<img src="${m.conteudo}" class="msg-img" alt="imagem">`;
  } else if (m.tipo === 'audio') {
    conteudoHTML = `<div class="msg-bubble"><audio controls src="${m.conteudo}" style="max-width:220px;"></audio></div>`;
  } else if (m.tipo === 'arquivo') {
    conteudoHTML = `<div class="msg-bubble"><a href="${m.conteudo}" target="_blank" style="color:inherit;">📎 Baixar arquivo</a></div>`;
  } else {
    conteudoHTML = `<div class="msg-bubble">${escapeHTML(m.conteudo || '')}</div>`;
  }

  return `<div class="msg ${enviado ? 'sent' : 'received'}">
    ${!enviado ? `<div class="avatar sm" style="background:#dbeafe;color:#1d4ed8;">?</div>` : ''}
    <div>
      ${conteudoHTML}
      <div class="msg-time">${hora}${enviado && m.lida ? ' ✓✓' : ''}</div>
    </div>
  </div>`;
}

function appendMensagem(m) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.insertAdjacentHTML('beforeend', mensagemHTML(m));
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Envio de mensagem ──────────────────────────────────────────────────────────
function sendMsg() {
  const inp = document.getElementById('chat-input-field');
  const text = inp?.value.trim();
  if (!text || !conversaAtiva) return;

  socket?.emit('enviar_mensagem', { conversa_id: conversaAtiva, conteudo: text });
  inp.value = '';
}

// ── Indicador de digitação ─────────────────────────────────────────────────────
let digitandoTimer;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chat-input-field')?.addEventListener('input', () => {
    if (!conversaAtiva || !socket) return;
    socket.emit('digitando', { conversa_id: conversaAtiva });
    clearTimeout(digitandoTimer);
    digitandoTimer = setTimeout(() => socket.emit('parou_digitar', { conversa_id: conversaAtiva }), 2000);
  });
});

function mostrarDigitando(show) {
  const el = document.getElementById('chat-status');
  if (el) el.textContent = show ? 'Digitando...' : 'Online';
}

// ── Upload de imagem ───────────────────────────────────────────────────────────
async function simulateImg() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file || !conversaAtiva) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      socket?.emit('enviar_imagem', { conversa_id: conversaAtiva, base64, mimetype: file.type, nome: file.name });
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ── Gravação de áudio ──────────────────────────────────────────────────────────
async function simulateAudio() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        socket?.emit('enviar_audio', { conversa_id: conversaAtiva, base64, mimetype: 'audio/webm' });
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    alert('Gravando... Clique no botão novamente para parar.');
  } catch {
    alert('Não foi possível acessar o microfone.');
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function atualizarBadge(conversaId) {
  const item = document.getElementById(`chat-item-${conversaId}`);
  if (!item) return;
  let badge = item.querySelector('.chat-unread');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'chat-unread';
    item.querySelector('.name')?.appendChild(badge);
  }
  badge.textContent = (parseInt(badge.textContent || '0') + 1).toString();
}
function atualizarStatusOnline(userId, online) { /* extensível */ }
function marcarMensagensComoLidas() { /* extensível */ }

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('chat-list-items')) renderChat();
});
