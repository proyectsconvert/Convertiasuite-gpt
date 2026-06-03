import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRAND_CONFIG = {
    "convertia": {
        "nametag": "Convertia",
        "fonts": {"title": "Switzer", "body": "Inter"},
        "colors": {
            "primary": "#011E23",
            "secondary_dark_green": "#10473f",
            "accent_green": "#1AEB9F",
            "lavender": "#bab8ff", 
            "purple": "#8f8cff",
            "bg_lite": "#F5F5F5",
            "text": "#111111",
        },
        "excel": {
            "font_name": "Calibri",
            "header_fill": "011E23",     
            "header_text": "FFFFFF",     
            "accent_fill": "1AEB9F",     
            "zebra_fill": "F5F5F5",      
            "border_color": "D9D9D9",    
        },
        "gradients": {
            "linear_brand": {
                "type": "linear",
                "angle": 90,
                "stops": [
                    {"color": "#1aeda1", "offset": "0%"},
                    {"color": "#bab8ff", "offset": "100%"},
                ],
                "css": "linear-gradient(90deg, #1aeda1 0%, #bab8ff 100%)",
            },
            "radial_purple_glow": {
                "type": "radial",
                "position": "50% 50%",
                "stops": [
                    {"color": "#8f8cff", "alpha": 0.74, "offset": "0%"},
                    {"color": "#8f8cff", "alpha": 0.80, "offset": "50%"},
                    {"color": "#f8fcff", "alpha": 0.00, "offset": "100%"},
                ],
                "css": (
                    "radial-gradient(circle at 50% 50%, "
                    "rgba(143,140,255,0.74) 0%, "
                    "rgba(143,140,255,0.80) 50%, "
                    "rgba(248,252,255,0.00) 100%)"
                ),
            },
            "radial_green_glow": {
                "type": "radial",
                "position": "50% 50%",
                "stops": [
                    {"color": "#1aeda1", "alpha": 0.74, "offset": "0%"},
                    {"color": "#1aeda1", "alpha": 0.80, "offset": "50%"},
                    {"color": "#f0afa5", "alpha": 0.00, "offset": "100%"},
                ],
                "css": (
                    "radial-gradient(circle at 50% 50%, "
                    "rgba(26,237,161,0.74) 0%, "
                    "rgba(26,237,161,0.80) 50%, "
                    "rgba(240,175,165,0.00) 100%)"
                ),
            },
        },
        
        "logos": {
            "main":  os.path.join(BASE_DIR, "assets", "logos", "convertia_main.png"),
            "docs":  os.path.join(BASE_DIR, "assets", "logos", "convertia_docs.png"),
            "white": os.path.join(BASE_DIR, "assets", "logos", "convertia_white.png"),
        },
        
       
        "templates": {
            "presentation": os.path.join(BASE_DIR, "assets", "templates", "plantilla_powerpoint.pptx"),
            "excel":        os.path.join(BASE_DIR, "assets", "templates", "plantilla_excel.xlsx"),
            "document":     os.path.join(BASE_DIR, "assets", "templates", "report_template.html"),
        },

        "fonts": {
            "switzer_regular": os.path.join(BASE_DIR, "assets", "fonts", "Switzer-Regular.ttf"),
            "switzer_bold":    os.path.join(BASE_DIR, "assets", "fonts", "Switzer-Bold.ttf"),
            "inter_regular":   os.path.join(BASE_DIR, "assets", "fonts", "Inter-Regular.ttf"),
            "inter_bold":      os.path.join(BASE_DIR, "assets", "fonts", "Inter-Bold.ttf"),
        },
    }
}