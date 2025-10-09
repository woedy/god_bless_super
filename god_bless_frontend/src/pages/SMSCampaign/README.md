# SMS Campaign Interface

This directory contains the advanced SMS Campaign management interface for the God Bless platform.

## Components

### 1. CampaignBuilder.tsx

**Purpose**: Drag-and-drop campaign builder with live message preview and macro support

**Key Features**:

- Drag-and-drop interface for building SMS campaigns
- Live message preview with macro substitution
- Template management (save, load, delete)
- Macro insertion with sample data preview
- Character count and message segment tracking
- Rate limiting configuration
- Campaign scheduling options
- Recipient list management

**API Endpoints Used**:

- `GET /api/sms/campaigns/` - List campaigns
- `POST /api/sms/campaigns/` - Create campaign
- `GET /api/sms/campaigns/{id}/` - Get campaign details
- `PUT /api/sms/campaigns/{id}/` - Update campaign
- `DELETE /api/sms/campaigns/{id}/` - Delete campaign
- `POST /api/sms/campaigns/{id}/start/` - Start campaign
- `POST /api/sms/campaigns/{id}/pause/` - Pause campaign
- `POST /api/sms/campaigns/{id}/resume/` - Resume campaign
- `GET /api/sms/templates/` - List templates
- `POST /api/sms/templates/` - Create template
- `DELETE /api/sms/templates/{id}/` - Delete template

**State Management**:

- Campaign configuration (name, message, rate limits)
- Template list and selection
- Recipient data and preview
- Campaign status and progress

**Macro System**:
Supports dynamic content insertion using the following macros:

- `{first_name}` - Recipient's first name
- `{last_name}` - Recipient's last name
- `{phone}` - Recipient's phone number
- `{email}` - Recipient's email address
- `{company}` - Recipient's company name
- `{custom_field}` - Custom field data

## Usage

### Creating a Campaign

1. Navigate to the SMS Campaign Builder
2. Enter a campaign name
3. Compose your message using the text editor
4. Insert macros by clicking the macro buttons
5. Preview the message with sample data
6. Configure rate limiting (messages per minute)
7. Upload or select recipient list
8. Save as template (optional)
9. Schedule or start the campaign

### Using Templates

1. Click "Load Template" to view saved templates
2. Select a template to load its configuration
3. Modify as needed
4. Save changes or create a new template

### Managing Recipients

- Upload CSV file with recipient data
- Required columns: phone, first_name, last_name
- Optional columns: email, company, custom fields
- Preview shows how macros will be replaced for each recipient

## Integration Points

### Backend Integration

- Django REST API endpoints in `god_bless_backend/sms_sender/`
- Celery tasks for asynchronous SMS sending
- Rate limiting handled by backend rate limiter
- Macro processing via `macro_processor.py`

### Frontend Components

- Uses DataTable component for recipient management
- Toast notifications for user feedback
- React Router for navigation
- ApexCharts for campaign analytics (future)

## Configuration

### Rate Limiting

- Default: 10 messages per minute
- Configurable per campaign
- Enforced by backend rate limiter

### Message Limits

- Maximum message length: 1600 characters
- Segment calculation: 160 chars per segment (GSM-7)
- Unicode messages: 70 chars per segment

## Future Enhancements

- Real-time campaign progress tracking
- A/B testing support
- Advanced scheduling (recurring campaigns)
- Campaign analytics dashboard
- Message delivery reports
- Opt-out management
- Multi-language support

## Development Notes

### Adding New Macros

1. Update backend `macro_processor.py` with new macro logic
2. Add macro button to CampaignBuilder UI
3. Update sample data for preview
4. Document in this README

### Testing

- Test with various recipient data formats
- Verify macro substitution accuracy
- Test rate limiting behavior
- Validate message segmentation
- Check template save/load functionality

## Related Documentation

- Backend: `god_bless_backend/sms_sender/CAMPAIGN_VIEWS_COMPLETION.md`
- DataTable: `god_bless_frontend/src/components/DataTable/README.md`
- Phone Management: `god_bless_frontend/src/pages/PhoneManagement/README.md`
