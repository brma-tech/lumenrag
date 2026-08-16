# ADR-001 — Fundacao do produto e frontend do LumenRAG

Status: aceita  
Data: 13 de agosto de 2026

## Contexto

O LumenRAG precisa oferecer uma instalacao Python simples que abra um painel RAG
local e utilize o LumenVec por baixo. Existe uma aplicacao anterior funcional com
FastAPI, React, Vite e Tailwind que ja cobre ingestao, chat, retrieval, providers
e avaliacao. O LumenVec Admin Studio tambem estabelece uma linguagem visual para
o ecossistema.

Streamlit reduziria o tempo de um prototipo descartavel, mas limitaria controle
sobre navegacao, estado, streaming, inspecao de retrieval, empacotamento e a
evolucao futura para uma experiencia Cloud. Tambem adicionaria um runtime de UI
que nao e necessario na distribuicao final.

## Decisao

1. O frontend sera React + TypeScript, compilado pelo Vite como assets estaticos.
2. Tailwind e componentes React pequenos formam o design system; nao sera adotado
   um framework completo de dashboard nesta fase.
3. FastAPI permanece como API de aplicacao e futuramente servira o build estatico
   em producao, eliminando a necessidade de um servidor Node no uso final.
4. LumenVec permanece fora do processo Python e e acessado por HTTP. O launcher
   sera responsavel por iniciar, verificar e encerrar uma instancia local quando
   nenhum endpoint externo for configurado.
5. O produto e a API publica passam a se chamar LumenRAG. O namespace interno
   `rag_lumenvec` sera renomeado apenas em uma migracao dedicada, depois da
   fundacao do launcher e dos testes de empacotamento.
6. A interface reutiliza a paleta, contraste, bordas, paineis e linguagem de
   status do LumenVec Admin Studio, mas preserva fluxos proprios de RAG.

## Limites dos componentes

```text
LumenRAG CLI / launcher
  ├─ workspace e configuracao local
  ├─ lifecycle do processo LumenVec
  └─ lifecycle da API LumenRAG

LumenRAG API (FastAPI)
  ├─ ingestao e parsing
  ├─ providers de embeddings e chat
  ├─ retrieval, rerank e citacoes
  ├─ historico e avaliacao
  └─ assets estaticos do Studio

LumenRAG Studio (React)
  ├─ onboarding e configuracao
  ├─ knowledge bases
  ├─ chat e fontes
  ├─ retrieval inspector
  └─ avaliacao e operacao

LumenVec
  └─ armazenamento, indexacao, busca, filtros e metricas
```

## Consequencias

- O desenvolvimento reaproveita a base existente sem carregar Streamlit.
- Desenvolvimento local ainda usa Vite com proxy e hot reload.
- A distribuicao final nao exigira Node.js; somente os assets compilados serao
  empacotados.
- O launcher multiplataforma e o servidor de assets estaticos passam a ser os
  blocos de distribuicao do produto.
- A divisao atual do `App.tsx` sera feita incrementalmente para evitar uma
  reescrita visual que quebre fluxos ja testados.

## Primeiro milestone

O milestone `0.1.0` deve entregar:

- identidade LumenRAG consistente;
- painel React alinhado ao LumenVec Admin Studio;
- build estatico servido pelo FastAPI;
- comando local `lumenrag start`;
- deteccao, startup, health check e shutdown do LumenVec;
- ingestao de PDF, Markdown e texto;
- chat com fontes;
- retrieval inspector inicial;
- testes de instalacao limpa em Windows, Linux e macOS.

## Atualizacao de implementacao

O launcher e o empacotamento autocontido foram implementados no milestone
`0.1.0`. O build produz wheels distintas para Windows amd64, Linux amd64/arm64 e
macOS amd64/arm64. Cada wheel contem:

- API e launcher Python;
- build estatico do LumenRAG Studio;
- binario LumenVec compilado para o target;
- manifesto de integridade SHA-256.

O smoke de instalacao limpa e lifecycle passou em Windows. Os quatro targets
restantes possuem compilacao cruzada e validacao estrutural local, mas continuam
pendentes de runtime em runners nativos.
