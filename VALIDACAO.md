# Verificação — 14 de setembro de 2026

Verificação funcional no navegador integrado do Codex, usando o servidor local do projeto na porta 4341.

| Fluxo | Resultado |
| --- | --- |
| Carregar o jardim e ativar o botão de entrada | Aprovado; cenário WebGL renderizado |
| Entrar e usar o mapa para visitar os quatro cantinhos | Aprovado |
| Arrastar para girar a vista | Aprovado visualmente |
| Caminhar por teclado e acionar o direcional da interface | Aprovado |
| Interagir com o lago usando a tecla E | Aprovado |
| Pausar a fonte | Aprovado; jatos desaparecem e a interface confirma |
| Regar as flores | Aprovado; gotas visíveis sobre o canteiro |
| Sentar e levantar do banco | Aprovado; movimento sai do estado sentado e o marcador do mapa se desloca |
| Alternar fim de tarde e entardecer | Aprovado visualmente |
| Ativar e silenciar áudio | Aprovado; inicialização sem erro e estado do botão atualizado |
| Interface em 320, 768, 1024 e 1440 pixels | Inspecionada; versão de 320 px ajustada para evitar sobreposição |
| Console após a sequência de interações | Nenhum erro ou aviso registrado |

Revisão de código corrigiu a colisão ao levantar do banco, a pausa durante os deslocamentos automáticos, a consistência da câmera ao voltar ao início e a suspensão de áudio ao preservar a página no histórico.

As verificações de tamanhos de tela usam a janela do navegador; não substituem testes de desempenho, áudio ou toque em aparelhos físicos. Não foi feito teste com leitor de tela nem benchmark de FPS.

## Avatar e câmera em terceira pessoa

- Avatar articulado carregado no navegador com textura facial personalizada, cabelo caramelo, moletom, calça e tênis. Aparência estilizada baseada na foto; a semelhança não é uma reconstrução facial exata.
- Caminhada por W confirmada pelo deslocamento do marcador do mapa. Girar a câmera por arraste mantém a posição do personagem.
- Alternância por V confirmada nos dois sentidos entre primeira e terceira pessoa; botão “Ver de frente” conferido visualmente.
- Visita pelo mapa ao pergolado, abertura da interação, pose sentada e retorno à caminhada verificados no navegador. Corrigidas a altura do assento e a posição sobre o banco. Tênis aparecem sobre o deck após a correção.
- Interface com os novos controles conferida na largura real do painel, 574 px. Sem erros ou avisos no console durante o fluxo final.
- Controlador de navegação executado com as classes Three.js do próprio projeto: 14 verificações passaram, incluindo colisões, câmera, pausa durante transições, primeira pessoa, banco e retorno à vista inicial.
- Geometria e articulação do avatar verificadas com importação real do módulo: sem coordenadas não finitas, descarte remove o personagem da cena, pé de apoio permanece próximo ao chão durante a caminhada. A sola sentada estabiliza em y=0,13170 m para um deck com topo em y=0,12 m.

O teste desta atualização não inclui leitor de tela, dispositivos físicos nem benchmark de desempenho.

## Correção do rosto após revisão visual

O usuário apontou deformação dos olhos e cabelo artificial. Identificadas cavidades da superfície facial que atravessavam a cabeça e um mapeamento da foto com escala horizontal variável por altura. Corrigidos com folga positiva e projeção uniforme, relevo mais suave e remoção das sombras recebidas sobre a textura. A frente do cabelo agora usa a referência sobre uma superfície 3D arredondada.

A nova versão foi carregada no mesmo servidor e navegador. Rosto e cabelo foram conferidos de frente em 1379 × 934 px; os olhos aparecem completos e o cabelo perdeu os blocos sólidos anteriores. Console sem erros ou avisos. A inspeção é visual, sem medição quantitativa de semelhança facial.

## Refinamento com as duas fotos adicionais

Usadas as duas fotos de perfil/moletom fornecidas pelo usuário. Ajustados projeção do queixo, proporção da cabeça, textura lateral do rosto/orelhas, cabelo ao redor da cabeça, caimento do moletom, mãos e tênis. A referência lateral foi gerada uma vez e integrada sobre superfícies curvas.

- Inspeção no navegador em 574 × 936 px, de frente e de lado: referência frontal preservada, cabelo lateral texturizado, orelhas e mandíbula com detalhes, mãos e tênis renderizados.
- Caminhada por W novamente confirmada pela alteração do marcador do mapa. Console final sem erros ou avisos.
- Auditoria do código integrado em cópias temporárias, com carregamento de imagem simulado: 126 meshes e nenhuma coordenada não finita; 441 raios de verificação rosto/crânio sem falhas, com folga mínima mundial de 5,099 mm após o ajuste de escala.
- Em 120 frames caminhando, solas reais entre y=0,01421 e 0,02537 m. Sentado, solas em y=0,13402 m para deck de y=0,12 m.
- Descarte auditado: cena vazia, geometria original das orelhas restaurada e todos os recursos monitorados liberados. Os hashes dos três arquivos finais permaneceram iguais antes e depois dos testes.

O modelo continua sendo uma aproximação baseada em imagens. Não foi realizada digitalização 3D, medição corporal ou avaliação quantitativa de identidade/semelhança.

## Publicação pública — 15 de setembro de 2026

- Removidos o personagem de companhia, seus módulos, textura, controles e referências. O avatar personalizado e as atividades do jardim permanecem disponíveis.
- Auditoria dos 29 arquivos rastreados no Git concluída. As referências locais necessárias ao funcionamento resolvem para arquivos incluídos no repositório.
- As duas texturas do avatar foram convertidas para WebP, com qualidade 90, sem recorte ou redimensionamento. Ambas mantêm 1254 × 1254 px e tiveram a decodificação verificada: referência frontal com 183.376 bytes e lateral com 240.040 bytes.
- No servidor local, o mapa com quatro destinos e a interação da fonte foram conferidos no navegador. Console sem erros ou avisos após o fluxo.
- Os 21 arquivos de execução responderam com HTTP 200 na publicação, sem autenticação, e seus hashes SHA-256 corresponderam aos arquivos locais. O arquivo de configuração `vercel.json` é o 22º arquivo do pacote de publicação e não integra essa verificação HTTP. O endereço público [jardim-digital-psi.vercel.app](https://jardim-digital-psi.vercel.app) respondeu sem redirecionar para login.
- No navegador online, foram conferidos a entrada em terceira pessoa, o mapa com quatro destinos, a viagem até o canteiro e a ação de regar as flores. O cenário e o avatar renderizaram corretamente; não houve erros ou avisos originados do site durante esse fluxo.
- O [repositório público](https://github.com/EpCreative/jardim-digital) está conectado ao projeto da Vercel, com a branch `main` como origem das publicações automáticas. A conexão foi verificada pela API.

Esta etapa inclui acesso HTTP público, inspeção visual e interação nos navegadores local e online. Não inclui aparelhos físicos, leitor de tela ou benchmark de desempenho.
