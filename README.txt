AV1 - Etapa 2 - Simulacao da Urna Eletronica 2026
=================================================

Arquivos principais:
- urna.html
- style.css
- script.js
- PMauricio.json
- PDC.json
- assets/heroes/ (imagens locais usadas pelo PDC.json)

Como executar:
1. Abra esta pasta no VS Code.
2. Inicie o arquivo urna.html com Live Server.
3. Nao abra apenas com file://, pois o navegador pode bloquear o carregamento dos JSONs via fetch.

Fluxo implementado:
- Deputado Federal (4 digitos)
- Deputado Estadual (5 digitos)
- Senador - 1a vaga (3 digitos)
- Senador - 2a vaga (3 digitos)
- Governador (2 digitos)
- Presidente (2 digitos)

Teclas:
- BRANCO registra voto em branco se nenhum numero tiver sido digitado.
- CORRIGE reinicia o voto do cargo atual.
- CONFIRMA registra voto valido, branco ou nulo e avanca para o proximo cargo.

Ao confirmar Presidente:
- A tela exibe FIM.
- O sistema aguarda 3 segundos.
- A urna reinicia para o proximo eleitor.

Ao encerrar:
- O sistema baixa votos.json com o registro detalhado dos votos de todos os eleitores concluidos.

Observacao:
- O codigo inclui um efeito sonoro simples de confirmacao via Web Audio API.

Som da urna:
- Confirmacoes intermediarias usam um bip curto.
- Apos confirmar Presidente, toca o efeito longo "pilili" junto com a tela FIM.
- Os dois arquivos ficam em assets/audio e funcionam offline.
