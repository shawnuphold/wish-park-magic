import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jtqnjvczkywfkobwddbu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak";

// Use service role to manage users
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser() {
  const email = 'tracyu@enchantedparkpickups.com';
  const password = 'Davenport123!';

  console.log('🔧 Creating/updating user with service role...\n');
  console.log('Supabase URL:', SUPABASE_URL);

  try {
    // First, check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log('Error listing users:', listError.message);
      return;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      console.log('Email confirmed:', existingUser.email_confirmed_at ? 'Yes' : 'No');

      // Update password and confirm email if needed
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true
        }
      );

      if (updateError) {
        console.log('Error updating user:', updateError.message);
      } else {
        console.log('✅ User password reset and email confirmed!');
      }

      // Update admin_users table
      await addToAdminUsers(existingUser.id, email);

    } else {
      // Create new user with email confirmed
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        console.log('Error creating user:', error.message);
        return;
      }

      console.log('✅ User created with confirmed email!');
      console.log('User ID:', data.user.id);

      await addToAdminUsers(data.user.id, email);
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

async function addToAdminUsers(userId: string, email: string) {
  console.log('\nUpdating admin_users table...');

  const { error } = await supabase
    .from('admin_users')
    .upsert({
      id: userId,
      email,
      name: 'Tracy U',
      role: 'admin',
    }, { onConflict: 'id' });

  if (error) {
    console.log('Could not update admin_users:', error.message);

    // Try updating by email instead
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ id: userId })
      .eq('email', email);

    if (updateError) {
      console.log('Also failed updating by email:', updateError.message);
    } else {
      console.log('✅ Updated admin_users ID by email!');
    }
  } else {
    console.log('✅ Admin user updated!');
  }

  console.log('\n✨ Done! Try logging in at https://enchantedparkpickups.com/auth/login');
  console.log('   Email: tracyu@enchantedparkpickups.com');
  console.log('   Password: Davenport123!');
}

createUser();
