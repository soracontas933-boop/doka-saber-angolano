import { motion } from "framer-motion";
import { FileText, BookOpen, HelpCircle, ClipboardList, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const cards = [
  {
    title: "Gerar Trabalho Escolar",
    description: "Crie trabalhos completos com capa, índice, introdução, desenvolvimento e conclusão.",
    icon: FileText,
    to: "/trabalho",
    gradient: "from-primary to-secondary",
  },
  {
    title: "Resumo do Caderno",
    description: "Tire fotos do caderno e obtenha resumos com flashcards e mapas mentais.",
    icon: BookOpen,
    to: "/resumo",
    gradient: "from-secondary to-primary",
  },
  {
    title: "Questionário Interativo",
    description: "Gere questionários a partir do conteúdo com correção automática.",
    icon: HelpCircle,
    to: "/questionario",
    gradient: "from-primary to-secondary",
  },
  {
    title: "Plano de Aula",
    description: "Crie planos de aula horizontais e verticais no formato INIDE.",
    icon: ClipboardList,
    to: "/plano-aula",
    gradient: "from-secondary to-primary",
  },
  {
    title: "Corrigir Trabalho",
    description: "Envia o teu trabalho e o DOKA corrige tudo automaticamente.",
    icon: Search,
    to: "/correcao",
    gradient: "from-primary to-secondary",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
          Olá, bem-vindo! 👋
        </h1>
        <p className="text-muted-foreground mb-8">
          O que deseja criar hoje?
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {cards.map((card) => (
          <motion.button
            key={card.to}
            variants={item}
            onClick={() => navigate(card.to)}
            className="group relative bg-card border border-border rounded-2xl p-6 text-left shadow-card hover:shadow-card-hover transition-shadow duration-200 cursor-pointer"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} mb-4`}>
              <card.icon className="h-5 w-5 text-secondary-foreground" />
            </div>
            <h2 className="text-base font-display font-semibold mb-1 text-card-foreground">
              {card.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default Dashboard;
