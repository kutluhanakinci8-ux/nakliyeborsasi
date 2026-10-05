import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type { MessagingAttachmentS3Config } from "./messagingAttachmentStorageConfig";

export class MessagingAttachmentS3Store {
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(config: MessagingAttachmentS3Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint ?? undefined,
      forcePathStyle: config.forcePathStyle,
    });
  }

  public async putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  public async headBucket(): Promise<void> {
    await this.client.send(
      new HeadBucketCommand({
        Bucket: this.bucket,
      }),
    );
  }

  /** Put → get → delete; doğrulama için. */
  public async probeWriteRead(): Promise<void> {
    const key = `probe/messaging-attachment/${randomUUID()}.txt`;
    const body = Buffer.from("lerta-messaging-attachment-probe", "utf8");
    await this.putObject({
      key,
      body,
      contentType: "text/plain",
    });
    const read = await this.getObject(key);
    if (read.toString("utf8") !== body.toString("utf8")) {
      throw new Error("S3 probe read mismatch");
    }
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  public async getObject(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const stream = response.Body;
    if (!stream) {
      throw new Error("S3 object body empty");
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
