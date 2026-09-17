# Plano: Portar FormsHero para um jogo web (browser) com gameplay real

## Objetivo

Portar o motor de sincronização áudio/MIDI hoje existente em C#/WinForms (`GHCore` + `FormsHero`) para uma aplicação web, **adicionando a mecânica de jogo que não existe no projeto atual**: notas que descem por um "highway", validação de acerto por janela de tempo, combo e pontuação — inspirado em Guitar Hero.

## Decisões já tomadas

| Decisão | Escolha |
|---|---|
| Stack de frontend | TypeScript puro (sem framework de jogo) + Canvas 2D para o gameplay; DOM simples para menus/song-select |
| Backend | Nenhum — site 100% estático (hospedável em GitHub Pages/Netlify/Vercel) |
| Escopo do MVP | Apenas Guitarra/Baixo (`GameInstrument.Guitar` / `Rhythm_Bass`), 5 trastes |
| Formato de charts | **Não modificar.** `song.ini` + `notes.mid`/`notes-unedited.mid` + `guitar.ogg`/`rhythm.ogg`/`drums.ogg`/`song.ogg` continuam exatamente como estão (padrão Frets on Fire / Clone Hero). Todo o parsing acontece em runtime no navegador, sem etapa de build que reescreva o conteúdo. Isso preserva compatibilidade com qualquer pacote de música desse ecossistema, não só as 8 pastas em `musica/`. |

Bateria, vocal, multiplayer, star power, HOPO/sustain avançado, leaderboard online etc. ficam como backlog pós-MVP (Etapa 6).

## Onde isso vive no repo

Sugestão: novo diretório `web/` na raiz do mesmo repositório (não mistura com os projetos `.csproj`), mantendo o histórico e o contexto do port juntos. A pasta `musica/` (assets das músicas) é copiada/referenciada de lá sem alterações.

## Desafios técnicos específicos de um jogo de ritmo no navegador

Estes pontos justificam decisões de arquitetura nas etapas abaixo:

1. **Precisão de timing**: `<audio>` HTML5 tem latência/jitter alto demais para julgar acertos. É necessário usar **Web Audio API** com `audioContext.currentTime` como relógio mestre único — isso também corrige, por construção, o problema de dessincronia que existe hoje no C# (`DryWetMidiPlayer` e `NAudioPlayer` são "dois relógios" iniciados juntos, mas sem sincronização contínua).
2. **Mixagem multi-camada**: `guitar.ogg`/`rhythm.ogg`/`drums.ogg`/`song.ogg` tocam como `AudioBufferSourceNode`s independentes, cada um com seu `GainNode` (mute/volume por camada) — equivalente ao `WaveMixerStream32` do NAudio, mas todos amarrados ao mesmo `currentTime` de início.
3. **Parsing de MIDI no navegador**: precisa de uma lib JS (ex.: `@tonejs/midi`) para ler `notes.mid`, já que não há `Melanchall.DryWetMidi` em JS.
4. **Extração de "chart jogável"**: o projeto atual só *visualiza* notas (`Form1`/`ScrollNoteView`); não existe hoje uma estrutura de dados "lista de notas por instrumento+dificuldade com tempo e duração" pronta para julgamento de acerto — isso é construído do zero na Etapa 1.
5. **Calibração de latência**: latência de áudio/input varia por navegador/SO/hardware. Vale incluir uma tela de calibração de offset (como Clone Hero/StepMania fazem) para o jogo ficar jogável de verdade, não só "no papel".

## Etapas

### Etapa 0 — Setup do projeto
- Criar `web/` com Vite + TypeScript (strict mode).
- Estrutura de pastas espelhando conceitualmente o `GHCore` (para facilitar tradução mental do C#): `core/parsing`, `core/audio`, `core/gameplay`, `ui/`.
- Configurar Vitest para testes unitários (o projeto original não tinha testes; a lógica de parsing e de julgamento de notas é exatamente o tipo de código que vale testar com casos determinísticos).
- Critério de pronto: `npm run dev` sobe uma página em branco; `npm test` roda (mesmo que vazio).

### Etapa 1 — Parsing de charts (port do `GHCore` de leitura)
- Port de `Utils.ReadIni` → parser de `song.ini` em TS (mesmo contrato: `key=value`, case-insensitive na chave).
- Port de `Song`/`SongFolder`: dado um diretório de música (via File System Access API ou upload de múltiplos arquivos), expor os mesmos campos (`Album`, `Name`, `Year`, `Artist`, caminhos dos `.ogg`, `notes.mid`/`notes-unedited.mid` com a mesma prioridade de `Song.GetMidi()`).
- Integrar `@tonejs/midi` e portar `Parser.GetTracksIdsDictionary()` (mapeamento nome-de-track → `GameInstrument`) e os arrays de gemas por dificuldade (`EasyGems`/`MediumGems`/`HardGems`/`ExpertGems`) + `GetGemIndex`.
- Port de `SongGamePlayMetaData.ReadMetaData`: detectar instrumentos e dificuldades disponíveis num chart, incluindo o fallback de chart antigo (Frets on Fire com uma única track sem nome reconhecido).
- **Novo** (não existe no C#): função que converte os `NoteOn`/`NoteOff` de uma track+dificuldade numa lista ordenada `{ timeMs, fret, sustainMs }` — a estrutura de dados que o motor de gameplay vai consumir.
- Testes: validar o parsing contra as 8 músicas reais de `musica/` (contagem de notas, instrumentos/dificuldades detectados, sem alterar os arquivos-fonte).

### Etapa 2 — Áudio sincronizado (port do `NAudioPlayer`)
- Implementar `AudioEngine` com Web Audio API: `decodeAudioData` para cada `.ogg` disponível, um `AudioBufferSourceNode` + `GainNode` por camada (`AudioLayer.Song/Guitar/Drums/Rhythm`, mesmo enum conceitual).
- `play()/pause()/resume()/stop()`, `setVolume(layer)`, `setMute(layer)` — mesma interface conceitual de `IAudioPlayer`.
- Pausa/retomada: como Web Audio não pausa nativamente um `AudioBufferSourceNode`, guardar o offset e recriar o node ao retomar, mantendo o `audioContext.currentTime` como referência de "tempo de música decorrido".
- Critério de pronto: tocar uma música de teste com as 4 camadas sincronizadas, mute/volume por camada funcionando, sem drift perceptível numa música inteira.

### Etapa 3 — Motor de gameplay (o núcleo pedido, não existe hoje)
- **Note highway** em Canvas 2D: 5 pistas coloridas (verde/vermelho/amarelo/azul/laranja, mesmas cores do `GameNeck`), notas posicionadas na tela em função de `songTime` atual (Etapa 2) e de uma velocidade de scroll configurável.
- **Input**: mapeamento de teclado configurável, default igual ao `GameForm._keys` (D, F, J, K, L → 5 trastes).
- **Julgamento de acerto** (o pedido central): ao pressionar um fret, comparar `songTime` com a nota mais próxima daquele fret ainda não julgada; janelas de tempo (ex.: Perfeito ±35ms, Bom ±90ms, Aceitável ±150ms, fora disso = Miss) — inspirado nas janelas clássicas de Guitar Hero/Clone Hero.
- **Sustains**: segurar a tecla enquanto a nota atravessa a linha de acerto; soltar antes do fim reduz/quebra a pontuação do sustain.
- **Pontuação e combo**: pontos base por nota certa; multiplicador de combo crescente a cada N acertos seguidos (ex. 1x → 2x aos 10 → 3x aos 20 → 4x aos 30, teto em 4x, como no Guitar Hero clássico); miss zera o combo. HUD com score, combo atual e % de acerto.
- **Feedback visual**: flash/partícula no trasto acertado; nota "quebrando"/ficando cinza no miss.
- Critério de pronto: jogar uma música do início ao fim na dificuldade Expert de guitarra com pontuação e combo funcionando e "sensação" de jogo (validar com playtesting manual, ajustando janelas de tempo).

### Etapa 4 — Fluxo de telas (port do `SongSelect`/`Form1`)
- Tela de seleção de música: lista as músicas em `musica/` (empacotadas como assets estáticos do build, sem alterar os arquivos) — port de `SongFolder.Songs`.
- Tela de seleção de instrumento (Guitarra/Baixo) e dificuldade antes de iniciar — pré-jogo, diferente do `Form1` atual que troca em tempo real.
- Tela de resultado pós-música: score final, % de acerto, maior combo.
- (Extensão natural desta etapa, pode ficar para depois do MVP): importar uma pasta de música arbitrária via File System Access API, para carregar qualquer chart no formato FoF/Clone Hero sem precisar reempacotar o site.

### Etapa 5 — Calibração e polimento
- Tela de calibração de offset de áudio/input (medir e compensar a latência do dispositivo do jogador).
- Persistência local (localStorage) de recordes por música/dificuldade.
- Ajustes finos de janelas de julgamento e de velocidade de scroll com base em playtesting.

### Etapa 6 — Backlog pós-MVP (fora do escopo inicial)

Sete itens independentes entre si — nenhuma ordem obrigatória além das dependências
citadas em cada um. Cada subseção é um ponto de partida para quando for a vez de
implementar aquele item, não uma tarefa em andamento. Estado atual do código (para
referência dos pontos de integração abaixo): `core/parsing` (Etapa 1), `core/audio`
(Etapa 2), `core/gameplay` (Etapa 3 — `gameplayEngine.ts`/`judgment.ts`/`scoring.ts`/`types.ts`),
`ui/screens` (Etapa 4 — `songSelectScreen`, `preGameScreen`, `gameplayScreen`, `resultsScreen`,
`settingsScreen`), `core/settings` (Etapa 5 — `calibration.ts`, `highScores.ts`, `gameSettings.ts`).

#### 6.1 — HOPO / tap notes
- **O que é**: notas hammer-on/pull-off (e tap notes) podem ser acertadas sem repicar
  (sem nova pressão de tecla), desde que a nota anterior tenha sido acertada e a
  próxima esteja dentro de uma janela curta — regra clássica de Guitar Hero/Clone Hero.
- **Onde mexe**: `core/parsing/chartNotes.ts` (o formato FoF/Clone Hero marca HOPO via
  nota MIDI 1 de "sustenido" um semitom acima da gema, ou flag de tap via texto/sysex —
  checar como o `notes.mid` das 8 músicas de `musica/` marca isso antes de decidir o
  parsing; **não pode virar campo inventado que não reflita o chart real**, é o mesmo
  dado que Clone Hero lê). Adicionar `isHopo`/`isTap` em `ChartNote` (`core/parsing/types.ts`)
  e `core/gameplay/types.ts` (`JudgedNote` herda). Nova regra em `judgment.ts`: permitir
  hit sem keypress novo se a nota anterior foi `Hit`/`SustainCompleted` e o fret muda.
- **Depende de**: nada além do motor atual — é uma extensão de `judgment.ts`.
- **Teste**: casos determinísticos em `judgment.test.ts` com sequência hit→HOPO→miss.

#### 6.2 — Star power / overdrive
- **O que é**: trechos do chart marcados como "fase de star power" (no MIDI, nota 116
  no FoF/Clone Hero); ao acertar 100% das notas de uma fase, o jogador acumula uma
  barra; ativá-la (tecla dedicada, ex. barra de espaço) dobra o multiplicador de
  pontos por um tempo.
- **Onde mexe**: `core/parsing/chartNotes.ts` para extrair as fases de SP (nota 116)
  como `{ startMs, endMs }[]`; `core/gameplay/scoring.ts` para o multiplicador dobrado
  enquanto ativo; `core/gameplay/gameplayEngine.ts` expõe `activateStarPower()` e o
  estado da barra em `GameplayStats` (novo campo `starPower: { available: number; active: boolean }`);
  `ui/screens/gameplayScreen.ts` + `ui/keyboardInput.ts` para a tecla de ativação e o
  HUD da barra; `ui/noteHighway.ts` para o feedback visual (highway "brilhando").
- **Depende de**: nada além do motor atual.
- **Teste**: `scoring.test.ts` cobrindo acúmulo de barra e multiplicador dobrado.

#### 6.3 — Rock meter (falha de música) — ✅ feito
- **O que é**: barra de energia que sobe em acerto e desce em miss/wrong-press; some
  a barra e a música para/falha, como o Guitar Hero clássico.
- **Como foi implementado**: `core/gameplay/scoring.ts` ganhou as constantes
  `DEFAULT_ROCK_METER_START` (50), `DEFAULT_ROCK_METER_GAIN_PER_HIT` (+2),
  `DEFAULT_ROCK_METER_LOSS_PER_MISS` (-6) e `clampRockMeter` (clamp 0–100).
  `GameplayStats` (`core/gameplay/types.ts`) ganhou `rockMeter: number` e
  `failed: boolean` (`rockMeter <= 0`); `GameplayEngineOptions` ganhou
  `rockMeterStartValue`/`rockMeterGainPerHit`/`rockMeterLossPerMiss` para
  configuração opcional. `gameplayEngine.ts` atualiza `rockMeter` em todo hit
  (`onFretDown`), miss por timeout (`missNote`, chamado por `update()`) e wrong
  press. `ui/screens/gameplayScreen.ts` ganhou o callback `onFailed(stats)`
  (irmão de `onFinished`) — `tick()` checa `stats.failed` a cada frame, antes do
  fim normal de música, e se verdadeiro faz `teardown()` e chama `onFailed` em vez
  de `onFinished`. `app.ts` passa `onFailed` e propaga um novo parâmetro `failed`
  até `resultsScreen.ts`, que mostra "Você falhou a música." quando true. HUD do
  gameplay mostra "Energia: N%".
- **Teste**: `scoring.test.ts` (`clampRockMeter`) e `gameplayEngine.test.ts`
  (bloco "GameplayEngine — rock meter (Etapa 6.3)": sobe em hit, desce em miss e
  wrong press, `failed` após sequência de misses, valores customizados).

#### 6.4 — Bateria (pads sem sustain)
- **O que é**: instrumento jogável novo, `GameInstrument.Drums` (já existe no enum
  em `core/parsing/types.ts`, só não é tratado como jogável ainda). Pads sem sustain
  (toque instantâneo), tipicamente 4-5 pads (kick + 4 tambores/pratos no mapeamento
  Clone Hero).
- **Onde mexe**: `core/parsing/parser.ts` — a extração de notas por dificuldade já
  cobre `Drums` (mesma lógica de `GetGemIndex`/gemas por faixa MIDI), então
  `chartNotes.ts` deve funcionar sem mudança estrutural grande, mas sustains sempre
  0 para bateria (o parsing pode simplesmente ignorar `sustainMs` na extração para
  esse instrumento, ou o gameplay engine tratar bateria como "sempre sustainMs=0").
  `core/gameplay/gameplayEngine.ts`/`judgment.ts` precisam de um modo "sem sustain"
  (pular os estados `Holding`/`SustainCompleted`/`SustainBroken` do `NoteRuntimeState`
  para esse instrumento). `ui/noteHighway.ts` precisa de um layout alternativo (pads
  em vez de barras longas — mesma ideia de trilha, sem desenhar corpo de sustain).
  `ui/keyboardInput.ts`/`preGameScreen.ts` precisam listar `Drums` como opção
  selecionável (hoje o `preGameScreen` já itera `parts` genericamente, então deve
  bastar `songSelectScreen`/filtragem de `parts` não excluir mais `Drums` — checar
  onde isso é filtrado hoje, se for).
- **Depende de**: nada além do motor atual.
- **Teste**: `chartNotes.test.ts` com uma música real de `musica/` que tenha `PART DRUMS`;
  `judgment.test.ts` cobrindo o modo sem sustain.

#### 6.5 — Vocal (pitch via microfone)
- **O que é**: captura de áudio do microfone (`getUserMedia` + `AnalyserNode`/`AudioWorklet`
  para detecção de pitch), comparado contra as notas de `PART VOCALS` do chart
  (`LyricEvent` para letra na tela, `NoteOnEvent`/`NoteOffEvent` com nota < 100 para
  afinação — mesma leitura que `Form1._midiPlayer_MessageDispached` faz no C#, ver
  CLAUDE.md).
- **Onde mexe**: novo módulo `core/audio/pitchDetection.ts` (ex.: autocorrelação ou
  YIN sobre o buffer do `AnalyserNode`) — **não existe equivalente no C#** (lá,
  vocal só toca no MIDI-out, não julga pitch do jogador; é gameplay novo, como o
  motor da Etapa 3 foi). Novo `core/parsing` para extrair `{ timeMs, durationMs, pitch, lyric }[]`
  de `PART VOCALS` (hoje `chartNotes.ts` só extrai gemas de guitarra/baixo por
  faixa MIDI fixa — vocal não usa o mesmo range de nota). Novo módulo de julgamento
  de afinação em `core/gameplay` (janela de tolerância em semitons, não em ms como
  as gemas). UI nova: barra de pitch + letra rolando (equivalente web do `VocalView`
  do C#).
- **Depende de**: permissão de microfone do navegador (tratar negação/indisponibilidade
  com fallback gracioso — sem gameplay de vocal, não travar a tela). Maior item do
  backlog em escopo; vale quebrar em sub-tarefas próprias quando for a vez.
- **Teste**: detecção de pitch é difícil de testar deterministicamente com Vitest puro;
  considerar fixtures de áudio gravado com pitch conhecido, ou isolar a lógica de
  comparação nota-esperada-vs-pitch-detectado (essa parte é pura e testável) do
  código de captura de microfone (esse não é).

#### 6.6 — Multiplayer local (2 instrumentos)
- **O que é**: dois jogadores simultâneos (ex. guitarra + baixo) na mesma tela,
  cada um com seu próprio highway, mapeamento de teclado e score/combo.
- **Onde mexe**: `core/gameplay/gameplayEngine.ts` já é uma classe/factory por
  instância — instanciar duas (uma por jogador) contra o mesmo `songTime` do
  `AudioEngine` (Etapa 2, já é um clock único compartilhável) deve funcionar sem
  mudar o engine em si. `ui/keyboardInput.ts` precisa de dois mapeamentos de tecla
  simultâneos sem conflito (o default D/F/J/K/L de um jogador precisa de um segundo
  set, ex. teclado numérico ou uma segunda metade do teclado — ver `core/settings/gameSettings.ts`
  para onde já existe configuração de teclas, estender para "por jogador").
  `ui/noteHighway.ts` e `ui/screens/gameplayScreen.ts` precisam renderizar duas
  highways lado a lado no mesmo `<canvas>` (ou dois `<canvas>`); `preGameScreen.ts`
  precisa de um segundo seletor de instrumento/dificuldade para o jogador 2;
  `resultsScreen.ts` precisa mostrar os dois resultados.
- **Depende de**: nada além do motor atual, mas é o item de maior mudança em UI/telas
  (toca em quase todo `ui/screens`).
- **Teste**: `gameplayEngine.test.ts` já cobre uma instância; útil um teste de duas
  instâncias rodando contra o mesmo clock sem interferência de estado (garantir que
  não há estado global compartilhado indevido entre elas).

#### 6.7 — Leaderboard online
- **Fora de cogitação enquanto a decisão "sem backend, site 100% estático" (ver topo
  deste documento) estiver de pé** — um leaderboard online exige um servidor (ou
  serviço de terceiros) para persistir e servir scores entre jogadores, o que
  contradiz diretamente essa decisão travada. Só faz sentido revisitar este item se
  essa decisão for revista explicitamente; até lá, `core/settings/highScores.ts`
  (Etapa 5, local via `localStorage`) é o único mecanismo de recorde.

## Observação sobre testes

O projeto C# original não tinha testes automatizados (verificação era manual, rodando o app). No port, a lógica de parsing (Etapa 1) e de julgamento de notas (Etapa 3) são funções puras e determinísticas — boas candidatas a testes unitários (Vitest) desde o início, o que também documenta as regras de negócio (janelas de tempo, mapeamento de tracks) de forma executável.
