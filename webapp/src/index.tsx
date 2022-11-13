import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Client from './routes/client';
import ServiceProvider from './routes/sp';
import ClientNew from './routes/client/new';
import ClientStatus from './routes/client/status';
import Root from './routes/root';
import Index from './routes';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme'
import { CssBaseline } from '@mui/material';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <Index/>
      },
      {
        path: "client",
        element: <Client />,
      },
      {
        path: "client/new",
        element: <ClientNew />,
      },
      {
        path: "client/status",
        element: <ClientStatus />,
      },
      {
        path: "sp",
        element: <ServiceProvider />,
      },
    ]
  }]
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
