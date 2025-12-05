"""
Phase 4 Tests: Guardrails & Safety

Tests for:
- Off-topic handling in system prompt
- Safety protocols
- Data integrity rules
- Conversation steering
"""

import pytest
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


class TestGuardrailsInPrompt:
    """Test that guardrails are properly defined in system prompt."""
    
    def test_system_prompt_has_off_topic_handling(self):
        """Test system prompt includes off-topic handling instructions."""
        from agent import SYSTEM_PROMPT
        
        assert 'OFF-TOPIC' in SYSTEM_PROMPT.upper(), "Should have off-topic handling section"
        assert 'redirect' in SYSTEM_PROMPT.lower(), "Should mention redirecting conversation"
    
    def test_system_prompt_has_example_redirections(self):
        """Test system prompt includes example redirection phrases."""
        from agent import SYSTEM_PROMPT
        
        # Check for redirection examples
        assert "focus on" in SYSTEM_PROMPT.lower() or "get back to" in SYSTEM_PROMPT.lower(), \
            "Should have example redirection phrases"
    
    def test_system_prompt_prohibits_off_topic_data_extraction(self):
        """Test system prompt prohibits extracting data from off-topic conversation."""
        from agent import SYSTEM_PROMPT
        
        assert "NEVER extract" in SYSTEM_PROMPT or "NEVER pretend" in SYSTEM_PROMPT, \
            "Should prohibit extracting medical info from off-topic chat"
    
    def test_system_prompt_mentions_common_off_topic_examples(self):
        """Test system prompt lists common off-topic examples."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        off_topic_examples = ['weather', 'sports', 'politics', 'pets', 'hobbies']
        found_examples = [ex for ex in off_topic_examples if ex in prompt_lower]
        
        assert len(found_examples) >= 2, "Should mention at least 2 common off-topic examples"


class TestSafetyProtocols:
    """Test safety protocols in system prompt."""
    
    def test_system_prompt_has_safety_section(self):
        """Test system prompt includes safety protocols."""
        from agent import SYSTEM_PROMPT
        
        assert 'SAFETY' in SYSTEM_PROMPT.upper(), "Should have safety protocols section"
    
    def test_system_prompt_mentions_emergency(self):
        """Test system prompt handles emergency situations."""
        from agent import SYSTEM_PROMPT
        
        assert '911' in SYSTEM_PROMPT or 'emergency' in SYSTEM_PROMPT.lower(), \
            "Should mention emergency services for crisis situations"
    
    def test_system_prompt_prohibits_medical_advice(self):
        """Test system prompt prohibits giving medical advice."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        prohibitions = ['not provide', 'do not provide', 'not prescribe', 'do not prescribe']
        has_prohibition = any(p in prompt_lower for p in prohibitions)
        
        assert has_prohibition, "Should prohibit providing medical advice or prescriptions"
    
    def test_system_prompt_handles_self_harm(self):
        """Test system prompt addresses self-harm mentions."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        crisis_terms = ['self-harm', 'suicidal', 'danger']
        has_crisis_handling = any(term in prompt_lower for term in crisis_terms)
        
        assert has_crisis_handling, "Should handle crisis situations like self-harm"


class TestDataIntegrity:
    """Test data integrity rules in system prompt."""
    
    def test_system_prompt_has_data_integrity_section(self):
        """Test system prompt includes data integrity rules."""
        from agent import SYSTEM_PROMPT
        
        assert 'DATA INTEGRITY' in SYSTEM_PROMPT.upper() or 'EXPLICITLY' in SYSTEM_PROMPT.upper(), \
            "Should have data integrity rules"
    
    def test_system_prompt_requires_explicit_information(self):
        """Test system prompt requires explicitly stated information."""
        from agent import SYSTEM_PROMPT
        
        assert 'EXPLICIT' in SYSTEM_PROMPT.upper(), \
            "Should require explicitly stated information"
    
    def test_system_prompt_handles_ambiguous_input(self):
        """Test system prompt addresses ambiguous input."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        assert 'clarification' in prompt_lower or 'ambiguous' in prompt_lower, \
            "Should mention handling ambiguous input"
    
    def test_system_prompt_handles_hypotheticals(self):
        """Test system prompt addresses hypothetical symptoms."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        hypothetical_terms = ['joke', 'hypothetical', 'haha']
        has_hypothetical_handling = any(term in prompt_lower for term in hypothetical_terms)
        
        assert has_hypothetical_handling, "Should handle hypothetical/joking mentions"


class TestConversationFlow:
    """Test conversation flow guidance in system prompt."""
    
    def test_system_prompt_has_conversation_flow(self):
        """Test system prompt includes conversation flow."""
        from agent import SYSTEM_PROMPT
        
        assert 'FLOW' in SYSTEM_PROMPT.upper() or 'CONVERSATION' in SYSTEM_PROMPT.upper(), \
            "Should have conversation flow guidance"
    
    def test_system_prompt_mentions_ending_session(self):
        """Test system prompt includes session ending."""
        from agent import SYSTEM_PROMPT
        
        assert 'end_session' in SYSTEM_PROMPT or 'END' in SYSTEM_PROMPT, \
            "Should mention ending the session"
    
    def test_system_prompt_specifies_data_to_gather(self):
        """Test system prompt specifies all data to gather."""
        from agent import SYSTEM_PROMPT
        prompt_lower = SYSTEM_PROMPT.lower()
        
        required_data = ['name', 'age', 'symptoms', 'severity', 'duration', 'medications']
        found_data = [d for d in required_data if d in prompt_lower]
        
        assert len(found_data) == len(required_data), \
            f"Should specify all required data. Missing: {set(required_data) - set(found_data)}"


class TestPromptCompleteness:
    """Test overall prompt completeness."""
    
    def test_system_prompt_is_comprehensive(self):
        """Test system prompt has all essential sections."""
        from agent import SYSTEM_PROMPT
        
        essential_sections = [
            'INFORMATION TO GATHER',
            'CRITICAL RULES',
            'OFF-TOPIC',
            'SAFETY',
        ]
        
        for section in essential_sections:
            assert section in SYSTEM_PROMPT.upper(), f"Missing section: {section}"
    
    def test_system_prompt_has_reasonable_length(self):
        """Test system prompt is neither too short nor excessively long."""
        from agent import SYSTEM_PROMPT
        
        word_count = len(SYSTEM_PROMPT.split())
        
        assert word_count >= 200, "System prompt seems too short"
        assert word_count <= 2000, "System prompt seems excessively long"
    
    def test_system_prompt_is_well_structured(self):
        """Test system prompt uses clear formatting."""
        from agent import SYSTEM_PROMPT
        
        # Check for numbered lists or bullet points
        has_structure = ':' in SYSTEM_PROMPT and ('-' in SYSTEM_PROMPT or any(str(i) + '.' in SYSTEM_PROMPT for i in range(1, 10)))
        
        assert has_structure, "System prompt should use structured formatting"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
