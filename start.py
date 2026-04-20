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

def install_dependencies():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    venv_path = os.path.join(backend_dir, "venv")
    
    # 1. Backend Setup
    if not os.path.exists(venv_path):
        print("[!] Backend environment missing. Initializing...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], cwd=backend_dir, shell=True)
    
    python_exe = os.path.join(venv_path, "Scripts", "python.exe") if os.name == 'nt' else os.path.join(venv_path, "bin", "python")
    print("[*] Synchronizing backend dependencies...")
    subprocess.run([python_exe, "-m", "pip", "install", "-r", "requirements.txt"], cwd=backend_dir, shell=True)

    # 2. Frontend Setup
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("[!] Frontend dependencies missing. Running npm install...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True)

def start_backend():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    venv_path = os.path.join(backend_dir, "venv")
    python_exe = os.path.join(venv_path, "Scripts", "python.exe") if os.name == 'nt' else os.path.join(venv_path, "bin", "python")
    
    if not os.path.exists(venv_path):
        print("[!] Critical: Backend venv still missing after setup attempt.")
        return

    run_command([python_exe, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], backend_dir, "BACKEND")

def start_frontend():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
         print("[!] Critical: Frontend dependencies missing after setup attempt.")
         return

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
    
    # Auto-install missing components
    install_dependencies()

    import threading
    threading.Thread(target=start_backend, daemon=True).start()
    threading.Thread(target=start_frontend, daemon=True).start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)
