const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function verifyClean() {
    console.log('=== VERIFICAÇÃO DO BANCO ===\n');

    const tables = ['products', 'sales', 'leads', 'notifications', 'product_mappings', 'timeline', 'subscriptions'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`❌ ${table}: ERRO - ${error.message}`);
        } else {
            const status = count === 0 ? '✅' : '⚠️';
            console.log(`${status} ${table}: ${count} registros`);
        }
    }

    // Also verify notifications schema
    console.log('\n--- Schema check ---');
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            type: 'schema_test',
            title: 'Test',
            message: 'Schema verification',
            status: 'pending',
            read: false,
            data: { test: true },
            created_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.log(`❌ Schema: ${error.message}`);
    } else {
        console.log(`✅ Schema OK - columns: ${Object.keys(data[0]).join(', ')}`);
        await supabase.from('notifications').delete().eq('id', data[0].id);
    }

    console.log('\n=== DONE ===');
}

verifyClean();
