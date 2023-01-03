import { Link, Outlet } from "react-router-dom";

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { AppBar, Toolbar, useScrollTrigger, useTheme } from "@mui/material";
import React from "react";

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window?: () => Window;
    children: React.ReactElement;
}

function ElevationScroll(props: Props) {
    const { children, window } = props;
    // Note that you normally won't need to set the window ref as useScrollTrigger
    // will default to window.
    // This is only being set here because the demo is in an iframe.
    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0,
        target: window ? window() : undefined,
    });

    return React.cloneElement(children, {
        elevation: trigger ? 4 : 0,
    });
}


export default function Root() {
    const theme = useTheme()
    return (
        <>
            <ElevationScroll>
                <AppBar color="inherit" enableColorOnDark >
                    <Toolbar >
                        <Container maxWidth="sm">
                            <Typography sx={{ textDecoration: "none", ":visited": { color: theme.palette.text.primary } }} variant="h6" component={Link} to="/">
                                Anonser - Anonymous services provisioning
                            </Typography>
                        </Container>
                    </Toolbar>
                </AppBar>
            </ElevationScroll>
            <br />
            <Container maxWidth="sm">
                <Box sx={{ my: 4 }}>
                    <br />
                    <Outlet />
                </Box>
            </Container>
        </>
    );
}