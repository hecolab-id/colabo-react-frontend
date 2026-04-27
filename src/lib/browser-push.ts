import { BrowserPushSubscriptionInput } from "@/lib/types";

export function isBrowserPushSupported() {
    return typeof window !== "undefined"
        && "Notification" in window
        && "serviceWorker" in navigator
        && "PushManager" in window;
}

export async function ensureBrowserPushSubscription(vapidPublicKey: string): Promise<BrowserPushSubscriptionInput | null> {
    if (!isBrowserPushSupported() || !vapidPublicKey) {
        return null;
    }

    if (Notification.permission !== "granted") {
        return null;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.update().catch(() => {
        // Push can still work with the currently active service worker.
    });

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && !subscriptionUsesApplicationServerKey(subscription, applicationServerKey)) {
        await subscription.unsubscribe();
        subscription = null;
    }

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });
    }

    const rawSubscription = subscription.toJSON();
    return {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: rawSubscription.keys?.p256dh || "",
            auth: rawSubscription.keys?.auth || "",
        },
        user_agent: navigator.userAgent,
    };
}

export async function removeBrowserPushSubscription(): Promise<string | null> {
    if (!isBrowserPushSupported()) {
        return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        return null;
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; index += 1) {
        outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
}

function subscriptionUsesApplicationServerKey(subscription: PushSubscription, expectedKey: Uint8Array) {
    const currentKey = subscription.options.applicationServerKey;
    if (!currentKey) {
        return true;
    }

    const currentBytes = new Uint8Array(currentKey);
    if (currentBytes.length !== expectedKey.length) {
        return false;
    }

    return currentBytes.every((value, index) => value === expectedKey[index]);
}
