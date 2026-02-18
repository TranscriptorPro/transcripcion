import os
import json

def generate_version(doctor_data, template_path, output_dir):
    """
    Generates a personalized index.html for a specific doctor.
    """
    if not os.path.exists(template_path):
        print(f"Error: Template {template_path} not found.")
        return

    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Placeholders to replace
    # We will assume these markers exist in index.html
    placeholders = {
        "/* {{CONFIG_IDENTITY}} */": f"const CLIENT_CONFIG = {json.dumps(doctor_data, indent=4)};",
        "<!-- {{APP_TITLE}} -->": f"<title>Transcriptor - Dr. {doctor_data['nombre']}</title>"
    }

    # Remove API Key Card (Black Box Security)
    # We look for the card containing the API input and remove it from the HTML
    import re
    # Pattern to find the card div containing apiKeyInput
    api_card_pattern = r'<div class="card">\s*<div class="card-title">\s*<svg.*?>\s*<path.*?>\s*</svg>\s*API Key Groq.*?</div>.*?<div class="api-section">.*?</div>\s*</div>'
    content = re.sub(api_card_pattern, '<!-- API Section Protected by Admin -->', content, flags=re.DOTALL)

    for marker, replacement in placeholders.items():
        if marker in content:
            content = content.replace(marker, replacement)
        else:
            print(f"Warning: Marker {marker} not found in template.")

    # Create output filename
    safe_name = doctor_data['nombre'].lower().replace(" ", "_").replace(".", "")
    output_filename = f"index_{safe_name}.html"
    output_path = os.path.join(output_dir, output_filename)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Success: Generated {output_path}")

if __name__ == "__main__":
    # List of doctors to generate
    doctors = [
        {
            "id": "DR001",
            "nombre": "Juan Perez",
            "matricula": "MN 12345",
            "plan": "pro",
            "vencimiento": "2026-12-31",
            "especialidad": "Cardiología",
            "status": "trial",
            "max_devices": 2
        },
        {
            "id": "DR002",
            "nombre": "García",
            "matricula": "MP 67890",
            "plan": "pro",
            "vencimiento": "2026-08-15",
            "especialidad": "ORL",
            "status": "active",
            "max_devices": 1
        }
    ]

    # Paths
    # Now script and template are in the same 'generar_apps' directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    template = os.path.join(current_dir, "template.html")
    # dist is in the parent directory of 'generar_apps'
    dist = os.path.join(os.path.dirname(current_dir), "dist")

    print("--- Transcriptor Médico: Generador de Versiones ---")
    for doc in doctors:
        generate_version(doc, template, dist)
