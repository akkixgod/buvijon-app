const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// For migrations, we typically need service role key, but let's try with anon first
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting SQL Migration for Dual Search System...');

  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_dual_search_family_requests.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);

    // Execute the SQL
    console.log('⚡ Executing SQL...');

    // Note: Direct SQL execution through client might have limitations
    // Let's try using the rpc function or direct execution
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error.message);

      // Try alternative approach using REST API
      console.log('🔄 Trying alternative approach...');
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Migration completed successfully via REST API!');
      return result;
    }

    console.log('✅ Migration completed successfully!');
    return data;

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('\n💡 Note: This migration requires database admin privileges.');
    console.log('💡 Please apply the migration manually in Supabase Dashboard:');
    console.log('💡 1. Go to https://app.supabase.com');
    console.log('💡 2. Select your project');
    console.log('💡 3. Navigate to SQL Editor');
    console.log('💡 4. Copy and paste the content of: supabase/migrations/001_dual_search_family_requests.sql');
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
