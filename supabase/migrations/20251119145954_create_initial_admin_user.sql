/*
  # Create Initial Admin User

  Creates a default admin user for the system with the following credentials:
  - Username: adsadmin
  - Password: Mm123567 (hashed with bcrypt)

  ## Security Note
  This migration creates an admin account with a default password. In production:
  - Change the password immediately after first login
  - Consider using stronger authentication methods
  - Implement password rotation policies
*/

-- Insert initial admin user (password is 'Mm123567' hashed with bcrypt)
INSERT INTO admin_users (username, password_hash)
VALUES (
  'adsadmin',
  '$2a$10$YXC8vXZ5QxNF.DM3B0LYMuqGqKzJ8z8kHxN5hVLW2Vp7yRjhBFHJW'
)
ON CONFLICT (username) DO NOTHING;
