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
      api_keys: {
        Row: {
          ativo: boolean
          chave: string
          criado_em: string
          id: string
          servico: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          criado_em?: string
          id?: string
          servico: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          criado_em?: string
          id?: string
          servico?: string
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
      hero_images: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          ordem: number
          url: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          ordem?: number
          url: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          ordem?: number
          url?: string
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
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          nome: string
          user_id: string
        }[]
      }
      increment_creditos_usados: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_workgroup_member: {
        Args: { _user_id: string; _workgroup_id: string }
        Returns: boolean
      }
      is_workgroup_owner: {
        Args: { _user_id: string; _workgroup_id: string }
        Returns: boolean
      }
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
