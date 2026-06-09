/**
 * MyTeacher — auth.js
 *

const API_URL = 'https://myteacher-backend.up.railway.app/api'; 

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Salva o token JWT e dados do usuário no sessionStorage */
function salvarSessao(token, usuario) {
  sessionStorage.setItem('mt_token', token);
  sessionStorage.setItem('mt_usuario', JSON.stringify(usuario));
}

/** Retorna o token salvo (ou null) */
function getToken() {
  return sessionStorage.getItem('mt_token');
}

/** Retorna os dados do usuário salvo (ou null) */
function getUsuario() {
  const raw = sessionStorage.getItem('mt_usuario');
  return raw ? JSON.parse(raw) : null;
}

/** Limpa a sessão (logout) */
function logout() {
  sessionStorage.removeItem('mt_token');
  sessionStorage.removeItem('mt_usuario');
  window.location.href = 'login.html';
}

/** Exibe uma mensagem de erro abaixo do botão dentro do .auth-form */
function mostrarErro(mensagem) {
  removerErro();
  const form = document.querySelector('.auth-form');
  if (!form) return;
  const div = document.createElement('div');
  div.id = 'auth-erro';
  div.style.cssText =
    'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:14px;margin-top:12px;';
  div.textContent = mensagem;
  form.appendChild(div);
}

function removerErro() {
  document.getElementById('auth-erro')?.remove();
}

/** Desabilita ou reabilita o botão de submit enquanto a requisição está em curso */
function setBotaoCarregando(btn, carregando) {
  if (!btn) return;
  btn.style.pointerEvents = carregando ? 'none' : '';
  btn.style.opacity = carregando ? '0.7' : '';
  btn.textContent = carregando ? 'Aguarde...' : btn.dataset.textoOriginal;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function iniciarLogin() {
  // Seleciona o botão "Entrar →" pelo texto (mantém compatibilidade com o HTML original)
  const btn = [...document.querySelectorAll('.btn.btn-primary')].find(
    (el) => el.textContent.includes('Entrar')
  );
  if (!btn) return;

  // Guarda o texto original para restaurar após a requisição
  btn.dataset.textoOriginal = btn.textContent;

  // Remove o href fake para evitar navegação direta
  btn.removeAttribute('href');
  btn.style.cursor = 'pointer';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    removerErro();

    const email = document.querySelector('input[type="email"]')?.value.trim();
    const senha = document.querySelector('input[type="password"]')?.value;

    if (!email || !senha) {
      mostrarErro('Preencha o e-mail e a senha.');
      return;
    }

    setBotaoCarregando(btn, true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarErro(data.error || 'Erro ao fazer login.');
        return;
      }

      salvarSessao(data.token, data.usuario);

      // Redireciona conforme o tipo de usuário
      if (data.usuario.tipo_usuario === 'professor') {
        window.location.href = 'home-professor.html';
      } else {
        window.location.href = 'home-aluno.html';
      }
    } catch (err) {
      mostrarErro('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setBotaoCarregando(btn, false);
    }
  });
}

// ─── CADASTRO ─────────────────────────────────────────────────────────────────

function iniciarCadastro() {
  const btn = [...document.querySelectorAll('.btn.btn-primary')].find(
    (el) => el.textContent.includes('Criar')
  );
  if (!btn) return;

  btn.dataset.textoOriginal = btn.textContent;
  btn.removeAttribute('href');
  btn.style.cursor = 'pointer';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    removerErro();

    // Coletar campos — seleciona pela ordem em que aparecem no HTML
    const inputs = document.querySelectorAll('.form-input');
    // Ordem no cadastro.html: nome, cidade, email, senha, confirmar senha
    const nome     = inputs[0]?.value.trim();
    const cidade   = inputs[1]?.value.trim();
    const email    = inputs[2]?.value.trim();
    const senha    = inputs[3]?.value;
    const confirmaSenha = inputs[4]?.value;

    // Tipo de usuário selecionado no role-picker
    const roleCard = document.querySelector('.role-card.selected');
    const tipo_usuario = roleCard?.querySelector('.role-name')?.textContent.toLowerCase();

    // Validações simples no frontend
    if (!nome || !email || !senha) {
      mostrarErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (senha.length < 6) {
      mostrarErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmaSenha) {
      mostrarErro('As senhas não coincidem.');
      return;
    }
    if (!['aluno', 'professor'].includes(tipo_usuario)) {
      mostrarErro('Selecione se você é Aluno ou Professor.');
      return;
    }

    setBotaoCarregando(btn, true);

    try {
      const res = await fetch(`${API_URL}/auth/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cidade, email, senha, tipo_usuario }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Tratar erros de validação do express-validator
        if (data.errors) {
          mostrarErro(data.errors.map((e) => e.msg).join(' | '));
        } else {
          mostrarErro(data.error || 'Erro ao criar conta.');
        }
        return;
      }

      salvarSessao(data.token, data.usuario);

      if (data.usuario.tipo_usuario === 'professor') {
        window.location.href = 'home-professor.html';
      } else {
        window.location.href = 'home-aluno.html';
      }
    } catch (err) {
      mostrarErro('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setBotaoCarregando(btn, false);
    }
  });
}

// ─── Demo buttons (login.html) ────────────────────────────────────────────────
// Os botões "Aluno Demo" e "Professor Demo" continuam funcionando como links
// estáticos — útil durante o desenvolvimento sem banco configurado.

// ─── Proteção de rotas internas ───────────────────────────────────────────────
/**
 * Chame esta função no <script> de cada página protegida (home-aluno, chat, etc.)
 * para redirecionar quem não estiver autenticado.
 *
 * Exemplo de uso:
 *   <script src="../js/auth.js"></script>
 *   <script>protegerRota();</script>
 */
function protegerRota(tipoExigido = null) {
  const token = getToken();
  const usuario = getUsuario();

  if (!token || !usuario) {
    window.location.href = 'login.html';
    return;
  }

  if (tipoExigido && usuario.tipo_usuario !== tipoExigido) {
    // Redireciona para a home correta se tentar acessar página do outro tipo
    window.location.href =
      usuario.tipo_usuario === 'professor' ? 'home-professor.html' : 'home-aluno.html';
  }
}

// ─── Inicialização automática ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const pagina = location.pathname.split('/').pop();

  if (pagina === 'login.html' || pagina === '') {
    iniciarLogin();
  } else if (pagina === 'cadastro.html') {
    iniciarCadastro();
  }
});

// Exportar para uso global nas páginas protegidas
window.myteacher = { getToken, getUsuario, logout, protegerRota };
