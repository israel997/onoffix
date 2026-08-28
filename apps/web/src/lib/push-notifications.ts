import { deletePushSubscription, savePushSubscription } from './api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY
  );
}

/** L'API push exige une clé binaire, pas la chaîne base64url qu'on stocke côté serveur. */
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getPushSubscriptionState(): Promise<'unsupported' | 'subscribed' | 'not-subscribed'> {
  if (!isPushSupported()) return 'unsupported';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'subscribed' : 'not-subscribed';
}

export async function enablePushNotifications() {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this device');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission refused');

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = subscription.toJSON();
  await savePushSubscription({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  });
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await subscription.unsubscribe();
  await deletePushSubscription(subscription.endpoint);
}
