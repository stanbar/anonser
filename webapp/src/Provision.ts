export class Provision {
    clientPubKey: string;
    provisionId: string;
    constructor(clientPubKey: string, provisionId: string) {
        this.clientPubKey = clientPubKey;
        this.provisionId = provisionId;
    }
}
