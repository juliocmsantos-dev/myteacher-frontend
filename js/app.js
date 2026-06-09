// ===================== UTILITÁRIOS GERAIS =====================

/** Abre um modal pelo ID */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

/** Fecha um modal pelo ID */
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Fechar modal ao clicar no overlay
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

/** Alterna abas dentro de um container .tabs */
function switchTab(el, targetId) {
  const container = el.closest('.tabs');
  container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const parent = container.parentElement;
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const target = document.getElementById(targetId);
  if (target) target.classList.add('active');
}

/** Seleciona o tipo de usuário (aluno/professor) no cadastro */
function selectRole(el) {
  document.querySelectorAll('.role-card').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
}

/** Define estrelas no formulário de avaliação */
function setStar(n) {
  document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < n));
}
