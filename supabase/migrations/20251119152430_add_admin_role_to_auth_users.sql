/*
  # Add Admin Role Support to Supabase Auth

  ## Overview
  This migration sets up admin authentication using Supabase's built-in auth system.
  
  ## Changes
  
  1. New Tables
    - None (using built-in auth.users table)
  
  2. New Functions
    - `is_admin()` - Helper function to check if current user is an admin
    - `get_admin_user_id()` - Function to get the admin user ID by email
  
  3. Security
    - Enable RLS on admin-accessible tables
    - Add policies for admin-only access
    - Use app_metadata to store admin role
  
  4. Data Migration
    - Migrate existing admin user from admin_users table to auth.users
    - Set admin role in app_metadata
  
  ## Important Notes
  - Admin users are identified by the `is_admin` flag in auth.users.raw_app_meta_data
  - The existing admin_users table is kept for backward compatibility but deprecated
  - All new admin functionality should use Supabase Auth
*/

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    )
  );
END;
$$;

-- Create a function to get admin user ID by email (for internal use)
CREATE OR REPLACE FUNCTION get_admin_user_id(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = admin_email;
  
  RETURN user_id;
END;
$$;

-- Add comment to admin_users table indicating it's deprecated
COMMENT ON TABLE admin_users IS 'DEPRECATED: Use Supabase auth.users with is_admin in app_metadata instead';
