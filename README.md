# Dashboard de Balances Bancarios - Chile (CMF) 🏦🇨🇱

Este proyecto es un dashboard interactivo diseñado para analizar y visualizar los estados financieros del sistema bancario chileno. A través de la integración con la API de la Comisión para el Mercado Financiero (CMF), permite extraer y monitorear indicadores clave de la industria en tiempo real.

## 📌 Contexto y Motivación
Con un fuerte interés en **Finanzas** y experiencia práctica en la **Prevención y Detección de Fraude**, este proyecto nace de la necesidad de aplicar análisis de datos al sector bancario. El monitoreo constante de indicadores como la liquidez, rentabilidad y estructura de capital no solo es fundamental para la toma de decisiones financieras, sino que también es una herramienta clave en la identificación temprana de anomalías sistémicas y perfiles de riesgo atípicos que pueden preceder a eventos de fraude institucional.

## 🚀 Características Principales
- **Integración API CMF:** Consumo automatizado de datos oficiales (Balances SBIF/CMF).
- **Cálculo de KPIs Financieros:**
  - **ROA (Return on Assets):** Rentabilidad sobre los activos.
  - **ROE (Return on Equity):** Rentabilidad financiera.
  - **LTD (Loan-to-Deposit Ratio):** Índice clave de riesgo de liquidez y solidez frente a corridas bancarias o fraudes.
- **Análisis Comparativo:** Evolución histórica del sistema bancario y desglose por entidad (depósitos, colocaciones, patrimonio, utilidad).
- **Exportación de Datos:** Descarga de reportes en formato CSV para análisis posterior en herramientas analíticas o corporativas.
  
<img width="1417" height="903" alt="image" src="https://github.com/user-attachments/assets/2bf3186c-5c42-4d53-af33-f0cb5c63d67b" />

<img width="1276" height="905" alt="image" src="https://github.com/user-attachments/assets/5e014e4c-6810-47c0-b730-6010d3cc109c" />

## 🛠️ Tecnologías Utilizadas
- **Frontend:** HTML5, CSS3, Vanilla JavaScript.
- **Gráficos:** Chart.js
- **Testing y Automatización:** Script de validación en Python.
- **API:** [API CMF Chile](https://api.cmfchile.cl/) (API SBIF de Recursos).

## ⚙️ Configuración y Uso Local
Para ejecutar este proyecto en tu entorno local:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/dashboard-bancoscl-balances.git
   cd dashboard-bancoscl-balances
   ```
2. Obtén una API Key gratuita en el portal para desarrolladores de la **CMF Chile**.
3. Configura tu API Key:
   - Abre el archivo `app.js` (línea 1) y cambia `"TU_API_KEY_AQUI"` por tu llave real.
   - _Opcional:_ Haz lo mismo en `test.py` si deseas ejecutar simulaciones o pruebas aisladas.
4. Inicia un servidor local ligero para el visor web (ayuda a prevenir errores de CORS):
   ```bash
   # Usando Python:
   python -m http.server 8000
   ```
5. Visita `http://localhost:8000` en tu navegador.

## 🛡️ Seguridad
Nunca subas tu API Key directamente a repositorios públicos. En este código, las llaves han sido filtradas y excluidas del historial para mantener las buenas prácticas de ciberseguridad.

---
*Este proyecto es parte de mi portafolio profesional, diseñado para demostrar habilidades avanzadas de análisis financiero, consumo de APIs y desarrollo frontend orientado al monitoreo de sistemas financieros.*
