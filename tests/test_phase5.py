"""
Phase 5 Tests: Clinician Summary Generation

Tests for:
- Summary module functions
- Summary prompt structure
- Summary parsing
- Frontend components
"""

import pytest
import os
import sys
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


class TestSummaryModule:
    """Test summary generation module."""
    
    def test_summary_module_exists(self):
        """Test that summary.py module exists."""
        summary_path = os.path.join(
            os.path.dirname(__file__), 
            '..', 'backend', 'summary.py'
        )
        assert os.path.exists(summary_path), "summary.py should exist"
    
    def test_clinical_summary_class_exists(self):
        """Test ClinicalSummary dataclass exists."""
        from summary import ClinicalSummary
        assert ClinicalSummary is not None
    
    def test_clinical_summary_has_required_fields(self):
        """Test ClinicalSummary has all required fields."""
        from summary import ClinicalSummary
        
        summary = ClinicalSummary(
            patient_name="Test Patient",
            patient_age=30,
            chief_complaint="Headache",
            subjective="Patient reports headache",
            objective="Alert and oriented",
            assessment="Tension headache",
            plan="Rest and hydration",
            raw_markdown="# Summary"
        )
        
        assert summary.patient_name == "Test Patient"
        assert summary.patient_age == 30
        assert summary.chief_complaint == "Headache"
        assert summary.subjective is not None
        assert summary.objective is not None
        assert summary.assessment is not None
        assert summary.plan is not None
    
    def test_clinical_summary_to_dict(self):
        """Test ClinicalSummary converts to dict."""
        from summary import ClinicalSummary
        
        summary = ClinicalSummary(
            patient_name="Dict Test",
            patient_age=25,
            chief_complaint="Cough",
            subjective="Has cough",
            objective="Clear lungs",
            assessment="Viral URI",
            plan="Supportive care",
            raw_markdown=""
        )
        
        data = summary.to_dict()
        
        assert isinstance(data, dict)
        assert data["patient_name"] == "Dict Test"
        assert data["chief_complaint"] == "Cough"
    
    def test_clinical_summary_to_json(self):
        """Test ClinicalSummary converts to JSON."""
        from summary import ClinicalSummary
        
        summary = ClinicalSummary(
            patient_name="JSON Test",
            patient_age=35,
            chief_complaint="Fever",
            subjective="Fever for 2 days",
            objective="Temp 101F",
            assessment="Febrile illness",
            plan="Monitor",
            raw_markdown=""
        )
        
        json_str = summary.to_json()
        parsed = json.loads(json_str)
        
        assert parsed["patient_name"] == "JSON Test"


class TestSummaryPrompt:
    """Test summary system prompt."""
    
    def test_summary_prompt_exists(self):
        """Test that SUMMARY_SYSTEM_PROMPT is defined."""
        from summary import SUMMARY_SYSTEM_PROMPT
        
        assert SUMMARY_SYSTEM_PROMPT is not None
        assert len(SUMMARY_SYSTEM_PROMPT) > 100
    
    def test_summary_prompt_has_soap_format(self):
        """Test prompt mentions SOAP format."""
        from summary import SUMMARY_SYSTEM_PROMPT
        prompt_upper = SUMMARY_SYSTEM_PROMPT.upper()
        
        assert 'SUBJECTIVE' in prompt_upper
        assert 'OBJECTIVE' in prompt_upper
        assert 'ASSESSMENT' in prompt_upper
        assert 'PLAN' in prompt_upper
    
    def test_summary_prompt_has_safety_rules(self):
        """Test prompt includes safety rules."""
        from summary import SUMMARY_SYSTEM_PROMPT
        prompt_lower = SUMMARY_SYSTEM_PROMPT.lower()
        
        assert 'physician' in prompt_lower or 'healthcare provider' in prompt_lower
        assert 'not invent' in prompt_lower or 'not assume' in prompt_lower


class TestQuickSummary:
    """Test offline quick summary generation."""
    
    def test_generate_quick_summary_exists(self):
        """Test generate_quick_summary function exists."""
        from summary import generate_quick_summary
        assert callable(generate_quick_summary)
    
    def test_quick_summary_returns_markdown(self):
        """Test quick summary returns markdown string."""
        from summary import generate_quick_summary
        
        patient_data = {
            "name": "Quick Test",
            "age": 40,
            "symptoms": ["pain", "fatigue"],
            "severity": 6,
            "duration": "3 days",
            "medications": ["aspirin"]
        }
        
        result = generate_quick_summary(patient_data)
        
        assert isinstance(result, str)
        assert "## Patient Information" in result
        assert "Quick Test" in result
    
    def test_quick_summary_handles_missing_data(self):
        """Test quick summary handles missing patient data."""
        from summary import generate_quick_summary
        
        patient_data = {
            "name": None,
            "symptoms": []
        }
        
        result = generate_quick_summary(patient_data)
        
        assert isinstance(result, str)
        assert "Unknown" in result or "Not" in result


class TestSummaryParsing:
    """Test markdown parsing for summaries."""
    
    def test_parse_summary_markdown_exists(self):
        """Test parse_summary_markdown function exists."""
        from summary import parse_summary_markdown
        assert callable(parse_summary_markdown)
    
    def test_parse_summary_extracts_sections(self):
        """Test parsing extracts SOAP sections."""
        from summary import parse_summary_markdown
        
        markdown = """## Patient Information
- **Name:** Test

## Chief Complaint
Headache

## Subjective
Patient has a headache.

## Objective
Alert and oriented.

## Assessment
Tension headache.

## Plan
Rest and fluids.
"""
        patient_data = {"name": "Test", "symptoms": ["Headache"]}
        
        result = parse_summary_markdown(markdown, patient_data)
        
        assert result.subjective != ""
        assert result.objective != ""
        assert result.assessment != ""
        assert result.plan != ""


class TestFrontendSummaryComponents:
    """Test frontend summary components."""
    
    def test_clinician_summary_component_exists(self):
        """Test ClinicianSummary component exists."""
        component_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'components', 'ClinicianSummary.tsx'
        )
        assert os.path.exists(component_path)
    
    def test_clinician_summary_has_editing(self):
        """Test component has editing functionality."""
        component_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'components', 'ClinicianSummary.tsx'
        )
        
        with open(component_path, 'r') as f:
            content = f.read()
        
        assert 'isEditing' in content
        assert 'Edit' in content
        assert 'Save' in content
    
    def test_clinician_summary_has_download(self):
        """Test component has download functionality."""
        component_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'components', 'ClinicianSummary.tsx'
        )
        
        with open(component_path, 'r') as f:
            content = f.read()
        
        assert 'Download' in content
        assert 'handleDownload' in content


class TestSummaryAPIRoute:
    """Test summary API route."""
    
    def test_summary_route_exists(self):
        """Test summary API route exists."""
        route_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'api', 'summary', 'route.ts'
        )
        assert os.path.exists(route_path)
    
    def test_summary_route_has_post_handler(self):
        """Test route has POST handler."""
        route_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'api', 'summary', 'route.ts'
        )
        
        with open(route_path, 'r') as f:
            content = f.read()
        
        assert 'export async function POST' in content
    
    def test_summary_route_has_fallback(self):
        """Test route has fallback summary generation."""
        route_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'api', 'summary', 'route.ts'
        )
        
        with open(route_path, 'r') as f:
            content = f.read()
        
        assert 'generateQuickSummary' in content


class TestMainPageSummaryIntegration:
    """Test main page summary integration."""
    
    def test_main_page_imports_clinician_summary(self):
        """Test main page imports ClinicianSummary."""
        page_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'page.tsx'
        )
        
        with open(page_path, 'r') as f:
            content = f.read()
        
        assert 'ClinicianSummary' in content
    
    def test_main_page_has_view_mode(self):
        """Test main page has view mode state."""
        page_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'page.tsx'
        )
        
        with open(page_path, 'r') as f:
            content = f.read()
        
        assert 'viewMode' in content
        assert 'summary' in content
        assert 'intake' in content
    
    def test_main_page_has_generate_button(self):
        """Test main page has generate summary button."""
        page_path = os.path.join(
            os.path.dirname(__file__),
            '..', 'frontend', 'src', 'app', 'page.tsx'
        )
        
        with open(page_path, 'r') as f:
            content = f.read()
        
        assert 'handleGenerateSummary' in content
        assert 'Generate' in content


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
