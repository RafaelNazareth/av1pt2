const ARQUIVOS_PARTIDOS = [
    { partido: "PMauricio", numero: "94", arquivo: "PMauricio.json" },
    { partido: "PDC", numero: "93", arquivo: "PDC.json" }
];

const cargos2026 = [
    { chave: "deputadoFederal", nome: "Deputado Federal", digitos: 4, cargoJson: "Deputado(a) Federal" },
    { chave: "deputadoEstadual", nome: "Deputado Estadual", digitos: 5, cargoJson: "Deputado(a) Estadual" },
    { chave: "senador1", nome: "Senador (1ª Vaga)", digitos: 3, cargoJson: "Senador(a)" },
    { chave: "senador2", nome: "Senador (2ª Vaga)", digitos: 3, cargoJson: "Senador(a)" },
    { chave: "governador", nome: "Governador", digitos: 2, cargoJson: "Governador(a)" },
    { chave: "presidente", nome: "Presidente", digitos: 2, cargoJson: "Presidente" }
];

let candidatos = [];
let indiceCandidatos = new Map();
let etapaAtual = 0;
let numeroDigitado = "";
let votoEmBranco = false;
let votacaoBloqueada = true;
let candidatoAtual = null;
let memoriaVotosEleitores = [];
let votoEleitorAtual = {};
let somAtivo = true;
let contextoAudio = null;

const el = {};

window.addEventListener("DOMContentLoaded", async () => {
    mapearElementos();
    vincularEventos();
    await carregarDadosPartidos();
});

function mapearElementos() {
    el.tela = document.getElementById("tela");
    el.conteudoVoto = document.getElementById("conteudoVoto");
    el.lblCargo = document.getElementById("lblCargo");
    el.containerDigitos = document.getElementById("containerDigitos");
    el.dadosCandidato = document.getElementById("dadosCandidato");
    el.imgCandidato = document.getElementById("imgCandidato");
    el.fotoBox = document.getElementById("fotoBox");
    el.btnBranco = document.getElementById("btnBranco");
    el.btnCorrige = document.getElementById("btnCorrige");
    el.btnConfirma = document.getElementById("btnConfirma");
    el.btnEncerrar = document.getElementById("btnEncerrar");
    el.btnSom = document.getElementById("btnSom");
    el.btnBoletim = document.getElementById("btnBoletim");
    el.modalBoletim = document.getElementById("modalBoletim");
    el.btnFecharBoletim = document.getElementById("btnFecharBoletim");
    el.btnFecharBoletimRodape = document.getElementById("btnFecharBoletimRodape");
    el.btnBaixarBoletim = document.getElementById("btnBaixarBoletim");
    el.resumoBoletim = document.getElementById("resumoBoletim");
    el.conteudoBoletim = document.getElementById("conteudoBoletim");
    el.statusDados = document.getElementById("statusDados");
    el.totalEleitores = document.getElementById("totalEleitores");
    el.etapaVotacao = document.getElementById("etapaVotacao");
    el.totalPartidos = document.getElementById("totalPartidos");
    el.audioConfirmacaoCurta = document.getElementById("audioConfirmacaoCurta");
    el.audioPililiFinal = document.getElementById("audioPililiFinal");
}

function vincularEventos() {
    document.querySelectorAll("[data-numero]").forEach((botao) => {
        botao.addEventListener("click", () => digitar(botao.dataset.numero));
    });

    el.btnBranco.addEventListener("click", votarBranco);
    el.btnCorrige.addEventListener("click", corrigir);
    el.btnConfirma.addEventListener("click", confirmar);
    el.btnEncerrar.addEventListener("click", encerrarVotacaoEEnviarTSE);
    el.btnSom.addEventListener("click", alternarSom);
    el.btnBoletim.addEventListener("click", abrirBoletim);
    el.btnFecharBoletim.addEventListener("click", fecharBoletim);
    el.btnFecharBoletimRodape.addEventListener("click", fecharBoletim);
    el.btnBaixarBoletim.addEventListener("click", () => baixarJSON("boletimDeUrna.json", gerarBoletimUrna()));
    el.modalBoletim.addEventListener("click", (evento) => {
        if (evento.target === el.modalBoletim) fecharBoletim();
    });

    document.addEventListener("pointerdown", () => {
        if (el.audioConfirmacaoCurta) el.audioConfirmacaoCurta.load();
        if (el.audioPililiFinal) el.audioPililiFinal.load();
    }, { once: true });

    document.addEventListener("keydown", (evento) => {
        if (/^[0-9]$/.test(evento.key)) {
            digitar(evento.key);
        } else if (evento.key === "Backspace" || evento.key === "Delete") {
            evento.preventDefault();
            corrigir();
        } else if (evento.key === "Enter") {
            evento.preventDefault();
            confirmar();
        } else if (evento.key === "Escape" && !el.modalBoletim.hidden) {
            fecharBoletim();
        }
    });
}

async function carregarDadosPartidos() {
    try {
        el.statusDados.textContent = "Carregando candidatos...";
        el.statusDados.className = "status-dados";

        const resultados = await Promise.all(
            ARQUIVOS_PARTIDOS.map(async (config) => {
                const resposta = await fetch(config.arquivo, { cache: "no-store" });
                if (!resposta.ok) {
                    throw new Error(`Falha ao carregar ${config.arquivo}.`);
                }

                const dados = await resposta.json();
                if (!Array.isArray(dados)) {
                    throw new Error(`${config.arquivo} não possui uma lista válida de candidatos.`);
                }

                return dados.map((candidato) => ({
                    ...candidato,
                    numero: String(candidato.numero),
                    partido: config.partido,
                    numeroPartido: config.numero
                }));
            })
        );

        candidatos = resultados.flat();
        montarIndiceCandidatos();

        el.statusDados.textContent = `${candidatos.length} candidatos carregados`;
        el.statusDados.className = "status-dados ok";
        el.totalPartidos.textContent = String(ARQUIVOS_PARTIDOS.length);
        votacaoBloqueada = false;
        iniciarNovoEleitor();
    } catch (erro) {
        console.error(erro);
        votacaoBloqueada = true;
        el.statusDados.textContent = "Erro ao carregar os arquivos dos partidos";
        el.statusDados.className = "status-dados erro";
        el.tela.innerHTML = `
            <div class="mensagem-centro">
                DADOS INDISPONÍVEIS
                <small>Abra esta pasta por um servidor local, como Live Server, e recarregue a página.</small>
            </div>`;
    }
}

function montarIndiceCandidatos() {
    indiceCandidatos = new Map();

    candidatos.forEach((candidato) => {
        const chave = criarChaveCandidato(candidato.numero, candidato.cargo);
        indiceCandidatos.set(chave, candidato);
    });
}

function criarChaveCandidato(numero, cargoJson) {
    return `${cargoJson}::${String(numero)}`;
}

function iniciarNovoEleitor() {
    etapaAtual = 0;
    votoEleitorAtual = {
        eleitor: memoriaVotosEleitores.length + 1,
        inicio: new Date().toISOString(),
        votos: []
    };
    votacaoBloqueada = false;
    atualizarContadores();
    iniciarEtapa();
}

function iniciarEtapa() {
    numeroDigitado = "";
    votoEmBranco = false;
    candidatoAtual = null;

    const cargo = cargos2026[etapaAtual];
    el.lblCargo.textContent = cargo.nome;
    el.dadosCandidato.innerHTML = "";
    ocultarFoto();
    renderizarQuadradosDigitos(cargo.digitos);
    atualizarContadores();
}

function renderizarQuadradosDigitos(qtd) {
    el.containerDigitos.hidden = false;
    el.containerDigitos.innerHTML = "";

    for (let i = 0; i < qtd; i++) {
        const div = document.createElement("div");
        div.className = i === 0 ? "digito pisca" : "digito";
        div.id = `digito-${i}`;
        el.containerDigitos.appendChild(div);
    }
}

function digitar(numero) {
    if (votacaoBloqueada || votoEmBranco) return;

    const cargo = cargos2026[etapaAtual];
    if (numeroDigitado.length >= cargo.digitos) return;

    numeroDigitado += numero;
    atualizarQuadradosDigitados();

    if (numeroDigitado.length === cargo.digitos) {
        verificarCandidatoDigitado(numeroDigitado, cargo);
    }
}

function atualizarQuadradosDigitados() {
    const cargo = cargos2026[etapaAtual];

    for (let i = 0; i < cargo.digitos; i++) {
        const quadrado = document.getElementById(`digito-${i}`);
        quadrado.textContent = numeroDigitado[i] || "";
        quadrado.classList.toggle("pisca", i === numeroDigitado.length && numeroDigitado.length < cargo.digitos);
    }
}

function verificarCandidatoDigitado(numero, cargo) {
    candidatoAtual = buscarCandidato(numero, cargo.cargoJson);

    if (candidatoAtual) {
        el.dadosCandidato.innerHTML = `
            <div class="candidato-nome">${escaparHTML(candidatoAtual.nome)}</div>
            <div class="candidato-partido">Partido: <strong>${escaparHTML(candidatoAtual.partido)}</strong></div>`;
        mostrarFoto(candidatoAtual);
    } else {
        ocultarFoto();
        el.dadosCandidato.innerHTML = `
            <div class="voto-aviso nulo">VOTO NULO</div>
            <div>Número não corresponde a candidato deste cargo.</div>`;
    }
}

function buscarCandidato(numero, cargoJson) {
    return indiceCandidatos.get(criarChaveCandidato(numero, cargoJson)) || null;
}

function mostrarFoto(candidato) {
    el.imgCandidato.onerror = () => {
        el.imgCandidato.onerror = null;
        el.imgCandidato.src = gerarAvatar(candidato.nome);
    };
    el.imgCandidato.src = candidato.foto;
    el.imgCandidato.alt = `Foto de ${candidato.nome}`;
    el.fotoBox.hidden = false;
}

function ocultarFoto() {
    el.fotoBox.hidden = true;
    el.imgCandidato.removeAttribute("src");
    el.imgCandidato.alt = "";
}

function votarBranco() {
    if (votacaoBloqueada) return;

    if (numeroDigitado !== "") {
        exibirMensagemTemporaria("Para votar em branco, pressione CORRIGE antes.");
        return;
    }

    votoEmBranco = true;
    candidatoAtual = null;
    el.containerDigitos.hidden = true;
    ocultarFoto();
    el.dadosCandidato.innerHTML = '<div class="voto-aviso">VOTO EM BRANCO</div>';
}

function corrigir() {
    if (votacaoBloqueada) return;
    iniciarEtapa();
}

function confirmar() {
    if (votacaoBloqueada) return;

    const cargo = cargos2026[etapaAtual];
    let registroVoto;

    if (votoEmBranco) {
        registroVoto = {
            cargo: cargo.nome,
            numero: "BRANCO",
            tipo: "BRANCO",
            candidato: null,
            partido: null
        };
    } else if (numeroDigitado.length === cargo.digitos) {
        registroVoto = candidatoAtual
            ? {
                cargo: cargo.nome,
                numero: numeroDigitado,
                tipo: "VALIDO",
                candidato: candidatoAtual.nome,
                partido: candidatoAtual.partido
            }
            : {
                cargo: cargo.nome,
                numero: numeroDigitado,
                tipo: "NULO",
                candidato: null,
                partido: null
            };
    } else {
        exibirMensagemTemporaria(`Digite os ${cargo.digitos} dígitos ou vote em BRANCO.`);
        return;
    }

    votoEleitorAtual.votos.push(registroVoto);

    const ultimaEtapa = etapaAtual === cargos2026.length - 1;
    if (ultimaEtapa) {
        tocarPililiFinal();
    } else {
        tocarConfirmacaoCurta();
    }

    etapaAtual += 1;

    if (etapaAtual < cargos2026.length) {
        iniciarEtapa();
    } else {
        finalizarVotoEleitor();
    }
}

function finalizarVotoEleitor() {
    votacaoBloqueada = true;
    votoEleitorAtual.fim = new Date().toISOString();
    memoriaVotosEleitores.push(votoEleitorAtual);
    atualizarContadores();
    el.btnBoletim.disabled = false;

    el.tela.innerHTML = '<div class="mensagem-fim">FIM</div>';

    setTimeout(() => {
        restaurarEstruturaTela();
        iniciarNovoEleitor();
    }, 3000);
}

function restaurarEstruturaTela() {
    el.tela.innerHTML = `
        <div id="conteudoVoto" class="conteudo-voto">
            <div class="tela-topo">
                <div>
                    <span class="seu-voto">SEU VOTO PARA</span>
                    <div class="cargo-titulo" id="lblCargo">---</div>
                </div>
                <div class="foto-box" id="fotoBox" hidden>
                    <img id="imgCandidato" class="foto-candidato" src="" alt="">
                </div>
            </div>
            <div class="quadrados-numero" id="containerDigitos" aria-label="Número do candidato"></div>
            <div class="dados-candidato" id="dadosCandidato" aria-live="polite"></div>
            <div class="tela-instrucoes" id="instrucoes">
                <span><b>CONFIRMA</b> para registrar o voto</span>
                <span><b>CORRIGE</b> para reiniciar esta etapa</span>
            </div>
        </div>`;

    el.conteudoVoto = document.getElementById("conteudoVoto");
    el.lblCargo = document.getElementById("lblCargo");
    el.containerDigitos = document.getElementById("containerDigitos");
    el.dadosCandidato = document.getElementById("dadosCandidato");
    el.imgCandidato = document.getElementById("imgCandidato");
    el.fotoBox = document.getElementById("fotoBox");
}

function encerrarVotacaoEEnviarTSE() {
    if (memoriaVotosEleitores.length === 0) {
        exibirMensagemTemporaria("Nenhum eleitor concluiu a votação nesta urna.");
        return;
    }

    const confirmarEncerramento = window.confirm(
        `Encerrar a votação? ${memoriaVotosEleitores.length} eleitor(es) concluíram o voto.`
    );

    if (!confirmarEncerramento) return;

    votacaoBloqueada = true;
    const registroCompleto = {
        urna: "Simulação 2026",
        encerramento: new Date().toISOString(),
        totalEleitores: memoriaVotosEleitores.length,
        partidos: ARQUIVOS_PARTIDOS.map(({ partido, numero }) => ({ partido, numero })),
        eleitores: memoriaVotosEleitores
    };

    baixarJSON("votos.json", registroCompleto);
    baixarJSON("boletimDeUrna.json", gerarBoletimUrna());

    el.tela.innerHTML = `
        <div class="mensagem-centro">
            VOTAÇÃO ENCERRADA
            <small>Os arquivos votos.json e boletimDeUrna.json foram gerados.</small>
        </div>`;
    el.btnEncerrar.disabled = true;
    el.btnBoletim.disabled = false;
    abrirBoletim();
}

function gerarBoletimUrna() {
    const apuracaoPorCargo = cargos2026.map((cargo) => {
        const votosCargo = memoriaVotosEleitores.flatMap((eleitor) =>
            eleitor.votos.filter((voto) => voto.cargo === cargo.nome)
        );

        const contagemCandidatos = new Map();
        let brancos = 0;
        let nulos = 0;

        votosCargo.forEach((voto) => {
            if (voto.tipo === "BRANCO") {
                brancos += 1;
            } else if (voto.tipo === "NULO") {
                nulos += 1;
            } else if (voto.tipo === "VALIDO") {
                const chave = `${voto.numero}::${voto.candidato}::${voto.partido}`;
                const atual = contagemCandidatos.get(chave) || {
                    numero: voto.numero,
                    candidato: voto.candidato,
                    partido: voto.partido,
                    votos: 0
                };
                atual.votos += 1;
                contagemCandidatos.set(chave, atual);
            }
        });

        const candidatosApurados = Array.from(contagemCandidatos.values())
            .sort((a, b) => b.votos - a.votos || a.candidato.localeCompare(b.candidato, "pt-BR"));

        return {
            cargo: cargo.nome,
            totalVotos: votosCargo.length,
            validos: candidatosApurados.reduce((total, item) => total + item.votos, 0),
            brancos,
            nulos,
            candidatos: candidatosApurados
        };
    });

    return {
        urna: "Simulação 2026",
        geradoEm: new Date().toISOString(),
        totalEleitores: memoriaVotosEleitores.length,
        partidos: ARQUIVOS_PARTIDOS.map(({ partido, numero }) => ({ partido, numero })),
        apuracao: apuracaoPorCargo
    };
}

function abrirBoletim() {
    if (memoriaVotosEleitores.length === 0) {
        exibirMensagemTemporaria("O boletim estará disponível após o primeiro eleitor concluir a votação.");
        return;
    }

    const boletim = gerarBoletimUrna();
    const totalValidos = boletim.apuracao.reduce((soma, cargo) => soma + cargo.validos, 0);
    const totalBrancos = boletim.apuracao.reduce((soma, cargo) => soma + cargo.brancos, 0);
    const totalNulos = boletim.apuracao.reduce((soma, cargo) => soma + cargo.nulos, 0);

    el.resumoBoletim.innerHTML = `
        <div class="resumo-card"><span>Eleitores</span><strong>${boletim.totalEleitores}</strong></div>
        <div class="resumo-card"><span>Votos válidos</span><strong>${totalValidos}</strong></div>
        <div class="resumo-card"><span>Brancos / nulos</span><strong>${totalBrancos} / ${totalNulos}</strong></div>`;

    el.conteudoBoletim.innerHTML = boletim.apuracao.map((cargo) => {
        const linhasCandidatos = cargo.candidatos.length
            ? cargo.candidatos.map((item) => `
                <div class="apuracao-linha">
                    <div><strong>${escaparHTML(item.candidato)}</strong><br><small>${escaparHTML(item.partido)}</small></div>
                    <div class="numero-apuracao">Nº ${escaparHTML(item.numero)}</div>
                    <div class="total-apuracao">${item.votos} voto${item.votos === 1 ? "" : "s"}</div>
                </div>`).join("")
            : '<div class="apuracao-linha"><div><small>Nenhum voto válido registrado.</small></div><div></div><div></div></div>';

        return `
            <section class="cargo-apuracao">
                <h3>${escaparHTML(cargo.cargo)}</h3>
                ${linhasCandidatos}
                <div class="apuracao-linha especial"><div><strong>Votos em branco</strong></div><div></div><div class="total-apuracao">${cargo.brancos}</div></div>
                <div class="apuracao-linha especial"><div><strong>Votos nulos</strong></div><div></div><div class="total-apuracao">${cargo.nulos}</div></div>
            </section>`;
    }).join("");

    el.modalBoletim.hidden = false;
    document.body.style.overflow = "hidden";
    el.btnFecharBoletim.focus();
}

function fecharBoletim() {
    el.modalBoletim.hidden = true;
    document.body.style.overflow = "";
}

function baixarJSON(nomeArquivo, dados) {
    const conteudo = JSON.stringify(dados, null, 2);
    const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function atualizarContadores() {
    el.totalEleitores.textContent = String(memoriaVotosEleitores.length);
    el.etapaVotacao.textContent = `${Math.min(etapaAtual + 1, cargos2026.length)} de ${cargos2026.length}`;
}

function exibirMensagemTemporaria(texto) {
    const anterior = el.dadosCandidato.innerHTML;
    el.dadosCandidato.innerHTML = `<div class="voto-aviso nulo">${escaparHTML(texto)}</div>`;
    window.setTimeout(() => {
        if (!votacaoBloqueada) {
            el.dadosCandidato.innerHTML = anterior;
        }
    }, 1600);
}

function alternarSom() {
    somAtivo = !somAtivo;
    el.btnSom.textContent = `Som da urna: ${somAtivo ? "ligado" : "desligado"}`;
    el.btnSom.setAttribute("aria-pressed", String(somAtivo));

    if (somAtivo) {
        tocarConfirmacaoCurta();
    }
}

async function tocarConfirmacaoCurta() {
    if (!somAtivo) return;

    // Primeira opção: arquivo WAV local empacotado no projeto.
    // Como a função é chamada a partir do clique em CONFIRMA, navegadores
    // modernos permitem a reprodução sem depender de autoplay.
    if (el.audioConfirmacaoCurta) {
        try {
            el.audioConfirmacaoCurta.pause();
            el.audioConfirmacaoCurta.currentTime = 0;
            await el.audioConfirmacaoCurta.play();
            return;
        } catch (erro) {
            console.warn("Falha ao reproduzir WAV local. Usando fallback Web Audio.", erro);
        }
    }

    // Fallback: síntese por Web Audio, reutilizando um único contexto.
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!contextoAudio) {
            contextoAudio = new AudioContext();
        }

        if (contextoAudio.state === "suspended") {
            await contextoAudio.resume();
        }

        const inicio = contextoAudio.currentTime;
        const ganho = contextoAudio.createGain();
        ganho.connect(contextoAudio.destination);
        ganho.gain.setValueAtTime(0.12, inicio);

        [
            { atraso: 0.00, frequencia: 880, duracao: 0.085 },
            { atraso: 0.12, frequencia: 1040, duracao: 0.085 },
            { atraso: 0.24, frequencia: 1240, duracao: 0.11 }
        ].forEach(({ atraso, frequencia, duracao }) => {
            const oscilador = contextoAudio.createOscillator();
            oscilador.type = "square";
            oscilador.frequency.setValueAtTime(frequencia, inicio + atraso);
            oscilador.connect(ganho);
            oscilador.start(inicio + atraso);
            oscilador.stop(inicio + atraso + duracao);
        });
    } catch (erro) {
        console.warn("Áudio indisponível neste navegador.", erro);
    }
}

async function tocarPililiFinal() {
    if (!somAtivo) return;

    if (el.audioPililiFinal) {
        try {
            el.audioPililiFinal.pause();
            el.audioPililiFinal.currentTime = 0;
            await el.audioPililiFinal.play();
            return;
        } catch (erro) {
            console.warn("Falha ao reproduzir o pilili final. Usando fallback Web Audio.", erro);
        }
    }

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!contextoAudio) contextoAudio = new AudioContext();
        if (contextoAudio.state === "suspended") await contextoAudio.resume();

        const inicio = contextoAudio.currentTime;
        const ganho = contextoAudio.createGain();
        ganho.connect(contextoAudio.destination);
        ganho.gain.setValueAtTime(0.12, inicio);

        [
            { atraso: 0.00, frequencia: 880, duracao: 0.105 },
            { atraso: 0.145, frequencia: 1320, duracao: 0.105 },
            { atraso: 0.290, frequencia: 1320, duracao: 0.185 }
        ].forEach(({ atraso, frequencia, duracao }) => {
            const oscilador = contextoAudio.createOscillator();
            oscilador.type = "square";
            oscilador.frequency.setValueAtTime(frequencia, inicio + atraso);
            oscilador.connect(ganho);
            oscilador.start(inicio + atraso);
            oscilador.stop(inicio + atraso + duracao);
        });
    } catch (erro) {
        console.warn("Pilili indisponível neste navegador.", erro);
    }
}

function gerarAvatar(nome) {
    const iniciais = String(nome)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
            <rect width="200" height="240" fill="#eef1f4"/>
            <circle cx="100" cy="82" r="42" fill="#c7ced6"/>
            <path d="M38 210c11-48 34-72 62-72s51 24 62 72" fill="#c7ced6"/>
            <text x="100" y="230" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#173c63">${iniciais}</text>
        </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
