// ─── Base de Referências Académicas Reais e Verificáveis ─────────
// Todas as referências listadas são de obras, autores e publicações reais.

export interface ReferenciaReal {
  autor: string;
  ano: number;
  titulo: string;
  editora: string;
  local: string;
  paginaExemplo: string; // página para citação inline
  apa: string; // referência formatada em APA
}

export interface CategoriaReferencias {
  categoria: string;
  disciplinas: string[]; // disciplinas que mapeiam para esta categoria
  referencias: ReferenciaReal[];
}

export const bancoCategorias: CategoriaReferencias[] = [
  {
    categoria: "Educação",
    disciplinas: ["Educação Moral e Cívica", "Educação Visual", "Pedagogia", "Geral"],
    referencias: [
      { autor: "Freire", ano: 1996, titulo: "Pedagogia da Autonomia", editora: "Paz e Terra", local: "São Paulo", paginaExemplo: "p. 45", apa: "Freire, P. (1996). Pedagogia da Autonomia: Saberes Necessários à Prática Educativa. Paz e Terra." },
      { autor: "Freire", ano: 1970, titulo: "Pedagogia do Oprimido", editora: "Paz e Terra", local: "São Paulo", paginaExemplo: "p. 78", apa: "Freire, P. (1970). Pedagogia do Oprimido. Paz e Terra." },
      { autor: "Libâneo", ano: 1994, titulo: "Didática", editora: "Cortez", local: "São Paulo", paginaExemplo: "p. 32", apa: "Libâneo, J. C. (1994). Didática. Cortez Editora." },
      { autor: "Saviani", ano: 2008, titulo: "Escola e Democracia", editora: "Autores Associados", local: "Campinas", paginaExemplo: "p. 56", apa: "Saviani, D. (2008). Escola e Democracia (41ª ed.). Autores Associados." },
      { autor: "Piaget", ano: 1973, titulo: "A Epistemologia Genética", editora: "Vozes", local: "Petrópolis", paginaExemplo: "p. 23", apa: "Piaget, J. (1973). A Epistemologia Genética. Editora Vozes." },
      { autor: "Vygotsky", ano: 1991, titulo: "A Formação Social da Mente", editora: "Martins Fontes", local: "São Paulo", paginaExemplo: "p. 67", apa: "Vygotsky, L. S. (1991). A Formação Social da Mente. Martins Fontes." },
      { autor: "MED Angola", ano: 2014, titulo: "Currículo do Ensino Primário", editora: "INIDE", local: "Luanda", paginaExemplo: "p. 15", apa: "Ministério da Educação de Angola. (2014). Currículo do Ensino Primário. INIDE." },
      { autor: "MED Angola", ano: 2001, titulo: "Lei de Bases do Sistema de Educação", editora: "Imprensa Nacional", local: "Luanda", paginaExemplo: "Art. 4", apa: "República de Angola. (2001). Lei nº 13/01 — Lei de Bases do Sistema de Educação. Imprensa Nacional." },
      { autor: "UNESCO", ano: 2015, titulo: "Educação 2030: Declaração de Incheon", editora: "UNESCO", local: "Paris", paginaExemplo: "p. 8", apa: "UNESCO. (2015). Educação 2030: Declaração de Incheon e Marco de Ação. UNESCO." },
      { autor: "Delors", ano: 1996, titulo: "Educação: Um Tesouro a Descobrir", editora: "Cortez/UNESCO", local: "São Paulo", paginaExemplo: "p. 89", apa: "Delors, J. (1996). Educação: Um Tesouro a Descobrir — Relatório para a UNESCO. Cortez Editora." },
    ],
  },
  {
    categoria: "História",
    disciplinas: ["História"],
    referencias: [
      { autor: "Ki-Zerbo", ano: 2010, titulo: "História Geral da África I", editora: "UNESCO", local: "Brasília", paginaExemplo: "p. 34", apa: "Ki-Zerbo, J. (2010). História Geral da África I: Metodologia e Pré-História da África. UNESCO." },
      { autor: "M'Bokolo", ano: 2009, titulo: "África Negra: História e Civilizações", editora: "EDUFBA", local: "Salvador", paginaExemplo: "p. 112", apa: "M'Bokolo, E. (2009). África Negra: História e Civilizações — Tomo I. EDUFBA." },
      { autor: "Birmingham", ano: 2015, titulo: "A Short History of Modern Angola", editora: "Oxford University Press", local: "Oxford", paginaExemplo: "p. 45", apa: "Birmingham, D. (2015). A Short History of Modern Angola. Oxford University Press." },
      { autor: "Wheeler & Pélissier", ano: 2009, titulo: "História de Angola", editora: "Tinta-da-China", local: "Lisboa", paginaExemplo: "p. 78", apa: "Wheeler, D., & Pélissier, R. (2009). História de Angola. Tinta-da-China." },
      { autor: "Neto", ano: 1979, titulo: "Sagrada Esperança", editora: "Sá da Costa", local: "Lisboa", paginaExemplo: "p. 22", apa: "Neto, A. (1979). Sagrada Esperança. Sá da Costa Editora." },
      { autor: "Cabral", ano: 1974, titulo: "Unidade e Luta", editora: "Seara Nova", local: "Lisboa", paginaExemplo: "p. 56", apa: "Cabral, A. (1974). Unidade e Luta. Seara Nova." },
      { autor: "Pinto de Andrade", ano: 1997, titulo: "Origens do Nacionalismo Africano", editora: "Dom Quixote", local: "Lisboa", paginaExemplo: "p. 90", apa: "Andrade, M. P. de. (1997). Origens do Nacionalismo Africano. Dom Quixote." },
      { autor: "Bender", ano: 2004, titulo: "Angola under the Portuguese", editora: "Africa World Press", local: "Trenton", paginaExemplo: "p. 134", apa: "Bender, G. J. (2004). Angola under the Portuguese: The Myth and the Reality. Africa World Press." },
      { autor: "Heywood", ano: 2000, titulo: "Contested Power in Angola", editora: "University of Rochester Press", local: "Rochester", paginaExemplo: "p. 67", apa: "Heywood, L. M. (2000). Contested Power in Angola, 1840s to the Present. University of Rochester Press." },
      { autor: "Hodges", ano: 2001, titulo: "Angola from Afro-Stalinism to Petro-Diamond Capitalism", editora: "James Currey", local: "Oxford", paginaExemplo: "p. 89", apa: "Hodges, T. (2001). Angola from Afro-Stalinism to Petro-Diamond Capitalism. James Currey." },
    ],
  },
  {
    categoria: "Geografia",
    disciplinas: ["Geografia"],
    referencias: [
      { autor: "Santos", ano: 2006, titulo: "A Natureza do Espaço", editora: "EDUSP", local: "São Paulo", paginaExemplo: "p. 45", apa: "Santos, M. (2006). A Natureza do Espaço: Técnica e Tempo, Razão e Emoção (4ª ed.). EDUSP." },
      { autor: "Santos", ano: 2000, titulo: "Por uma Outra Globalização", editora: "Record", local: "Rio de Janeiro", paginaExemplo: "p. 67", apa: "Santos, M. (2000). Por uma Outra Globalização: Do Pensamento Único à Consciência Universal. Record." },
      { autor: "Amaral", ano: 1996, titulo: "O Reino do Congo, os Mbundu, o Reino dos Ngola", editora: "ICALP", local: "Lisboa", paginaExemplo: "p. 34", apa: "Amaral, I. do. (1996). O Reino do Congo, os Mbundu (ou Ambundos), o Reino dos 'Ngola'. ICALP." },
      { autor: "Diniz", ano: 2006, titulo: "Características Mesológicas de Angola", editora: "IPAD", local: "Lisboa", paginaExemplo: "p. 23", apa: "Diniz, A. C. (2006). Características Mesológicas de Angola (2ª ed.). IPAD." },
      { autor: "Ab'Saber", ano: 2003, titulo: "Os Domínios de Natureza no Brasil", editora: "Ateliê Editorial", local: "São Paulo", paginaExemplo: "p. 78", apa: "Ab'Saber, A. N. (2003). Os Domínios de Natureza no Brasil: Potencialidades Paisagísticas. Ateliê Editorial." },
      { autor: "PNUD", ano: 2020, titulo: "Relatório do Desenvolvimento Humano", editora: "PNUD", local: "Nova Iorque", paginaExemplo: "p. 56", apa: "PNUD. (2020). Relatório do Desenvolvimento Humano 2020. Programa das Nações Unidas para o Desenvolvimento." },
      { autor: "INE Angola", ano: 2016, titulo: "Resultados Definitivos do Recenseamento Geral da População e Habitação", editora: "INE", local: "Luanda", paginaExemplo: "p. 12", apa: "Instituto Nacional de Estatística. (2016). Resultados Definitivos do Recenseamento Geral da População e Habitação de Angola 2014. INE." },
    ],
  },
  {
    categoria: "Língua Portuguesa",
    disciplinas: ["Português"],
    referencias: [
      { autor: "Cunha & Cintra", ano: 2017, titulo: "Nova Gramática do Português Contemporâneo", editora: "Lexikon", local: "Rio de Janeiro", paginaExemplo: "p. 145", apa: "Cunha, C., & Cintra, L. F. L. (2017). Nova Gramática do Português Contemporâneo (7ª ed.). Lexikon." },
      { autor: "Pepetela", ano: 1992, titulo: "A Geração da Utopia", editora: "Dom Quixote", local: "Lisboa", paginaExemplo: "p. 89", apa: "Pepetela. (1992). A Geração da Utopia. Dom Quixote." },
      { autor: "Pepetela", ano: 1980, titulo: "Mayombe", editora: "Edições 70", local: "Lisboa", paginaExemplo: "p. 34", apa: "Pepetela. (1980). Mayombe. Edições 70." },
      { autor: "Vieira", ano: 1974, titulo: "Luuanda", editora: "Edições 70", local: "Lisboa", paginaExemplo: "p. 56", apa: "Vieira, J. L. (1974). Luuanda (3ª ed.). Edições 70." },
      { autor: "Ervedosa", ano: 1979, titulo: "Roteiro da Literatura Angolana", editora: "UEA", local: "Luanda", paginaExemplo: "p. 78", apa: "Ervedosa, C. (1979). Roteiro da Literatura Angolana (3ª ed.). União dos Escritores Angolanos." },
      { autor: "Ferreira", ano: 1977, titulo: "Literaturas Africanas de Expressão Portuguesa", editora: "ICALP", local: "Lisboa", paginaExemplo: "p. 45", apa: "Ferreira, M. (1977). Literaturas Africanas de Expressão Portuguesa (Vol. I). ICALP." },
      { autor: "Xitu", ano: 1974, titulo: "Mestre Tamoda", editora: "Edições 70", local: "Lisboa", paginaExemplo: "p. 23", apa: "Xitu, U. (1974). Mestre Tamoda. Edições 70." },
      { autor: "Ruy Duarte de Carvalho", ano: 1999, titulo: "Vou lá Visitar Pastores", editora: "Cotovia", local: "Lisboa", paginaExemplo: "p. 67", apa: "Carvalho, R. D. de. (1999). Vou lá Visitar Pastores. Cotovia." },
    ],
  },
  {
    categoria: "Biologia",
    disciplinas: ["Biologia"],
    referencias: [
      { autor: "Campbell & Reece", ano: 2010, titulo: "Biologia", editora: "Artmed", local: "Porto Alegre", paginaExemplo: "p. 234", apa: "Campbell, N. A., & Reece, J. B. (2010). Biologia (8ª ed.). Artmed." },
      { autor: "Amabis & Martho", ano: 2006, titulo: "Biologia Moderna", editora: "Moderna", local: "São Paulo", paginaExemplo: "p. 156", apa: "Amabis, J. M., & Martho, G. R. (2006). Biologia Moderna (Vol. 1). Editora Moderna." },
      { autor: "Darwin", ano: 1859, titulo: "A Origem das Espécies", editora: "Lello & Irmão", local: "Porto", paginaExemplo: "p. 45", apa: "Darwin, C. (1859). A Origem das Espécies por Meio da Selecção Natural. Lello & Irmão." },
      { autor: "Wilson", ano: 1992, titulo: "The Diversity of Life", editora: "Harvard University Press", local: "Cambridge", paginaExemplo: "p. 89", apa: "Wilson, E. O. (1992). The Diversity of Life. Harvard University Press." },
      { autor: "OMS", ano: 2021, titulo: "World Health Statistics", editora: "WHO", local: "Genebra", paginaExemplo: "p. 12", apa: "Organização Mundial da Saúde. (2021). World Health Statistics 2021. WHO." },
      { autor: "Huntley", ano: 2019, titulo: "Biodiversity of Angola", editora: "Springer", local: "Cham", paginaExemplo: "p. 67", apa: "Huntley, B. J. (2019). Biodiversity of Angola: Science & Conservation. Springer." },
    ],
  },
  {
    categoria: "Física e Química",
    disciplinas: ["Física", "Química"],
    referencias: [
      { autor: "Halliday, Resnick & Walker", ano: 2016, titulo: "Fundamentos de Física", editora: "LTC", local: "Rio de Janeiro", paginaExemplo: "p. 123", apa: "Halliday, D., Resnick, R., & Walker, J. (2016). Fundamentos de Física (10ª ed., Vol. 1). LTC." },
      { autor: "Atkins & Jones", ano: 2012, titulo: "Princípios de Química", editora: "Bookman", local: "Porto Alegre", paginaExemplo: "p. 89", apa: "Atkins, P., & Jones, L. (2012). Princípios de Química: Questionando a Vida Moderna (5ª ed.). Bookman." },
      { autor: "Feltre", ano: 2004, titulo: "Química", editora: "Moderna", local: "São Paulo", paginaExemplo: "p. 67", apa: "Feltre, R. (2004). Química (Vol. 1, 6ª ed.). Editora Moderna." },
      { autor: "Nussenzveig", ano: 2013, titulo: "Curso de Física Básica", editora: "Edgard Blücher", local: "São Paulo", paginaExemplo: "p. 45", apa: "Nussenzveig, H. M. (2013). Curso de Física Básica (Vol. 1, 5ª ed.). Edgard Blücher." },
      { autor: "Einstein", ano: 1905, titulo: "Sobre a Eletrodinâmica dos Corpos em Movimento", editora: "Annalen der Physik", local: "Berlim", paginaExemplo: "p. 891", apa: "Einstein, A. (1905). Zur Elektrodynamik bewegter Körper. Annalen der Physik, 17, 891-921." },
      { autor: "Lavoisier", ano: 1789, titulo: "Traité Élémentaire de Chimie", editora: "Cuchet", local: "Paris", paginaExemplo: "p. 34", apa: "Lavoisier, A. L. (1789). Traité Élémentaire de Chimie. Cuchet." },
    ],
  },
  {
    categoria: "Matemática",
    disciplinas: ["Matemática"],
    referencias: [
      { autor: "Stewart", ano: 2016, titulo: "Cálculo", editora: "Cengage Learning", local: "São Paulo", paginaExemplo: "p. 234", apa: "Stewart, J. (2016). Cálculo (Vol. 1, 8ª ed.). Cengage Learning." },
      { autor: "Iezzi et al.", ano: 2013, titulo: "Matemática: Ciência e Aplicações", editora: "Saraiva", local: "São Paulo", paginaExemplo: "p. 89", apa: "Iezzi, G., Dolce, O., Degenszajn, D., & Périgo, R. (2013). Matemática: Ciência e Aplicações (Vol. 1, 8ª ed.). Saraiva." },
      { autor: "Boyer", ano: 2012, titulo: "História da Matemática", editora: "Edgard Blücher", local: "São Paulo", paginaExemplo: "p. 45", apa: "Boyer, C. B. (2012). História da Matemática (3ª ed.). Edgard Blücher." },
      { autor: "Dante", ano: 2016, titulo: "Matemática: Contexto e Aplicações", editora: "Ática", local: "São Paulo", paginaExemplo: "p. 67", apa: "Dante, L. R. (2016). Matemática: Contexto e Aplicações (Vol. 1, 4ª ed.). Ática." },
      { autor: "Polya", ano: 1945, titulo: "How to Solve It", editora: "Princeton University Press", local: "Princeton", paginaExemplo: "p. 12", apa: "Polya, G. (1945). How to Solve It: A New Aspect of Mathematical Method. Princeton University Press." },
    ],
  },
  {
    categoria: "Filosofia e Sociologia",
    disciplinas: ["Filosofia", "Sociologia"],
    referencias: [
      { autor: "Aristóteles", ano: 2009, titulo: "Ética a Nicómaco", editora: "Quetzal", local: "Lisboa", paginaExemplo: "p. 45", apa: "Aristóteles. (2009). Ética a Nicómaco (Trad. A. C. Caeiro). Quetzal Editores." },
      { autor: "Platão", ano: 2001, titulo: "A República", editora: "Fundação Calouste Gulbenkian", local: "Lisboa", paginaExemplo: "p. 234", apa: "Platão. (2001). A República (Trad. M. H. R. Pereira, 9ª ed.). Fundação Calouste Gulbenkian." },
      { autor: "Fanon", ano: 1961, titulo: "Os Condenados da Terra", editora: "Ulisseia", local: "Lisboa", paginaExemplo: "p. 78", apa: "Fanon, F. (1961). Os Condenados da Terra. Ulisseia." },
      { autor: "Boaventura de Sousa Santos", ano: 2002, titulo: "A Globalização e as Ciências Sociais", editora: "Cortez", local: "São Paulo", paginaExemplo: "p. 56", apa: "Santos, B. de S. (2002). A Globalização e as Ciências Sociais (2ª ed.). Cortez." },
      { autor: "Durkheim", ano: 2007, titulo: "As Regras do Método Sociológico", editora: "Martins Fontes", local: "São Paulo", paginaExemplo: "p. 34", apa: "Durkheim, É. (2007). As Regras do Método Sociológico (3ª ed.). Martins Fontes." },
      { autor: "Weber", ano: 2004, titulo: "A Ética Protestante e o Espírito do Capitalismo", editora: "Companhia das Letras", local: "São Paulo", paginaExemplo: "p. 89", apa: "Weber, M. (2004). A Ética Protestante e o Espírito do Capitalismo. Companhia das Letras." },
      { autor: "Hountondji", ano: 1983, titulo: "African Philosophy: Myth and Reality", editora: "Indiana University Press", local: "Bloomington", paginaExemplo: "p. 45", apa: "Hountondji, P. J. (1983). African Philosophy: Myth and Reality. Indiana University Press." },
      { autor: "Mbembe", ano: 2014, titulo: "Crítica da Razão Negra", editora: "Antígona", local: "Lisboa", paginaExemplo: "p. 67", apa: "Mbembe, A. (2014). Crítica da Razão Negra. Antígona." },
    ],
  },
  {
    categoria: "Direito e Economia",
    disciplinas: ["Direito", "Economia", "Contabilidade", "Gestão"],
    referencias: [
      { autor: "Constituição de Angola", ano: 2010, titulo: "Constituição da República de Angola", editora: "Imprensa Nacional", local: "Luanda", paginaExemplo: "Art. 21", apa: "República de Angola. (2010). Constituição da República de Angola. Imprensa Nacional." },
      { autor: "Samuelson & Nordhaus", ano: 2010, titulo: "Economia", editora: "McGraw-Hill", local: "Lisboa", paginaExemplo: "p. 45", apa: "Samuelson, P. A., & Nordhaus, W. D. (2010). Economia (19ª ed.). McGraw-Hill." },
      { autor: "Mankiw", ano: 2014, titulo: "Introdução à Economia", editora: "Cengage Learning", local: "São Paulo", paginaExemplo: "p. 89", apa: "Mankiw, N. G. (2014). Introdução à Economia (6ª ed.). Cengage Learning." },
      { autor: "Chiavenato", ano: 2014, titulo: "Introdução à Teoria Geral da Administração", editora: "Manole", local: "Barueri", paginaExemplo: "p. 56", apa: "Chiavenato, I. (2014). Introdução à Teoria Geral da Administração (9ª ed.). Manole." },
      { autor: "Banco Mundial", ano: 2021, titulo: "Angola Economic Update", editora: "World Bank", local: "Washington", paginaExemplo: "p. 23", apa: "Banco Mundial. (2021). Angola Economic Update: Putting Oil Revenue to Work. World Bank." },
      { autor: "CEIC", ano: 2019, titulo: "Relatório Económico de Angola", editora: "Universidade Católica de Angola", local: "Luanda", paginaExemplo: "p. 34", apa: "CEIC. (2019). Relatório Económico de Angola 2018. Centro de Estudos e Investigação Científica, Universidade Católica de Angola." },
    ],
  },
  {
    categoria: "Língua Inglesa",
    disciplinas: ["Inglês"],
    referencias: [
      { autor: "Murphy", ano: 2019, titulo: "English Grammar in Use", editora: "Cambridge University Press", local: "Cambridge", paginaExemplo: "p. 34", apa: "Murphy, R. (2019). English Grammar in Use (5th ed.). Cambridge University Press." },
      { autor: "Crystal", ano: 2003, titulo: "English as a Global Language", editora: "Cambridge University Press", local: "Cambridge", paginaExemplo: "p. 56", apa: "Crystal, D. (2003). English as a Global Language (2nd ed.). Cambridge University Press." },
      { autor: "Achebe", ano: 1958, titulo: "Things Fall Apart", editora: "Heinemann", local: "Londres", paginaExemplo: "p. 89", apa: "Achebe, C. (1958). Things Fall Apart. Heinemann." },
      { autor: "Ngugi wa Thiong'o", ano: 1986, titulo: "Decolonising the Mind", editora: "James Currey", local: "Oxford", paginaExemplo: "p. 12", apa: "Ngugi wa Thiong'o. (1986). Decolonising the Mind: The Politics of Language in African Literature. James Currey." },
    ],
  },
  {
    categoria: "Informática",
    disciplinas: ["Informática"],
    referencias: [
      { autor: "Tanenbaum", ano: 2015, titulo: "Sistemas Operacionais Modernos", editora: "Pearson", local: "São Paulo", paginaExemplo: "p. 78", apa: "Tanenbaum, A. S. (2015). Sistemas Operacionais Modernos (4ª ed.). Pearson." },
      { autor: "Kurose & Ross", ano: 2013, titulo: "Redes de Computadores e a Internet", editora: "Pearson", local: "São Paulo", paginaExemplo: "p. 45", apa: "Kurose, J. F., & Ross, K. W. (2013). Redes de Computadores e a Internet (6ª ed.). Pearson." },
      { autor: "Cormen et al.", ano: 2009, titulo: "Introduction to Algorithms", editora: "MIT Press", local: "Cambridge", paginaExemplo: "p. 123", apa: "Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2009). Introduction to Algorithms (3rd ed.). MIT Press." },
      { autor: "Pressman", ano: 2014, titulo: "Engenharia de Software", editora: "McGraw-Hill", local: "Porto Alegre", paginaExemplo: "p. 56", apa: "Pressman, R. S. (2014). Engenharia de Software: Uma Abordagem Profissional (8ª ed.). McGraw-Hill." },
    ],
  },
];

// ─── Funções de acesso ─────────────────────────────────────────

/**
 * Retorna as referências reais para uma dada disciplina.
 * Se a disciplina não for encontrada, retorna as de "Educação".
 */
export function getReferenciasParaDisciplina(disciplina: string): ReferenciaReal[] {
  const cat = bancoCategorias.find((c) =>
    c.disciplinas.some((d) => d.toLowerCase() === disciplina.toLowerCase())
  );
  const educacao = bancoCategorias.find((c) => c.categoria === "Educação")!;
  const refs = cat ? cat.referencias : educacao.referencias;
  // Always include some education refs for cross-disciplinary citations
  if (cat && cat.categoria !== "Educação") {
    const eduExtras = educacao.referencias.slice(0, 3);
    return [...refs, ...eduExtras];
  }
  return refs;
}

/**
 * Formata uma lista de referências em texto para injectar no prompt da IA.
 */
export function formatarReferenciasParaPrompt(refs: ReferenciaReal[]): string {
  return refs
    .map((r) => `- ${r.apa} [Citação: (${r.autor}, ${r.ano}, ${r.paginaExemplo})]`)
    .join("\n");
}

/**
 * Valida referências geradas pela IA contra o banco real.
 * Retorna as que são válidas + substitui inválidas por reais da mesma categoria.
 */
export function validarBibliografia(
  textoBibliografia: string,
  disciplina: string
): string {
  const refs = getReferenciasParaDisciplina(disciplina);
  const linhas = textoBibliografia.split("\n").filter((l) => l.trim().length > 5);

  const resultado: string[] = [];
  const usadas = new Set<number>();

  for (const linha of linhas) {
    // Check if any real reference author+year appears in this line
    const match = refs.findIndex(
      (r, idx) =>
        !usadas.has(idx) &&
        linha.includes(r.autor.split(" ")[0]) &&
        linha.includes(String(r.ano))
    );

    if (match >= 0) {
      // Valid — keep the real APA formatted version
      resultado.push(refs[match].apa);
      usadas.add(match);
    }
    // Invalid line — skip (will be replaced below)
  }

  // Ensure at least 5 references
  if (resultado.length < 5) {
    for (let i = 0; i < refs.length && resultado.length < 6; i++) {
      if (!usadas.has(i)) {
        resultado.push(refs[i].apa);
        usadas.add(i);
      }
    }
  }

  return resultado.map((r) => `- ${r}`).join("\n\n");
}
