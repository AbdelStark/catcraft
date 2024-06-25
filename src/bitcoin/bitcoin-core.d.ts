declare module "bitcoin-core" {
  export default class Client {
    constructor(options: {
      network: string;
      host: string;
      port: number;
      username: string;
      password: string;
    });

    getNetworkInfo(): Promise<{
      version: number;
      subversion: string;
      protocolversion: number;
    }>;
    getBalance(): Promise<number>;
    sendToAddress(address: string, amount: number): Promise<string>;
    getAddressInfo(address: string): Promise<any>;
    // Add other methods you use from bitcoin-core here
  }
}
