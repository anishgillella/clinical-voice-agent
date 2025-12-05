"""
Phase 2 Tests: Real-Time Function Calling

Tests for:
- Function tool definitions and execution
- PatientRecord updates via function calls
- Data broadcasting functionality
- Field update logic
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


class TestFunctionToolDefinitions:
    """Test that function tools are properly defined."""
    
    def test_update_patient_record_function_exists(self):
        """Test that update_patient_record function is defined."""
        from agent import update_patient_record
        assert callable(update_patient_record)
    
    def test_end_session_function_exists(self):
        """Test that end_session function is defined."""
        from agent import end_session
        assert callable(end_session)
    
    def test_update_patient_record_has_correct_parameters(self):
        """Test that update_patient_record accepts the right parameters."""
        from agent import update_patient_record
        import inspect
        sig = inspect.signature(update_patient_record)
        params = list(sig.parameters.keys())
        
        expected_params = ['name', 'age', 'symptom', 'symptom_severity', 'symptom_duration', 'overall_severity', 'overall_duration', 'medication']
        for param in expected_params:
            assert param in params, f"Missing parameter: {param}"


class TestPatientRecordUpdates:
    """Test PatientRecord update functionality."""
    
    def test_update_name_only(self):
        """Test updating just the name field."""
        from agent import reset_patient_record, get_patient_record, PatientRecord
        
        reset_patient_record()
        record = get_patient_record()
        
        # Simulate an update
        record.name = "John Doe"
        
        assert record.name == "John Doe"
        assert record.age is None  # Other fields unchanged
    
    def test_update_multiple_fields(self):
        """Test updating multiple fields at once."""
        from agent import reset_patient_record, get_patient_record, Symptom
        
        reset_patient_record()
        record = get_patient_record()
        
        record.name = "Jane Smith"
        record.age = 35
        record.add_symptom("headache", 7)
        record.add_symptom("fever", 6)
        record.overall_severity = 7
        
        assert record.name == "Jane Smith"
        assert record.age == 35
        assert len(record.symptoms) == 2
        assert record.overall_severity == 7
    
    def test_symptoms_list_append(self):
        """Test that symptoms can be appended using add_symptom."""
        from agent import reset_patient_record, get_patient_record
        
        reset_patient_record()
        record = get_patient_record()
        
        record.add_symptom("cough", 5)
        record.add_symptom("fatigue", 3)
        
        symptom_names = record.get_symptom_names()
        assert "cough" in symptom_names
        assert "fatigue" in symptom_names
        assert len(record.symptoms) == 2
    
    def test_medications_list_update(self):
        """Test medication list updates."""
        from agent import reset_patient_record, get_patient_record
        
        reset_patient_record()
        record = get_patient_record()
        
        record.medications = ["ibuprofen", "aspirin"]
        
        assert len(record.medications) == 2
        assert "ibuprofen" in record.medications
    
    def test_severity_range(self):
        """Test severity accepts valid range values."""
        from agent import reset_patient_record, get_patient_record
        
        reset_patient_record()
        record = get_patient_record()
        
        # Test various overall_severity levels
        for severity in [1, 5, 10]:
            record.overall_severity = severity
            assert record.overall_severity == severity


class TestDataBroadcasting:
    """Test data broadcasting functionality."""
    
    def test_patient_record_to_dict(self):
        """Test PatientRecord conversion to dict for broadcasting."""
        from agent import PatientRecord, Symptom
        
        symptoms = [Symptom(name="pain", severity=5, duration="2 days")]
        record = PatientRecord(
            name="Test Patient",
            age=30,
            symptoms=symptoms,
            overall_severity=5,
            overall_duration="2 days",
            medications=["tylenol"]
        )
        
        data = record.to_dict()
        
        assert isinstance(data, dict)
        assert data["name"] == "Test Patient"
        assert data["age"] == 30
        assert len(data["symptoms"]) == 1
        assert data["symptoms"][0]["name"] == "pain"
        assert data["symptoms"][0]["duration"] == "2 days"
        assert data["overall_severity"] == 5
        assert data["overall_duration"] == "2 days"
        assert data["medications"] == ["tylenol"]
    
    def test_patient_record_to_json(self):
        """Test PatientRecord JSON serialization."""
        from agent import PatientRecord, Symptom
        
        symptoms = [Symptom(name="nausea", severity=3, duration="1 week")]
        record = PatientRecord(
            name="JSON Patient",
            age=25,
            symptoms=symptoms,
            overall_severity=3,
            overall_duration="1 week",
            medications=[]
        )
        
        json_str = record.to_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["name"] == "JSON Patient"
        assert parsed["age"] == 25
    
    def test_broadcast_message_format(self):
        """Test that broadcast message has correct format."""
        from agent import PatientRecord, Symptom
        
        symptoms = [Symptom(name="dizziness", severity=6, duration="3 days")]
        record = PatientRecord(
            name="Broadcast Test",
            age=40,
            symptoms=symptoms,
            overall_severity=6,
            overall_duration="3 days",
            medications=["medicine"]
        )
        
        # Create broadcast message format
        message = {
            "type": "UPDATE_RECORD",
            "data": record.to_dict()
        }
        
        assert message["type"] == "UPDATE_RECORD"
        assert "data" in message
        assert message["data"]["name"] == "Broadcast Test"
    
    def test_session_end_message_format(self):
        """Test session end message format."""
        from agent import PatientRecord, Symptom
        
        symptoms = [Symptom(name="complete", severity=None, duration=None)]
        record = PatientRecord(
            name="Session End Test",
            age=50,
            symptoms=symptoms,
            overall_severity=None,
            overall_duration=None,
            medications=[]
        )
        
        message = {
            "type": "SESSION_END",
            "data": record.to_dict()
        }
        
        assert message["type"] == "SESSION_END"


class TestRoomIntegration:
    """Test room setup and integration."""
    
    def test_set_room_function_exists(self):
        """Test that set_room function exists."""
        from agent import set_room
        assert callable(set_room)
    
    def test_reset_patient_record_function(self):
        """Test reset functionality."""
        from agent import reset_patient_record, get_patient_record
        
        # Set some data
        record = get_patient_record()
        record.name = "Before Reset"
        record.age = 99
        
        # Reset
        reset_patient_record()
        
        # Check it's cleared
        new_record = get_patient_record()
        assert new_record.name is None
        assert new_record.age is None
        assert new_record.symptoms == []


class TestAgentTools:
    """Test that agent has correct tools configured."""
    
    def test_agent_has_update_tool(self):
        """Test agent includes update_patient_record tool."""
        from agent import create_agent
        
        agent = create_agent()
        
        # Check tools are configured
        assert hasattr(agent, '_tools') or hasattr(agent, 'tools')
    
    def test_agent_tool_count(self):
        """Test agent has expected number of tools."""
        from agent import create_agent
        
        agent = create_agent()
        
        # Should have at least 2 tools (update_patient_record, end_session)
        tools = getattr(agent, '_tools', None) or getattr(agent, 'tools', [])
        assert len(tools) >= 2


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
