export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_roles: {
        Row: {
          atualizado_em: string
          concedido_por: string
          criado_em: string
          id: string
          permissions: string[]
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          concedido_por: string
          criado_em?: string
          id?: string
          permissions?: string[]
          user_id: string
        }
        Update: {
          atualizado_em?: string
          concedido_por?: string
          criado_em?: string
          id?: string
          permissions?: string[]
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          ativo: boolean
          chave: string
          criado_em: string
          id: string
          prioridade: number
          servico: string
          ultimo_erro: string | null
        }
        Insert: {
          ativo?: boolean
          chave: string
          criado_em?: string
          id?: string
          prioridade?: number
          servico: string
          ultimo_erro?: string | null
        }
        Update: {
          ativo?: boolean
          chave?: string
          criado_em?: string
          id?: string
          prioridade?: number
          servico?: string
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          categoria: string | null
          criado_em: string
          descricao: string
          id: string
          plano: string | null
          tipo: string
          user_email: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          criado_em?: string
          descricao: string
          id?: string
          plano?: string | null
          tipo?: string
          user_email?: string | null
          valor?: number
        }
        Update: {
          categoria?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          plano?: string | null
          tipo?: string
          user_email?: string | null
          valor?: number
        }
        Relationships: []
      }
      book_categories: {
        Row: {
          ativo: boolean
          criado_em: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      book_library: {
        Row: {
          book_id: string
          id: string
          metodo: string
          obtido_em: string
          user_id: string
        }
        Insert: {
          book_id: string
          id?: string
          metodo?: string
          obtido_em?: string
          user_id: string
        }
        Update: {
          book_id?: string
          id?: string
          metodo?: string
          obtido_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_library_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_purchase_requests: {
        Row: {
          atualizado_em: string
          book_id: string
          criado_em: string
          email_confirmacao: string
          estado: string
          ficheiro_url: string | null
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          book_id: string
          criado_em?: string
          email_confirmacao: string
          estado?: string
          ficheiro_url?: string | null
          id?: string
          user_id: string
          valor?: number
        }
        Update: {
          atualizado_em?: string
          book_id?: string
          criado_em?: string
          email_confirmacao?: string
          estado?: string
          ficheiro_url?: string | null
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_purchase_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          atualizado_em: string
          autor: string
          capa_url: string | null
          category_id: string | null
          classe: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          destaque: boolean
          downloads: number
          ficheiro_path: string
          gratuito: boolean
          id: string
          idioma: string | null
          isbn: string | null
          paginas: number | null
          preco_creditos: number
          preco_kz: number
          publicado: boolean
          titulo: string
          visualizacoes: number
        }
        Insert: {
          atualizado_em?: string
          autor: string
          capa_url?: string | null
          category_id?: string | null
          classe?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          downloads?: number
          ficheiro_path: string
          gratuito?: boolean
          id?: string
          idioma?: string | null
          isbn?: string | null
          paginas?: number | null
          preco_creditos?: number
          preco_kz?: number
          publicado?: boolean
          titulo: string
          visualizacoes?: number
        }
        Update: {
          atualizado_em?: string
          autor?: string
          capa_url?: string | null
          category_id?: string | null
          classe?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          downloads?: number
          ficheiro_path?: string
          gratuito?: boolean
          id?: string
          idioma?: string | null
          isbn?: string | null
          paginas?: number | null
          preco_creditos?: number
          preco_kz?: number
          publicado?: boolean
          titulo?: string
          visualizacoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "book_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      button_covers: {
        Row: {
          atualizado_em: string
          button_key: string
          criado_em: string
          id: string
          image_url: string
          label: string | null
        }
        Insert: {
          atualizado_em?: string
          button_key: string
          criado_em?: string
          id?: string
          image_url: string
          label?: string | null
        }
        Update: {
          atualizado_em?: string
          button_key?: string
          criado_em?: string
          id?: string
          image_url?: string
          label?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          plano: string
          sale_id: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          plano: string
          sale_id?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          plano?: string
          sale_id?: string | null
          status?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          ativo: boolean
          creditos: number
          criado_em: string
          id: string
          nome: string
          ordem: number
          preco: number
        }
        Insert: {
          ativo?: boolean
          creditos: number
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          preco: number
        }
        Update: {
          ativo?: boolean
          creditos?: number
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          preco?: number
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          ordem: number
          tipo: string
          url: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          ordem?: number
          tipo?: string
          url: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          ordem?: number
          tipo?: string
          url?: string
          video_url?: string | null
        }
        Relationships: []
      }
      landing_sections: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          conteudo: Json
          criado_em: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          conteudo?: Json
          criado_em?: string | null
          id?: string
          ordem?: number
          tipo: string
          titulo?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          conteudo?: Json
          criado_em?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          atualizado_em: string
          criado_em: string
          email_confirmacao: string
          estado: string
          ficheiro_url: string | null
          id: string
          plano: string
          user_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email_confirmacao: string
          estado?: string
          ficheiro_url?: string | null
          id?: string
          plano: string
          user_id: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email_confirmacao?: string
          estado?: string
          ficheiro_url?: string | null
          id?: string
          plano?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          atualizado_em: string
          chave: string
          id: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          id?: string
          valor: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          funcao: string | null
          genero: string | null
          id: string
          idade: number | null
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          funcao?: string | null
          genero?: string | null
          id: string
          idade?: number | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          funcao?: string | null
          genero?: string | null
          id?: string
          idade?: number | null
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          atualizado_em: string
          conteudo: Json
          criado_em: string
          id: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          conteudo?: Json
          criado_em?: string
          id?: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          conteudo?: Json
          criado_em?: string
          id?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          atualizado_em: string
          chave: string
          id: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          id?: string
          valor?: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      study_group_invites: {
        Row: {
          convidado_por: string
          criado_em: string
          email: string
          estado: string
          group_id: string
          id: string
        }
        Insert: {
          convidado_por: string
          criado_em?: string
          email: string
          estado?: string
          group_id: string
          id?: string
        }
        Update: {
          convidado_por?: string
          criado_em?: string
          email?: string
          estado?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          aceite: boolean
          cor: string
          creditos_pagos: boolean
          entrou_em: string
          group_id: string
          id: string
          nome_exibicao: string
          papel: string
          user_id: string
        }
        Insert: {
          aceite?: boolean
          cor?: string
          creditos_pagos?: boolean
          entrou_em?: string
          group_id: string
          id?: string
          nome_exibicao: string
          papel?: string
          user_id: string
        }
        Update: {
          aceite?: boolean
          cor?: string
          creditos_pagos?: boolean
          entrou_em?: string
          group_id?: string
          id?: string
          nome_exibicao?: string
          papel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          conteudo: string
          criado_em: string
          group_id: string
          id: string
          is_bot: boolean
          mencionados: string[]
          sender_cor: string
          sender_id: string | null
          sender_nome: string
        }
        Insert: {
          conteudo: string
          criado_em?: string
          group_id: string
          id?: string
          is_bot?: boolean
          mencionados?: string[]
          sender_cor?: string
          sender_id?: string | null
          sender_nome: string
        }
        Update: {
          conteudo?: string
          criado_em?: string
          group_id?: string
          id?: string
          is_bot?: boolean
          mencionados?: string[]
          sender_cor?: string
          sender_id?: string | null
          sender_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_parts: {
        Row: {
          atualizado_em: string
          conteudo: string
          criado_em: string
          defesa: Json | null
          group_id: string
          id: string
          member_id: string
          ordem: number
          titulo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          conteudo?: string
          criado_em?: string
          defesa?: Json | null
          group_id: string
          id?: string
          member_id: string
          ordem?: number
          titulo: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          conteudo?: string
          criado_em?: string
          defesa?: Json | null
          group_id?: string
          id?: string
          member_id?: string
          ordem?: number
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_parts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_parts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "study_group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          disciplina: string
          documento_final: Json | null
          estado: string
          id: string
          nome: string
          tema: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          disciplina: string
          documento_final?: Json | null
          estado?: string
          id?: string
          nome: string
          tema: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          disciplina?: string
          documento_final?: Json | null
          estado?: string
          id?: string
          nome?: string
          tema?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          assunto: string
          atualizado_em: string
          criado_em: string
          estado: string
          id: string
          mensagem: string
          resposta: string | null
          user_id: string
        }
        Insert: {
          assunto: string
          atualizado_em?: string
          criado_em?: string
          estado?: string
          id?: string
          mensagem: string
          resposta?: string | null
          user_id: string
        }
        Update: {
          assunto?: string
          atualizado_em?: string
          criado_em?: string
          estado?: string
          id?: string
          mensagem?: string
          resposta?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          criado_em: string
          id: string
          modulo: string
          servico_ia: string | null
          tokens_usados: number | null
          user_id: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          modulo: string
          servico_ia?: string | null
          tokens_usados?: number | null
          user_id?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          modulo?: string
          servico_ia?: string | null
          tokens_usados?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          atualizado_em: string
          creditos_totais: number
          creditos_usados: number
          criado_em: string
          id: string
          limite_planos_aula: number
          limite_questionarios: number
          limite_resumos: number
          limite_tfc: number
          limite_trabalhos: number
          pago_em: string | null
          periodo_inicio: string
          plano: string
          suporte_prioritario: boolean
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          creditos_totais?: number
          creditos_usados?: number
          criado_em?: string
          id?: string
          limite_planos_aula?: number
          limite_questionarios?: number
          limite_resumos?: number
          limite_tfc?: number
          limite_trabalhos?: number
          pago_em?: string | null
          periodo_inicio?: string
          plano?: string
          suporte_prioritario?: boolean
          user_id: string
        }
        Update: {
          atualizado_em?: string
          creditos_totais?: number
          creditos_usados?: number
          criado_em?: string
          id?: string
          limite_planos_aula?: number
          limite_questionarios?: number
          limite_resumos?: number
          limite_tfc?: number
          limite_trabalhos?: number
          pago_em?: string | null
          periodo_inicio?: string
          plano?: string
          suporte_prioritario?: boolean
          user_id?: string
        }
        Relationships: []
      }
      workgroup_members: {
        Row: {
          aceite: boolean
          convidado_em: string
          id: string
          papel: string
          user_id: string
          workgroup_id: string
        }
        Insert: {
          aceite?: boolean
          convidado_em?: string
          id?: string
          papel?: string
          user_id: string
          workgroup_id: string
        }
        Update: {
          aceite?: boolean
          convidado_em?: string
          id?: string
          papel?: string
          user_id?: string
          workgroup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workgroup_members_workgroup_id_fkey"
            columns: ["workgroup_id"]
            isOneToOne: false
            referencedRelation: "workgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      workgroup_projects: {
        Row: {
          adicionado_em: string
          adicionado_por: string
          id: string
          project_id: string
          workgroup_id: string
        }
        Insert: {
          adicionado_em?: string
          adicionado_por: string
          id?: string
          project_id: string
          workgroup_id: string
        }
        Update: {
          adicionado_em?: string
          adicionado_por?: string
          id?: string
          project_id?: string
          workgroup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workgroup_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workgroup_projects_workgroup_id_fkey"
            columns: ["workgroup_id"]
            isOneToOne: false
            referencedRelation: "workgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      workgroups: {
        Row: {
          criado_em: string
          criado_por: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          criado_por: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          criado_por?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceitar_convite_grupo: {
        Args: { p_cor: string; p_group_id: string; p_nome_exibicao: string }
        Returns: Json
      }
      add_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      aprovar_compra_livro: { Args: { p_request_id: string }; Returns: Json }
      comprar_livro_com_creditos: { Args: { p_book_id: string }; Returns: Json }
      consume_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          nome: string
          user_id: string
        }[]
      }
      get_admin_permissions: { Args: { _user_id: string }; Returns: string[] }
      increment_creditos_usados: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      is_study_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_study_group_owner: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_workgroup_member: {
        Args: { _user_id: string; _workgroup_id: string }
        Returns: boolean
      }
      is_workgroup_owner: {
        Args: { _user_id: string; _workgroup_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
