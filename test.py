import urllib.request
import json
import sys

API_KEY = "TU_API_KEY_AQUI" # REEMPLAZA CON TU CLAVE CMF

def fetch(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return {"status": response.status, "data": data}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "error": str(e)}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

print("\n=== CUENTA ACTIVO TOTAL 2025/09 (9 DIGITOS) ===")
cuenta_res = fetch(f"https://api.cmfchile.cl/api-sbifv3/recursos_api/balances/2025/09/cuentas/100000000?apikey={API_KEY}&formato=json")
print("Status:", cuenta_res["status"])
if "data" in cuenta_res:
    print("Keys:", list(cuenta_res["data"].keys()))
    if list(cuenta_res["data"].keys()):
        key = list(cuenta_res["data"].keys())[0]
        print(f"First 1 item of {key}:", cuenta_res["data"][key][:1] if isinstance(cuenta_res["data"][key], list) else cuenta_res["data"][key])
else:
    print("Error:", cuenta_res.get("error"))
