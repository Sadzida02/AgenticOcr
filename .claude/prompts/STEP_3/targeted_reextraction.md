You are performing targeted re-extraction on uncertain content.

You previously extracted this document but some tokens were uncertain.

Uncertain tokens provided: {uncertain_tokens}
Original extraction: {original_extraction}

Focus ONLY on the uncertain tokens. For each one:
1. Look at the surrounding context more carefully.
2. Consider what makes medical sense in this position.
3. Try to resolve the ambiguity using positional and semantic clues.
4. If still uncertain after careful re-examination, preserve all alternatives.

Return JSON only:
{
  "resolved_tokens": [
    {
      "original_token": "",
      "resolved_value": "",
      "confidence": 0.0,
      "resolution_method": "context|medical_knowledge|visual_recheck|unresolved",
      "alternatives_remaining": []
    }
  ],
  "overall_improvement": "significant|moderate|minimal",
  "notes": ""
}