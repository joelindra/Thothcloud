import subprocess
import os
import sys
import time
import signal

processes = []

def run_command(command, cwd, name):
    print(f"[*] Starting {name}...")
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=True,
        text=True,
        bufsize=1
    )
    processes.append(process)
    for line in iter(process.stdout.readline, ""):
        print(f"[{name}] {line.strip()}")
    process.stdout.close()
    return process.wait()

def start_backend():
    backend_dir = os.path.join(os.getcwd(), "backend")
    venv_path = os.path.join(backend_dir, "venv")
    python_exe = os.path.join(venv_path, "Scripts", "python.exe") if os.name == 'nt' else os.path.join(venv_path, "bin", "python")
    
    if not os.path.exists(venv_path):
        print("[!] Backend venv not found. Please install manually or check paths.")
        return

    run_command([python_exe, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], backend_dir, "BACKEND")

def start_frontend():
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    run_command(["npm", "run", "dev"], frontend_dir, "FRONTEND")

def signal_handler(sig, frame):
    print("\n[!] Shutting down ThothCloud... Terminating sub-processes.")
    for p in processes:
        try:
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except:
            pass
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    
    print("""
    =========================================
       THOTHCLOUD - NATIVE RUNNER (v1.1)
    =========================================
    [*] Mode: Native Python + Node.js
    [*] DB: SQLite
    [*] Storage: ./storage
    =========================================
    """)

    os.makedirs("storage", exist_ok=True)

    import threading
    threading.Thread(target=start_backend, daemon=True).start()
    threading.Thread(target=start_frontend, daemon=True).start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)
