import type { Source, Change, Customer, Impact, Task, Message } from './types';

export const MOCK_SOURCES: Source[] = [
  { id: 'src_1', country: 'UK', url: 'https://gov.uk/visas', type: 'html', frequency: 'hourly', status: 'active', last_checked: new Date().toISOString() },
  { id: 'src_2', country: 'Canada', url: 'https://canada.ca/immigration', type: 'js', frequency: 'daily', status: 'active' },
  { id: 'src_3', country: 'Australia', url: 'https://immi.homeaffairs.gov.au/rules.pdf', type: 'pdf', frequency: 'weekly', status: 'error' },
];

export const MOCK_CHANGES: Change[] = [
  {
    id: 'chg_1',
    source_id: 'src_1',
    before_text: 'The minimum salary requirement for a Skilled Worker visa is £26,200.',
    after_text: 'The minimum salary requirement for a Skilled Worker visa is £38,700.',
    category: 'Financial Requirements',
    severity: 'severe',
    confidence: 'high',
    effective_date: '2024-04-04',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'chg_2',
    source_id: 'src_2',
    before_text: 'Applications take 6 weeks.',
    after_text: 'Applications currently take 8 weeks.',
    category: 'Processing Times',
    severity: 'minor',
    confidence: 'high',
    status: 'verified',
    created_at: new Date().toISOString(),
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust_1', name: 'Acme Corp', country: 'UK', visa_type: 'Skilled Worker', stage: 'Pre-Approval', contact: 'hr@acme.com', language: 'en' },
  { id: 'cust_2', name: 'Global Tech', country: 'UK', visa_type: 'Skilled Worker', stage: 'Active', contact: 'mobility@globaltech.com', language: 'en' },
];

export const MOCK_IMPACTS: Impact[] = [
  { id: 'imp_1', change_id: 'chg_1', customer_id: 'cust_1', level: 'severe', required_action: 'Update salary offerings for new applicants' },
  { id: 'imp_2', change_id: 'chg_1', customer_id: 'cust_2', level: 'minor', required_action: 'Review current sponsorship certificates' },
];

export const MOCK_TASKS: Task[] = [
  { id: 'tsk_1', change_id: 'chg_1', description: 'Review new salary thresholds against client Acme Corp', owner: 'Alice', status: 'open' }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'msg_1', impact_id: 'imp_1', language: 'en', body: 'Important update regarding UK Skilled Worker visa salary thresholds...', status: 'draft' }
];
