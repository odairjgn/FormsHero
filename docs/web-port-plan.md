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

#### 6.1 — HOPO / tap notes — ✅ feito
- **O que é**: notas hammer-on/pull-off (e tap notes) podem ser acertadas sem repicar
  (sem nova pressão de tecla), desde que a nota anterior tenha sido acertada e a
  próxima esteja dentro de uma janela curta — regra clássica de Guitar Hero/Clone Hero.
- **Como foi implementado**: checado empiricamente contra o `notes.mid` das 8 músicas
  de `musica/` (script descartável, não commitado) antes de decidir o parsing —
  confirmado que o formato usa, por dificuldade, dois marcadores MIDI 5 e 6 semitons
  acima da gema mais grave dessa dificuldade (ex.: Expert 96-100 → force=101, tap=102),
  cada um como uma nota cuja duração é um *span*: toda gema daquela dificuldade cujo
  início cai dentro do span é afetada. `core/parsing/parser.ts` ganhou
  `getForceMarkerNote`/`getTapMarkerNote`. `core/parsing/chartNotes.ts`
  (`extractChartNotes`) calcula HOPO natural (fret diferente do anterior + distância
  ≤ 1/3 de nota de um quarto em ticks, o default documentado do Clone Hero/Moonscraper
  quando `song.ini` não define `hopofreq` — nenhuma das 8 músicas define), e o marcador
  de força inverte esse resultado quando presente; o marcador de tap seta `isTap`
  independentemente. `ChartNote` (`core/parsing/types.ts`) ganhou `isHopo`/`isTap`;
  `JudgedNote` (`core/gameplay/types.ts`) herda ambos sem mudança própria. Nova função
  `isAutoHitEligible` em `core/gameplay/judgment.ts`: tap é elegível sem condição; HOPO
  exige que a nota anterior do chart (`notes[id-1]`) tenha resolvido como
  `Hit`/`SustainCompleted` (não `Holding`) e que o fret mude.
  `core/gameplay/gameplayEngine.ts`: `update()` agora tenta o auto-hit (via novo método
  privado `applyHit`, compartilhado com `onFretDown`) antes de checar o timeout de miss,
  resolvendo a nota como `Hit`/`Perfect` no exato `timeMs` da nota, sem exigir
  `onFretDown`.
- **Depende de**: nada além do motor atual — é uma extensão de
  `judgment.ts`/`gameplayEngine.ts`.
- **Teste**: `chartNotes.test.ts` (marcadores de força/tap sintéticos + contra o chart
  real da Joan Jett), `judgment.test.ts` (`isAutoHitEligible` isolado) e
  `gameplayEngine.test.ts` (bloco "HOPO/tap auto-hit (Etapa 6.1)": sequência
  hit→HOPO→miss, tap sem predecessor, `Holding` não conta como predecessor válido).

#### 6.2 — Star power / overdrive — ✅ feito
- **O que é**: trechos do chart marcados como "fase de star power" (no MIDI, nota 116
  no FoF/Clone Hero); ao acertar 100% das notas de uma fase, o jogador acumula uma
  barra; ativá-la (tecla dedicada, ex. barra de espaço) dobra o multiplicador de
  pontos por um tempo.
- **Como foi implementado**: `parser.ts` ganhou `STAR_POWER_MARKER_NOTE` (116) — ao
  contrário dos marcadores de força/tap do 6.1, este não é por dificuldade: uma única
  instância de nota 116 por track cobre gemas de qualquer dificuldade dentro do seu
  span. `chartNotes.ts` (`extractChartNotes`) coleta os spans de SP, ordena por tick e
  atribui a cada gema o índice do span em que ela cai como `starPowerPhraseId: number | null`
  (novo campo em `ChartNote`/`JudgedNote`, ordem = ordem cronológica das fases no
  chart) — confirmado contra o chart real da Joan Jett (6 fases). `core/gameplay/scoring.ts`
  ganhou `DEFAULT_STAR_POWER_GAIN_PER_PHRASE` (20, ou seja 5 fases enchem a barra),
  `DEFAULT_STAR_POWER_DRAIN_PER_SECOND` (100/8, barra cheia dura ~8s ativa),
  `STAR_POWER_MULTIPLIER` (2x) e `clampStarPower`. `gameplayEngine.ts`: cada nota
  resolvida (hit ou miss, via `applyHit`/`missNote`) chama `resolveStarPowerPhraseNote`,
  que decrementa quantas notas da fase faltam e marca a fase como "falhada" em qualquer
  miss; a barra só ganha o chunk da fase quando a última nota resolve sem nenhuma falha.
  `activateStarPower()` liga o estado (`starPowerActive`) se houver barra disponível;
  `update()` drena a barra proporcionalmente ao tempo real decorrido (delta entre
  chamadas) e desativa sozinho ao esvaziar. Enquanto ativo, o multiplicador de combo
  (`currentMultiplier()`) e os pontos de sustain (`sustainPoints()`) são dobrados.
  `GameplayStats` ganhou `starPower: { available: number; active: boolean }`;
  `GameplayEngineOptions` ganhou `starPowerGainPerPhrase`/`starPowerDrainPerSecond`.
  `ui/keyboardInput.ts` ganhou a tecla dedicada (Space, `DEFAULT_STAR_POWER_KEY_CODE`)
  e `FretInputHandlers.onActivateStarPower`; `ui/screens/gameplayScreen.ts` liga isso a
  `gameplayEngine.activateStarPower()` e mostra a barra/estado no HUD;
  `ui/noteHighway.ts` desenha um anel dourado nas notas de uma fase de SP e um brilho
  dourado na highway inteira enquanto ativo.
- **Depende de**: nada além do motor atual — extensão de
  `chartNotes.ts`/`scoring.ts`/`gameplayEngine.ts`, mesmo padrão do 6.1.
- **Teste**: `chartNotes.test.ts` (spans sintéticos: nota fora de fase, span cobrindo
  fase, numeração em ordem cronológica, span compartilhado entre dificuldades; e o
  chart real da Joan Jett com 6 fases). `scoring.test.ts` (`clampStarPower`).
  `gameplayEngine.test.ts` (bloco "GameplayEngine — star power (Etapa 6.2)": barra não
  paga fase incompleta, paga fase 100% acertada, nunca paga fase com miss, notas fora
  de fase não contam, `activateStarPower` é no-op com barra vazia, ativa e dobra o
  multiplicador, drena proporcionalmente ao tempo e desativa ao esvaziar, dobra pontos
  de sustain).

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

#### 6.4 — Bateria (pads sem sustain) — ✅ feito
- **O que é**: instrumento jogável novo, `GameInstrument.Drums`. Pads sem sustain
  (toque instantâneo); a 5ª gema (fret index 4, "laranja") é o pedal de kick/bumbo,
  convencionalmente desenhado como um travessão horizontal cruzando toda a highway
  em vez de um gem numa lane, já que o pedal não pertence a nenhuma lane específica.
- **Como foi implementado**: `core/parsing/parser.ts` ganhou `DRUM_PEDAL_FRET_INDEX`
  (4) — Clone Hero/FoF reusa exatamente os mesmos ranges de nota MIDI por
  dificuldade da guitarra para bateria (`GEMS_BY_DIFFICULTY`), o pedal é uma
  convenção de índice, não uma nota MIDI separada. `core/parsing/chartNotes.ts`
  (`extractChartNotes`) ganhou um 4º parâmetro opcional `instrument`: quando é
  `GameInstrument.Drums`, `sustainMs` é forçado a 0 (checado contra o chart real de
  bateria da Joan Jett: as notas carregam uma duração curta fixa que é artefato de
  autoria do MIDI, não uma instrução de segurar) e `isHopo`/`isTap` são sempre
  `false` — checagem contra esse mesmo chart real mostrou que, sem essa supressão,
  a regra de HOPO natural marcaria ~metade das notas de bateria (pads diferentes,
  próximos no tempo) como HOPO, fazendo `isAutoHitEligible` acertá-las sozinho sem
  nenhuma tecla pressionada. Star power continua sendo extraído normalmente para
  bateria (fases próprias, mesma lógica de qualquer outro instrumento). Como
  `sustainMs` sempre 0 já faz `gameplayEngine.ts` pular os estados
  `Holding`/`SustainCompleted`/`SustainBroken` (a checagem existente é
  `note.sustainMs > 0`), **nenhuma mudança foi necessária no motor de gameplay** —
  o "modo sem sustain" sai de graça da extração. `ui/noteHighway.ts` ganhou a opção
  `isDrums`: com ela, o fret `DRUM_PEDAL_FRET_INDEX` é desenhado como uma barra
  (`drawPedalBar`) cruzando toda a largura do canvas, tanto a nota caindo quanto a
  linha de acerto (`drawHitLine`) e o efeito de acerto (`drawHitEffects`) — em vez
  do círculo/diamante e do marcador circular que as outras 4 lanes usam.
  `ui/keyboardInput.ts` ganhou `DEFAULT_DRUM_KEY_CODES` (D F J K + **Space** pro
  pedal) — e, por conflito de tecla com o pedal, `DEFAULT_STAR_POWER_KEY_CODE`
  mudou de Space para **Shift esquerdo** (`STAR_POWER_KEY_LABEL` exportado junto,
  usado no HUD). `app.ts` inclui `GameInstrument.Drums` em `PLAYABLE_INSTRUMENTS` e
  mapeia pra `AudioLayer.Drums`; `ui/screens/gameplayScreen.ts` e
  `ui/screens/preGameScreen.ts` propagam `isDrums`/mostram a dica de teclas correta
  por instrumento selecionado.
- **Depende de**: nada além do motor atual.
- **Teste**: `chartNotes.test.ts` (bloco "extractChartNotes — drums (Etapa 6.4)":
  `sustainMs` zerado mesmo com duração no MIDI, HOPO natural nunca marcado
  [comparado lado a lado com guitarra nas mesmas notas], marcadores de força/tap
  ignorados, star power ainda atribuído, e o chart real de bateria da Joan Jett —
  sustains todos zerados, nenhum HOPO/tap, pedal presente). `ui/noteHighway.ts` e
  `ui/keyboardInput.ts` seguem sem teste automatizado (Canvas/DOM real, mesma
  observação do cabeçalho de `noteHighway.ts`) — verificado manualmente com uma
  página de playtest descartável (não commitada): pedal como travessão cruzando a
  highway (nota e linha de acerto), D/F/J/K/Space disparando os frets 0-4 e Shift
  esquerdo disparando `onActivateStarPower`.

#### 6.5 — Vocal (pitch via microfone) — ✅ feito
- **O que é**: captura de áudio do microfone, comparada contra as notas de
  `PART VOCALS` do chart (letra na tela + afinação) — gameplay novo, sem
  equivalente no C# (lá vocal só toca no MIDI-out, nunca julga o pitch do
  jogador — ver CLAUDE.md sobre `UserControls.MidiOut`).
- **Como foi implementado**: checado empiricamente contra o `notes.mid` das 8
  músicas de `musica/` (scripts descartáveis, não commitados) antes de
  decidir o parsing.
  - **Parsing** (`core/parsing/vocalNotes.ts`, `extractVocalNotes`): o
    `@tonejs/midi` usado em todo o resto do projeto nunca expõe os eventos de
    letra (`lyrics`/`text`) de uma track que não seja a primeira (conferido
    no código-fonte da própria lib) — foi preciso um segundo parse, cru, com
    `midi-file` (dependência transitiva do `@tonejs/midi`, promovida a
    dependência direta em `package.json`), casado pela **track já
    parseada pelo `@tonejs/midi`** por nome (não por índice — evita a
    pegadinha de offset da conductor track já documentada em
    `chartMetadata.ts`), e a conversão tick->ms reaproveita
    `midi.header.ticksToSeconds` para não introduzir um segundo relógio.
    Convenção real confirmada nas 8 músicas: cada sílaba é uma nota
    (`noteOn`/`noteOff`) pareada 1-para-1, em ordem cronológica, com um
    evento `lyrics` (contagem idêntica em todas as 8 músicas) — sufixo `#`
    marca sílaba de percussão/"talkie" (pitch `null`, sempre nota MIDI 36
    nas músicas testadas, mas o parser usa o sufixo da letra como sinal
    autoritativo, não o número da nota, para não quebrar em outros packs
    Clone Hero/FoF); sufixo `-`/`=` marca palavra continuando na próxima
    sílaba (`joinsNext`); texto exatamente `"+"` marca "mesma palavra, pitch
    novo, sem sílaba nova pra mostrar" (`lyric: ""`). Fases de linha
    ("phrase") são lidas dos marcadores alternados nota 105/106
    (`VOCAL_PHRASE_MARKER_NOTES` em `parser.ts`), mesmo padrão de span usado
    por `STAR_POWER_MARKER_NOTE`. `chartMetadata.ts` ganhou um caso especial
    (`availableDifficultiesFor`): vocal não tem os 4 níveis de dificuldade do
    formato FoF/Clone Hero (uma linha só), então é reportado como um único
    pseudo-nível `Expert` — deixa `Part`/`Difficult` fluir pelo mesmo
    pipeline de pre-game picker sem um caso "sem dificuldade" espalhado pelo
    resto do código.
  - **Detecção de pitch** (`core/audio/pitchDetection.ts`, DOM-free e
    testável com Vitest puro): autocorrelação normalizada por diferença
    absoluta (a técnica clássica de afinadores no navegador, sem FFT),
    com busca de lag limitada por `DEFAULT_MIN_HZ`/`DEFAULT_MAX_HZ` (evita
    tanto erro de oitava quanto busca desnecessária) e refinamento
    sub-amostral por interpolação parabólica em torno do lag vencedor.
    `hzToMidi`/`midiToHz` fazem a conversão pra semitons (A4/MIDI 69 =
    440Hz). `core/audio/micPitchSource.ts` (`MicPitchSource`, não testado —
    mesma razão de `createAudioEngine.ts`) faz a ponte com o mundo real:
    `getUserMedia` (com echo cancellation/noise suppression/AGC desligados —
    todos distorcem a forma de onda periódica de que a autocorrelação
    depende) + `AnalyserNode`, interface *pull*
    (`getCurrentPitchHz()` chamado uma vez por frame, mesmo padrão de
    `AudioEngine.currentTime`/`GameplayEngine.update()`).
  - **Julgamento** (`core/gameplay/vocalJudgment.ts` + `vocalEngine.ts`):
    tolerância em semitons (`DEFAULT_VOCAL_TOLERANCE_SEMITONES = 2`), não em
    ms como as gemas — `isInTune` compara a distância em semitons entre o
    pitch detectado e o alvo da nota. `VocalGameplayEngine` é um motor
    paralelo ao `GameplayEngine` (não compartilha código — julgamento
    contínuo por pitch, não por keypress discreto): cada `update(songTimeMs,
    detectedPitchHz)` acumula, por nota ativa, a fração do tempo cantada
    afinada (`hitRatio`, 0-1); a nota resolve `Hit`/`Missed` quando sua
    janela de julgamento termina (`max(durationMs, 120ms)` — o piso evita
    que uma sílaba curtíssima feche antes de sequer um frame de
    `requestAnimationFrame` cair dentro dela) e `hitRatio` cruzou
    `DEFAULT_VOCAL_HIT_RATIO_THRESHOLD` (50% — julgamento contínuo não tem
    o mesmo "tudo ou nada" de uma janela de ms). Nota de percussão
    (`pitch: null`) é julgada só por "teve voz" (qualquer pitch detectado),
    não por afinação. Em vez de inventar uma estrutura de stats paralela,
    `getStats()` devolve o mesmo `GameplayStats` de qualquer outro
    instrumento (`multiplier`/combo reaproveitados, `wrongPresses` sempre 0,
    `starPower` sempre inativo — não é um mecanismo vocal nesta etapa), o
    que faz `resultsScreen.ts`/`core/settings/highScores.ts`/`app.ts` (tela
    de resultado, recorde, "jogar de novo") funcionarem sem nenhuma mudança.
  - **UI**: `ui/vocalHighway.ts` (`VocalHighway`, não testado — desenha em
    `CanvasRenderingContext2D` real, mesmo motivo de `noteHighway.ts`) é o
    equivalente vocal da note highway: tempo rola da direita pra uma linha
    "agora" fixa à esquerda (como as gemas), mas o eixo vertical é *pitch*,
    não uma lane de trasto — nota de percussão ganha uma faixa própria
    embaixo, já que não tem pitch pra plotar. O pitch detectado ao vivo
    aparece como um marcador na linha "agora". `ui/screens/vocalGameplayScreen.ts`
    (`startVocalGameplayScreen`) é a contraparte de `gameplayScreen.ts`:
    pede permissão de microfone primeiro (`MicPitchSource.start()`) e, se
    negada/indisponível, mostra erro com botão de voltar em vez de travar a
    tela (não há um "modo sem gameplay" degradado — sem microfone não tem o
    que julgar); a letra rolando é HTML simples (não canvas), agrupada por
    `phraseId` com a sílaba atual em destaque, juntando sílabas por
    `joinsNext` (sem espaço) igual à convenção do chart.
  - **Wiring**: `app.ts` guarda os bytes crus do MIDI (`LoadedSong.midiBytes`)
    além do `Midi` já parseado, e `showGameplay` bifurca pra
    `showVocalGameplay` quando `part.instrument === GameInstrument.Vocals`
    (motor/tela completamente diferentes — não dava pra só trocar uma opção
    no `GameplayScreenOptions` existente). `preGameScreen.ts` ganhou dois
    ajustes pequenos: o rótulo do seletor omite "— Expert" para vocal (é um
    pseudo-nível, mostrar a palavra seria enganoso) e a dica de input mostra
    "cante no microfone" em vez do hint de teclas.
- **Depende de**: permissão de microfone do navegador — tratada com fallback
  gracioso (mensagem + botão de voltar), não trava a tela.
- **Teste**: `vocalNotes.test.ts` (marcadores `#`/`-`/`=`/`+` sintéticos +
  agrupamento de fase + exclusão dos marcadores de fase/star power da lista
  de sílabas + as 8 músicas reais de `musica/`, contagem de sílabas exata
  batendo com o MIDI cru). `pitchDetection.test.ts` (ondas senoidais
  sintéticas em três registros vocais, silêncio, ruído, `hzToMidi`/`midiToHz`
  ida-e-volta — tudo puro, sem microfone real, confirmando a antecipação do
  plano original: "isolar a lógica... do código de captura de microfone").
  `vocalJudgment.test.ts` (`semitoneDistance`/`isInTune`, tolerância padrão e
  customizada). `vocalEngine.test.ts` (fluxo de frames simulados: nota
  afinada/desafinada/nunca cantada, nota de percussão por voz vs. silêncio,
  piso de janela mínima pra sílaba curta, combo/score/rock meter/god
  mode/accuracy — mesmo padrão de `gameplayEngine.test.ts`).

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
