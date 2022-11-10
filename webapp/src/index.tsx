import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Client from './routes/Client';
import ServiceProvider from './routes/ServiceProvider';
import ClientNew from './routes/ClientNew';
import ClientStatus from './routes/ClientStatus';
import Root from './routes/root';
import Index from './routes/Index';

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
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
