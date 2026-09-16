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
- Bateria (pads sem sustain), Vocal (pitch via microfone, `AnalyserNode`), HOPO/tap notes, star power/overdrive, "rock meter" com falha de música, multiplayer local (2 instrumentos), leaderboard online (exigiria backend, fora da decisão atual de site estático).

## Observação sobre testes

O projeto C# original não tinha testes automatizados (verificação era manual, rodando o app). No port, a lógica de parsing (Etapa 1) e de julgamento de notas (Etapa 3) são funções puras e determinísticas — boas candidatas a testes unitários (Vitest) desde o início, o que também documenta as regras de negócio (janelas de tempo, mapeamento de tracks) de forma executável.
