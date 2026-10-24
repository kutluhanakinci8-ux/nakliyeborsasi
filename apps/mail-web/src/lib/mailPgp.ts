import * as openpgp from "openpgp";

export async function encryptTextWithPgp(
  plainText: string,
  recipientPublicKeyArmored: string,
): Promise<string> {
  const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKeyArmored });
  const message = await openpgp.createMessage({ text: plainText });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: publicKey,
  });
  return typeof encrypted === "string" ? encrypted : String(encrypted);
}

export async function fingerprintPublicKey(armored: string): Promise<string | null> {
  try {
    const key = await openpgp.readKey({ armoredKey: armored });
    return key.getFingerprint().toUpperCase();
  } catch {
    return null;
  }
}
