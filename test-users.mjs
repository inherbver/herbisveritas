import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testUsers() {
  try {
    console.log('Testing user retrieval...');
    console.log('URL:', supabaseUrl);
    
    // Test 1: List users with admin API
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });
    
    if (error) {
      console.error('Error listing users:', error);
      return;
    }
    
    console.log('Users retrieved:', users?.users?.length || 0);
    console.log('First user:', users?.users?.[0]?.email);
    
    // Test 2: Get profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
      
    if (profileError) {
      console.error('Error getting profiles:', profileError);
      return;
    }
    
    console.log('Profiles retrieved:', profiles?.length || 0);
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testUsers();