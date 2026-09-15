# Seu personagem no Jardim

Personagem estilizado inspirado na fotografia fornecida pelo usuário. A partir de uma única foto, esta versão aproxima aparência e características visíveis; não é uma reconstrução 3D idêntica nem uma digitalização do rosto.

O personagem veste moletom azul-marinho carvão, com caimento solto e capuz abaixado, calça escura e tênis claros. Cabelo castanho claro com franja lateral, sobrancelhas escuras e bigode acompanham a primeira referência. O perfil e o caimento do moletom foram refinados usando as duas fotos adicionais enviadas pelo usuário. Os calçados e as partes não visíveis do corpo continuam sendo aproximações.

## Controles

- O passeio começa em **terceira pessoa**, com o personagem visível.
- **W A S D**, setas ou direcional: caminhar; **Shift**: acelerar.
- Arraste para girar a câmera em torno do personagem.
- **Ver de frente** aproxima a câmera do rosto.
- **V** ou o botão de câmera alterna primeira e terceira pessoa.
- As interações, o mapa, o banco, a fonte e o lago continuam disponíveis.

## Referência facial

Arquivo: `assets/avatar-face.webp`.
Preparado com geração de imagens a partir da referência fotográfica fornecida pelo proprietário do projeto. O original não foi alterado. A textura é aplicada ao rosto e à frente do cabelo, sobre superfícies 3D; corpo e membros são geometria articulada.

Após a revisão do usuário, a projeção da foto passou a usar uma escala única para preservar olhos, nariz e boca. O rosto mantém uma folga positiva em relação à cabeça, impedindo que a malha oculte os olhos. A iluminação foi suavizada para não duplicar as sombras já presentes na imagem. O cabelo frontal usa os fios da referência em uma superfície arredondada, substituindo as mechas sólidas anteriores.

As laterais e a parte de trás do cabelo também recebem textura dos fios. A proporção da cabeça em relação ao corpo foi reduzida para um aspecto mais adulto. O queixo e a parte inferior do rosto têm maior projeção, usando as novas fotos de perfil como referência. As mãos incluem dedos separados e falanges, e os tênis têm solados, calcanhar e biqueira modelados.

## Referência de perfil

Arquivo: `assets/avatar-profile.webp`, gerado uma vez pela ferramenta nativa de imagens usando a selfie inicial, as duas fotos adicionais e a referência frontal já preparada. A imagem resultante tem 1254 × 1254 px e mostra um perfil para a esquerda, com luz difusa e a aparência de cabelo/bigode da primeira selfie. É uma interpretação guiada pelas fotos, não uma medição ou digitalização da pessoa.

A referência é projetada sobre as superfícies laterais curvas e as orelhas, com uma transição gradual para a referência frontal. Os dois lados reutilizam a mesma referência; assimetrias não visíveis nas fotos não podem ser reconstruídas com precisão. As fotos originais permanecem inalteradas.
