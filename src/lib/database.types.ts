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
          role: 'adult' | 'child'
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
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          date: string
          description: string
          amount: number
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
          category_id?: string | null
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          household_id: string
          pattern: string
          category_id: string
          member_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          pattern: string
          category_id: string
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          pattern?: string
          category_id?: string
          member_id?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
