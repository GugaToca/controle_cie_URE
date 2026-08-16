/* ==========================================================
   Myboot.win — logica compartilhada
   Le o catalogo.json e desenha a lista de imagens.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- utilitarios ---------- */

  function escapar(t) {
    var d = document.createElement('div');
    d.textContent = (t === null || t === undefined) ? '' : String(t);
    return d.innerHTML;
  }

  function formatarTamanho(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    var gb = bytes / 1073741824;
    if (gb >= 1) return gb.toFixed(1).replace('.', ',') + ' GB';
    var mb = bytes / 1048576;
    if (mb >= 1) return Math.round(mb) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  /* ---------- desenho ---------- */

  function cartaoImagem(img, detalhado) {
    var partes = (img.arquivos && img.arquivos.length > 1)
      ? img.arquivos.length + ' partes' : '';

    var tags = '';
    if (img.tamanhoBytes) {
      tags += '<span class="tag">' + formatarTamanho(img.tamanhoBytes) + '</span>';
    }
    if (partes) {
      tags += '<span class="tag tag-cinza">' + partes + '</span>';
    }
    if (img.unattend) {
      tags += '<span class="tag tag-verde">Instalacao automatica</span>';
    }

    var meta = '';
    if (detalhado) {
      var linhas = [];
      if (img.id) linhas.push('ID: <code>' + escapar(img.id) + '</code>');
      if (img.indice) linhas.push('Indice do WIM: <code>' + escapar(img.indice) + '</code>');
      if (img.arquivos && img.arquivos.length) {
        linhas.push('Arquivos: <code>' + escapar(img.arquivos.join(', ')) + '</code>');
      }
      if (linhas.length) {
        meta = '<div class="item-desc" style="margin-top:9px">' + linhas.join('<br>') + '</div>';
      }
    }

    return '' +
      '<div class="item">' +
        '<div style="min-width:0;flex:1">' +
          '<div class="item-nome">' + escapar(img.nome) + '</div>' +
          '<div class="item-desc">' + escapar(img.descricao || '') + '</div>' +
          meta +
        '</div>' +
        '<div class="item-meta">' + tags + '</div>' +
      '</div>';
  }

  function render(alvo, imagens, detalhado) {
    if (!alvo) return;

    if (!imagens || !imagens.length) {
      alvo.innerHTML = '<div class="vazio">Nenhuma imagem publicada ainda.<br>' +
        'Assim que uma imagem for enviada, ela aparece aqui automaticamente.</div>';
      return;
    }

    alvo.innerHTML = imagens.map(function (i) {
      return cartaoImagem(i, detalhado);
    }).join('');
  }

  /* ---------- carga ---------- */

  function iniciar() {
    var alvo = document.getElementById('lista');
    var detalhado = !!(alvo && alvo.getAttribute('data-detalhado') === '1');

    fetch('myboot/catalogo.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('catalogo.json nao encontrado');
        return r.json();
      })
      .then(function (d) {
        render(alvo, d.imagens, detalhado);

        var n = document.getElementById('contador');
        if (n) {
          var q = (d.imagens || []).length;
          n.textContent = q === 1 ? '1 imagem disponivel' : q + ' imagens disponiveis';
        }

        var r = document.getElementById('atualizado');
        if (r && d.atualizadoEm) {
          r.textContent = 'Catalogo atualizado em ' + d.atualizadoEm;
        }
      })
      .catch(function () {
        if (alvo) {
          alvo.innerHTML = '<div class="vazio">Nao foi possivel carregar a lista de imagens.<br>' +
            'Tente recarregar a pagina em alguns instantes.</div>';
        }
      });

    /* Arquivos extras: so aparece se arquivos.json existir e tiver itens */
    fetch('myboot/arquivos.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var sec = document.getElementById('secao-arquivos');
        var alvo = document.getElementById('lista-arquivos');
        if (!sec || !alvo || !d || !d.arquivos || !d.arquivos.length) return;

        alvo.innerHTML = d.arquivos.map(function (a) {
          var tam = a.tamanhoBytes
            ? '<span class="tag tag-cinza">' + formatarTamanho(a.tamanhoBytes) + '</span>' : '';
          return '' +
            '<div class="item">' +
              '<div style="min-width:0;flex:1">' +
                '<div class="item-nome">' + escapar(a.nome) + '</div>' +
                '<div class="item-desc">' + escapar(a.descricao || '') + '</div>' +
              '</div>' +
              '<div class="item-meta">' + tam +
                '<a class="btn btn-2" style="padding:9px 18px;font-size:13.5px" download href="' +
                  escapar(a.caminho) + '">Baixar</a>' +
              '</div>' +
            '</div>';
        }).join('');

        sec.style.display = '';
      })
      .catch(function () {});

    fetch('myboot/versao.txt', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        var v = document.getElementById('versao');
        if (v && t.trim()) v.textContent = 'v' + t.trim();
      })
      .catch(function () {});

    var ano = document.getElementById('ano');
    if (ano) ano.textContent = new Date().getFullYear();
  }

  window.iniciarMyBoot = iniciar;
})();
