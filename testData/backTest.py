import math
import os
import random
import requests
import socket
import ssl
import time
from urllib.parse import urlparse


BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "http://localhost:8080")
BACKEND_BASE_PATH = os.getenv("BACKEND_BASE_PATH", "/elyos-telemetry-backend")
URL = f"{BACKEND_ORIGIN}{BACKEND_BASE_PATH}/api/lectures"


# ---------------------------------------------------
# 1) TLS HANDSHAKE TEST
# ---------------------------------------------------
def test_tls():
    print("\n=== TLS HANDSHAKE TEST ===")

    parsed = urlparse(URL)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    if parsed.scheme != "https":
        print(f"Skipping TLS handshake for non-HTTPS URL: {URL}")
        return

    ctx = ssl.create_default_context()

    try:
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                print("TLS connected")
                print("TLS version:", ssock.version())
                print("Cipher:", ssock.cipher())
                cert = ssock.getpeercert()
                print("Certificate subject:", cert["subject"])
    except Exception as exc:
        print("TLS FAILED:", exc)


# ---------------------------------------------------
# 2) REALISTIC DRIVE PROFILE
# ---------------------------------------------------
BASE_LATITUDE = 39.792150
BASE_LONGITUDE = -86.238710
WHEELBASE_ASSUMED = 1.6

simulation_state = {
    "step": 0,
    "latitude": BASE_LATITUDE,
    "longitude": BASE_LONGITUDE,
    "heading_deg": 90.0,
    "speed_mps": 0.0,
    "prev_speed_mps": 0.0,
    "accel_pct": 0.0,
    "voltage_battery": 51.8,
    "ambient_temp": 23.0,
}


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def update_drive_profile():
    step = simulation_state["step"]
    phase = step % 120

    if phase < 18:
        target_accel_pct = 18 + phase * 3.2
    elif phase < 45:
        target_accel_pct = 72 + 10 * math.sin((phase - 18) / 27 * math.pi)
    elif phase < 70:
        target_accel_pct = 55 - (phase - 45) * 1.4
    elif phase < 90:
        target_accel_pct = 18 + 8 * math.sin((phase - 70) / 20 * 2 * math.pi)
    else:
        target_accel_pct = max(0, 22 - (phase - 90) * 1.3)

    accel_pct = simulation_state["accel_pct"] * 0.72 + target_accel_pct * 0.28
    accel_pct = clamp(accel_pct + random.uniform(-1.2, 1.2), 0, 100)

    drag = 0.05 + simulation_state["speed_mps"] * 0.012
    propulsion = accel_pct / 100 * 2.8
    speed_mps = clamp(simulation_state["speed_mps"] + propulsion - drag, 0, 18)

    longitudinal_accel = speed_mps - simulation_state["prev_speed_mps"]
    turn_wave = math.sin(step / 18) * 14
    heading_deg = (simulation_state["heading_deg"] + turn_wave * 0.12) % 360

    distance_m = speed_mps
    heading_rad = math.radians(heading_deg)
    delta_lat = (distance_m * math.cos(heading_rad)) / 111111
    delta_lng = (distance_m * math.sin(heading_rad)) / (
        111111 * math.cos(math.radians(simulation_state["latitude"]))
    )

    simulation_state["latitude"] += delta_lat
    simulation_state["longitude"] += delta_lng
    simulation_state["heading_deg"] = heading_deg
    simulation_state["prev_speed_mps"] = simulation_state["speed_mps"]
    simulation_state["speed_mps"] = speed_mps
    simulation_state["accel_pct"] = accel_pct
    simulation_state["voltage_battery"] = clamp(
        simulation_state["voltage_battery"] - speed_mps * 0.0025 + random.uniform(-0.015, 0.01),
        47.5,
        52.2,
    )
    simulation_state["ambient_temp"] = clamp(
        simulation_state["ambient_temp"] + 0.015 * speed_mps + random.uniform(-0.04, 0.04),
        22,
        36,
    )
    simulation_state["step"] += 1

    return longitudinal_accel


def generate_payload():
    longitudinal_accel = update_drive_profile()
    speed_mps = simulation_state["speed_mps"]
    speed_kmh = speed_mps * 3.6
    heading_rad = math.radians(simulation_state["heading_deg"])

    velocity_x = speed_mps * math.cos(heading_rad)
    velocity_y = speed_mps * math.sin(heading_rad)
    lateral_accel = math.sin(simulation_state["step"] / 11) * 0.85
    vertical_accel = 9.81 + math.sin(simulation_state["step"] / 8) * 0.08
    current = clamp(simulation_state["accel_pct"] * 0.58 + speed_kmh * 0.24 + random.uniform(-1.8, 1.8), 0, 85)
    rpm_motor = int(speed_kmh * 92 + simulation_state["accel_pct"] * 16 + random.uniform(-60, 60))
    steering_direction = round(math.sin(simulation_state["step"] / 16) * 18, 2)
    altitude_m = 225 + math.sin(simulation_state["step"] / 40) * 4.5
    air_speed = clamp(speed_mps + random.uniform(-0.3, 0.3), 0, 22)

    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "voltage_battery": round(simulation_state["voltage_battery"], 2),
        "current": round(current, 2),
        "latitude": round(simulation_state["latitude"], 6),
        "longitude": round(simulation_state["longitude"], 6),
        "acceleration_x": round(longitudinal_accel, 3),
        "acceleration_y": round(lateral_accel, 3),
        "acceleration_z": round(vertical_accel, 3),
        "orientation_x": round(math.sin(simulation_state["step"] / 13) * 6, 2),
        "orientation_y": round(math.cos(simulation_state["step"] / 17) * 4, 2),
        "orientation_z": round(simulation_state["heading_deg"], 2),
        "rpm_motor": rpm_motor,
        "velocity_x": round(velocity_x, 3),
        "velocity_y": round(velocity_y, 3),
        "ambient_temp": round(simulation_state["ambient_temp"], 1),
        "steering_direction": steering_direction,
        "altitude_m": round(altitude_m, 1),
        "num_sats": random.randint(10, 16),
        "air_speed": round(air_speed, 2),
        "throttle": round(simulation_state["accel_pct"], 1),
    }


# ---------------------------------------------------
# 3) CONTINUOUS POST LOOP
# ---------------------------------------------------
def send_loop():
    print("\n=== STARTING CONTINUOUS TELEMETRY ===")
    print(f"Sending telemetry to {URL}")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "ESP32-Test-Client"
    }

    try:
        while True:
            payload = generate_payload()
            response = requests.post(URL, json=payload, headers=headers, timeout=10)

            print(
                f"[{time.strftime('%H:%M:%S')}] "
                f"Status: {response.status_code} | "
                f"Speed: {math.sqrt(payload['velocity_x'] ** 2 + payload['velocity_y'] ** 2) * 3.6:.1f} km/h | "
                f"Throttle: {payload['throttle']:.1f}% | "
                f"Current: {payload['current']:.1f} A"
            )

            time.sleep(1)

    except requests.exceptions.RequestException as exc:
        print("Request failed:", exc)
    except KeyboardInterrupt:
        print("\nStopped by user.")


if __name__ == "__main__":
    test_tls()
    send_loop()
