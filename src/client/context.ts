'use client';

import { createContext } from 'react';
import type { EntrolyticsContextValue } from '../types';

export const EntrolyticsContext = createContext<EntrolyticsContextValue | null>(null);
