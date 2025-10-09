/**
 * UI Types
 * TypeScript interfaces for UI components, state management, and user interactions
 */

import type { ReactNode } from 'react'

// Base UI Types
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  id?: string
  'data-testid'?: string
}

// Layout Types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
  isActive?: boolean
}

export interface SidebarProps extends BaseComponentProps {
  isCollapsed: boolean
  onToggle: () => void
  navigation: NavigationItem[]
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: ReactNode
  badge?: string | number
  isActive?: boolean
  children?: NavigationItem[]
  permissions?: string[]
}

// Form Types
export interface FormFieldProps extends BaseComponentProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
}

export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  autoComplete?: string
  maxLength?: number
  minLength?: number
  pattern?: string
}

export interface SelectProps extends FormFieldProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  options: SelectOption[]
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  loading?: boolean
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
  icon?: ReactNode
}

export interface CheckboxProps extends FormFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  indeterminate?: boolean
}

export interface RadioProps extends FormFieldProps {
  value: string
  selectedValue: string
  onChange: (value: string) => void
  name: string
}

export interface TextareaProps extends FormFieldProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  maxLength?: number
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

// Button Types
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'warning'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Modal Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  footer?: ReactNode
}

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

// Table Types
export interface TableProps<T = any> extends BaseComponentProps {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: PaginationConfig
  sorting?: SortingConfig
  selection?: SelectionConfig<T>
  actions?: TableAction<T>[]
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
}

export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex?: keyof T
  render?: (value: any, row: T, index: number) => ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
}

export interface PaginationConfig {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean
  onChange: (page: number, pageSize: number) => void
}

export interface SortingConfig {
  field?: string
  direction?: 'asc' | 'desc'
  onChange: (field: string, direction: 'asc' | 'desc') => void
}

export interface SelectionConfig<T = any> {
  selectedRows: T[]
  onChange: (selectedRows: T[]) => void
  getRowKey: (row: T) => string
  type?: 'checkbox' | 'radio'
}

export interface TableAction<T = any> {
  key: string
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  disabled?: (row: T) => boolean
  visible?: (row: T) => boolean
  danger?: boolean
}

// Card Types
export interface CardProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  footer?: ReactNode
  loading?: boolean
  hoverable?: boolean
  bordered?: boolean
}

// Notification Types
export interface NotificationProps {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  closable?: boolean
  actions?: NotificationAction[]
  onClose?: () => void
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface NotificationAction {
  label: string
  onClick: () => void
  primary?: boolean
}

// Loading Types
export interface LoadingProps extends BaseComponentProps {
  size?: LoadingSize
  text?: string
  overlay?: boolean
}

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Chart Types
export interface ChartProps extends BaseComponentProps {
  type: ChartType
  data: ChartData
  options?: ChartOptions
  height?: number
  loading?: boolean
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'doughnut' 
  | 'area' 
  | 'scatter'

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
  fill?: boolean
}

export interface ChartOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: {
    legend?: {
      display?: boolean
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
    tooltip?: {
      enabled?: boolean
    }
  }
  scales?: {
    x?: ChartScale
    y?: ChartScale
  }
}

export interface ChartScale {
  display?: boolean
  title?: {
    display?: boolean
    text?: string
  }
  min?: number
  max?: number
}

// Filter Types
export interface FilterProps extends BaseComponentProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  onReset?: () => void
  onApply?: () => void
}

export interface FilterConfig {
  key: string
  label: string
  type: FilterType
  options?: SelectOption[]
  placeholder?: string
  multiple?: boolean
  searchable?: boolean
}

export type FilterType = 
  | 'text' 
  | 'select' 
  | 'multiselect' 
  | 'date' 
  | 'daterange' 
  | 'number' 
  | 'boolean'

// Search Types
export interface SearchProps extends BaseComponentProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  loading?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

// Progress Types
export interface ProgressProps extends BaseComponentProps {
  value: number
  max?: number
  size?: ProgressSize
  variant?: ProgressVariant
  showLabel?: boolean
  label?: string
  animated?: boolean
}

export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg'
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error'

// Badge Types
export interface BadgeProps extends BaseComponentProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  count?: number
  showZero?: boolean
  max?: number
}

export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'

export type BadgeSize = 'sm' | 'md' | 'lg'

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor: string
  borderRadius: number
  fontSize: number
  fontFamily: string
}

// Responsive Types
export interface ResponsiveConfig {
  xs?: any
  sm?: any
  md?: any
  lg?: any
  xl?: any
  '2xl'?: any
}

// Animation Types
export interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
}

// Accessibility Types
export interface A11yProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  role?: string
  tabIndex?: number
}