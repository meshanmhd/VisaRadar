export type Severity = 'severe' | 'minor' | 'none';
export type Confidence = 'high' | 'medium' | 'low';
export type Status = 'pending' | 'verified' | 'false_positive' | 'processed';

export interface Source {
  id: string;
  country: string;
  url: string;
  type: string;
  frequency: string;
  status: 'active' | 'paused' | 'error';
  last_checked?: string;
}

export interface Change {
  id: string;
  source_id: string;
  country?: string;
  before_text: string;
  after_text: string;
  summary?: string;
  short_title?: string;
  long_description?: string;
  short_before?: string;
  short_after?: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  effective_date?: string;
  status: Status;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  country: string;
  visa_type: string;
  stage: string;
  contact: string;
  language: string;
}

export interface Impact {
  id: string;
  change_id: string;
  customer_id: string;
  level: Severity;
  required_action: string;
  actual_action: string;
  short_description: string;
  system_step: string;
  deadline?: string;
}

export interface Task {
  id: string;
  change_id: string;
  description: string;
  owner: string;
  due_date?: string;
  status: 'open' | 'in_progress' | 'done';
}

export interface Message {
  id: string;
  impact_id: string;
  language: string;
  body: string;
  status: 'draft' | 'approved' | 'sent';
}
