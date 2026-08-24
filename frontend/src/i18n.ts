export type Language = "en" | "pt-BR";

const copy = {
  en: {
    overview: "Overview", chat: "Chat", knowledge: "Knowledge", evaluation: "Evaluation", operations: "Operations", explorer: "LumenVec Explorer", exploreVectorMap: "Explore vector map", vectorMapPreview: "Vector map preview",
    configureAi: "Configure AI", language: "Language", indexed: "indexed", documents: "documents", filter: "filter", filters: "filters",
    clearChat: "Clear chat", noDocuments: "No documents indexed yet.", uploadPrompt: "Upload files to create a knowledge base before chatting.", upload: "Upload files",
    generating: "Generating an answer from your documents...", askSelected: (n: number) => `Ask using ${n} selected document(s)...`, ask: "Ask something about the indexed files...",
    emptyTitle: "Chat with your knowledge base", emptyDescription: "Ask questions, request summaries, and explore the files indexed in this collection.",
    scope: "Chat scope", clear: "clear", noFilterDocs: "No documents available to filter.",
    searchPlaceholder: "Search the web...", thinkPlaceholder: "Think deeply...", canvasPlaceholder: "Create on canvas...",
    search: "Search", think: "Think", canvas: "Canvas", attach: "Attach files", stop: "Stop generating", send: "Send message", sourcesTitle: "Answer sources", sourcesEmpty: "Sources retrieved for the latest answer will appear here.", collapseSidebar: "Collapse sidebar", expandSidebar: "Expand sidebar", experienceMode: "Experience mode", researchMode: "Research mode", userMode: "User mode", researchModeHint: "Sources and evaluations are visible", userModeHint: "Simple chat without technical details"
  },
  "pt-BR": {
    overview: "Visão geral", chat: "Chat", knowledge: "Base", evaluation: "Avaliação", operations: "Operação", explorer: "LumenVec Explorer", exploreVectorMap: "Explorar mapa vetorial", vectorMapPreview: "Prévia do mapa vetorial",
    configureAi: "Configurar IA", language: "Idioma", indexed: "indexado", documents: "documentos", filter: "filtro", filters: "filtros",
    clearChat: "Limpar chat", noDocuments: "Nenhum documento indexado ainda.", uploadPrompt: "Envie arquivos para criar uma base de conhecimento antes de conversar.", upload: "Enviar arquivos",
    generating: "Gerando resposta com base nos documentos...", askSelected: (n: number) => `Pergunte usando ${n} documento(s) selecionado(s)...`, ask: "Pergunte algo sobre os arquivos indexados...",
    emptyTitle: "Converse com sua base de conhecimento", emptyDescription: "Faça perguntas, peça resumos e explore os arquivos indexados nesta collection.",
    scope: "Escopo do chat", clear: "limpar", noFilterDocs: "Nenhum documento disponível para filtrar.",
    searchPlaceholder: "Pesquisar na web...", thinkPlaceholder: "Pensar profundamente...", canvasPlaceholder: "Criar no canvas...",
    search: "Pesquisar", think: "Pensar", canvas: "Canvas", attach: "Anexar arquivos", stop: "Parar geração", send: "Enviar mensagem", sourcesTitle: "Fontes da resposta", sourcesEmpty: "As fontes recuperadas da última resposta aparecerão aqui.", collapseSidebar: "Recolher menu lateral", expandSidebar: "Expandir menu lateral", experienceMode: "Modo de experiência", researchMode: "Modo pesquisa", userMode: "Modo usuário", researchModeHint: "Fontes e avaliações estão visíveis", userModeHint: "Chat simples sem detalhes técnicos"
  }
} as const;

export function t(language: Language, key: keyof typeof copy.en, ...args: number[]): string {
  const value = copy[language][key] ?? copy.en[key];
  return typeof value === "function" ? (value as (n: number) => string)(args[0] ?? 0) : value;
}

export function tr(language: Language, english: string, portuguese: string): string {
  return language === "pt-BR" ? portuguese : english;
}
