import subprocess
import os
import sys
import time
import signal
import threading

processes = []

def run_command(command, cwd, name):
    print(f"[*] Starting {name}...")
    # Perbaikan: Menggunakan shell=False agar list argumen terbaca dengan benar
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=False, 
        text=True,
        bufsize=1
    )
    processes.append(process)
    
    # Membaca log secara real-time
    for line in iter(process.stdout.readline, ""):
        print(f"[{name}] {line.strip()}")
    
    process.stdout.close()
    return process.wait()

def install_dependencies():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    
    # Path venv yang benar sesuai struktur folder kamu
    venv_path = os.path.join(backend_dir, "venv")

    # 1. Backend Setup
    if not os.path.exists(venv_path):
        print("[!] Backend environment missing. Initializing...")
        # Gunakan shell=False dan panggil module venv
        subprocess.run([sys.executable, "-m", "venv", "venv"], cwd=backend_dir)

    python_exe = os.path.join(venv_path, "bin", "python")
    if os.name == 'nt':
        python_exe = os.path.join(venv_path, "Scripts", "python.exe")

    print("[*] Synchronizing backend dependencies...")
    # Perbaikan: Jangan gunakan shell=True dengan list
    subprocess.run([python_exe, "-m", "pip", "install", "-r", "requirements.txt"], cwd=backend_dir)

    # 2. Frontend Setup
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("[!] Frontend dependencies missing. Running npm install...")
        subprocess.run(["npm", "install"], cwd=frontend_dir)

def start_backend():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    venv_path = os.path.join(backend_dir, "venv")
    
    python_exe = os.path.join(venv_path, "bin", "python")
    if os.name == 'nt':
        python_exe = os.path.join(venv_path, "Scripts", "python.exe")

    if not os.path.exists(venv_path):
        print("[!] Critical: Backend venv still missing.")
        return

    # Perbaikan: Pemanggilan uvicorn yang benar lewat list
    cmd = [python_exe, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    run_command(cmd, backend_dir, "BACKEND")

def start_frontend():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")

    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
         print("[!] Critical: Frontend dependencies missing.")
         return

    # Gunakan npm langsung
    run_command(["npm", "run", "dev"], frontend_dir, "FRONTEND")

def signal_handler(sig, frame):
    print("\n[!] Shutting down ThothCloud... Terminating sub-processes.")
    for p in processes:
        try:
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
    install_dependencies()

    threading.Thread(target=start_backend, daemon=True).start()
    threading.Thread(target=start_frontend, daemon=True).start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)
