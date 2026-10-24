export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          color: string;
          expires_at: string;
          font: string;
          id: number;
          message: string;
          shape: string;
          starts_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          color: string;
          expires_at: string;
          font: string;
          id: number;
          message: string;
          shape: string;
          starts_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          color?: string;
          expires_at?: string;
          font?: string;
          id?: number;
          message?: string;
          shape?: string;
          starts_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          article: string;
          authority: string | null;
          base_value: number;
          category: string;
          circle: string;
          content: string;
          created_at: string;
          first_discovered_at: string | null;
          first_discovered_by: string | null;
          id: string;
          rarity: Database["public"]["Enums"]["card_rarity"];
          ref: string;
          source_code: string;
          source_url: string | null;
          status: string;
          status_note: string | null;
          summary: string | null;
          text_date: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          article: string;
          authority?: string | null;
          base_value?: number;
          category?: string;
          circle?: string;
          content: string;
          created_at?: string;
          first_discovered_at?: string | null;
          first_discovered_by?: string | null;
          id?: string;
          rarity?: Database["public"]["Enums"]["card_rarity"];
          ref: string;
          source_code: string;
          source_url?: string | null;
          status?: string;
          status_note?: string | null;
          summary?: string | null;
          text_date?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          article?: string;
          authority?: string | null;
          base_value?: number;
          category?: string;
          circle?: string;
          content?: string;
          created_at?: string;
          first_discovered_at?: string | null;
          first_discovered_by?: string | null;
          id?: string;
          rarity?: Database["public"]["Enums"]["card_rarity"];
          ref?: string;
          source_code?: string;
          source_url?: string | null;
          status?: string;
          status_note?: string | null;
          summary?: string | null;
          text_date?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          buyer_id: string | null;
          card_id: string;
          created_at: string;
          id: string;
          price: number;
          seller_id: string;
          sold_at: string | null;
          status: string;
          updated_at: string;
          user_card_id: string;
        };
        Insert: {
          buyer_id?: string | null;
          card_id: string;
          created_at?: string;
          id?: string;
          price: number;
          seller_id: string;
          sold_at?: string | null;
          status?: string;
          updated_at?: string;
          user_card_id: string;
        };
        Update: {
          buyer_id?: string | null;
          card_id?: string;
          created_at?: string;
          id?: string;
          price?: number;
          seller_id?: string;
          sold_at?: string | null;
          status?: string;
          updated_at?: string;
          user_card_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_user_card_id_fkey";
            columns: ["user_card_id"];
            isOneToOne: true;
            referencedRelation: "user_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          balance: number;
          created_at: string;
          free_boosters_day: string | null;
          free_boosters_used: number;
          id: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          free_boosters_day?: string | null;
          free_boosters_used?: number;
          id: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          free_boosters_day?: string | null;
          free_boosters_used?: number;
          id?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      promo_code_redemptions: {
        Row: {
          created_at: string;
          credits_amount: number;
          id: string;
          promo_code_id: string;
          redeemed_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_amount: number;
          id?: string;
          promo_code_id: string;
          redeemed_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_amount?: number;
          id?: string;
          promo_code_id?: string;
          redeemed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: {
          code: string;
          created_at: string;
          credits_amount: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          owner_id: string | null;
          unlimited: boolean;
          updated_at: string;
          uses_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          credits_amount: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          owner_id?: string | null;
          unlimited?: boolean;
          updated_at?: string;
          uses_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          credits_amount?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          owner_id?: string | null;
          unlimited?: boolean;
          updated_at?: string;
          uses_count?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          description: string;
          id: string;
          kind: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description: string;
          id?: string;
          kind: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_cards: {
        Row: {
          acquired_at: string;
          card_id: string;
          created_at: string;
          id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          revocation_reason: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          acquired_at?: string;
          card_id: string;
          created_at?: string;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revocation_reason?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          acquired_at?: string;
          card_id?: string;
          created_at?: string;
          id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revocation_reason?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_set_announcement: {
        Args: {
          p_color: string;
          p_duration_minutes: number;
          p_font: string;
          p_message: string;
          p_shape: string;
        };
        Returns: {
          color: string;
          expires_at: string;
          font: string;
          message: string;
          shape: string;
          starts_at: string;
        }[];
      };
      admin_end_announcement: { Args: never; Returns: boolean };
      admin_adjust_balance: {
        Args: { p_delta: number; p_reason: string; p_user_id: string };
        Returns: number;
      };
      admin_apply_rollback: {
        Args: { p_reason: string; p_window_minutes: number };
        Returns: {
          cards_revoked: number;
          discoveries_reset: number;
          listings_cancelled: number;
        }[];
      };
      admin_market_history: {
        Args: { p_user_id: string };
        Returns: {
          buyer_id: string | null;
          buyer_username: string | null;
          card_title: string;
          listing_id: string;
          price: number;
          seller_id: string;
          seller_username: string;
          sold_at: string | null;
        }[];
      };
      admin_player_collection_stats: {
        Args: { p_user_id: string };
        Returns: {
          catalog_cards: number;
          owned_cards: number;
          unique_cards: number;
        }[];
      };
      admin_player_collection_breakdown: {
        Args: { p_user_id: string };
        Returns: {
          category_name: string;
          category_type: string;
          catalog_cards: number;
          owned_total: number;
          owned_unique: number;
        }[];
      };
      admin_missing_player_cards: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string; p_user_id: string };
        Returns: {
          card_id: string;
          category: string;
          circle: string;
          rarity: Database["public"]["Enums"]["card_rarity"];
          ref: string;
          total_missing: number;
          title: string;
        }[];
      };
      admin_player_cards: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string };
        Returns: {
          acquired_at: string;
          base_value: number;
          card_id: string;
          listing_active: boolean;
          rarity: Database["public"]["Enums"]["card_rarity"];
          title: string;
          user_card_id: string;
        }[];
      };
      admin_preview_rollback: {
        Args: { p_window_minutes: number };
        Returns: {
          cards_to_revoke: number;
          discoveries_to_reset: number;
          listings_to_cancel: number;
          players_affected: number;
        }[];
      };
      admin_recent_audit: {
        Args: never;
        Returns: {
          action: string;
          actor_user_id: string;
          audit_id: number;
          created_at: string;
          details: Json;
          reason: string;
          target_user_id: string | null;
          target_username: string | null;
        }[];
      };
      admin_grant_card: {
        Args: { p_card_id: string; p_reason: string; p_user_id: string };
        Returns: string;
      };
      admin_get_player_drop_rates: {
        Args: { p_user_id: string };
        Returns: {
          commune: number;
          epique: number;
          is_custom: boolean;
          legendaire: number;
          mythique: number;
          peu_commune: number;
          rare: number;
        }[];
      };
      admin_set_player_drop_rates: {
        Args: {
          p_commune: number;
          p_epique: number;
          p_legendaire: number;
          p_mythique: number;
          p_peu_commune: number;
          p_rare: number;
          p_reason: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      admin_reset_player_drop_rates: {
        Args: { p_reason: string; p_user_id: string };
        Returns: undefined;
      };
      admin_reset_all_first_discoveries: {
        Args: { p_reason: string };
        Returns: number;
      };
      admin_revoke_player_cards: {
        Args: { p_reason: string; p_user_id: string };
        Returns: number;
      };
      admin_recent_draws: {
        Args: { p_user_id?: string | null };
        Returns: {
          card_id: string | null;
          card_title: string | null;
          draw_id: number;
          drawn_at: string;
          drawer_user_id: string | null;
          drawer_username: string | null;
          current_owner_id: string | null;
          current_owner_username: string | null;
          rarity: Database["public"]["Enums"]["card_rarity"] | null;
          revoked_at: string | null;
          user_card_id: string | null;
        }[];
      };
      admin_revoke_card: {
        Args: { p_reason: string; p_user_card_id: string };
        Returns: boolean;
      };
      admin_search_players: {
        Args: { p_query: string };
        Returns: {
          balance: number;
          created_at: string;
          user_id: string;
          username: string;
        }[];
      };
      buy_listing: { Args: { p_listing_id: string }; Returns: undefined };
      cancel_listing: { Args: { p_listing_id: string }; Returns: undefined };
      create_listing: {
        Args: { p_price: number; p_user_card_id: string };
        Returns: string;
      };
      draw_card: { Args: { p_user: string }; Returns: string };
      is_god_admin: { Args: never; Returns: boolean };
      open_booster: {
        Args: { p_quantity: number };
        Returns: {
          card_id: string;
          user_card_id: string;
        }[];
      };
      open_free_booster: {
        Args: never;
        Returns: {
          card_id: string;
          user_card_id: string;
        }[];
      };
      random_rarity: {
        Args: never;
        Returns: Database["public"]["Enums"]["card_rarity"];
      };
      redeem_promo_code: {
        Args: { p_code: string };
        Returns: {
          credits_amount: number;
          new_balance: number;
        }[];
      };
    };
    Enums: {
      card_rarity: "commune" | "peu_commune" | "rare" | "epique" | "legendaire" | "mythique";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      card_rarity: ["commune", "peu_commune", "rare", "epique", "legendaire", "mythique"],
    },
  },
} as const;
