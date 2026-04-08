# Claude Project: Agentic OCR for Handwritten Medical Prescriptions

This Claude project is designed to extract and validate unclear handwritten medical prescriptions using a multi-agent workflow.

## Main goals
- Read poor-quality handwritten prescriptions
- Avoid unsafe guessing
- Normalize abbreviations into structured medication data
- Validate against medicine knowledge and dosage logic
- Flag low-confidence outputs for human review

## Agent flow
1. Intake Agent
2. Image Enhancement Agent
3. Handwriting Reader Agent
4. Clinical Parser Agent
5. Drug Knowledge Agent
6. Safety Validator Agent
7. Ambiguity Resolver Agent
8. Confidence Scoring Agent
9. Human Review Agent
10. Reporting Agent
