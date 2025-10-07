"""
Macro Processing System for SMS Campaigns
Handles dynamic content replacement with personalization macros
"""

import re
from datetime import datetime
from typing import Dict, Any, Optional
import random
import string


class MacroProcessor:
    """Process and replace macros in SMS message templates"""
    
    # Macro pattern: @MACRONAME@
    MACRO_PATTERN = r"@(\w+)@"
    
    def __init__(self):
        """Initialize the macro processor"""
        self.default_values = self._get_default_values()
    
    def _get_default_values(self) -> Dict[str, Any]:
        """Get default values for common macros"""
        now = datetime.now()
        return {
            "DATE": now.strftime("%m/%d/%Y"),
            "TIME": now.strftime("%I:%M %p"),
            "DAY": now.strftime("%A"),
            "MONTH": now.strftime("%B"),
            "YEAR": str(now.year),
            "COMPANY": "Our Company",
            "BUSINESS": "Our Business",
        }
    
    def process_message(
        self,
        template: str,
        custom_data: Optional[Dict[str, Any]] = None,
        recipient_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Process a message template and replace all macros
        
        Args:
            template: Message template with @MACRO@ placeholders
            custom_data: Custom macro values (campaign-level)
            recipient_data: Recipient-specific data (per-message)
        
        Returns:
            Processed message with macros replaced
        """
        if custom_data is None:
            custom_data = {}
        if recipient_data is None:
            recipient_data = {}
        
        # Merge all data sources (priority: recipient > custom > default)
        all_data = {**self.default_values, **custom_data, **recipient_data}
        
        def replace_macro(match):
            macro_name = match.group(1)
            return str(all_data.get(macro_name, match.group(0)))
        
        # Replace all macros in the template
        processed = re.sub(self.MACRO_PATTERN, replace_macro, template)
        return processed
    
    def extract_macros(self, template: str) -> list:
        """Extract all macro names from a template"""
        return re.findall(self.MACRO_PATTERN, template)
    
    def validate_template(self, template: str, available_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a template and check for missing macros
        
        Returns:
            Dictionary with validation results
        """
        macros = self.extract_macros(template)
        all_data = {**self.default_values, **available_data}
        
        missing_macros = [m for m in macros if m not in all_data]
        
        return {
            "valid": len(missing_macros) == 0,
            "macros_found": macros,
            "missing_macros": missing_macros,
            "available_macros": list(all_data.keys())
        }
    
    def generate_sample_message(self, template: str, sample_data: Optional[Dict[str, Any]] = None) -> str:
        """Generate a sample message with placeholder data"""
        if sample_data is None:
            sample_data = self._get_sample_data()
        
        return self.process_message(template, sample_data)
    
    def _get_sample_data(self) -> Dict[str, Any]:
        """Get sample data for preview purposes"""
        return {
            "FIRSTNAME": "John",
            "LASTNAME": "Doe",
            "FULLNAME": "John Doe",
            "EMAIL": "john.doe@example.com",
            "COMPANY": "Acme Corp",
            "BUSINESS": "Acme Store",
            "BRAND": "Acme",
            "ORDERID": "ORD-12345",
            "AMOUNT": "99.99",
            "TOTAL": "109.99",
            "REF": self._generate_ref_number(),
            "TICKET": self._generate_ticket_number(),
            "INVOICE": "INV-2024-001",
            "PRODUCT": "Premium Widget",
            "CATEGORY": "Electronics",
            "ITEMS": "3",
            "DESCRIPTION": "High-quality premium widget",
            "DISCOUNT": "20",
            "CODE": self._generate_promo_code(),
            "REWARD": "$10 off",
            "POINTS": "500",
            "DELIVERYDATE": "03/15/2024",
            "STARTTIME": "9:00 AM",
            "ENDTIME": "5:00 PM",
            "ADDRESS": "123 Main St",
            "CITY": "New York",
            "STATE": "NY",
            "ZIP": "10001",
            "VENUE": "Convention Center",
            "LOCATION": "Downtown",
            "LINK": "https://example.com",
            "URL": "https://example.com/track",
            "TRACKINGURL": "https://track.example.com/12345",
            "PHONE": "1-800-555-0100",
            "EVENT": "Annual Conference",
            "SERVICE": "Premium Plan",
            "SEASON": "Spring",
            "MESSAGE": "Important update",
            "MINUTES": "10",
        }
    
    def _generate_ref_number(self) -> str:
        """Generate a random reference number"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    def _generate_ticket_number(self) -> str:
        """Generate a random ticket number"""
        return f"TKT-{''.join(random.choices(string.digits, k=6))}"
    
    def _generate_promo_code(self) -> str:
        """Generate a random promo code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# Singleton instance
macro_processor = MacroProcessor()


def process_message(template: str, custom_data: Optional[Dict[str, Any]] = None, 
                   recipient_data: Optional[Dict[str, Any]] = None) -> str:
    """Convenience function to process a message"""
    return macro_processor.process_message(template, custom_data, recipient_data)


def extract_macros(template: str) -> list:
    """Convenience function to extract macros"""
    return macro_processor.extract_macros(template)


def validate_template(template: str, available_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to validate a template"""
    return macro_processor.validate_template(template, available_data)
