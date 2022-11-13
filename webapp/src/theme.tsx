import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { LinkProps } from '@mui/material/Link';
import React from 'react';

const LinkBehavior = React.forwardRef<
    HTMLAnchorElement,
    Omit<RouterLinkProps, 'to'> & { href: RouterLinkProps['to'] }
>((props, ref) => {
    const { href, ...other } = props;
    // Map href (MUI) -> to (react-router)
    return <RouterLink ref={ref} to={href} {...other} />;
});

// A custom theme for this app
const theme = createTheme({
    palette: {
        primary: {
            main: '#556cd6',
        },
        secondary: {
            main: '#19857b',
        },
        error: {
            main: red.A400,
        },
    },
    components: {
        MuiLink: {
            defaultProps: {
                component: LinkBehavior,
            } as LinkProps,
        },
        MuiButtonBase: {
            defaultProps: {
                LinkComponent: LinkBehavior,
            },
        },
    },
});

export default theme;