# Tool Registry

Available tools:
- enhance_image(image_path)
- crop_regions(image_path)
- lookup_medicine_candidates(term)
- validate_medication_logic(medication_json)
- compare_candidate_words(image_crop_path, candidates)
- calculate_confidence(context_json)
- store_audit_log(step_name, payload)

Each tool must return structured JSON.
No tool may fabricate medical facts.
