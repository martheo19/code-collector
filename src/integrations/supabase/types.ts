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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          article: string
          authority: string | null
          base_value: number
          category: string
          circle: string
          content: string
          created_at: string
          first_discovered_at: string | null
          first_discovered_by: string | null
          id: string
          rarity: Database["public"]["Enums"]["card_rarity"]
          ref: string
          source_code: string
          source_url: string | null
          status: string
          status_note: string | null
          summary: string | null
          text_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          article: string
          authority?: string | null
          base_value?: number
          category?: string
          circle?: string
          content: string
          created_at?: string
          first_discovered_at?: string | null
          first_discovered_by?: string | null
          id?: string
          rarity?: Database["public"]["Enums"]["card_rarity"]
          ref: string
          source_code: string
          source_url?: string | null
          status?: string
          status_note?: string | null
          summary?: string | null
          text_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          article?: string
          authority?: string | null
          base_value?: number
          category?: string
          circle?: string
          content?: string
          created_at?: string
          first_discovered_at?: string | null
          first_discovered_by?: string | null
          id?: string
          rarity?: Database["public"]["Enums"]["card_rarity"]
          ref?: string
          source_code?: string
          source_url?: string | null
          status?: string
          status_note?: string | null
          summary?: string | null
          text_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          buyer_id: string | null
          card_id: string
          created_at: string
          id: string
          price: number
          seller_id: string
          sold_at: string | null
          status: string
          updated_at: string
          user_card_id: string
        }
        Insert: {
          buyer_id?: string | null
          card_id: string
          created_at?: string
          id?: string
          price: number
          seller_id: string
          sold_at?: string | null
          status?: string
          updated_at?: string
          user_card_id: string
        }
        Update: {
          buyer_id?: string | null
          card_id?: string
          created_at?: string
          id?: string
          price?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
          updated_at?: string
          user_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_card_id_fkey"
            columns: ["user_card_id"]
            isOneToOne: true
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          free_boosters_day: string | null
          free_boosters_used: number
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          balance?: number
          created_at?: string
          free_boosters_day?: string | null
          free_boosters_used?: number
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          balance?: number
          created_at?: string
          free_boosters_day?: string | null
          free_boosters_used?: number
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          created_at: string
          credits_amount: number
          id: string
          promo_code_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_amount: number
          id?: string
          promo_code_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          credits_amount: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          owner_id: string | null
          unlimited: boolean
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          credits_amount: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          owner_id?: string | null
          unlimited?: boolean
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          credits_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          owner_id?: string | null
          unlimited?: boolean
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          acquired_at: string
          card_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          card_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          card_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_listing: { Args: { p_listing_id: string }; Returns: undefined }
      cancel_listing: { Args: { p_listing_id: string }; Returns: undefined }
      create_listing: {
        Args: { p_price: number; p_user_card_id: string }
        Returns: string
      }
      draw_card: { Args: { p_user: string }; Returns: string }
      open_booster: {
        Args: never
        Returns: {
          card_id: string
          user_card_id: string
        }[]
      }
      open_free_booster: {
        Args: never
        Returns: {
          card_id: string
          user_card_id: string
        }[]
      }
      random_rarity: {
        Args: never
        Returns: Database["public"]["Enums"]["card_rarity"]
      }
      redeem_promo_code: {
        Args: { p_code: string }
        Returns: {
          credits_amount: number
          new_balance: number
        }[]
      }
    }
    Enums: {
      card_rarity:
        | "commune"
        | "peu_commune"
        | "rare"
        | "epique"
        | "legendaire"
        | "mythique"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      card_rarity: [
        "commune",
        "peu_commune",
        "rare",
        "epique",
        "legendaire",
        "mythique",
      ],
    },
  },
} as const
