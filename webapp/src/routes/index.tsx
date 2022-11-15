import { Button } from "@mui/material";

function Index() {
    return (
        <ul>
            <li>
                <Button href="client" variant="contained">
                    Client
                </Button>
            </li>
            <li>
                <Button href="sp" variant="contained">
                    Service Provider
                </Button>
            </li>
        </ul>
    );
}

export default Index;
export { default as Root } from "./root";
export { default as Client } from "./client";
export { default as ClientNew } from "./client/new";
export { default as ClientStatus } from "./client/status";
export { default as ServiceProvider } from "./sp";