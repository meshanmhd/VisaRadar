import type { Change, Customer, Impact, Message, Source, Task } from './types';
import { MOCK_CHANGES, MOCK_CUSTOMERS, MOCK_IMPACTS, MOCK_MESSAGES, MOCK_SOURCES, MOCK_TASKS } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // Default to true for now

// Helper to simulate network delay for mocks
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Changes
  getChanges: async (): Promise<Change[]> => {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_CHANGES;
    }
    const res = await fetch(`${API_BASE_URL}/changes`);
    if (!res.ok) throw new Error('Failed to fetch changes');
    return res.json();
  },
  
  getChangeById: async (id: string): Promise<Change> => {
    if (USE_MOCK) {
      await delay(300);
      const change = MOCK_CHANGES.find(c => c.id === id);
      if (!change) throw new Error('Not found');
      return change;
    }
    const res = await fetch(`${API_BASE_URL}/changes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch change');
    return res.json();
  },

  updateChangeStatus: async (id: string, status: Change['status']): Promise<Change> => {
    if (USE_MOCK) {
      await delay(400);
      const change = MOCK_CHANGES.find(c => c.id === id);
      if (!change) throw new Error('Not found');
      return { ...change, status };
    }
    const res = await fetch(`${API_BASE_URL}/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update change');
    return res.json();
  },

  // Sources
  getSources: async (): Promise<Source[]> => {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_SOURCES;
    }
    const res = await fetch(`${API_BASE_URL}/sources`);
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_CUSTOMERS;
    }
    const res = await fetch(`${API_BASE_URL}/customers`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  // Impacts
  getImpactsForChange: async (changeId: string): Promise<Impact[]> => {
    if (USE_MOCK) {
      await delay(400);
      return MOCK_IMPACTS.filter(i => i.change_id === changeId);
    }
    const res = await fetch(`${API_BASE_URL}/changes/${changeId}/impacts`);
    if (!res.ok) throw new Error('Failed to fetch impacts');
    return res.json();
  },

  // Dashboard Summary
  getDashboardSummary: async () => {
    if (USE_MOCK) {
      await delay(500);
      return {
        totalChanges: MOCK_CHANGES.length,
        pendingApprovals: MOCK_CHANGES.filter(c => c.status === 'pending').length,
        affectedClients: MOCK_CUSTOMERS.length,
        severeCount: MOCK_CHANGES.filter(c => c.severity === 'severe').length,
        minorCount: MOCK_CHANGES.filter(c => c.severity === 'minor').length,
      };
    }
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  }
};
