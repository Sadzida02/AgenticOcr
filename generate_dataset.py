import os
import json
import random
from PIL import Image, ImageDraw, ImageFont
import textwrap

# pip install Pillow
# Run: python generate_dataset.py

OUTPUT_DIR = "synthetic_dataset"
GROUND_TRUTH_FILE = "ground_truth.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Data pools ────────────────────────────────────────────────────────────────

DOCTORS = [
    "Dr. A. Mehmed", "Dr. S. Kovačević", "Dr. M. Hadžić",
    "Dr. E. Bajrić", "Dr. N. Šehić", "Dr. J. Williams",
    "Dr. R. Patel", "Dr. L. Chen"
]

PATIENTS = [
    ("Amira Hodžić", "15/03/1948", "F"),
    ("Josip Marić", "22/07/1945", "M"),
    ("Fatima Begović", "01/12/1952", "F"),
    ("Ivan Petrović", "30/06/1943", "M"),
    ("Zehra Muratović", "14/09/1950", "F"),
    ("Stjepan Blažević", "08/02/1938", "M"),
    ("Rabija Softić", "19/11/1955", "F"),
    ("Mirko Jovanović", "27/04/1947", "M"),
]

MEDICATIONS = [
    {
        "drug": "Amoxicillin",
        "abbrev": "Amox",
        "strengths": ["250mg", "500mg"],
        "forms": ["Tab", "Cap"],
        "frequencies": ["tds", "bd", "od"],
        "durations": ["5d", "7d", "10d"]
    },
    {
        "drug": "Metformin",
        "abbrev": "Metf",
        "strengths": ["500mg", "850mg", "1000mg"],
        "forms": ["Tab"],
        "frequencies": ["bd", "tds"],
        "durations": ["30d", "ongoing"]
    },
    {
        "drug": "Lisinopril",
        "abbrev": "Lisin",
        "strengths": ["5mg", "10mg", "20mg"],
        "forms": ["Tab"],
        "frequencies": ["od"],
        "durations": ["30d", "ongoing"]
    },
    {
        "drug": "Atorvastatin",
        "abbrev": "Atorv",
        "strengths": ["10mg", "20mg", "40mg"],
        "forms": ["Tab"],
        "frequencies": ["od"],
        "durations": ["30d", "ongoing"]
    },
    {
        "drug": "Omeprazole",
        "abbrev": "Omep",
        "strengths": ["20mg", "40mg"],
        "forms": ["Cap"],
        "frequencies": ["od", "bd"],
        "durations": ["14d", "30d"]
    },
    {
        "drug": "Amlodipine",
        "abbrev": "Amlo",
        "strengths": ["5mg", "10mg"],
        "forms": ["Tab"],
        "frequencies": ["od"],
        "durations": ["30d", "ongoing"]
    },
    {
        "drug": "Paracetamol",
        "abbrev": "PCM",
        "strengths": ["500mg", "1000mg"],
        "forms": ["Tab"],
        "frequencies": ["qid", "tds", "prn"],
        "durations": ["3d", "5d", "7d"]
    },
    {
        "drug": "Ibuprofen",
        "abbrev": "Ibup",
        "strengths": ["200mg", "400mg", "600mg"],
        "forms": ["Tab"],
        "frequencies": ["tds", "bd"],
        "durations": ["3d", "5d", "7d"]
    },
]

DIAGNOSES = [
    "Upper respiratory tract infection",
    "Hypertension",
    "Type 2 Diabetes Mellitus",
    "Hyperlipidaemia",
    "Gastroesophageal reflux disease",
    "Osteoarthritis",
    "Urinary tract infection",
    "Anxiety disorder",
]

CLINICS = [
    "Dom Zdravlja Sarajevo", "General Practice Clinic",
    "Family Medicine Centre", "Primary Health Centre",
    "Poliklinika Sunce", "Medical Centre Novo Sarajevo"
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def random_date(start_year=2023, end_year=2025):
    day = random.randint(1, 28)
    month = random.randint(1, 12)
    year = random.randint(start_year, end_year)
    return f"{day:02d}/{month:02d}/{year}"

def pick_medications(count=None):
    count = count or random.randint(1, 3)
    chosen = random.sample(MEDICATIONS, min(count, len(MEDICATIONS)))
    result = []
    for med in chosen:
        strength = random.choice(med["strengths"])
        form = random.choice(med["forms"])
        freq = random.choice(med["frequencies"])
        duration = random.choice(med["durations"])
        use_abbrev = random.random() < 0.4
        name = med["abbrev"] if use_abbrev else med["drug"]
        result.append({
            "display": f"{form} {name} {strength} {freq} x {duration}",
            "full": f"{form} {med['drug']} {strength} {freq} x {duration}",
            "drug": med["drug"],
            "strength": strength,
            "frequency": freq,
            "duration": duration
        })
    return result

def add_noise(draw, width, height, level="low"):
    """Add realistic scan noise"""
    import random
    noise_count = {"low": 50, "medium": 200, "high": 500}[level]
    for _ in range(noise_count):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        gray = random.randint(180, 240)
        draw.point((x, y), fill=(gray, gray, gray))

def get_font(size, bold=False):
    """Try to get a font, fall back to default"""
    try:
        if bold:
            return ImageFont.truetype("arialbd.ttf", size)
        return ImageFont.truetype("arial.ttf", size)
    except:
        try:
            return ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except:
            return ImageFont.load_default()

# ── Generator functions ───────────────────────────────────────────────────────

def generate_typed_prescription(index):
    """Clean typed prescription — easier for OCR"""
    width, height = 794, 1123  # A4 at 96dpi
    img = Image.new("RGB", (width, height), color=(252, 252, 250))
    draw = ImageDraw.Draw(img)

    doctor = random.choice(DOCTORS)
    patient = random.choice(PATIENTS)
    clinic = random.choice(CLINICS)
    date = random_date()
    diagnosis = random.choice(DIAGNOSES)
    medications = pick_medications()

    font_title = get_font(18, bold=True)
    font_normal = get_font(14)
    font_small = get_font(12)
    font_label = get_font(13, bold=True)

    y = 40
    # Header
    draw.rectangle([30, y, width-30, y+60], outline=(180, 180, 180), width=1)
    draw.text((40, y+10), clinic, font=font_title, fill=(50, 50, 100))
    draw.text((40, y+35), "Medical Prescription", font=font_small,
              fill=(100, 100, 100))
    draw.text((width-200, y+10), f"Date: {date}", font=font_small,
              fill=(80, 80, 80))
    y += 80

    # Patient info
    draw.line([(30, y), (width-30, y)], fill=(200, 200, 200), width=1)
    y += 10
    draw.text((40, y), "PATIENT INFORMATION", font=font_label,
              fill=(80, 80, 80))
    y += 25
    draw.text((40, y), f"Name: {patient[0]}", font=font_normal,
              fill=(30, 30, 30))
    draw.text((300, y), f"DOB: {patient[1]}", font=font_normal,
              fill=(30, 30, 30))
    draw.text((520, y), f"Sex: {patient[2]}", font=font_normal,
              fill=(30, 30, 30))
    y += 30
    draw.text((40, y), f"Diagnosis: {diagnosis}", font=font_normal,
              fill=(30, 30, 30))
    y += 40

    # Medications
    draw.line([(30, y), (width-30, y)], fill=(200, 200, 200), width=1)
    y += 10
    draw.text((40, y), "PRESCRIBED MEDICATIONS", font=font_label,
              fill=(80, 80, 80))
    y += 30

    med_texts = []
    for i, med in enumerate(medications, 1):
        draw.text((40, y), f"{i}.", font=font_normal, fill=(30, 30, 30))
        draw.text((65, y), med["display"], font=font_normal, fill=(20, 20, 80))
        med_texts.append(med["display"])
        y += 35

    y += 20
    draw.line([(30, y), (width-30, y)], fill=(200, 200, 200), width=1)
    y += 20
    draw.text((40, y), f"Prescribing Doctor: {doctor}", font=font_normal,
              fill=(50, 50, 50))
    y += 30
    draw.text((40, y), "Signature: _____________________", font=font_normal,
              fill=(50, 50, 50))

    # Noise
    add_noise(draw, width, height, "low")

    filename = f"typed_prescription_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)

    ground_truth = (
        f"{clinic}\n"
        f"Medical Prescription\n"
        f"Date: {date}\n"
        f"Name: {patient[0]} DOB: {patient[1]} Sex: {patient[2]}\n"
        f"Diagnosis: {diagnosis}\n"
        + "\n".join(med_texts) + "\n"
        f"Prescribing Doctor: {doctor}"
    )

    return filename, ground_truth, {
        "type": "typed_prescription",
        "doctor": doctor,
        "patient": patient[0],
        "diagnosis": diagnosis,
        "medications": [m["full"] for m in medications]
    }

def generate_handwriting_style(index):
    """Simulated handwriting style — irregular, harder for Tesseract"""
    width, height = 794, 600
    img = Image.new("RGB", (width, height), color=(255, 253, 240))
    draw = ImageDraw.Draw(img)

    doctor = random.choice(DOCTORS)
    patient = random.choice(PATIENTS)
    date = random_date()
    medications = pick_medications(random.randint(1, 2))

    # Use slightly different sizes to simulate handwriting variation
    font_lg = get_font(random.randint(16, 19))
    font_md = get_font(random.randint(13, 16))
    font_sm = get_font(random.randint(11, 13))

    y = 30
    # Slightly tilted header line simulation
    draw.text((40 + random.randint(-3, 3), y), f"Rx",
              font=get_font(22, bold=True), fill=(20, 20, 100))
    draw.text((90, y), f"Date: {date}", font=font_md, fill=(40, 40, 40))
    draw.text((400 + random.randint(-5, 5), y),
              f"Dr: {doctor.split('.')[-1].strip()}", font=font_sm,
              fill=(40, 40, 40))
    y += 45

    draw.text((40, y), f"Pt: {patient[0]}", font=font_md, fill=(30, 30, 30))
    draw.text((350, y), f"Age: {2024 - int(patient[1].split('/')[-1])}",
              font=font_sm, fill=(30, 30, 30))
    y += 40

    draw.line([(30, y), (width-50, y)], fill=(150, 150, 150), width=1)
    y += 15

    med_texts = []
    for i, med in enumerate(medications, 1):
        # Simulate irregular baseline
        offset = random.randint(-4, 4)
        draw.text((40, y + offset), f"{i}) {med['display']}",
                  font=font_lg, fill=(20, 20, 20))
        med_texts.append(med["display"])
        y += 45

    y += 10
    draw.text((40 + random.randint(-2, 2), y),
              "Signature: _______________", font=font_sm, fill=(80, 80, 80))

    add_noise(draw, width, height,
              random.choice(["low", "medium", "medium"]))

    # Apply slight rotation to simulate scan skew
    angle = random.uniform(-2, 2)
    img = img.rotate(angle, fillcolor=(255, 253, 240))

    filename = f"handwritten_style_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)

    ground_truth = (
        f"Rx Date: {date} Dr: {doctor.split('.')[-1].strip()}\n"
        f"Pt: {patient[0]}\n"
        + "\n".join(med_texts)
    )

    return filename, ground_truth, {
        "type": "handwritten_style",
        "doctor": doctor,
        "patient": patient[0],
        "medications": [m["full"] for m in medications]
    }

def generate_lab_result(index):
    """Lab result with table"""
    width, height = 794, 900
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    patient = random.choice(PATIENTS)
    doctor = random.choice(DOCTORS)
    date = random_date()
    lab_id = f"LAB{random.randint(10000, 99999)}"

    font_title = get_font(16, bold=True)
    font_normal = get_font(13)
    font_small = get_font(11)
    font_header = get_font(12, bold=True)

    y = 30
    draw.text((40, y), "LABORATORY RESULTS REPORT", font=font_title,
              fill=(20, 20, 100))
    draw.text((width-200, y), f"Lab ID: {lab_id}", font=font_small,
              fill=(80, 80, 80))
    y += 30
    draw.line([(30, y), (width-30, y)], fill=(100, 100, 200), width=2)
    y += 15

    draw.text((40, y), f"Patient: {patient[0]}", font=font_normal,
              fill=(30, 30, 30))
    draw.text((400, y), f"DOB: {patient[1]}", font=font_normal,
              fill=(30, 30, 30))
    y += 25
    draw.text((40, y), f"Referring Doctor: {doctor}", font=font_normal,
              fill=(30, 30, 30))
    draw.text((400, y), f"Date: {date}", font=font_normal, fill=(30, 30, 30))
    y += 40

    # Table
    tests = [
        ("Haemoglobin", f"{random.uniform(11.0, 17.5):.1f}", "g/dL",
         "12.0-17.5", random.random() < 0.2),
        ("WBC", f"{random.uniform(3.5, 12.0):.1f}", "x10^9/L",
         "4.0-11.0", random.random() < 0.2),
        ("Platelets", f"{random.randint(120, 400)}", "x10^9/L",
         "150-400", random.random() < 0.15),
        ("Glucose (fasting)", f"{random.uniform(3.5, 9.0):.1f}", "mmol/L",
         "3.9-5.5", random.random() < 0.3),
        ("Creatinine", f"{random.uniform(50, 120):.0f}", "umol/L",
         "53-97", random.random() < 0.2),
        ("Sodium", f"{random.randint(133, 147)}", "mmol/L",
         "136-145", random.random() < 0.1),
        ("Potassium", f"{random.uniform(3.2, 5.5):.1f}", "mmol/L",
         "3.5-5.0", random.random() < 0.15),
    ]

    cols = [40, 280, 420, 500, 620, 720]
    headers = ["Test", "Result", "Unit", "Reference", "Flag"]
    row_height = 30

    # Header row
    draw.rectangle([30, y, width-30, y+row_height],
                   fill=(220, 230, 255), outline=(180, 180, 220))
    for col, header in zip(cols, headers):
        draw.text((col + 5, y + 8), header, font=font_header,
                  fill=(20, 20, 80))
    y += row_height

    test_lines = []
    for i, (test, value, unit, ref, abnormal) in enumerate(tests):
        bg = (255, 240, 240) if abnormal else (255, 255, 255)
        draw.rectangle([30, y, width-30, y+row_height],
                       fill=bg, outline=(200, 200, 200))
        draw.text((cols[0]+5, y+8), test, font=font_normal, fill=(30, 30, 30))
        draw.text((cols[1]+5, y+8), value, font=font_normal,
                  fill=(180, 0, 0) if abnormal else (30, 30, 30))
        draw.text((cols[2]+5, y+8), unit, font=font_small, fill=(80, 80, 80))
        draw.text((cols[3]+5, y+8), ref, font=font_small, fill=(80, 80, 80))
        draw.text((cols[4]+5, y+8), "H/L" if abnormal else "", font=font_small,
                  fill=(180, 0, 0))
        test_lines.append(
            f"{test}: {value} {unit} (ref: {ref})"
            + (" [ABNORMAL]" if abnormal else ""))
        y += row_height

    y += 20
    draw.text((40, y), f"Reviewed by: {doctor}", font=font_normal,
              fill=(50, 50, 50))

    add_noise(draw, width, height, "low")

    filename = f"lab_result_{index:03d}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)

    ground_truth = (
        f"LABORATORY RESULTS REPORT Lab ID: {lab_id}\n"
        f"Patient: {patient[0]} DOB: {patient[1]}\n"
        f"Referring Doctor: {doctor} Date: {date}\n"
        + "\n".join(test_lines) + "\n"
        f"Reviewed by: {doctor}"
    )

    return filename, ground_truth, {
        "type": "lab_result",
        "patient": patient[0],
        "lab_id": lab_id,
        "tests": [t[0] for t in tests]
    }

# ── Main generator ────────────────────────────────────────────────────────────

def generate_dataset(total=25):
    ground_truth_data = {}
    metadata = []

    counts = {
        "typed_prescription": total // 3,
        "handwritten_style": total // 3,
        "lab_result": total - 2 * (total // 3)
    }

    print(f"Generating {total} synthetic documents...")
    idx = 1

    for _ in range(counts["typed_prescription"]):
        filename, gt, meta = generate_typed_prescription(idx)
        ground_truth_data[filename] = gt
        metadata.append({"filename": filename, **meta})
        print(f"  Created: {filename}")
        idx += 1

    for _ in range(counts["handwritten_style"]):
        filename, gt, meta = generate_handwriting_style(idx)
        ground_truth_data[filename] = gt
        metadata.append({"filename": filename, **meta})
        print(f"  Created: {filename}")
        idx += 1

    for _ in range(counts["lab_result"]):
        filename, gt, meta = generate_lab_result(idx)
        ground_truth_data[filename] = gt
        metadata.append({"filename": filename, **meta})
        print(f"  Created: {filename}")
        idx += 1

    # Save ground truth
    with open(os.path.join(OUTPUT_DIR, GROUND_TRUTH_FILE), "w") as f:
        json.dump(ground_truth_data, f, indent=2)

    # Save metadata
    with open(os.path.join(OUTPUT_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nDone. {total} documents saved to '{OUTPUT_DIR}/'")
    print(f"Ground truth saved to '{OUTPUT_DIR}/{GROUND_TRUTH_FILE}'")
    print(f"Metadata saved to '{OUTPUT_DIR}/metadata.json'")

if __name__ == "__main__":
    generate_dataset(25)