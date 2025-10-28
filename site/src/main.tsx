import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from '@/components/theme-provider';

import PrintersPage from './pages/PrintersPage';
import Landing from './pages/Landing';

import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import Layout from './components/layout.js';



// actual routing
const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <Landing />,
            },
            {
                path: "/printers",
                element: <PrintersPage />,
            },
            {
                path: "/test",
                element: <div>TEST ROUTE</div>
            }
        ]
    }
]);

// dom setup
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    </StrictMode>,
)
