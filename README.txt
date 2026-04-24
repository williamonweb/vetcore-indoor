VETCORE INDOOR - VERSAO REALTIME COM SUPABASE

O que mudou:
- Painel por clinica
- TV por clinica usando ?clinica=slug
- Atualizacao em tempo real via Supabase Realtime
- Fallback local se o Supabase ainda nao estiver configurado

ARQUIVOS IMPORTANTES:
- supabase-schema.sql -> rode no SQL Editor do Supabase
- supabase-config.js -> cole a URL e a ANON KEY do projeto
- supabase-config.example.js -> modelo de configuracao

COMO LIGAR:
1) Crie um projeto no Supabase
2) Abra SQL Editor e rode o arquivo supabase-schema.sql
3) Em Project Settings > API, copie:
   - Project URL
   - anon public key
4) Abra o arquivo supabase-config.js e preencha:
   window.TVReceptionSupabaseConfig = {
     url: 'SUA_URL',
     anonKey: 'SUA_ANON_KEY'
   };
5) Suba os arquivos no Vercel

FLUXO DE TESTE:
1) Abra configuracoes.html?novo=1
2) Cadastre a clinica com identificador, por exemplo: onda-animal
3) Entre pelo login com o e-mail e senha cadastrados
4) Cadastre conteudo no painel
5) Abra a TV em:
   tv.html?clinica=onda-animal
6) Deixe a TV aberta e altere algo no painel
7) A mudanca deve aparecer sem F5

OBSERVACOES IMPORTANTES:
- Hoje os arquivos de imagem e video continuam sendo salvos como base64 dentro do banco.
- Para uso pesado/producao, o ideal e migrar as midias para Supabase Storage.
- O login desta versao foi feito para teste rapido direto no navegador. Para venda em escala, o ideal e migrar o acesso para Supabase Auth.

MODO LOCAL:
- Se voce nao preencher o supabase-config.js, o sistema entra em modo local.
- Nesse modo o login demo continua funcionando com:
  admin@clinica.com
  123456

LINKS IMPORTANTES:
- Painel: painel.html
- Cadastro da clinica: configuracoes.html?novo=1
- TV por clinica: tv.html?clinica=slug-da-clinica


ATUALIZAÇÃO - VÍDEOS NO SISTEMA
1) No Supabase, crie um bucket público em Storage com o nome: indoor-videos
2) No painel, selecione Tipo de conteúdo = Vídeo e envie um arquivo .mp4.
3) O vídeo será salvo no Supabase Storage e a TV puxará a URL pública.
4) Recomendado: MP4 H.264, até 50 MB, 1920x1080 ou menor. Na TV ele roda sem som para permitir autoplay.
5) IMPORTANTE: mantenha o seu supabase-config.js que já funciona. Não sobrescreva esse arquivo com exemplo vazio.
