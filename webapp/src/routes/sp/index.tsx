import { Stack, Step, StepContent, StepLabel, Stepper, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import ServiceProviderAccept from "src/components/SPAccept";
import ServiceProviderPoD from "src/components/SPProofOfDelivery";
import ServiceProviderSubmitResults from "src/components/SPSubmitResults";
import { ProvisionBase, ProvisionDelivered, ProvisionProvisioned, Provision } from "../../Provision";
import ServiceProviderPoP from "src/components/SPProofOfProvision";
import { useEth } from "src/contexts/EthContext";
import ProvisionState from "src/components/ProvisionState";
import { REACT_APP_SERVICE_PROVIDER_SEC_KEY } from "src/Constants";


export type StepperComponentProps<IN extends Provision|undefined, OUT extends Provision> = {
    provision: IN;
    setProvision: (provision: OUT) => void;
}

function ServiceProvider() {
    const [provision, setProvision] = useState<Provision | undefined>();
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        console.log("step: ", activeStep)
        if (provision instanceof ProvisionProvisioned) {
            setActiveStep(2);
            console.log("setActiveStep to: ", 2)
        } else if (provision instanceof ProvisionProvisioned) {
            setActiveStep(1);
            console.log("setActiveStep to: ", 1)
        } else if (provision instanceof ProvisionDelivered) {
            setActiveStep(1);
            console.log("setActiveStep to: ", 1)
        } else if (provision instanceof ProvisionBase) {
            setActiveStep(0);
            console.log("setActiveStep to: ", 0)
        } else {
            console.log("setActiveStep to: ", 0)
            setActiveStep(0);
        }
    }, [provision]);



    return (
        <Stepper activeStep={activeStep} orientation="vertical">
            {(StepWrapper({
                label: "Delivery",
                description: "Scan the QR code from the package you want to accept",
                isLast: false,
                children: (
                    <>
                        <ServiceProviderAccept provision={undefined} setProvision={setProvision} />
                        {provision instanceof ProvisionBase && (<ServiceProviderPoD provision={provision} setProvision={setProvision} />)}
                    </>
                ),
            }))}

            {(StepWrapper({
                label: "Provision",
                isLast: false,
                children: (
                        provision instanceof ProvisionDelivered && <ServiceProviderSubmitResults provision={provision} setProvision={setProvision} />
                ),
            }))}

            {(StepWrapper({
                label: "Summary",
                description: "Provision completed",
                isLast: true,
                children: (
                    provision instanceof ProvisionProvisioned && <ProvisionState privKey={REACT_APP_SERVICE_PROVIDER_SEC_KEY} clientPubKey={provision.clientPubKey} provisionId={provision.provisionId} /> 
                ),
            }))}
        </Stepper>
    )
}

export function StepWrapper({ children, label, description, isLast }: { children: any, label: string, description?: string, isLast: boolean }) {
    console.log(children, label, description, isLast)
    return (
        <Step key={label}>
            <StepLabel>
                {label}
            </StepLabel>
            <StepContent>
                {description && (<Typography>{description}</Typography>)}
                {children}
            </StepContent>
        </Step>
    )
}
export default ServiceProvider;