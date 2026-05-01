import { Library } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MeusLivrosTab from "@/components/biblioteca/MeusLivrosTab";
import PublicarLivroTab from "@/components/biblioteca/PublicarLivroTab";
import FaturamentoAutorTab from "@/components/biblioteca/FaturamentoAutorTab";

const MinhaBibliotecaPage = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Library className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Minha Biblioteca</h1>
      </div>

      <Tabs defaultValue="meus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="meus" className="rounded-xl">Meus Livros</TabsTrigger>
          <TabsTrigger value="publicar" className="rounded-xl">Publicar Livro</TabsTrigger>
          <TabsTrigger value="faturamento" className="rounded-xl">Faturamento</TabsTrigger>
        </TabsList>
        <TabsContent value="meus"><MeusLivrosTab /></TabsContent>
        <TabsContent value="publicar"><PublicarLivroTab /></TabsContent>
        <TabsContent value="faturamento"><FaturamentoAutorTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default MinhaBibliotecaPage;
