const clients = new Set();

export function addClient(res, user) {
    const client = { res, user };
    clients.add(client);
    res.on('close', () => {
        clients.delete(client);
    });
    return client;
}

export function broadcastNotification(notification) {
    for (const client of clients) {
        try {
            const { res, user } = client;
            if (notification.recipient_role) {
                if (user.role && user.role === notification.recipient_role) {
                    sendEvent(res, notification);
                }
                continue;
            }
            if (notification.recipient_id) {
                const nid = String(notification.recipient_id);
                if (user && String(user.sub) === nid) {
                    sendEvent(res, notification);
                }
            }
        } catch (e) {
            console.warn('SSE broadcast error:', e.message || e);
        }
    }
}

function sendEvent(res, data) {
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
        // ignore
    }
}