import json

with open('synthetic_dataset/ground_truth.json', encoding='utf-8') as f:
    data = json.load(f)

for filename, text in data.items():
    print(f'\n=== {filename} ===')
    print(text)
    print('---')