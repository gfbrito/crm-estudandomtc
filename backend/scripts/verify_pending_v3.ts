import { supabaseAdmin } from '../src/config/supabase.js';

async function verify() {
    console.log('Verifying pending webhooks for UnknownTest3...');
    const { data: pending, error: pendingError } = await supabaseAdmin
        .from('pending_webhooks')
        .select('*')
        .eq('origin', 'UnknownTest3');

    if (pendingError) {
        console.error('Error fetching pending:', pendingError);
    } else {
        console.log('Pending Webhooks:', pending?.length);
    }

    console.log('Verifying notifications for UnknownTest3...');
    const { data: notifs, error: notifError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('type', 'new_origin');

    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else {
        const unknownNotifs = notifs?.filter((n: any) => n.data?.origin === 'UnknownTest3');
        console.log('Notifications Found:', unknownNotifs?.length);
        if (unknownNotifs && unknownNotifs.length > 0) {
            console.log('Validation SUCCESS: Notification created.');
        } else {
            console.error('Validation FAILED: No notification found.');
        }
    }
}

verify();
