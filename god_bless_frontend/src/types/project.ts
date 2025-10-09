export interface Project {
  id: number;
  project_name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  target_phone_count: number;
  target_sms_count: number;
  budget?: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  task_stats?: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    completion_rate: number;
  };
  phone_stats?: {
    total: number;
    valid: number;
    invalid: number;
  };
  sms_stats?: {
    total: number;
    sent: number;
    pending: number;
    failed: number;
  };
  recent_activities?: Activity[];
  collaborators_count?: number;
}

export interface Activity {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
  user_details: {
    username: string;
  };
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  assigned_to_details: any;
}

export interface ProjectFormData {
  project_name: string;
  description: string;
  status: string;
  priority: string;
  start_date?: string;
  due_date?: string;
  target_phone_count: string;
  target_sms_count: string;
  budget?: string;
}