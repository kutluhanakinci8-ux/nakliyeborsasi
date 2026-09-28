import webpush from "web-push";

export type VapidCredentials = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: string,
  vapid: VapidCredentials,
): Promise<void> {
  await webpush.sendNotification(subscription, payload, {
    vapidDetails: {
      subject: vapid.subject,
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
    },
  });
}
