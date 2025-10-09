/**
 * Theme Demo Page
 * Demonstrates the theme system capabilities
 */

import React from 'react'
import { AppLayout } from '../components/layout'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { useTheme, useThemeClasses } from '../contexts/ThemeContext'
import type { BreadcrumbItem } from '../types/ui'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'Theme Demo',
    href: '/theme-demo',
    isActive: true
  }
]

/**
 * Theme Demo Page Component
 */
export function ThemeDemo() {
  const { theme, resolvedTheme } = useTheme()
  const classes = useThemeClasses()

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className={`text-3xl font-bold ${classes.text.primary}`}>
              Theme System Demo
            </h1>
            <p className={`mt-2 ${classes.text.secondary}`}>
              Explore the light and dark mode capabilities of the platform.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle variant="dropdown" showLabel />
          </div>
        </div>

        {/* Theme Status */}
        <Card>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
              Current Theme Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${classes.bg.secondary}`}>
                <h3 className={`font-medium ${classes.text.primary}`}>Selected Theme</h3>
                <p className={`text-2xl font-bold ${classes.text.primary} capitalize`}>
                  {theme}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${classes.bg.secondary}`}>
                <h3 className={`font-medium ${classes.text.primary}`}>Resolved Theme</h3>
                <p className={`text-2xl font-bold ${classes.text.primary} capitalize`}>
                  {resolvedTheme}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${classes.bg.secondary}`}>
                <h3 className={`font-medium ${classes.text.primary}`}>System Preference</h3>
                <p className={`text-2xl font-bold ${classes.text.primary}`}>
                  {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Theme Toggle Variants */}
        <Card>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
              Theme Toggle Variants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Icon Toggle</h3>
                <ThemeToggle variant="icon" />
              </div>
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Button Toggle</h3>
                <ThemeToggle variant="button" />
              </div>
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Dropdown Toggle</h3>
                <ThemeToggle variant="dropdown" showLabel />
              </div>
            </div>
          </div>
        </Card>

        {/* Component Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buttons */}
          <Card>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
                Button Components
              </h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Form Elements */}
          <Card>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
                Form Elements
              </h2>
              <div className="space-y-4">
                <Input
                  label="Text Input"
                  placeholder="Enter some text..."
                  fullWidth
                />
                <Input
                  label="Email Input"
                  type="email"
                  placeholder="user@example.com"
                  fullWidth
                />
                <Input
                  label="Input with Error"
                  placeholder="This has an error"
                  error="This field is required"
                  fullWidth
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Status Colors */}
        <Card>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
              Status Colors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="theme-success p-4 rounded-lg border">
                <h3 className="font-medium">Success</h3>
                <p className="text-sm">Operation completed successfully</p>
              </div>
              <div className="theme-warning p-4 rounded-lg border">
                <h3 className="font-medium">Warning</h3>
                <p className="text-sm">Please review this action</p>
              </div>
              <div className="theme-error p-4 rounded-lg border">
                <h3 className="font-medium">Error</h3>
                <p className="text-sm">Something went wrong</p>
              </div>
              <div className="theme-info p-4 rounded-lg border">
                <h3 className="font-medium">Info</h3>
                <p className="text-sm">Additional information</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Color Palette */}
        <Card>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
              Color Palette
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Backgrounds</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`p-4 rounded ${classes.bg.primary} ${classes.border.primary} border`}>
                    <span className={classes.text.primary}>Primary</span>
                  </div>
                  <div className={`p-4 rounded ${classes.bg.secondary} ${classes.border.primary} border`}>
                    <span className={classes.text.primary}>Secondary</span>
                  </div>
                  <div className={`p-4 rounded ${classes.bg.tertiary} ${classes.border.primary} border`}>
                    <span className={classes.text.primary}>Tertiary</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Text Colors</h3>
                <div className="space-y-2">
                  <p className={classes.text.primary}>Primary text color</p>
                  <p className={classes.text.secondary}>Secondary text color</p>
                  <p className={classes.text.tertiary}>Tertiary text color</p>
                  <p className={classes.text.muted}>Muted text color</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Implementation Guide */}
        <Card>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${classes.text.primary}`}>
              Implementation Guide
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Using Theme Classes</h3>
                <pre className={`p-4 rounded-lg ${classes.bg.secondary} ${classes.text.secondary} text-sm overflow-x-auto`}>
{`import { useThemeClasses } from '../contexts/ThemeContext'

function MyComponent() {
  const classes = useThemeClasses()
  
  return (
    <div className={classes.bg.primary}>
      <h1 className={classes.text.primary}>Title</h1>
      <p className={classes.text.secondary}>Description</p>
    </div>
  )
}`}
                </pre>
              </div>
              
              <div>
                <h3 className={`font-medium mb-2 ${classes.text.primary}`}>Using Tailwind Classes</h3>
                <pre className={`p-4 rounded-lg ${classes.bg.secondary} ${classes.text.secondary} text-sm overflow-x-auto`}>
{`<div className="bg-white dark:bg-gray-800 transition-colors duration-200">
  <h1 className="text-gray-900 dark:text-gray-100">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>`}
                </pre>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}