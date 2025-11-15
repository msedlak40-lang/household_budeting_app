/**
 * Category Seed Script
 *
 * This script populates your household with comprehensive suggested categories.
 *
 * Usage:
 *   1. Create a .env file in the project root with:
 *      VITE_SUPABASE_URL=your_supabase_url
 *      VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
 *      USER_ID=your_user_id (from Supabase Auth)
 *
 *   2. Run: node scripts/seed-categories.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const userId = process.env.USER_ID

if (!supabaseUrl || !supabaseKey || !userId) {
  console.error('❌ Missing environment variables!')
  console.error('   Please create a .env file with:')
  console.error('   - VITE_SUPABASE_URL')
  console.error('   - VITE_SUPABASE_ANON_KEY')
  console.error('   - USER_ID')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Comprehensive category structure with subcategories
const CATEGORIES = {
  'Housing': [
    'Rent/Mortgage',
    'Property Tax',
    'HOA Fees',
    'Home Insurance',
    'Utilities - Electric',
    'Utilities - Gas',
    'Utilities - Water',
    'Internet',
    'Home Maintenance',
    'Home Improvement',
  ],
  'Transportation': [
    'Gas/Fuel',
    'Car Payment',
    'Car Insurance',
    'Car Maintenance',
    'Car Wash',
    'Parking',
    'Tolls',
    'Public Transit',
    'Uber/Lyft/Taxi',
  ],
  'Food & Dining': [
    'Groceries',
    'Restaurants',
    'Fast Food',
    'Coffee Shops',
    'Alcohol & Bars',
    'Food Delivery',
  ],
  'Shopping': [
    'Clothing',
    'Shoes',
    'Electronics',
    'Home Goods',
    'Books',
    'Personal Care',
    'Beauty & Cosmetics',
    'Gifts',
  ],
  'Entertainment': [
    'Movies & Theater',
    'Streaming Services',
    'Gaming',
    'Music',
    'Concerts & Events',
    'Sports & Recreation',
    'Hobbies',
  ],
  'Healthcare': [
    'Doctor Visits',
    'Dentist',
    'Pharmacy',
    'Vision/Eye Care',
    'Health Insurance',
    'Medical Supplies',
    'Therapy/Counseling',
  ],
  'Fitness & Wellness': [
    'Gym Membership',
    'Fitness Classes',
    'Sports Equipment',
    'Wellness & Spa',
  ],
  'Pets': [
    'Pet Food',
    'Veterinarian',
    'Pet Supplies',
    'Pet Insurance',
    'Pet Grooming',
  ],
  'Kids & Family': [
    'Childcare',
    'School Tuition',
    'School Supplies',
    'Kids Activities',
    'Kids Clothing',
    'Toys',
    'Allowance',
  ],
  'Travel & Vacation': [
    'Hotels',
    'Flights',
    'Vacation Activities',
    'Rental Cars',
    'Travel Insurance',
  ],
  'Bills & Subscriptions': [
    'Phone Bill',
    'Streaming (Netflix/Hulu/etc)',
    'Music Subscription',
    'Cloud Storage',
    'Software Subscriptions',
    'Magazine Subscriptions',
    'Other Memberships',
  ],
  'Financial': [
    'Bank Fees',
    'ATM Fees',
    'Credit Card Fees',
    'Investment Fees',
    'Tax Preparation',
    'Legal Fees',
    'Accounting',
  ],
  'Education': [
    'Tuition',
    'Books & Supplies',
    'Online Courses',
    'Professional Development',
  ],
  'Charity & Gifts': [
    'Donations',
    'Charitable Giving',
    'Religious Offerings',
    'Political Contributions',
  ],
  'Income': [
    'Salary',
    'Bonus',
    'Tax Refund',
    'Reimbursement',
    'Cash Back Rewards',
    'Interest Income',
    'Investment Returns',
  ],
  'Savings & Investments': [
    'Emergency Fund',
    'Retirement Contribution',
    'Investment Contribution',
    'Savings Transfer',
  ],
  'Miscellaneous': [
    'Cash Withdrawal',
    'Uncategorized',
    'Other',
  ],
}

async function seedCategories() {
  console.log('🌱 Starting category seed...\n')

  try {
    // 1. Get the household for this user
    console.log('📋 Finding household...')
    const { data: households, error: householdError } = await supabase
      .from('households')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (householdError) throw householdError
    if (!households || households.length === 0) {
      throw new Error('No household found for this user')
    }

    const household = households[0]
    console.log(`✅ Found household: ${household.name} (${household.id})\n`)

    // 2. Check existing categories
    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('household_id', household.id)

    const existingNames = new Set(existing?.map(c => c.name) || [])

    // 3. Insert categories
    let parentCount = 0
    let subCount = 0
    let skipCount = 0

    for (const [parentName, subcategories] of Object.entries(CATEGORIES)) {
      // Insert parent category
      if (existingNames.has(parentName)) {
        console.log(`⏭️  Skipping existing category: ${parentName}`)
        skipCount++
      } else {
        const { data: parent, error: parentError } = await supabase
          .from('categories')
          .insert({
            household_id: household.id,
            name: parentName,
            parent_category_id: null,
          })
          .select()
          .single()

        if (parentError) {
          console.error(`❌ Error creating parent "${parentName}":`, parentError.message)
          continue
        }

        console.log(`✅ Created parent: ${parentName}`)
        parentCount++

        // Insert subcategories
        for (const subName of subcategories) {
          if (existingNames.has(subName)) {
            console.log(`   ⏭️  Skipping existing subcategory: ${subName}`)
            skipCount++
          } else {
            const { error: subError } = await supabase
              .from('categories')
              .insert({
                household_id: household.id,
                name: subName,
                parent_category_id: parent.id,
              })

            if (subError) {
              console.error(`   ❌ Error creating subcategory "${subName}":`, subError.message)
            } else {
              console.log(`   ✅ Created subcategory: ${subName}`)
              subCount++
            }
          }
        }
      }
    }

    console.log('\n🎉 Seed complete!')
    console.log(`   📊 Summary:`)
    console.log(`      - ${parentCount} parent categories created`)
    console.log(`      - ${subCount} subcategories created`)
    console.log(`      - ${skipCount} existing categories skipped`)
    console.log(`      - ${parentCount + subCount} total new categories`)

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message)
    process.exit(1)
  }
}

seedCategories()
