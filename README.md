# Jardim — um respiro digital

Um jardim original em 3D, explorável no navegador com um personagem personalizado em terceira pessoa. Caminhos curvos ligam uma fonte animada, canteiros floridos, um lago e um pergolado com banco. Inclui mapa com viagens diretas, interações, luz de entardecer, áudio ambiente sintetizado e controles por toque.

## Abrir localmente

Requer Python 3. A porta fixa deste projeto é **4341**. Verifique se está livre; reutilize um servidor deste projeto já existente e não encerre processos de outros projetos.

```sh
python3 serve.py
```

Abra [o jardim local](http://127.0.0.1:4341) no navegador. Não abra `index.html` diretamente como `file://`, porque os módulos JavaScript precisam de HTTP. Não há instalação de pacotes nem etapa de compilação.

## Publicar na Vercel

Importe este repositório na Vercel com a raiz `./`. O arquivo `vercel.json` configura o projeto como site estático: preset **Other**, sem instalação de dependências ou comando de build, e saída na raiz. Todos os módulos, fontes, texturas e licenças necessários estão incluídos no repositório.

## Controles

- **Entrar no jardim:** inicia o passeio em terceira pessoa, mostrando seu personagem.
- **W A S D** ou **setas:** caminhar. **Shift:** acelerar.
- **Arrastar a tela:** girar a câmera ao redor do personagem. No celular, deslize e use o direcional.
- **Ver de frente:** aproximar a câmera para ver o rosto; **V:** alternar primeira e terceira pessoa.
- **E** ou o convite na tela: interagir com um lugar próximo.
- **Mapa:** visitar diretamente um dos quatro cantinhos.
- **Sol/lua:** alternar a luz; **alto-falante:** ativar ou silenciar o áudio.
- **Esc:** pausar e abrir a ajuda; **Jardim:** retornar à vista inicial.

A fonte pode ser ligada/desligada, as flores podem ser regadas e o banco e o lago oferecem pontos para contemplação. Começa sem som. O cenário e o áudio são procedurais; rosto e cabelo usam uma referência facial preparada a partir da foto fornecida. Todos os recursos estão incluídos localmente, e o aplicativo não precisa de rede depois de carregado.

## Arquivos

- `src/world.js`: cenário, vegetação, água, marcos e colisores.
- `src/rendering.js`: câmera, iluminação e renderização.
- `src/navigation.js`: movimento, colisões e transições de câmera.
- `src/avatar.js`: personagem articulado, rosto, roupa e animações.
- `src/hair.js`: cabelo em 3D com textura na frente, nas laterais e atrás.
- `src/profile.js`: referência lateral projetada sobre o volume do rosto e das orelhas.
- `src/main.js`: interface, mapa e interações.
- `src/audio.js`: vento, água e pássaros sintetizados com Web Audio.
- `src/style.css`: interface adaptável em português.

Three.js 0.180.0 está incluído em `vendor/`, com sua licença MIT. Fontes DM Sans e Instrument Serif distribuídas sob SIL Open Font License. O código e o cenário foram criados para este projeto; não foram extraídos do site de referência.

## Limites

Requer WebGL 2 e um navegador moderno. Desempenho e áudio dependem do dispositivo. O cenário usa modelagem procedural estilizada; não é um levantamento fotográfico nem uma simulação botânica.
