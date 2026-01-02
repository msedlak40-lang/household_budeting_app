export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          name: string
          role: 'adult' | 'child'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          role?: 'adult' | 'child'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          role?: 'adult' | 'child'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      accounts: {
        Row: {
          id: string
          household_id: string
          name: string
          account_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          account_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          account_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          parent_category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          parent_category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          parent_category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          date: string
          description: string
          amount: number
          vendor: string | null
          normalized_vendor: string | null
          vendor_override: string | null
          transaction_hash: string | null
          category_id: string | null
          member_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          date: string
          description: string
          amount: number
          vendor?: string | null
          normalized_vendor?: string | null
          vendor_override?: string | null
          transaction_hash?: string | null
          category_id?: string | null
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          date?: string
          description?: string
          amount?: number
          vendor?: string | null
          normalized_vendor?: string | null
          vendor_override?: string | null
          transaction_hash?: string | null
          category_id?: string | null
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          }
        ]
      }
      rules: {
        Row: {
          id: string
          household_id: string
          pattern: string
          category_id: string | null
          member_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          pattern: string
          category_id?: string | null
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          pattern?: string
          category_id?: string | null
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_items: {
        Row: {
          id: string
          household_id: string
          name: string
          amount: number
          frequency: 'monthly'
          category_id: string
          member_id: string | null
          account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          amount: number
          frequency?: 'monthly'
          category_id: string
          member_id?: string | null
          account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          amount?: number
          frequency?: 'monthly'
          category_id?: string
          member_id?: string | null
          account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_items_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_role: 'adult' | 'child'
      recurring_frequency: 'monthly'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
