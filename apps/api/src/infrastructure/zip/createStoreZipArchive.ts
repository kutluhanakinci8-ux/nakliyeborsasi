import { crc32 } from "zlib";

type ZipEntry = { name: string; data: Buffer };

/** Minimal ZIP (store, no compression) for eDiscovery packages. */
export function createStoreZipArchive(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data) >>> 0;

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(crc, 10);
    localHeader.writeUInt32LE(data.length, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt16LE(nameBuf.length, 22);
    localHeader.writeUInt16LE(0, 24);
    nameBuf.copy(localHeader, 30);

    localParts.push(localHeader, data);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(crc, 12);
    centralHeader.writeUInt32LE(data.length, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt16LE(nameBuf.length, 24);
    centralHeader.writeUInt16LE(0, 26);
    centralHeader.writeUInt16LE(0, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(0, 34);
    centralHeader.writeUInt32LE(offset, 38);
    nameBuf.copy(centralHeader, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const centralOffset = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, end]);
}
