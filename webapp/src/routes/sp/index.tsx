import { Step, StepContent, StepLabel, Stepper, Typography } from "@mui/material";
import { useState, FC, useEffect } from "react";
import ServiceProviderAccept from "src/components/ServiceProviderAccept";
import ServiceProviderPoD from "src/components/ServiceProviderPoD";
import ServiceProviderSubmitResults from "src/components/ServiceProviderSubmitResults";
import { Provision, getStatus } from "../../Provision";
import ServiceProviderPoP from "src/components/ServiceProviderPoP";

export type StepperComponentProps = {
    provision: Provision | undefined;
    setProvision: (provision: Provision | undefined) => void;
}

type Step = {
    label: string;
    component: FC<StepperComponentProps>;
    description: string;
}

const steps: Step[] = [
    {
        label: 'Scan QR code',
        description: `Scan the QR code from the package you want to accept`,
        component: (props) => (<ServiceProviderAccept {...props} />),
    },
    {
        label: 'Proof of delivery',
        description:
            'Publish a proof of delivery to the blockchain. This will be used to verify the package was delivered.',
        component: (props) => (<ServiceProviderPoD {...props} />),
    },
    {
        label: 'Publish results',
        description: 'Publish the encrypted results to the content-addressable network.',
        component: (props) => (<ServiceProviderSubmitResults {...props} />),
    },
    {
        label: 'Proof of provision',
        description: `Publish a proof of provision to the blockchain. This will be used to verify the provision was completed in time.`,
        component: (props) => (<ServiceProviderPoP {...props} />),
    },
    {
        label: 'Done',
        description: `Provision completed`,
        component: (props) => (<Typography>Provision finished</Typography>),
    },
];

function ServiceProvider() {
    const [provision, setProvision] = useState<Provision | undefined>();
    const [activeStep, setActiveStep] = useState(0);
    useEffect(() => {
        if (!provision) {
            console.log("provision is null");
            setActiveStep(0);
        } else {
            const status = getStatus(provision);

            console.log("provision status is now: ", status);
            if (status === 'Unknown') {
                setActiveStep(0);
            } else if (status === 'Prepared') {
                setActiveStep(1);
            } else if (status === 'Delivered') {
                setActiveStep(2);
            } else if (status === 'Uploaded') {
                setActiveStep(3);
            }else if (status === 'Provisioned') {
                setActiveStep(4);
            }

        }
    }, [provision]);


    console.log('activeStep', activeStep);
    console.log('steps[activeStep]', steps[activeStep]);

    return (
        <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
                <Step key={step.label}>
                    <StepLabel
                        optional={
                            activeStep === (steps.length - 1) ? (
                                <Typography variant="caption">Last step</Typography>
                            ) : null
                        }
                    >
                        {step.label}
                    </StepLabel>
                    <StepContent>
                        <Typography>{step.description}</Typography>
                        {index == activeStep && steps[activeStep].component({ provision, setProvision })}
                    </StepContent>
                </Step>
            ))}
        </Stepper>
    )
}
export default ServiceProvider;