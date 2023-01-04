export type Provision = ProvisionBase | ProvisionDelivered | ProvisionProvisioned;

export function recreateFromBlockchain(provisionId: string, clientPubKey: string, results: any): Provision | undefined {
    const { issueTime, paymentDeadlineTime, provisionDeadlineTime, paidInCash, paymentAddress, cid, dealId, minerId } = results;
    if (issueTime && paymentDeadlineTime && provisionDeadlineTime && paidInCash !== undefined && paymentAddress !== undefined) {
        if (cid && dealId && minerId) {
            return new ProvisionProvisioned(clientPubKey, provisionId, issueTime, paymentDeadlineTime, provisionDeadlineTime, paidInCash, paymentAddress, cid, dealId, minerId);
        }
        return new ProvisionDelivered(clientPubKey, provisionId, issueTime, paymentDeadlineTime, provisionDeadlineTime, paidInCash, paymentAddress);
    }
    return new ProvisionBase(clientPubKey, provisionId);
}

export class ProvisionBase {
    clientPubKey: string;
    provisionId: string;

    constructor(clientPubKey: string, provisionId: string) {
        if (clientPubKey.length !== 68) {
            throw new Error("Invalid clientPubKey length");
        }

        if (provisionId.length !== 66) {
            throw new Error("Invalid provisionId length");
        }
        this.clientPubKey = clientPubKey;
        this.provisionId = provisionId;
    }
    public upgradeToDelivered(issueTime: number, paymentDeadlineTime: number, provisionDeadlineTime: number, paidWithCash: boolean, paymentAddress: string) {
        return new ProvisionDelivered(this.clientPubKey, this.provisionId, issueTime, paymentDeadlineTime, provisionDeadlineTime, paidWithCash, paymentAddress)
    }
    public status(): string {
        return "Initialised";
    }
}

export class ProvisionDelivered extends ProvisionBase {
    issueTime: number;
    paymentDeadlineTime: number;
    provisionDeadlineTime: number;
    paidInCash: boolean;
    paymentAddress: string;

    constructor(clientPubKey: string, provisionId: string, issueTime: number, paymentDeadlineTime: number, provisionDeadlineTime: number, paidInCash: boolean, paymentAddress: string) {
        super(clientPubKey, provisionId);
        this.issueTime = issueTime;
        this.paymentDeadlineTime = paymentDeadlineTime;
        this.provisionDeadlineTime = provisionDeadlineTime;
        this.paidInCash = paidInCash;
        this.paymentAddress = paymentAddress;
    }
    public upgradeToUploaded(cid: string, dealId: number, minerId: string) {
        return new ProvisionProvisioned(this.clientPubKey, this.provisionId, this.issueTime, this.paymentDeadlineTime, this.provisionDeadlineTime, this.paidInCash, this.paymentAddress, cid, dealId, minerId)
    }
    public status(): string {
        return "Delivered";
    }
}

export class ProvisionProvisioned extends ProvisionDelivered {
    dealId: number;
    cid: string;
    minerId: string;

    constructor(clientPubKey: string, provisionId: string, issueTime: number, paymentDeadlineTime: number, provisionDeadlineTime: number, paidWithCash: boolean, paymentAddress: string, cid: string, dealId: number, minerId: string) {
        super(clientPubKey, provisionId, issueTime, paymentDeadlineTime, provisionDeadlineTime, paidWithCash, paymentAddress)
        if (cid.length !== 46) {
            throw new Error("Invalid cid length");
        }
        this.dealId = dealId;
        this.cid = cid;
        this.minerId = minerId;
    }

    public status(): string {
        return "Provisioned";
    }
}
