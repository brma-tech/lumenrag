# Distribuicao do LumenRAG

Status: artefatos locais funcionais; publicacao nao autorizada  
Versao: 0.1.0

## Contrato do artefato

Cada wheel e especifica de plataforma e inclui o mesmo conjunto logico:

```text
lumenrag + rag_lumenvec
lumenrag/assets/manifest.json
lumenrag/assets/bin/lumenvec[.exe]
lumenrag/assets/studio/index.html
lumenrag/assets/studio/assets/*
```

O manifesto registra target, versao, entrypoint do engine, entrypoint do Studio
e SHA-256 de todos os arquivos. O launcher falha fechado quando um asset estiver
ausente ou alterado.

## Matriz

| Target | Tag da wheel | Build cruzado | Smoke nativo |
| --- | --- | --- | --- |
| Windows amd64 | `win_amd64` | passou | passou |
| Linux amd64 | `manylinux_2_17_x86_64` | passou | pendente |
| Linux arm64 | `manylinux_2_17_aarch64` | passou | pendente |
| macOS Intel | `macosx_11_0_x86_64` | passou | pendente |
| macOS Apple Silicon | `macosx_11_0_arm64` | passou | pendente |

`CGO_ENABLED=0` remove dependencias dinamicas introduzidas pelo engine Go. Isso
nao substitui a instalacao e o smoke em cada sistema operacional real.

## Gates anteriores a publicacao

1. decidir e aplicar a licenca do LumenRAG e confirmar a redistribuicao do
   LumenVec embutido;
2. concluir revisao de marca e nome do pacote PyPI;
3. executar testes em Python 3.11, 3.12 e 3.13 nos cinco targets;
4. executar smoke nativo de startup, ingestao, busca, restart e shutdown;
5. produzir SBOM e executar scan de dependencias e malware;
6. assinar wheels e registrar proveniencia do build;
7. testar instalacao via `pipx` e `uvx` em maquinas limpas;
8. obter autorizacao explicita de publicacao;
9. publicar primeiro em TestPyPI;
10. validar TestPyPI antes de promover ao PyPI.

O builder nao possui comando de upload e nao recebe tokens de registry. Essa
separacao impede que um build local publique acidentalmente um artefato.

## Pipeline de CI

O workflow `.github/workflows/ci.yml` executa lint, testes Python nas versões
3.11--3.13, build do frontend e auditoria npm em todo push e pull request.
Quando a variável de repositório `LUMENVEC_REPOSITORY` estiver configurada nas
Actions do GitHub, ele também faz checkout do engine, gera os wheels nativos de
Windows, Linux e macOS, testa o wheel em cada runner e publica os artefatos
apenas como artifacts da execução. A variável opcional `LUMENVEC_REF` fixa uma
tag ou commit do engine para builds reproduzíveis.

O pipeline não publica no PyPI. A publicação continua sendo um gate manual após
licença, proveniência, SBOM, assinatura e autorização explícita.
