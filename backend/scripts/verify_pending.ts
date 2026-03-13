import { supabaseAdmin } from '../src/config/supabase.js';

async function verify() {
    console.log('Verifying pending webhooks for UnknownTest...');
    const { data: pending, error: pendingError } = await supabaseAdmin
        .from('pending_webhooks')
        .select('*')
        .eq('origin', 'UnknownTest');

    if (pendingError) {
        console.error('Error fetching pending:', pendingError);
    } else {
        console.log('Pending Webhooks:', pending);
    }

    console.log('Verifying notifications for UnknownTest...');
    // We need to filter JSON column manually or assume the structure
    const { data: notifs, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('type', 'new_origin');

    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else {
        const unknownNotifs = notifs?.filter((n: any) => n.data?.origin === 'UnknownTest');
        console.log('Notifications:', unknownNotifs);
    }
}

verify();
