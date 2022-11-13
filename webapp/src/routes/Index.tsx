import { Button } from "@mui/material";

function App() {
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

export default App;
