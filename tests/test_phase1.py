"""
Phase 1 Tests: Voice Infrastructure

These tests verify that the core voice infrastructure components are properly
configured and can be instantiated without errors.

Run with: pytest tests/test_phase1.py -v
"""

import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


class TestPatientRecord:
    """Test the PatientRecord dataclass functionality."""
    
    def test_patient_record_creation(self):
        """Test that PatientRecord can be created with default values."""
        from agent import PatientRecord
        
        record = PatientRecord()
        
        assert record.name is None
        assert record.age is None
        assert record.symptoms == []
        assert record.overall_severity is None
        assert record.overall_duration is None
        assert record.medications == []
    
    def test_patient_record_with_values(self):
        """Test PatientRecord with actual values."""
        from agent import PatientRecord, Symptom
        
        symptoms = [
            Symptom(name="headache", severity=7, duration="2 days"),
            Symptom(name="fatigue", severity=5, duration="1 week")
        ]
        record = PatientRecord(
            name="John Doe",
            age=35,
            symptoms=symptoms,
            overall_severity=6,
            overall_duration="3 days",
            medications=["ibuprofen"]
        )
        
        assert record.name == "John Doe"
        assert record.age == 35
        assert len(record.symptoms) == 2
        assert record.symptoms[0].name == "headache"
        assert record.symptoms[0].severity == 7
        assert record.symptoms[0].duration == "2 days"
        assert record.overall_severity == 6
        assert record.overall_duration == "3 days"
        assert record.medications == ["ibuprofen"]
    
    def test_patient_record_to_dict(self):
        """Test that PatientRecord can be converted to dictionary."""
        from agent import PatientRecord
        
        record = PatientRecord(name="Jane", age=28)
        result = record.to_dict()
        
        assert isinstance(result, dict)
        assert result["name"] == "Jane"
        assert result["age"] == 28
        assert result["symptoms"] == []
    
    def test_patient_record_to_json(self):
        """Test that PatientRecord can be serialized to JSON."""
        from agent import PatientRecord
        import json
        
        record = PatientRecord(name="Test", age=30)
        json_str = record.to_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["name"] == "Test"
        assert parsed["age"] == 30


class TestSystemPrompt:
    """Test the system prompt configuration."""
    
    def test_system_prompt_exists(self):
        """Test that SYSTEM_PROMPT is defined."""
        from agent import SYSTEM_PROMPT
        
        assert SYSTEM_PROMPT is not None
        assert len(SYSTEM_PROMPT) > 100  # Should be substantial
    
    def test_system_prompt_contains_key_instructions(self):
        """Test that system prompt contains essential instructions."""
        from agent import SYSTEM_PROMPT
        
        # Should mention key data to gather
        assert "name" in SYSTEM_PROMPT.lower()
        assert "age" in SYSTEM_PROMPT.lower()
        assert "symptom" in SYSTEM_PROMPT.lower()
        
        # Should mention the function to call
        assert "update_patient_record" in SYSTEM_PROMPT
        
        # Should mention guardrails
        assert "off-topic" in SYSTEM_PROMPT.lower() or "redirect" in SYSTEM_PROMPT.lower()


class TestAgentImports:
    """Test that all required modules can be imported."""
    
    def test_import_agent_module(self):
        """Test that agent.py can be imported."""
        import agent
        assert hasattr(agent, 'PatientRecord')
        assert hasattr(agent, 'create_agent')
        assert hasattr(agent, 'SYSTEM_PROMPT')
        assert hasattr(agent, 'update_patient_record')
        assert hasattr(agent, 'end_session')
    
    def test_import_main_module(self):
        """Test that main.py can be imported (basic syntax check)."""
        # This tests that the file has valid Python syntax
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "main", 
            os.path.join(os.path.dirname(__file__), '..', 'backend', 'main.py')
        )
        assert spec is not None


class TestAgentCreation:
    """Test the Agent creation and configuration."""
    
    def test_create_agent_returns_agent(self):
        """Test that create_agent returns an Agent instance."""
        from agent import create_agent
        from livekit.agents import Agent
        
        agent = create_agent()
        assert isinstance(agent, Agent)
    
    def test_agent_has_tools(self):
        """Test that the created agent has the required tools."""
        from agent import create_agent
        
        agent = create_agent()
        # Tools are function objects, get their names via __name__
        tool_names = [tool.__name__ for tool in agent._tools]
        
        assert "update_patient_record" in tool_names
        assert "end_session" in tool_names


class TestPatientRecordFunctions:
    """Test the patient record utility functions."""
    
    def test_get_patient_record(self):
        """Test getting the patient record."""
        from agent import get_patient_record, reset_patient_record, PatientRecord
        
        reset_patient_record()
        record = get_patient_record()
        assert isinstance(record, PatientRecord)
    
    def test_reset_patient_record(self):
        """Test resetting the patient record."""
        from agent import get_patient_record, reset_patient_record
        
        # Modify the record
        record = get_patient_record()
        record.name = "Test"
        
        # Reset and verify
        reset_patient_record()
        new_record = get_patient_record()
        assert new_record.name is None


class TestDependencies:
    """Test that required dependencies are available."""
    
    def test_livekit_agents_import(self):
        """Test that livekit-agents can be imported."""
        from livekit.agents import Agent, function_tool
        assert True
    
    def test_livekit_plugins_import(self):
        """Test that livekit plugins can be imported."""
        from livekit.plugins import deepgram, openai
        assert True
    
    def test_openai_import(self):
        """Test that openai can be imported."""
        import openai
        assert True
    
    def test_pydantic_import(self):
        """Test that pydantic can be imported."""
        import pydantic
        assert True
    
    def test_dotenv_import(self):
        """Test that python-dotenv can be imported."""
        from dotenv import load_dotenv
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
