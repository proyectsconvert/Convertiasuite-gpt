"""Wrapper HTML para landing pages generadas."""

import html


def render_landing_wrapper(content: str, title: str = "") -> str:
    safe_title = html.escape(title, quote=True) if title else ""
    safe_content = html.escape(content, quote=True).replace("\n", "<br />")

    page_title = safe_title or "Convertia"
    title_html = (
        f'<h1 class="text-3xl font-bold text-white mb-6">{safe_title}</h1>'
        if safe_title
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="max-w-2xl w-full">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
                {title_html}
                <div class="text-lg text-gray-100 leading-relaxed">
                    {safe_content}
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""
