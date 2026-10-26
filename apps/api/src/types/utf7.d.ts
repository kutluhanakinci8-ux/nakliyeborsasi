declare module "utf7" {
  export const imap: {
    encode: (str: string) => string;
    decode: (str: string) => string;
  };
}
