import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'; // Импорт стилей Mantine
import '@mantine/carousel/styles.css';
import { DatesProvider } from '@mantine/dates'
import '@mantine/dates/styles.css';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider>
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>,
)
