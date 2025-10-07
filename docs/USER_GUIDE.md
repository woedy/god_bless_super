# God Bless America Platform - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Phone Number Management](#phone-number-management)
4. [SMS Campaign Management](#sms-campaign-management)
5. [Project Management](#project-management)
6. [Settings & Configuration](#settings--configuration)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating an Account

1. Navigate to the platform homepage
2. Click **Sign Up** in the top right corner
3. Fill in your details:
   - Username (unique identifier)
   - Email address
   - Password (minimum 8 characters, must include letters and numbers)
   - Confirm password
4. Click **Create Account**
5. Check your email for verification link (if email verification is enabled)

### Logging In

1. Click **Sign In** on the homepage
2. Enter your username and password
3. Click **Sign In**
4. You'll be redirected to your dashboard

### Theme Customization

The platform supports both light and dark themes:

1. Click the **theme toggle** icon in the top navigation bar
2. Your preference is automatically saved
3. The theme persists across sessions

---

## Dashboard Overview

The dashboard provides a comprehensive view of your platform activity:

### Key Metrics
- **Total Phone Numbers**: Count of all generated phone numbers
- **Valid Numbers**: Numbers that passed validation
- **Active Campaigns**: Currently running SMS campaigns
- **Messages Sent**: Total SMS messages delivered

### Recent Activity
- View your latest phone number generations
- Track recent SMS campaigns
- Monitor validation tasks
- See system notifications

### Quick Actions
- Generate new phone numbers
- Create SMS campaign
- Validate phone numbers
- Export data

---

## Phone Number Management

### Generating Phone Numbers

1. Navigate to **Generate Numbers** from the sidebar
2. Configure generation parameters:
   - **Area Code**: Enter desired area code (e.g., 555)
   - **Quantity**: Number of phones to generate (1 - 1,000,000)
   - **Carrier**: Select carrier (Verizon, AT&T, T-Mobile, Sprint, or All)
   - **Number Type**: Choose mobile, landline, or voip
3. Click **Generate Numbers**
4. Monitor progress in real-time with the progress bar
5. Numbers are automatically saved to your account

**Tips:**
- Large generations (>10,000) run in the background
- You'll receive a notification when complete
- You can continue using the platform while generation runs

### Viewing All Numbers

1. Navigate to **All Numbers** from the sidebar
2. Use the filter panel to refine results:
   - **Carrier**: Filter by specific carrier
   - **Area Code**: Filter by area code
   - **Number Type**: Filter by type (mobile/landline/voip)
   - **Validation Status**: Show only valid or invalid numbers
3. Sort by any column by clicking the column header
4. Use the search bar to find specific numbers

### Exporting Numbers

1. From the **All Numbers** page, apply desired filters
2. Click the **Export** button
3. Select export format:
   - **CSV**: Comma-separated values (Excel compatible)
   - **TXT**: Plain text, one number per line
   - **JSON**: Structured data format
   - **DOC**: Microsoft Word document
4. Click **Download**
5. The export includes only filtered results

### Validating Phone Numbers

1. Navigate to **Validate Numbers** from the sidebar
2. Choose validation method:
   - **Single Number**: Enter one number to validate
   - **Bulk Validation**: Upload CSV file or paste multiple numbers
3. Click **Validate**
4. View validation results:
   - ✓ Valid: Number is active and reachable
   - ✗ Invalid: Number is disconnected or invalid
   - Carrier information
   - Number type
   - Line status

**Validation Features:**
- Real-time validation for single numbers
- Background processing for bulk validation (>100 numbers)
- Results are automatically saved
- Export validation reports

---

## SMS Campaign Management

### Creating a Campaign

1. Navigate to **SMS Campaigns** → **New Campaign**
2. Enter campaign details:
   - **Campaign Name**: Descriptive name for your campaign
   - **Message Template**: Your SMS message content
3. Use personalization macros:
   - `{{name}}`: Recipient's name
   - `{{phone}}`: Recipient's phone number
   - `{{date}}`: Current date
   - `{{custom_field}}`: Any custom field you define
4. Preview your message in real-time
5. Click **Save Campaign**

### Using Campaign Templates

1. Click **Template Library** in the campaign builder
2. Browse pre-built templates by category:
   - Marketing
   - Notifications
   - Reminders
   - Alerts
3. Click **Use Template** to load it
4. Customize the template for your needs

### Adding Recipients

**Method 1: Manual Entry**
1. In campaign details, click **Add Recipients**
2. Enter phone numbers (one per line)
3. Add personalization data if using macros
4. Click **Add**

**Method 2: Import from File**
1. Click **Import Recipients**
2. Upload CSV file with columns:
   - `phone`: Phone number (required)
   - `name`: Recipient name (optional)
   - Additional custom fields
3. Map CSV columns to campaign fields
4. Click **Import**

**Method 3: Use Existing Numbers**
1. Click **Select from Numbers**
2. Filter your phone number database
3. Select numbers to add
4. Click **Add Selected**

### Configuring Delivery Settings

1. In campaign settings, configure:
   - **Carrier Filtering**: Target specific carriers
   - **Rate Limiting**: Messages per minute (prevents spam detection)
   - **Delivery Delay**: Random delay between messages (1-10 seconds)
   - **Batch Size**: Number of messages per batch
2. **Schedule Delivery** (optional):
   - Choose immediate or scheduled send
   - Set date and time for scheduled campaigns
   - Select timezone
3. Click **Save Settings**

### Sending a Campaign

1. Review campaign summary:
   - Total recipients
   - Estimated delivery time
   - Cost estimate (if applicable)
2. Click **Send Campaign**
3. Confirm sending
4. Monitor progress in real-time:
   - Messages sent
   - Delivery status
   - Failed messages
   - Estimated completion time

### Campaign Analytics

1. Navigate to **SMS Dashboard**
2. View campaign metrics:
   - **Delivery Rate**: Percentage successfully delivered
   - **Failure Rate**: Failed deliveries
   - **Carrier Breakdown**: Distribution by carrier
   - **Timeline**: Delivery over time
3. Export campaign reports
4. View detailed message logs

---

## Project Management

### Creating a Project

1. Navigate to **Projects** → **Add Project**
2. Enter project details:
   - **Project Name**: Descriptive name
   - **Description**: Project purpose and goals
   - **Start Date**: Project start date
   - **End Date**: Expected completion date
3. Click **Create Project**

### Managing Project Tasks

1. Open a project from **All Projects**
2. Click **Tasks** tab
3. Add new tasks:
   - Task name
   - Description
   - Priority (Low, Medium, High)
   - Due date
   - Assigned to (if team feature enabled)
4. Track task status:
   - To Do
   - In Progress
   - Completed
5. Update task status by clicking the status dropdown

### Project Dashboard

Each project has a dedicated dashboard showing:
- Task completion progress
- Upcoming deadlines
- Recent activity
- Associated phone numbers
- Related SMS campaigns

---

## Settings & Configuration

### Account Settings

1. Navigate to **Settings** → **Account**
2. Update your profile:
   - Username
   - Email address
   - Password
   - Theme preference
   - Notification preferences
3. Click **Save Changes**

### SMTP Configuration

Configure email servers for SMS delivery:

1. Navigate to **Settings** → **SMTP Servers**
2. Click **Add SMTP Server**
3. Enter server details:
   - **Host**: SMTP server address
   - **Port**: SMTP port (usually 587 or 465)
   - **Username**: SMTP username
   - **Password**: SMTP password
   - **Use TLS**: Enable for secure connection
4. Click **Test Connection** to verify
5. Click **Save**

**SMTP Rotation:**
- Enable rotation to distribute load across multiple servers
- Set rotation strategy (round-robin, random, or weighted)
- Configure health checks to skip failed servers

### Proxy Configuration

Configure proxy servers for enhanced privacy:

1. Navigate to **Settings** → **Proxy Servers**
2. Click **Add Proxy**
3. Enter proxy details:
   - **Host**: Proxy server address
   - **Port**: Proxy port
   - **Type**: HTTP, HTTPS, or SOCKS5
   - **Username**: Proxy username (if required)
   - **Password**: Proxy password (if required)
4. Click **Test Connection**
5. Click **Save**

**Proxy Rotation:**
- Enable automatic proxy rotation
- Set rotation interval
- Configure fallback behavior

### Delivery Settings

Fine-tune message delivery:

1. Navigate to **Settings** → **Delivery**
2. Configure:
   - **Minimum Delay**: Minimum seconds between messages (1-60)
   - **Maximum Delay**: Maximum seconds between messages (1-60)
   - **Batch Size**: Messages per batch (1-1000)
   - **Concurrent Batches**: Number of parallel batches (1-10)
3. Click **Save Settings**

**Best Practices:**
- Use 2-5 second delays to avoid spam detection
- Batch size of 100-500 for optimal performance
- Limit concurrent batches to 2-3 for stability

---

## Troubleshooting

### Common Issues

#### Phone Generation Not Working

**Problem**: Numbers aren't generating
**Solutions**:
1. Check that quantity is between 1 and 1,000,000
2. Verify area code is valid (3 digits)
3. Check background task status in dashboard
4. Ensure you have sufficient permissions

#### SMS Campaign Not Sending

**Problem**: Campaign stuck in "sending" status
**Solutions**:
1. Verify SMTP servers are configured and active
2. Check SMTP server connection status
3. Review campaign logs for error messages
4. Ensure recipients have valid phone numbers
5. Check rate limiting settings aren't too restrictive

#### Validation Failing

**Problem**: Phone validation returns errors
**Solutions**:
1. Ensure phone numbers are in correct format
2. Check that validation service is running
3. Verify database connection
4. Try validating smaller batches

#### Export Not Downloading

**Problem**: Export button doesn't download file
**Solutions**:
1. Check browser pop-up blocker settings
2. Ensure you have applied filters before exporting
3. Try a different export format
4. Check browser console for errors

#### Login Issues

**Problem**: Can't log in to account
**Solutions**:
1. Verify username and password are correct
2. Check if account is activated (check email)
3. Try password reset if forgotten
4. Clear browser cache and cookies
5. Try a different browser

### Performance Tips

1. **Large Datasets**: Use filters to reduce data load
2. **Slow Loading**: Clear browser cache regularly
3. **Background Tasks**: Monitor task queue in dashboard
4. **Export Large Data**: Use CSV format for best performance
5. **Campaign Sending**: Use appropriate batch sizes and delays

### Getting Help

If you continue experiencing issues:

1. Check the **System Status** page for known issues
2. Review error messages carefully
3. Contact support with:
   - Description of the problem
   - Steps to reproduce
   - Screenshots (if applicable)
   - Browser and operating system information
4. Check the FAQ section for common questions

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + /`: Toggle sidebar
- `Ctrl/Cmd + T`: Toggle theme
- `Ctrl/Cmd + N`: New campaign (on campaigns page)
- `Ctrl/Cmd + E`: Export data (on data pages)
- `Esc`: Close modals and dialogs

---

## Best Practices

### Phone Number Management
- Generate numbers in batches appropriate for your needs
- Validate numbers before using in campaigns
- Regularly clean up invalid numbers
- Use filters to organize large datasets
- Export backups of important number lists

### SMS Campaigns
- Test campaigns with small recipient lists first
- Use personalization to increase engagement
- Monitor delivery rates and adjust settings
- Respect carrier rate limits
- Keep messages concise and clear
- Include opt-out instructions when required

### Security
- Use strong, unique passwords
- Enable two-factor authentication (if available)
- Log out when using shared computers
- Regularly review account activity
- Don't share account credentials

### Performance
- Close unused browser tabs
- Use filters to reduce data load
- Schedule large operations during off-peak hours
- Monitor background task queue
- Clear browser cache periodically

---

## Glossary

- **Area Code**: First 3 digits of a phone number identifying geographic region
- **Carrier**: Telecommunications company providing phone service
- **Bulk Operation**: Processing multiple items simultaneously
- **Campaign**: Organized SMS sending operation with multiple recipients
- **Macro**: Placeholder text replaced with personalized data
- **Rate Limiting**: Controlling message sending speed to avoid spam detection
- **Validation**: Verifying phone number is active and reachable
- **Background Task**: Long-running operation processed asynchronously
- **Export**: Downloading data in various file formats
- **SMTP**: Simple Mail Transfer Protocol for sending messages

---

## Support & Resources

- **Documentation**: Full technical documentation available at `/docs`
- **API Reference**: For developers integrating with the platform
- **Video Tutorials**: Step-by-step video guides
- **Community Forum**: Connect with other users
- **Support Email**: support@godblessamerica.com
- **Status Page**: Real-time system status and uptime

---

*Last Updated: January 2025*
*Version: 2.0*
