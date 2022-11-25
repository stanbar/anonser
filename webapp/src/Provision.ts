export interface Provision {
    clientPubKey: string;
    provisionId: string;
    issueTime?: number;
    paymentDeadlineTime?: number;
    provisionDeadlineTime?: number;
    paidWithCash?: boolean;
    provisioned?: boolean;
    dealId?: number;
    cid?: string;
    minerId?: string;
}


export function upgradeToDelivered(provision: Provision, issueTime: number, paymentDeadlineTime: number, provisionDeadlineTime: number, paidWithCash: boolean): Provision {
    return {
        ...provision,
        issueTime,
        paymentDeadlineTime,
        provisionDeadlineTime,
        paidWithCash,
    }
}

export function upgradeToUploaded(provision: Provision, cid: string, dealId: number, minerId: string): Provision {
    if (getStatus(provision) === "Delivered") {
        return {
            ...provision,
            cid,
            dealId,
            minerId
        }
    } else {
        return {
            ...provision,
            cid,
            dealId,
            minerId
        }
    }
}

export function upgradeToProvisioned(provision: Provision): Provision {
    if (getStatus(provision) === "Uploaded") {
        return {
            ...provision,
            provisioned: true
        }
    } else {
        return {
            ...provision,
        }
    }
}

export function getStatus(provision: Provision): "Prepared" | "Delivered" | "Uploaded" | "Unknown" | "Provisioned" {
    console.log(provision)
    if (provision.clientPubKey.length == 68 && provision.provisionId.length == 66) {
        if (provision.issueTime && provision.paymentDeadlineTime && provision.provisionDeadlineTime) {
            if (provision.minerId && provision.dealId && provision.cid?.length == 46) {
                if (provision.provisioned) {
                    return "Provisioned";
                } else {
                    return "Uploaded";
                }
            } else {
                return "Delivered";
            }
        } else {
            return "Prepared";
        }
    } else {
        return "Unknown";
    }
}