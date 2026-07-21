import os
import sys

# Añadir el directorio padre al path para importar app correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.domain.entities.document_content import DocumentContent, Section, TableData
from app.services.document_generation.document_generator import DocumentGenerator


def main():
    table = TableData(
        headers=["Métrica", "Enero", "Febrero", "Marzo"],
        rows=[
            ["Clientes Nuevos", 150, 180, 210],
            ["Tasa de Conversión", "2.4%", "2.7%", "3.1%"],
            ["Ingresos (USD)", 15000, 18500, 22000]
        ],
        caption="Métricas de rendimiento Q1"
    )

    sections = [
        Section(
            title="Introducción General",
            level=1,
            content="Este documento contiene el reporte de rendimiento del primer trimestre de Convertia, detallando métricas y resultados clave. El objetivo es alinear las estrategias comerciales con los hallazgos del equipo de analítica.",
            bullets=["Lanzamiento de nuevas campañas de captación", "Optimización de embudos en landing pages", "Integración con ConvertiaSuite GPT"]
        ),
        Section(
            title="Resultados Detallados de Conversión",
            level=2,
            content="A continuación se presentan los datos numéricos tabulados correspondientes a las métricas de conversión y ventas del canal principal durante el Q1.",
            table=table
        ),
        Section(
            title="Recomendaciones Estratégicas",
            level=3,
            content="Se sugiere mantener el enfoque en la optimización de costes por adquisición y expandir el canal de búsqueda pagada en mercados secundarios.",
            bullets=["Aumentar presupuesto en Google Ads un 15%", "Refinar audiencias de remarketing en Meta", "Desplegar el nuevo chatbot automatizado"]
        )
    ]

    content = DocumentContent(
        title="Reporte Trimestral de Convertia",
        subtitle="Rendimiento del primer trimestre y proyecciones de crecimiento para el Q2",
        author="Olivia AI — Analista Principal",
        date="03 / 06 / 2026",
        classification="Confidencial Corporativo",
        sections=sections,
        tables=[table]
    )

    generator = DocumentGenerator(brand="convertia")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "test_output")
    os.makedirs(out_dir, exist_ok=True)

    print("=" * 60)
    print("INICIANDO PRUEBAS DE GENERACIÓN DE DOCUMENTOS CORPORATIVOS")
    print("=" * 60)

    formats = ["pdf", "docx", "pptx", "xlsx"]
    failures = 0

    for fmt in formats:
        try:
            print(f"\n[+] Generando formato: {fmt.upper()}...")
            file_bytes = generator.generate(content, fmt=fmt)
            out_file = os.path.join(out_dir, f"test_doc.{fmt}")
            with open(out_file, "wb") as f:
                f.write(file_bytes)
            print(f"    -> ¡ÉXITO! Guardado en: {out_file} ({len(file_bytes)} bytes)")
        except Exception as e:
            failures += 1
            print(f"    -> [ERROR] Falló la generación de {fmt.upper()}: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    if failures == 0:
        print("RESULTADO: ¡TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO!")
    else:
        print(f"RESULTADO: Se completó con {failures} fallas.")
    print("=" * 60)


if __name__ == "__main__":
    main()
