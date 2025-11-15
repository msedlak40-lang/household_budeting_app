-- =====================================================
-- CATEGORY SEED DATA
-- =====================================================
-- Run this in your Supabase SQL Editor to populate suggested categories
-- This will create parent categories and subcategories for your household
-- =====================================================

-- First, get your household ID (replace with your actual household_id)
-- You can find this by running: SELECT id, name FROM households WHERE created_by = auth.uid();

-- For this script to work, replace 'YOUR_HOUSEHOLD_ID_HERE' with your actual household UUID
-- Example: '123e4567-e89b-12d3-a456-426614174000'

DO $$
DECLARE
  household_uuid UUID;
  housing_id UUID;
  transportation_id UUID;
  food_id UUID;
  shopping_id UUID;
  entertainment_id UUID;
  healthcare_id UUID;
  fitness_id UUID;
  pets_id UUID;
  kids_id UUID;
  travel_id UUID;
  bills_id UUID;
  financial_id UUID;
  education_id UUID;
  charity_id UUID;
  income_id UUID;
  savings_id UUID;
  misc_id UUID;
BEGIN
  -- Get the first household for the current user
  SELECT id INTO household_uuid FROM households WHERE created_by = auth.uid() ORDER BY created_at ASC LIMIT 1;

  IF household_uuid IS NULL THEN
    RAISE EXCEPTION 'No household found for current user';
  END IF;

  RAISE NOTICE 'Using household: %', household_uuid;

  -- =====================================================
  -- HOUSING
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Housing', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO housing_id;

  IF housing_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Rent/Mortgage', housing_id),
      (household_uuid, 'Property Tax', housing_id),
      (household_uuid, 'HOA Fees', housing_id),
      (household_uuid, 'Home Insurance', housing_id),
      (household_uuid, 'Utilities - Electric', housing_id),
      (household_uuid, 'Utilities - Gas', housing_id),
      (household_uuid, 'Utilities - Water', housing_id),
      (household_uuid, 'Internet', housing_id),
      (household_uuid, 'Home Maintenance', housing_id),
      (household_uuid, 'Home Improvement', housing_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- TRANSPORTATION
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Transportation', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO transportation_id;

  IF transportation_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Gas/Fuel', transportation_id),
      (household_uuid, 'Car Payment', transportation_id),
      (household_uuid, 'Car Insurance', transportation_id),
      (household_uuid, 'Car Maintenance', transportation_id),
      (household_uuid, 'Car Wash', transportation_id),
      (household_uuid, 'Parking', transportation_id),
      (household_uuid, 'Tolls', transportation_id),
      (household_uuid, 'Public Transit', transportation_id),
      (household_uuid, 'Uber/Lyft/Taxi', transportation_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- FOOD & DINING
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Food & Dining', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO food_id;

  IF food_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Groceries', food_id),
      (household_uuid, 'Restaurants', food_id),
      (household_uuid, 'Fast Food', food_id),
      (household_uuid, 'Coffee Shops', food_id),
      (household_uuid, 'Alcohol & Bars', food_id),
      (household_uuid, 'Food Delivery', food_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- SHOPPING
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Shopping', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO shopping_id;

  IF shopping_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Clothing', shopping_id),
      (household_uuid, 'Shoes', shopping_id),
      (household_uuid, 'Electronics', shopping_id),
      (household_uuid, 'Home Goods', shopping_id),
      (household_uuid, 'Books', shopping_id),
      (household_uuid, 'Personal Care', shopping_id),
      (household_uuid, 'Beauty & Cosmetics', shopping_id),
      (household_uuid, 'Gifts', shopping_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- ENTERTAINMENT
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Entertainment', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO entertainment_id;

  IF entertainment_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Movies & Theater', entertainment_id),
      (household_uuid, 'Streaming Services', entertainment_id),
      (household_uuid, 'Gaming', entertainment_id),
      (household_uuid, 'Music', entertainment_id),
      (household_uuid, 'Concerts & Events', entertainment_id),
      (household_uuid, 'Sports & Recreation', entertainment_id),
      (household_uuid, 'Hobbies', entertainment_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- HEALTHCARE
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Healthcare', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO healthcare_id;

  IF healthcare_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Doctor Visits', healthcare_id),
      (household_uuid, 'Dentist', healthcare_id),
      (household_uuid, 'Pharmacy', healthcare_id),
      (household_uuid, 'Vision/Eye Care', healthcare_id),
      (household_uuid, 'Health Insurance', healthcare_id),
      (household_uuid, 'Medical Supplies', healthcare_id),
      (household_uuid, 'Therapy/Counseling', healthcare_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- FITNESS & WELLNESS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Fitness & Wellness', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO fitness_id;

  IF fitness_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Gym Membership', fitness_id),
      (household_uuid, 'Fitness Classes', fitness_id),
      (household_uuid, 'Sports Equipment', fitness_id),
      (household_uuid, 'Wellness & Spa', fitness_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- PETS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Pets', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO pets_id;

  IF pets_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Pet Food', pets_id),
      (household_uuid, 'Veterinarian', pets_id),
      (household_uuid, 'Pet Supplies', pets_id),
      (household_uuid, 'Pet Insurance', pets_id),
      (household_uuid, 'Pet Grooming', pets_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- KIDS & FAMILY
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Kids & Family', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO kids_id;

  IF kids_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Childcare', kids_id),
      (household_uuid, 'School Tuition', kids_id),
      (household_uuid, 'School Supplies', kids_id),
      (household_uuid, 'Kids Activities', kids_id),
      (household_uuid, 'Kids Clothing', kids_id),
      (household_uuid, 'Toys', kids_id),
      (household_uuid, 'Allowance', kids_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- TRAVEL & VACATION
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Travel & Vacation', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO travel_id;

  IF travel_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Hotels', travel_id),
      (household_uuid, 'Flights', travel_id),
      (household_uuid, 'Vacation Activities', travel_id),
      (household_uuid, 'Rental Cars', travel_id),
      (household_uuid, 'Travel Insurance', travel_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- BILLS & SUBSCRIPTIONS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Bills & Subscriptions', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO bills_id;

  IF bills_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Phone Bill', bills_id),
      (household_uuid, 'Streaming (Netflix/Hulu/etc)', bills_id),
      (household_uuid, 'Music Subscription', bills_id),
      (household_uuid, 'Cloud Storage', bills_id),
      (household_uuid, 'Software Subscriptions', bills_id),
      (household_uuid, 'Magazine Subscriptions', bills_id),
      (household_uuid, 'Other Memberships', bills_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- FINANCIAL
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Financial', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO financial_id;

  IF financial_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Bank Fees', financial_id),
      (household_uuid, 'ATM Fees', financial_id),
      (household_uuid, 'Credit Card Fees', financial_id),
      (household_uuid, 'Investment Fees', financial_id),
      (household_uuid, 'Tax Preparation', financial_id),
      (household_uuid, 'Legal Fees', financial_id),
      (household_uuid, 'Accounting', financial_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- EDUCATION
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Education', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO education_id;

  IF education_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Tuition', education_id),
      (household_uuid, 'Books & Supplies', education_id),
      (household_uuid, 'Online Courses', education_id),
      (household_uuid, 'Professional Development', education_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- CHARITY & GIFTS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Charity & Gifts', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO charity_id;

  IF charity_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Donations', charity_id),
      (household_uuid, 'Charitable Giving', charity_id),
      (household_uuid, 'Religious Offerings', charity_id),
      (household_uuid, 'Political Contributions', charity_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- INCOME
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Income', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO income_id;

  IF income_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Salary', income_id),
      (household_uuid, 'Bonus', income_id),
      (household_uuid, 'Tax Refund', income_id),
      (household_uuid, 'Reimbursement', income_id),
      (household_uuid, 'Cash Back Rewards', income_id),
      (household_uuid, 'Interest Income', income_id),
      (household_uuid, 'Investment Returns', income_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- SAVINGS & INVESTMENTS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Savings & Investments', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO savings_id;

  IF savings_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Emergency Fund', savings_id),
      (household_uuid, 'Retirement Contribution', savings_id),
      (household_uuid, 'Investment Contribution', savings_id),
      (household_uuid, 'Savings Transfer', savings_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  -- =====================================================
  -- MISCELLANEOUS
  -- =====================================================
  INSERT INTO categories (household_id, name, parent_category_id)
  VALUES (household_uuid, 'Miscellaneous', NULL)
  ON CONFLICT (household_id, name) DO NOTHING
  RETURNING id INTO misc_id;

  IF misc_id IS NOT NULL THEN
    INSERT INTO categories (household_id, name, parent_category_id) VALUES
      (household_uuid, 'Cash Withdrawal', misc_id),
      (household_uuid, 'Uncategorized', misc_id),
      (household_uuid, 'Other', misc_id)
    ON CONFLICT (household_id, name) DO NOTHING;
  END IF;

  RAISE NOTICE 'Category seed complete! Check your categories table.';
END $$;

-- =====================================================
-- COMPLETED!
-- =====================================================
-- View your categories:
-- SELECT c.name as category, p.name as parent
-- FROM categories c
-- LEFT JOIN categories p ON c.parent_category_id = p.id
-- ORDER BY COALESCE(p.name, c.name), c.name;
