import { supabaseAdmin } from '../src/config/supabase.js';

async function verify() {
    console.log('Verifying pending webhooks for UnknownTest2...');
    const { data: pending, error: pendingError } = await supabaseAdmin
        .from('pending_webhooks')
        .select('*')
        .eq('origin', 'UnknownTest2');

    if (pendingError) {
        console.error('Error fetching pending:', pendingError);
    } else {
        console.log('Pending Webhooks:', pending);
    }

    console.log('Verifying notifications for UnknownTest2...');
    const { data: notifs, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('type', 'new_origin');

    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else {
        const unknownNotifs = notifs?.filter((n: any) => n.data?.origin === 'UnknownTest2');
        console.log('Notifications Found:', unknownNotifs?.length);
        console.log('First Notification:', unknownNotifs?.[0]);
    }
}

verify();
